import { describe, expect, it } from 'vitest';
import { calculateLandedCost } from '../calculate';
import type { BreakdownLine, DestinationRules, LineKind } from '../types';
import { baseInput, CIFLAND, ctxFor, FOBLAND, sourced, UNVERIFIED_RATE_LAND } from './fixtures';

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

describe('origin-specific duty rows', () => {
  const ORIGINLAND: DestinationRules = {
    ...FOBLAND,
    country: 'OG',
    dutyRates: [
      { hsPrefix: 'default', label: 'Import duty', rateBps: sourced(500) },
      {
        hsPrefix: 'default',
        originCountry: 'CN',
        label: 'Import duty (CN origin, combined rate)',
        rateBps: sourced(3_000),
      },
    ],
  };

  function inputWithOrigin(origin?: string) {
    const input = baseInput({ destCountry: 'OG' });
    return { ...input, item: { ...input.item, originCountry: origin } };
  }

  it('matching origin beats the generic row at equal prefix length', () => {
    const out = calculateLandedCost(inputWithOrigin('CN'), ctxFor(ORIGINLAND));
    // 30% of 200.00 instead of the generic 5%
    expect(line(out.lines, 'duty').amountMinor).toBe(6_000);
    expect(line(out.lines, 'duty').sourceId).toBe('OG.dutyRates.default:CN');
  });

  it('non-matching origin uses the generic row', () => {
    const out = calculateLandedCost(inputWithOrigin('VN'), ctxFor(ORIGINLAND));
    expect(line(out.lines, 'duty').amountMinor).toBe(1_000);
    expect(line(out.lines, 'duty').sourceId).toBe('OG.dutyRates.default');
  });

  it('with no explicit origin, the merchant country stands in', () => {
    // merchant is US in baseInput, so the CN row must not fire
    const out = calculateLandedCost(inputWithOrigin(undefined), ctxFor(ORIGINLAND));
    expect(line(out.lines, 'duty').amountMinor).toBe(1_000);
    expect(out.assumptions.join(' ')).toContain('non-preferential origin');
  });
});

describe('relief exclusions (excludedHsPrefixes)', () => {
  const EXCLUSIONLAND: DestinationRules = {
    ...FOBLAND,
    country: 'EX',
    dutyRelief: sourced({
      kind: 'threshold' as const,
      amountMinor: 10_000,
      basis: 'intrinsic-goods-value' as const,
      excludedHsPrefixes: ['6404'],
    }),
    importTax: {
      ...FOBLAND.importTax,
      threshold: sourced({
        kind: 'threshold' as const,
        amountMinor: 10_000,
        basis: 'intrinsic-goods-value' as const,
        belowThreshold: 'no-import-tax' as const,
        excludedHsPrefixes: ['6404'],
      }),
    },
  };
  const hs = (code: string) => ({ code, confidence: 'estimated' as const, sourceId: 'test' });

  it('an excluded category under the threshold still pays duty and tax', () => {
    const out = calculateLandedCost(
      baseInput({ priceMinor: 8_000, hs: hs('640411') }),
      ctxFor(EXCLUSIONLAND)
    );
    // footwear rate 10% of FOB 80.00 = 8.00; tax 20% of (80 + 8 + 20 shipping)
    expect(line(out.lines, 'duty').amountMinor).toBe(800);
    expect(line(out.lines, 'tax').amountMinor).toBe(2_160);
  });

  it('a non-excluded category is relieved, capped by classification confidence', () => {
    const out = calculateLandedCost(
      baseInput({ priceMinor: 8_000, hs: hs('851800') }),
      ctxFor(EXCLUSIONLAND)
    );
    expect(line(out.lines, 'duty')).toMatchObject({ amountMinor: 0, confidence: 'estimated' });
    expect(line(out.lines, 'tax')).toMatchObject({ amountMinor: 0, confidence: 'estimated' });
  });

  it('no HS classification makes relief undecidable: unknown, never a guessed zero', () => {
    const out = calculateLandedCost(baseInput({ priceMinor: 8_000 }), ctxFor(EXCLUSIONLAND));
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(line(out.lines, 'tax').amountMinor).toBeNull();
    expect(out.warnings.join(' ')).toContain('excludes some product categories');
  });

  it('matches mutually: a heading-level code hits a subheading-level exclusion', () => {
    const subheadingLand: DestinationRules = {
      ...EXCLUSIONLAND,
      dutyRelief: sourced({
        kind: 'threshold' as const,
        amountMinor: 10_000,
        basis: 'intrinsic-goods-value' as const,
        excludedHsPrefixes: ['640420'],
      }),
    };
    const out = calculateLandedCost(
      baseInput({ priceMinor: 8_000, hs: hs('6404') }),
      ctxFor(subheadingLand)
    );
    // Possibly-excluded errs toward computing duty, not toward a wrong zero.
    expect(line(out.lines, 'duty').amountMinor).toBe(800);
  });
});

