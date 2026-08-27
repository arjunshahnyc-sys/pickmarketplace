import { describe, expect, it } from 'vitest';
import { calculateLandedCost } from '../calculate';
import { fineCategoryFor } from '../classify/fineCategory';
import { typicalShippedWeight } from '../classify/weightEstimates';
import { buildLandedCostInput, estimateShipping } from '../enrich';
import { FixtureFxProvider } from '../fx';
import { isTopSlotEligible } from '../rank';
import { EU_MEMBERSHIP } from '../rules/eu';
import { loadRulesFor } from '../rules/loader';
import { collectShippingWarnings, getShippingEstimateRoute } from '../rules/shippingEstimates';
import type { ShippingEstimateRoute } from '../types';
import { baseInput, CIFLAND, ctxFor, sourced, unverified } from './fixtures';

const FIXTURE_ROUTE: ShippingEstimateRoute = {
  origin: 'US',
  destination: 'GB',
  currency: 'USD',
  service: 'Test Post International',
  bands: [
    { maxGrams: 454, costMinor: sourced(2_500) },
    { maxGrams: 908, costMinor: sourced(3_200) },
    { maxGrams: 2_268, costMinor: sourced(3_800) },
  ],
  meta: { sourceUrl: 'https://example.test/fixture' },
};
const TABLE = { 'US:GB': FIXTURE_ROUTE };

describe('typicalShippedWeight', () => {
  it('covers the parcel-sized curated categories and normalizes lookups', () => {
    expect(typicalShippedWeight('shoes')?.grams).toBe(1_500);
    expect(typicalShippedWeight('Coffee-Makers')?.grams).toBe(4_000);
    expect(typicalShippedWeight('gaming-mice')?.grams).toBe(350);
  });

  it('refuses freight-class and ambiguous categories', () => {
    expect(typicalShippedWeight('tvs')).toBeNull();
    expect(typicalShippedWeight('monitors')).toBeNull();
    expect(typicalShippedWeight('Electronics')).toBeNull();
    expect(typicalShippedWeight(undefined)).toBeNull();
  });
});

describe('estimateShipping', () => {
  it('picks the band the typical weight falls in and labels everything', () => {
    const est = estimateShipping('shoes', 'US', 'GB', TABLE)!; // 1500 g -> 2268 band
    expect(est.costMinor).toBe(3_800);
    expect(est.confidence).toBe('estimated');
    expect(est.sourceId).toBe('shipping-estimate:US:GB:2268g');
    expect(est.basis).toContain('boxed shoes');
    expect(est.assumption).toContain('actual shipping charge will differ');
    expect(estimateShipping('gaming-mice', 'US', 'GB', TABLE)!.costMinor).toBe(2_500);
  });

  it('yields nothing for domestic, unknown merchants, missing routes, or overweight items', () => {
    expect(estimateShipping('shoes', 'US', 'US', TABLE)).toBeUndefined();
    expect(estimateShipping('shoes', undefined, 'GB', TABLE)).toBeUndefined();
    expect(estimateShipping('shoes', 'US', 'JP', TABLE)).toBeUndefined();
    expect(estimateShipping('coffee-makers', 'US', 'GB', TABLE)).toBeUndefined(); // 4000 g > last band
  });

  it('an unverified band yields no estimate (the guardrail for future edits)', () => {
    const seeded = {
      'US:GB': {
        ...FIXTURE_ROUTE,
        bands: [{ maxGrams: 2_268, costMinor: unverified<number>() }],
      },
    };
    expect(estimateShipping('shoes', 'US', 'GB', seeded)).toBeUndefined();
  });

  it('the real encoded table serves the blended USPS benchmark (owner-approved 2026-08-27)', () => {
    // Boxed shoes at 1500 g land on the FCPIS 4 lb band, not PMI 5 lb.
    const shoes = estimateShipping('shoes', 'US', 'GB')!;
    expect(shoes.costMinor).toBe(6_425);
    expect(shoes.sourceId).toBe('shipping-estimate:US:GB:1814g');
    // Headphones at 700 g land on FCPIS 2 lb.
    expect(estimateShipping('headphones', 'US', 'GB')!.costMinor).toBe(3_570);
    // Heavy categories fall through to PMI: coffee makers 4000 g -> 10 lb.
    expect(estimateShipping('coffee-makers', 'US', 'CA')!.costMinor).toBe(8_625);
    expect(getShippingEstimateRoute('US', 'GB')).not.toBeNull();
  });
});

