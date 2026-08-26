import { describe, expect, it } from 'vitest';
import { calculateLandedCost } from '../calculate';
import type { BreakdownLine, LineKind } from '../types';
import { baseInput, CIFLAND, ctxFor, FOBLAND, UNVERIFIED_RATE_LAND } from './fixtures';

function line(lines: BreakdownLine[], kind: LineKind): BreakdownLine {
  const found = lines.find((l) => l.kind === kind);
  if (!found) throw new Error(`no ${kind} line`);
  return found;
}

describe('lanes', () => {
  it('domestic: import lines are exact zeros, shipping stays honestly unknown', () => {
    const out = calculateLandedCost(
      baseInput({ merchantCountry: 'US', destCountry: 'US', shipping: null }),
      ctxFor(null)
    );
    expect(out.lane).toBe('domestic');
    expect(line(out.lines, 'duty')).toMatchObject({ amountMinor: 0, confidence: 'exact' });
    expect(line(out.lines, 'tax')).toMatchObject({ amountMinor: 0, confidence: 'exact' });
    expect(line(out.lines, 'fee')).toMatchObject({ amountMinor: 0, confidence: 'exact' });
    expect(line(out.lines, 'shipping').amountMinor).toBeNull();
    expect(out.totalMinor).toBe(20_000); // item only
    expect(out.unknownComponents).toEqual(['shipping']);
    expect(out.assumptions.join(' ')).toContain('sales tax');
  });

  it('intra-EU: no duty, no import VAT, VAT-in-price assumption', () => {
    const out = calculateLandedCost(
      baseInput({ merchantCountry: 'DE', destCountry: 'FR', shipping: null }),
      ctxFor(null)
    );
    expect(out.lane).toBe('intra-eu');
    expect(line(out.lines, 'duty').amountMinor).toBe(0);
    expect(line(out.lines, 'tax').amountMinor).toBe(0);
    expect(out.assumptions.join(' ')).toContain('includes VAT');
  });

  it('unknown merchant country: import charges are unknown, never zero', () => {
    const out = calculateLandedCost(
      baseInput({ merchantCountry: undefined }),
      ctxFor(FOBLAND)
    );
    expect(out.lane).toBe('unknown');
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(line(out.lines, 'tax').amountMinor).toBeNull();
    expect(out.confidence).toBe('unknown');
  });
});

describe('duty relief vs tax threshold are SEPARATE (the crux)', () => {
  // FOBLAND: duty relief at $100.00 intrinsic, Test VAT threshold at $50.00.
  it('value between the thresholds: duty relieved, tax still charged', () => {
    const out = calculateLandedCost(baseInput({ priceMinor: 8_000 }), ctxFor(FOBLAND));
    expect(line(out.lines, 'duty').amountMinor).toBe(0);
    expect(line(out.lines, 'duty').basis).toContain('duty relief threshold');
    // base = customs value (80.00 FOB) + duty 0 + shipping 20.00 = 100.00 -> 20% = 20.00
    expect(line(out.lines, 'tax').amountMinor).toBe(2_000);
  });

  it('value under both: duty and tax both zero', () => {
    const out = calculateLandedCost(baseInput({ priceMinor: 4_000 }), ctxFor(FOBLAND));
    expect(line(out.lines, 'duty').amountMinor).toBe(0);
    expect(line(out.lines, 'tax').amountMinor).toBe(0);
    expect(line(out.lines, 'tax').basis).toContain('threshold');
  });

  it('value above both: duty and tax both charged, tax base includes duty', () => {
    const out = calculateLandedCost(baseInput({ priceMinor: 20_000 }), ctxFor(FOBLAND));
    // FOB customs value 200.00, default duty 5% = 10.00
    expect(line(out.lines, 'duty').amountMinor).toBe(1_000);
    // base = 200.00 + 10.00 + shipping 20.00 (FOBLAND taxes shipping) = 230.00 -> 20% = 46.00
    expect(line(out.lines, 'tax').amountMinor).toBe(4_600);
    // fee = 10.00 flat + 5% of (10.00 + 46.00) = 10.00 + 2.80
    expect(line(out.lines, 'fee').amountMinor).toBe(1_280);
    expect(out.totalMinor).toBe(20_000 + 2_000 + 1_000 + 4_600 + 1_280);
  });
});

describe('valuation basis is data', () => {
  it('CIF adds freight into the customs value and never re-taxes shipping', () => {
    const out = calculateLandedCost(baseInput({ destCountry: 'CF' }), ctxFor(CIFLAND));
    // customs value = 200.00 + 20.00 = 220.00; duty 8% = 17.60
    expect(line(out.lines, 'duty').amountMinor).toBe(1_760);
    // GST base = 220.00 + 17.60 (no extra shipping: already in CIF) = 237.60 -> 15% = 35.64
    expect(line(out.lines, 'tax').amountMinor).toBe(3_564);
    expect(out.assumptions.join(' ')).toContain('insurance');
    expect(line(out.lines, 'duty').confidence).toBe('estimated'); // CIF-without-insurance cap
  });

  it('CIF with unknown shipping makes duty and tax unknown, with a warning', () => {
    const out = calculateLandedCost(
      baseInput({ destCountry: 'CF', shipping: null }),
      ctxFor(CIFLAND)
    );
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(line(out.lines, 'tax').amountMinor).toBeNull();
    expect(out.warnings.join(' ')).toContain('CIF valuation');
  });

  it('merchant-collects regime: low-value import owes nothing at the border', () => {
    const out = calculateLandedCost(
      baseInput({ destCountry: 'CF', priceMinor: 5_000 }),
      ctxFor(CIFLAND)
    );
    expect(line(out.lines, 'tax').amountMinor).toBe(0);
    expect(line(out.lines, 'tax').confidence).toBe('estimated');
    expect(out.assumptions.join(' ')).toContain('collected');
    // CIFLAND has NO duty relief (verified none), so duty still applies:
    // customs value 50.00 + 20.00 = 70.00 -> 8% = 5.60
    expect(line(out.lines, 'duty').amountMinor).toBe(560);
  });
});