describe('flat-below-threshold duty (EU transitional regime shape)', () => {
  const FLATLAND: DestinationRules = {
    ...FOBLAND,
    country: 'FL',
    dutyRelief: sourced({
      kind: 'flat-below-threshold' as const,
      amountMinor: 15_000,
      basis: 'intrinsic-goods-value' as const,
      flatDutyMinorPerItem: 300,
    }),
  };

  it('at or under the threshold: flat per-item duty, stated as single-item', () => {
    const out = calculateLandedCost(baseInput({ priceMinor: 10_000 }), ctxFor(FLATLAND));
    expect(line(out.lines, 'duty').amountMinor).toBe(300);
    expect(line(out.lines, 'duty').basis).toContain('Flat');
    expect(out.assumptions.join(' ')).toContain('single-item consignment');
    // duty feeds the tax base: (100 + 3 + 20 shipping) x 20% = 24.60
    expect(line(out.lines, 'tax').amountMinor).toBe(2_460);
  });

  it('above the threshold: normal ad valorem rates resume', () => {
    const out = calculateLandedCost(baseInput({ priceMinor: 20_000 }), ctxFor(FLATLAND));
    expect(line(out.lines, 'duty').amountMinor).toBe(1_000); // default 5%
  });

  it('respects exclusions: carved-out categories pay ad valorem, unclassified is undecidable', () => {
    const withExclusions: DestinationRules = {
      ...FLATLAND,
      dutyRelief: sourced({
        kind: 'flat-below-threshold' as const,
        amountMinor: 15_000,
        basis: 'intrinsic-goods-value' as const,
        flatDutyMinorPerItem: 300,
        excludedHsPrefixes: ['6404'],
      }),
    };
    const excluded = calculateLandedCost(
      baseInput({ priceMinor: 10_000, hs: { code: '640411', confidence: 'estimated', sourceId: 't' } }),
      ctxFor(withExclusions)
    );
    expect(line(excluded.lines, 'duty').amountMinor).toBe(1_000); // footwear 10%
    const unclassified = calculateLandedCost(baseInput({ priceMinor: 10_000 }), ctxFor(withExclusions));
    expect(line(unclassified.lines, 'duty').amountMinor).toBeNull();
  });
});

describe('verified zero tax rate', () => {
  it('a 0% rate makes tax exactly zero even when duty is unknown', () => {
    const NOVATLAND: DestinationRules = {
      ...UNVERIFIED_RATE_LAND, // duty rate unfilled -> duty unknown
      country: 'NV',
      importTax: { ...UNVERIFIED_RATE_LAND.importTax, rateBps: sourced(0) },
    };
    const out = calculateLandedCost(baseInput({ destCountry: 'NV' }), ctxFor(NOVATLAND));
    expect(line(out.lines, 'duty').amountMinor).toBeNull();
    expect(line(out.lines, 'tax')).toMatchObject({ amountMinor: 0, confidence: 'exact' });
    expect(line(out.lines, 'tax').basis).toContain('0% rate');
  });
});