describe('estimated shipping flows through the calculation', () => {
  it('caps the shipping line AND the CIF customs value it feeds', () => {
    const input = baseInput({ destCountry: 'CF', shipping: null });
    input.shipping = estimateShipping('shoes', 'US', 'GB', TABLE); // fixture estimate, USD
    const out = calculateLandedCost(input, ctxFor(CIFLAND));
    const shipping = out.lines.find((l) => l.kind === 'shipping')!;
    expect(shipping.amountMinor).toBe(3_800);
    expect(shipping.confidence).toBe('estimated');
    expect(shipping.basis).toContain('Test Post International');
    expect(out.assumptions.join(' ')).toContain('actual shipping charge will differ');
    // CIF customs value = 200.00 + 38.00 = 238.00; duty 8% = 19.04, and the
    // line is estimated because the value it is computed from is.
    const duty = out.lines.find((l) => l.kind === 'duty')!;
    expect(duty.amountMinor).toBe(1_904);
    expect(duty.confidence).toBe('estimated');
    expect(out.unknownComponents).toEqual([]);
  });

  it('GB above GBP 135 becomes a full real-rules estimate with estimated shipping', () => {
    const { rules, rulesWarnings } = loadRulesFor('GB', new Date('2026-08-26T00:00:00Z'));
    const fx = new FixtureFxProvider(
      { 'USD:GBP': { midMicros: 790_000, asOf: '2026-08-26T00:00:00Z' } },
      { spreadBps: 0 }
    );
    const out = calculateLandedCost(
      {
        item: {
          priceMinor: 30_000,
          currency: 'USD',
          hs: { code: '6404', confidence: 'estimated', sourceId: 'category-map:shoes' },
        },
        merchant: { id: 'target', country: 'US', incoterm: 'DAP', configConfidence: 'estimated' },
        shipping: estimateShipping('shoes', 'US', 'GB', TABLE),
        destination: { country: 'GB', currency: 'GBP' },
      },
      { rules, eu: EU_MEMBERSHIP, fx, rulesWarnings }
    );
    // item 237.00 + shipping 30.02; CIF customs value 267.02
    // duty 16% = 42.72; VAT 20% of (267.02 + 42.72) = 61.95; RM fee 8.00
    expect(out.lines.find((l) => l.kind === 'item')!.amountMinor).toBe(23_700);
    expect(out.lines.find((l) => l.kind === 'shipping')!.amountMinor).toBe(3_002);
    expect(out.lines.find((l) => l.kind === 'duty')!.amountMinor).toBe(4_272);
    expect(out.lines.find((l) => l.kind === 'tax')!.amountMinor).toBe(6_195);
    expect(out.lines.find((l) => l.kind === 'fee')!.amountMinor).toBe(800);
    expect(out.totalMinor).toBe(23_700 + 3_002 + 4_272 + 6_195 + 800);
    expect(out.unknownComponents).toEqual([]);
    expect(out.confidence).toBe('estimated');
    expect(isTopSlotEligible(out)).toBe(true);
  });
});

