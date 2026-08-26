// End-to-end checks against the REAL encoded destination rules (verified
// 2026-08-26), with pinned fixture FX. These document exactly what the
// engine can and cannot compute per destination while per-HS duty rates
// remain unfilled — the "cannot" cases must stay honest unknowns.

import { describe, expect, it } from 'vitest';
import { calculateLandedCost, type CalcContext } from '../calculate';
import { summarizeTotal } from '../enrich';
import { FixtureFxProvider } from '../fx';
import { isTopSlotEligible } from '../rank';
import { EU_MEMBERSHIP } from '../rules/eu';
import { loadRulesFor } from '../rules/loader';
import type { BreakdownLine, LandedCostInput, LineKind } from '../types';

const NOW = new Date('2026-08-26T00:00:00Z');

const FX = new FixtureFxProvider(
  {
    'USD:GBP': { midMicros: 790_000, asOf: '2026-08-26T00:00:00Z' },
    'USD:CAD': { midMicros: 1_350_000, asOf: '2026-08-26T00:00:00Z' },
    'USD:AUD': { midMicros: 1_500_000, asOf: '2026-08-26T00:00:00Z' },
    'USD:JPY': { midMicros: 147_000_000, asOf: '2026-08-26T00:00:00Z' },
    'USD:EUR': { midMicros: 900_000, asOf: '2026-08-26T00:00:00Z' },
  },
  { spreadBps: 0 }
);

function ctx(country: string): CalcContext {
  const { rules, rulesWarnings } = loadRulesFor(country, NOW);
  return { rules, eu: EU_MEMBERSHIP, fx: FX, rulesWarnings };
}

function input(over: {
  priceMinor: number;
  destCountry: string;
  destCurrency: string;
  hsCode?: string;
  merchantCountry?: string;
}): LandedCostInput {
  return {
    item: {
      priceMinor: over.priceMinor,
      currency: 'USD',
      hs: over.hsCode
        ? { code: over.hsCode, confidence: 'estimated', sourceId: 'category-map' }
        : undefined,
    },
    merchant: {
      id: 'target',
      country: over.merchantCountry ?? 'US',
      incoterm: 'DAP',
      configConfidence: 'estimated',
    },
    shipping: undefined, // never available from our sources
    destination: { country: over.destCountry, currency: over.destCurrency },
  };
}

function line(lines: BreakdownLine[], kind: LineKind): BreakdownLine {
  return lines.find((l) => l.kind === kind)!;
}