describe('intrinsic-basis relief without a customs value', () => {
  it('CIF destination with unknown shipping can still relieve duty on intrinsic value', () => {
    const CIF_INTRINSIC: DestinationRules = {
      ...CIFLAND,
      country: 'CI',
      dutyRelief: sourced({
        kind: 'threshold' as const,
        amountMinor: 10_000,
        basis: 'intrinsic-goods-value' as const,
      }),
    };
    // 80.00 item: relief (intrinsic <= 100.00) decides duty = 0 even though
    // the CIF customs value is unknown; tax (above its 75.00 merchant
    // threshold) still needs the customs value, so it stays unknown.
    const out = calculateLandedCost(
      baseInput({ destCountry: 'CI', priceMinor: 8_000, shipping: null }),
      ctxFor(CIF_INTRINSIC)
    );
    expect(line(out.lines, 'duty').amountMinor).toBe(0);
    expect(line(out.lines, 'tax').amountMinor).toBeNull();
  });
});

describe('conditional carrier fees', () => {
  const feeRow = (extra: object): DestinationRules => ({
    ...FOBLAND,
    country: 'FE',
    carrierFees: [
      { carrier: 'default', label: 'Processing fee', flatMinor: sourced(1_000), ...extra },
    ],
  });

  it('appliesAboveMinor: zero at or under the value threshold, flat above it', () => {
    const rules = feeRow({ appliesAboveMinor: 15_000 });
    const under = calculateLandedCost(baseInput({ priceMinor: 12_000 }), ctxFor(rules));
    expect(line(under.lines, 'fee')).toMatchObject({ amountMinor: 0 });
    expect(line(under.lines, 'fee').basis).toContain('at or under');
    const over = calculateLandedCost(baseInput({ priceMinor: 20_000 }), ctxFor(rules));
    expect(line(over.lines, 'fee').amountMinor).toBe(1_000);
  });

  it('appliesAboveMinor with unknown customs value makes the fee unknown', () => {
    const rules: DestinationRules = {
      ...CIFLAND,
      country: 'FE',
      carrierFees: [
        { carrier: 'default', label: 'Processing fee', flatMinor: sourced(1_000), appliesAboveMinor: 15_000 },
      ],
    };
    const out = calculateLandedCost(baseInput({ destCountry: 'FE', shipping: null }), ctxFor(rules));
    expect(line(out.lines, 'fee').amountMinor).toBeNull();
  });

  it('onlyWhenChargesDue: zero when duty and tax are zero, flat when charges exist, unknown when they are', () => {
    const rules = feeRow({ onlyWhenChargesDue: true });
    // 40.00 item: under both FOBLAND thresholds -> duty 0, tax 0 -> fee 0
    const relieved = calculateLandedCost(baseInput({ priceMinor: 4_000 }), ctxFor(rules));
    expect(line(relieved.lines, 'fee')).toMatchObject({ amountMinor: 0 });
    expect(line(relieved.lines, 'fee').basis).toContain('No import charges');
    // 200.00 item: duty and tax due -> flat fee applies
    const charged = calculateLandedCost(baseInput({ priceMinor: 20_000 }), ctxFor(rules));
    expect(line(charged.lines, 'fee').amountMinor).toBe(1_000);
    // unknown duty -> unknown fee
    const unknownRules: DestinationRules = {
      ...UNVERIFIED_RATE_LAND,
      country: 'FE',
      carrierFees: [
        { carrier: 'default', label: 'Processing fee', flatMinor: sourced(1_000), onlyWhenChargesDue: true },
      ],
    };
    const unknown = calculateLandedCost(baseInput({ destCountry: 'FE' }), ctxFor(unknownRules));
    expect(line(unknown.lines, 'fee').amountMinor).toBeNull();
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