describe('fineCategoryFor', () => {
  it('re-derives curated keys from names the feed collapses into Electronics', () => {
    expect(fineCategoryFor('Sony WH-1000XM5 Wireless Headphones', 'Electronics')).toBe('headphones');
    expect(fineCategoryFor('Apple iPhone 16 Pro', 'Electronics')).toBe('phones');
    expect(fineCategoryFor('Samsung 55" 4K Smart TV', 'Electronics')).toBe('tvs');
    expect(fineCategoryFor('Apple Watch Series 11', 'Electronics')).toBe('smartwatches');
    expect(fineCategoryFor('Seiko 5 Automatic Watch', 'Other')).toBe('watches');
  });

  it('falls back to the feed category, inventing nothing', () => {
    expect(fineCategoryFor('Stanley Quencher H2.0 Tumbler', 'Kitchen')).toBe('Kitchen');
    expect(fineCategoryFor('Mystery Item', undefined)).toBeUndefined();
  });

  it('the end-to-end gap the browser caught: Electronics-bucketed headphones classify and estimate', () => {
    const input = buildLandedCostInput(
      {
        id: 'p1',
        name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
        price: 328,
        image: '',
        retailer: 'Target',
        category: 'Electronics', // what guessCategory actually emits
        url: 'https://example.test/p1',
      },
      { country: 'JP', currency: 'JPY' }
    )!;
    expect(input.item.hs).toMatchObject({ code: '8518' });
    expect(input.shipping).toMatchObject({ costMinor: 3_790, confidence: 'estimated' });
  });
});

describe('the Japan unlock', () => {
  it('an estimated shipping line makes the customs-value threshold decidable end to end', () => {
    // $50 headphones to JP at 1 USD = 147 JPY: item 7,350 yen + estimated
    // FCPIS 2 lb shipping $37.90 -> 5,571 yen. CIF customs value 12,921 yen
    // is OVER the 10,000-yen exemption, so real charges compute: duty 0%
    // (heading 8518 verified Free), consumption tax 10% of 12,921 = 1,292,
    // Japan Post fee 200 yen since charges are due.
    const { rules, rulesWarnings } = loadRulesFor('JP', new Date('2026-08-27T00:00:00Z'));
    const fx = new FixtureFxProvider(
      { 'USD:JPY': { midMicros: 147_000_000, asOf: '2026-08-27T00:00:00Z' } },
      { spreadBps: 0 }
    );
    const out = calculateLandedCost(
      {
        item: {
          priceMinor: 5_000,
          currency: 'USD',
          hs: { code: '8518', confidence: 'estimated', sourceId: 'category-map:headphones' },
        },
        merchant: { id: 'target', country: 'US', incoterm: 'DAP', configConfidence: 'estimated' },
        shipping: estimateShipping('headphones', 'US', 'JP'),
        destination: { country: 'JP', currency: 'JPY' },
      },
      { rules, eu: EU_MEMBERSHIP, fx, rulesWarnings }
    );
    const line = (k: string) => out.lines.find((l) => l.kind === k)!;
    expect(line('item').amountMinor).toBe(7_350);
    expect(line('shipping').amountMinor).toBe(5_571);
    expect(line('duty').amountMinor).toBe(0);
    expect(line('tax').amountMinor).toBe(1_292);
    expect(line('fee').amountMinor).toBe(200);
    expect(out.totalMinor).toBe(7_350 + 5_571 + 0 + 1_292 + 200);
    expect(out.unknownComponents).toEqual([]);
    expect(isTopSlotEligible(out)).toBe(true);
  });
});

describe('collectShippingWarnings', () => {
  it('flags verified bands older than the max age', () => {
    const stale: ShippingEstimateRoute = {
      ...FIXTURE_ROUTE,
      bands: [{ maxGrams: 454, costMinor: { ...sourced(2_500), lastVerified: '2026-01-01' } }],
    };
    const warnings = collectShippingWarnings(stale, new Date('2026-08-26T00:00:00Z'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('US:GB');
    expect(warnings[0]).toContain('237 days ago');
    const fresh: ShippingEstimateRoute = {
      ...FIXTURE_ROUTE,
      bands: FIXTURE_ROUTE.bands.map((b) => ({
        ...b,
        costMinor: { ...b.costMinor, lastVerified: '2026-08-01' },
      })),
    };
    expect(collectShippingWarnings(fresh, new Date('2026-08-26T00:00:00Z'))).toHaveLength(0);
  });
});
