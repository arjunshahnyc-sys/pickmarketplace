import { describe, expect, it } from 'vitest';
import {
  collectRulesWarnings,
  getDestinationRules,
  loadRulesFor,
  supportedDestinations,
  walkSourcedValues,
} from '../rules/loader';
import { EU_MEMBERSHIP } from '../rules/eu';
import { sourced } from './fixtures';
import type { DestinationRules } from '../types';

describe('registry', () => {
  it('serves all seeded destinations', () => {
    expect(supportedDestinations().sort()).toEqual(['AU', 'CA', 'DE', 'FR', 'GB', 'JP', 'US']);
    for (const c of supportedDestinations()) {
      expect(getDestinationRules(c)?.country).toBe(c);
    }
    expect(getDestinationRules('ZZ')).toBeNull();
  });

  it('destination currency matches the country', () => {
    expect(getDestinationRules('US')?.currency).toBe('USD');
    expect(getDestinationRules('GB')?.currency).toBe('GBP');
    expect(getDestinationRules('DE')?.currency).toBe('EUR');
    expect(getDestinationRules('JP')?.currency).toBe('JPY');
  });
});

describe('seed policy: no invented numbers can ship', () => {
  // These invariants are the mechanical form of "do not populate rates from
  // training data": a row is either unverified AND empty, or verified AND
  // dated. There is no state where an unreviewed number exists.
  it('every unverified row is unfilled; every verified row is dated', () => {
    for (const c of supportedDestinations()) {
      const rules = getDestinationRules(c)!;
      for (const { path, row } of walkSourcedValues(rules)) {
        const where = `${c}.${path}`;
        if (row.verification === 'unverified') {
          expect(row.value, `${where} is unverified but carries a value`).toBeNull();
          expect(row.lastVerified, `${where} is unverified but carries a date`).toBeNull();
        } else {
          expect(row.lastVerified, `${where} is verified but undated`).not.toBeNull();
        }
        expect(row.sourceUrl, `${where} has no source`).toMatch(/^https:\/\//);
      }
    }
  });

  it('EU membership follows the same policy', () => {
    expect(EU_MEMBERSHIP.sourceUrl).toMatch(/^https:\/\//);
    if (EU_MEMBERSHIP.verification === 'verified') {
      expect(EU_MEMBERSHIP.lastVerified).not.toBeNull();
    }
  });
});

describe('staleness', () => {
  const now = new Date('2026-08-26T00:00:00Z');

  function withVerifiedRow(lastVerified: string): DestinationRules {
    const base = getDestinationRules('US')!;
    return {
      ...base,
      valuationBasis: { ...sourced<'CIF' | 'FOB'>('FOB'), lastVerified },
    };
  }

  it('warns for verified rows older than 90 days, naming the row and source', () => {
    const stale = withVerifiedRow('2026-01-01'); // 237 days before `now`
    const warnings = collectRulesWarnings(stale, now);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('US.valuationBasis');
    expect(warnings[0]).toContain('237 days ago');
    expect(warnings[0]).toContain('https://');
  });

  it('stays quiet for fresh rows and for unverified rows', () => {
    const fresh = withVerifiedRow('2026-08-01');
    expect(collectRulesWarnings(fresh, now)).toHaveLength(0);
    // Seed files are all unverified: no staleness noise, they warn through
    // the calculator's unverified path instead.
    expect(collectRulesWarnings(getDestinationRules('US')!, now)).toHaveLength(0);
  });

  it('loadRulesFor bundles rules and warnings for CalcContext', () => {
    const { rules, rulesWarnings } = loadRulesFor('US', now);
    expect(rules?.country).toBe('US');
    expect(rulesWarnings).toEqual([]);
    expect(loadRulesFor('ZZ', now)).toEqual({ rules: null, rulesWarnings: [] });
  });
});