describe('real rules, fresh as of 2026-08-26', () => {
  it('US domestic: full subtotal, no staleness warnings', () => {
    const out = calculateLandedCost(
      input({ priceMinor: 20_000, destCountry: 'US', destCurrency: 'USD' }),
      ctx('US')
    );
    expect(out.lane).toBe('domestic');
    expect(out.totalMinor).toBe(20_000);
    expect(out.warnings.some((w) => w.includes('last verified'))).toBe(false);
  });

  it('GB under GBP 135: duty relieved, VAT merchant-collects, no fee — a real cross-border estimate', () => {
    // $100 -> 79.00 GBP intrinsic, under the 135.00 threshold
    const out = calculateLandedCost(
      input({ priceMinor: 10_000, destCountry: 'GB', destCurrency: 'GBP' }),
      ctx('GB')
    );
    expect(line(out.lines, 'item').amountMinor).toBe(7_900);
    expect(line(out.lines, 'duty')).toMatchObject({ amountMinor: 0 });
    expect(line(out.lines, 'duty').basis).toContain('duty relief threshold');
    expect(line(out.lines, 'tax')).toMatchObject({ amountMinor: 0 });
    expect(out.assumptions.join(' ')).toContain('collected Import VAT at checkout');
    expect(line(out.lines, 'fee')).toMatchObject({ amountMinor: 0 });
    expect(out.totalMinor).toBe(7_900);
    expect(isTopSlotEligible(out)).toBe(true);
    expect(summarizeTotal(out)).toMatchObject({ kind: 'subtotal', missing: ['shipping'] });
  });

  it('GB over GBP 135: honestly unavailable while duty rates are unfilled', () => {
    const out = calculateLandedCost(
      input({ priceMinor: 30_000, destCountry: 'GB', destCurrency: 'GBP' }),
      ctx('GB')
    );
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(line(out.lines, 'tax').amountMinor).toBeNull();
    expect(summarizeTotal(out).kind).toBe('unavailable');
    expect(isTopSlotEligible(out)).toBe(false);
  });

  it('CA between CAD 40 and 150: duty relieved, real 5% GST, real handling fee', () => {
    // $80 -> CAD 108.00: above the 40.00 tax threshold, under the 150.00 duty one
    const out = calculateLandedCost(
      input({ priceMinor: 8_000, destCountry: 'CA', destCurrency: 'CAD' }),
      ctx('CA')
    );
    expect(line(out.lines, 'item').amountMinor).toBe(10_800);
    expect(line(out.lines, 'duty').amountMinor).toBe(0);
    // GST base is duty-paid value (10800 + 0), shipping excluded: 5% = 540
    expect(line(out.lines, 'tax').amountMinor).toBe(540);
    expect(line(out.lines, 'fee').amountMinor).toBe(995); // charges due -> Canada Post fee
    expect(out.totalMinor).toBe(10_800 + 540 + 995);
    expect(isTopSlotEligible(out)).toBe(true);
  });

  it('CA under CAD 40: everything relieved, fee waived', () => {
    // $25 -> CAD 33.75
    const out = calculateLandedCost(
      input({ priceMinor: 2_500, destCountry: 'CA', destCurrency: 'CAD' }),
      ctx('CA')
    );
    expect(line(out.lines, 'duty').amountMinor).toBe(0);
    expect(line(out.lines, 'tax').amountMinor).toBe(0);
    expect(line(out.lines, 'fee').amountMinor).toBe(0);
    expect(line(out.lines, 'fee').basis).toContain('No import charges');
  });

  it('AU under AUD 1,000 with a classified product: relieved, vendor GST, no processing charge', () => {
    // $200 -> AUD 300.00, shoes (6404): not in the tobacco/alcohol exclusions
    const out = calculateLandedCost(
      input({ priceMinor: 20_000, destCountry: 'AU', destCurrency: 'AUD', hsCode: '6404' }),
      ctx('AU')
    );
    expect(line(out.lines, 'duty')).toMatchObject({ amountMinor: 0, confidence: 'estimated' });
    expect(line(out.lines, 'tax').amountMinor).toBe(0);
    expect(out.assumptions.join(' ')).toContain('collected GST at checkout');
    expect(line(out.lines, 'fee')).toMatchObject({ amountMinor: 0 });
    expect(line(out.lines, 'fee').basis).toContain('at or under');
    expect(isTopSlotEligible(out)).toBe(true);
  });

  it('AU without classification: relief is undecidable because of the excise carve-outs', () => {
    const out = calculateLandedCost(
      input({ priceMinor: 20_000, destCountry: 'AU', destCurrency: 'AUD' }),
      ctx('AU')
    );
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(out.warnings.join(' ')).toContain('excludes some product categories');
  });

  it('JP: customs-value threshold is undecidable while shipping is unknown', () => {
    const out = calculateLandedCost(
      input({ priceMinor: 5_000, destCountry: 'JP', destCurrency: 'JPY', hsCode: '8518' }),
      ctx('JP')
    );
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(out.warnings.join(' ')).toContain('customs-value, which is unknown');
    expect(summarizeTotal(out).kind).toBe('unavailable');
  });

  it('DE under EUR 150: flat EUR 3 duty, IOSS-collected VAT, handling fee — a full estimate', () => {
    // $100 -> EUR 90.00 intrinsic: flat-fee band. Duty EUR 3.00, VAT
    // merchant-collected (assumed), Deutsche Post fee applies since duty is
    // due at the border.
    const out = calculateLandedCost(
      input({ priceMinor: 10_000, destCountry: 'DE', destCurrency: 'EUR' }),
      ctx('DE')
    );
    expect(line(out.lines, 'duty').amountMinor).toBe(300);
    expect(line(out.lines, 'duty').basis).toContain('Flat');
    expect(line(out.lines, 'tax').amountMinor).toBe(0);
    expect(line(out.lines, 'fee').amountMinor).toBe(750);
    expect(out.totalMinor).toBe(9_000 + 300 + 750);
    expect(out.assumptions.join(' ')).toContain('single-item consignment');
    expect(isTopSlotEligible(out)).toBe(true);
    expect(summarizeTotal(out)).toMatchObject({ kind: 'subtotal', missing: ['shipping'] });
  });

  it('DE over EUR 150: ad valorem band, honestly unavailable until TARIC rates land', () => {
    const out = calculateLandedCost(
      input({ priceMinor: 30_000, destCountry: 'DE', destCurrency: 'EUR' }),
      ctx('DE')
    );
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(summarizeTotal(out).kind).toBe('unavailable');
  });

  it('intra-EU with the verified membership table is exact, no membership warning', () => {
    const out = calculateLandedCost(
      input({ priceMinor: 10_000, destCountry: 'FR', destCurrency: 'EUR', merchantCountry: 'DE' }),
      ctx('FR')
    );
    expect(out.lane).toBe('intra-eu');
    expect(out.warnings.some((w) => w.includes('membership'))).toBe(false);
    expect(line(out.lines, 'duty').confidence).toBe('estimated'); // merchant config confidence
  });
});