describe('HS classification flows into duty', () => {
  it('longest prefix match beats the default rate', () => {
    const out = calculateLandedCost(
      baseInput({ hs: { code: '640411', confidence: 'estimated', sourceId: 'category-map' } }),
      ctxFor(FOBLAND)
    );
    // footwear rate 10% of 200.00 = 20.00 (default would be 10.00)
    expect(line(out.lines, 'duty').amountMinor).toBe(2_000);
    expect(line(out.lines, 'duty').label).toContain('footwear');
    // classification is estimated, so the duty line can never be exact
    expect(line(out.lines, 'duty').confidence).toBe('estimated');
  });

  it('no HS code falls back to the default rate with a warning', () => {
    const out = calculateLandedCost(baseInput(), ctxFor(FOBLAND));
    expect(line(out.lines, 'duty').amountMinor).toBe(1_000);
    expect(out.warnings.join(' ')).toContain('No HS classification');
  });
});

describe('the legal guardrail: unverified or unfilled rules never render numbers', () => {
  it('unverified duty rate makes duty unknown and cascades into tax', () => {
    const out = calculateLandedCost(
      baseInput({ destCountry: 'UV' }),
      ctxFor(UNVERIFIED_RATE_LAND)
    );
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(line(out.lines, 'tax').amountMinor).toBeNull(); // base needs duty
    expect(out.warnings.join(' ')).toContain('unverified');
    expect(out.warnings.join(' ')).toContain('example.test'); // points at the source to check
    expect(out.confidence).toBe('unknown');
  });

  it('missing rules data for the destination leaves all import charges unknown', () => {
    const out = calculateLandedCost(baseInput({ destCountry: 'ZZ' }), ctxFor(null));
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(out.warnings.join(' ')).toContain('No customs rules data');
  });
});

describe('incoterms', () => {
  it('DDP zeroes import charges even with no rules data at all', () => {
    const out = calculateLandedCost(
      baseInput({ incoterm: 'DDP', destCountry: 'ZZ' }),
      ctxFor(null)
    );
    expect(line(out.lines, 'duty')).toMatchObject({ amountMinor: 0 });
    expect(line(out.lines, 'duty').label).toContain('prepaid');
    expect(out.totalMinor).toBe(22_000); // item + shipping only
    expect(out.totalRange).toBeUndefined();
  });

  it('unknown incoterm shows the DAP lines but ranges DDP-low to DAP-high', () => {
    const out = calculateLandedCost(baseInput({ incoterm: 'unknown' }), ctxFor(FOBLAND));
    expect(out.totalRange).toBeDefined();
    expect(out.totalRange!.lowMinor).toBe(22_000); // item + shipping, charges prepaid
    expect(out.totalRange!.highMinor).toBe(out.totalMinor);
    expect(out.totalRange!.highMinor).toBeGreaterThan(out.totalRange!.lowMinor);
    // never a point estimate: every import line is capped at estimated
    for (const kind of ['duty', 'tax', 'fee'] as const) {
      expect(line(out.lines, kind).confidence).toBe('estimated');
    }
    expect(out.confidence).not.toBe('exact');
  });
});

describe('output invariants', () => {
  it('totalMinor always equals the sum of known lines', () => {
    for (const input of [
      baseInput(),
      baseInput({ shipping: null }),
      baseInput({ incoterm: 'unknown' }),
      baseInput({ merchantCountry: undefined }),
      baseInput({ destCountry: 'CF' }),
    ]) {
      const out = calculateLandedCost(input, ctxFor(input.destination.country === 'CF' ? CIFLAND : FOBLAND));
      const sum = out.lines.reduce((acc, l) => acc + (l.amountMinor ?? 0), 0);
      expect(out.totalMinor).toBe(sum);
    }
  });

  it('is deterministic', () => {
    const a = calculateLandedCost(baseInput({ incoterm: 'unknown' }), ctxFor(FOBLAND));
    const b = calculateLandedCost(baseInput({ incoterm: 'unknown' }), ctxFor(FOBLAND));
    expect(a).toEqual(b);
  });

  it('passes loader warnings through', () => {
    const out = calculateLandedCost(
      baseInput(),
      ctxFor(FOBLAND, { rulesWarnings: ['FB rules older than 90 days'] })
    );
    expect(out.warnings).toContain('FB rules older than 90 days');
  });
});
