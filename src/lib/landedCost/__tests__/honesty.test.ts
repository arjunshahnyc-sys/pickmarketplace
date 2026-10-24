import { describe, expect, it } from 'vitest';
import { badgeFor, headlineFor, panelLines } from '@/components/LandedCostPanel';
import type { MerchantShippingPolicy } from '../../trust/registry';
import { calculateLandedCost } from '../calculate';
import { allCrossPairsMicros } from '../ecb';
import {
  buildLandedCostInput,
  clearBreakdownCacheForTests,
  resolveShipping,
  shippingGapReason,
  summarizeTotal,
  withLandedCosts,
  type TotalSummary,
} from '../enrich';
import { NullFxProvider, TableFxProvider } from '../fx';
import { totalResolution } from '../rank';
import { EU_MEMBERSHIP } from '../rules/eu';
import { loadRulesFor } from '../rules/loader';
import type { LandedCostBreakdown, LandedCostInput } from '../types';
import type { Product as FeedProduct } from '../../types';

// The credibility contract, as tests: no fallback path may emit a
// fabricated number, missing data must surface as unavailable or a NAMED
// partial (never a silent zero), and stale cached results expire instead of
// being served as fresh.

const NOW = new Date('2026-09-01T00:00:00Z');

function usInput(over: Partial<LandedCostInput['item']> = {}, subdivision?: string): LandedCostInput {
  return {
    item: { priceMinor: 10_000, currency: 'USD', ...over },
    merchant: { id: 'target', country: 'US', incoterm: 'unknown', configConfidence: 'estimated' },
    shipping: undefined,
    destination: { country: 'US', currency: 'USD', subdivision },
  };
}

function usCtx() {
  const { rules, rulesWarnings } = loadRulesFor('US', NOW);
  return { rules, eu: EU_MEMBERSHIP, fx: new NullFxProvider(), rulesWarnings };
}

const verifiedRow = <T,>(value: T) => ({
  value,
  sourceUrl: 'https://example.test/policy',
  lastVerified: '2026-08-31',
  verification: 'verified' as const,
});

function policy(over: Partial<MerchantShippingPolicy> = {}): MerchantShippingPolicy {
  return {
    market: 'us',
    currency: 'USD',
    policyUrl: 'https://example.test/policy',
    ...over,
  };
}

describe('shipping hierarchy: no tier invents a number', () => {
  const base = {
    categoryId: undefined,
    merchantCountry: 'US',
    destinationCountry: 'US',
    itemPriceMinor: 10_000,
    itemCurrency: 'USD',
    now: NOW,
  };

  it('nothing resolves -> undefined, not a default', () => {
    // No policy, no category weight: every tier exhausts and the answer is
    // undefined. There is deliberately no heuristic tier to catch this.
    expect(resolveShipping({ ...base })).toBeUndefined();
    expect(resolveShipping({ ...base, merchantCountry: undefined })).toBeUndefined();
    // Non-US origins have no benchmark routes (owner scope 2026-09-01).
    expect(
      resolveShipping({ ...base, merchantCountry: 'GB', destinationCountry: 'GB', categoryId: 'shoes' })
    ).toBeUndefined();
  });

  it('unverified policy rows never produce a figure', () => {
    const unverified = policy({
      freeOverMinor: { ...verifiedRow(3500), verification: 'unverified' },
      flatBelowMinor: { ...verifiedRow(599), verification: 'unverified' },
    });
    // Falls through the policy tier entirely; no category weight, so no
    // benchmark either: undefined.
    expect(resolveShipping({ ...base, policy: unverified })).toBeUndefined();
  });

  it('a policy below its threshold with no published flat rate falls through', () => {
    const freeOverOnly = policy({ freeOverMinor: verifiedRow(3500) });
    expect(
      resolveShipping({ ...base, itemPriceMinor: 2_000, policy: freeOverOnly })
    ).toBeUndefined();
    // At or over the threshold it resolves to a real 0 from the policy.
    expect(
      resolveShipping({ ...base, itemPriceMinor: 3_500, policy: freeOverOnly })
    ).toMatchObject({ costMinor: 0, confidence: 'estimated' });
  });

  it('policies apply only to the US domestic lane they were published for', () => {
    const p = policy({ freeOverMinor: verifiedRow(3500) });
    expect(
      resolveShipping({ ...base, destinationCountry: 'GB', policy: p })
    ).toBeUndefined();
  });

  it('a stale policy still resolves but carries a re-verification warning', () => {
    const stale = policy({
      freeOverMinor: { ...verifiedRow(3500), lastVerified: '2026-05-01' },
    });
    const resolved = resolveShipping({ ...base, policy: stale })!;
    expect(resolved.costMinor).toBe(0);
    expect(resolved.warning).toContain('last verified');
    // The warning reaches the breakdown the shopper can expand.
    const input = usInput();
    input.shipping = resolved;
    const out = calculateLandedCost(input, usCtx());
    expect(out.warnings.join(' ')).toContain('last verified');
  });
});

describe('sales tax: missing data is a named gap, never a silent zero', () => {
  it('no delivery state -> tax line is null, not zero', () => {
    const out = calculateLandedCost(usInput(), usCtx());
    const tax = out.lines.find((l) => l.kind === 'tax')!;
    expect(tax.amountMinor).toBeNull();
    expect(out.unknownComponents).toContain('tax');
    expect(summarizeTotal(out)).toMatchObject({ kind: 'subtotal' });
  });

  it('an unknown state code -> tax line is null, not zero', () => {
    const out = calculateLandedCost(usInput({}, 'ZZ'), usCtx());
    expect(out.lines.find((l) => l.kind === 'tax')!.amountMinor).toBeNull();
  });

  it('every computed line traces to a rules row, never to thin air', () => {
    const out = calculateLandedCost(usInput({}, 'NJ'), usCtx());
    for (const line of out.lines) {
      if (line.amountMinor !== null && line.amountMinor > 0) {
        expect(line.sourceId, line.label).not.toBe('derived');
        expect(line.sourceId, line.label).not.toBe('');
      }
    }
    expect(out.lines.find((l) => l.kind === 'tax')!.sourceId).toBe('US.salesTax.NJ');
  });

  it('the sales tax line stays visible in the panel, not collapsed into zeros', () => {
    const out = calculateLandedCost(usInput({}, 'NJ'), usCtx());
    const lines = panelLines(out);
    expect(lines.some((l) => l.label === 'Sales tax (NJ)')).toBe(true);
    expect(lines.some((l) => l.label.includes('No import charges'))).toBe(true);
  });
});

describe('summary <-> ranking bucket consistency', () => {
  const shapes: Array<Partial<LandedCostBreakdown>> = [
    {},
    { unknownComponents: ['shipping'] },
    { unknownComponents: ['tax'] },
    { unknownComponents: ['item'] },
    { lane: 'unknown' },
    { lane: 'cross-border', unknownComponents: ['duty'] },
    { lane: 'cross-border', totalRange: { lowMinor: 100, highMinor: 200 } },
    { lane: 'cross-border', totalRange: { lowMinor: 100, highMinor: 200 }, unknownComponents: ['shipping'] },
  ];

  it('kinds map one-to-one onto buckets', () => {
    for (const over of shapes) {
      const b: LandedCostBreakdown = {
        lines: [],
        totalMinor: 100,
        confidence: 'estimated',
        assumptions: [],
        warnings: [],
        unknownComponents: [],
        lane: 'domestic',
        currency: 'USD',
        ...over,
      };
      const kind = summarizeTotal(b).kind;
      const bucket = totalResolution(b);
      const expected =
        kind === 'unavailable'
          ? 'unavailable'
          : kind === 'total'
            ? 'resolved'
            : kind === 'range' && b.unknownComponents.length === 0
              ? 'resolved'
              : 'partial';
      expect(bucket, JSON.stringify(over)).toBe(expected);
    }
  });
});

describe('headline honesty (the "+ shipping" pattern is dead)', () => {
  const summaries: TotalSummary[] = [
    { kind: 'total', totalMinor: 3_142 },
    { kind: 'subtotal', totalMinor: 2_797, missing: ['shipping'] },
    { kind: 'subtotal', totalMinor: 2_797, missing: ['shipping', 'tax'] },
    { kind: 'range', lowMinor: 2_000, highMinor: 2_600, missing: [] },
    { kind: 'range', lowMinor: 2_000, highMinor: 2_600, missing: ['shipping'] },
    { kind: 'unavailable', reason: 'x', code: 'fx' },
    { kind: 'unavailable', reason: 'x', code: 'unknown-seller' },
  ];

  it('no summary shape can produce a trailing "+ shipping"', () => {
    for (const s of summaries) {
      expect(headlineFor(s, 'USD')).not.toContain('+ shipping');
      expect(headlineFor(s, 'USD')).not.toContain('Est. total');
    }
  });

  it('only a complete summary reads as a Total; partials name their gaps', () => {
    expect(headlineFor({ kind: 'total', totalMinor: 3_142 }, 'USD')).toBe('Total $31.42');
    expect(
      headlineFor({ kind: 'range', lowMinor: 2_000, highMinor: 2_600, missing: [] }, 'USD')
    ).toBe('Total $20.00 to $26.00');
    expect(
      headlineFor({ kind: 'subtotal', totalMinor: 2_797, missing: ['shipping'] }, 'USD')
    ).toBe('Known costs $27.97 · shipping not included');
    expect(
      headlineFor({ kind: 'subtotal', totalMinor: 2_797, missing: ['shipping', 'tax'] }, 'USD')
    ).toBe('Known costs $27.97 · shipping and tax not included');
    expect(headlineFor({ kind: 'unavailable', reason: 'x', code: 'import-charges' }, 'USD')).toBe(
      'Total cost unavailable'
    );
  });

  it('an FX-caused unavailable shows as loading only while rates are pending', () => {
    const fx: TotalSummary = { kind: 'unavailable', reason: 'x', code: 'fx' };
    expect(headlineFor(fx, 'USD', true)).toBe('Computing total…');
    expect(headlineFor(fx, 'USD', false)).toBe('Total cost unavailable');
    const seller: TotalSummary = { kind: 'unavailable', reason: 'x', code: 'unknown-seller' };
    expect(headlineFor(seller, 'USD', true)).toBe('Total cost unavailable');
  });

  it('the badge reflects the real state, not a static label', () => {
    const total: TotalSummary = { kind: 'total', totalMinor: 100 };
    const partial: TotalSummary = { kind: 'subtotal', totalMinor: 100, missing: ['tax'] };
    expect(badgeFor(total, 'resolved', 'exact')?.text).toBe('exact');
    expect(badgeFor(total, 'resolved', 'estimated')?.text).toBe('estimate');
    expect(badgeFor(partial, 'partial', 'unknown')?.text).toBe('partial');
    expect(badgeFor({ kind: 'unavailable', reason: 'x', code: 'fx' }, 'unavailable', 'unknown')).toBeNull();
  });
});

describe('breakdown memo: stale entries expire, loading states never cache', () => {
  const product: FeedProduct = {
    id: 'memo-test',
    name: 'Nike Air Zoom Running Shoes',
    price: 89.99,
    image: '',
    retailer: 'Target',
    category: 'Shoes',
    currency: 'USD',
    sourceMarket: 'US',
    url: 'https://example.test/memo',
  };
  const dest = { country: 'US', currency: 'USD', subdivision: 'NJ' };
  const tableFx = () =>
    new TableFxProvider(
      { pairsMicros: {}, asOf: '2026-09-01', spreadBps: 150, sourceId: 'fx:test' },
      NOW
    );

  it('caches per FX snapshot and destination, and expires by TTL', () => {
    clearBreakdownCacheForTests();
    const fx = tableFx();
    const [a] = withLandedCosts([product], dest, NOW, fx);
    const [b] = withLandedCosts([product], dest, NOW, fx);
    expect(b.landedCost).toBe(a.landedCost); // same cached object

    // A different subdivision is a different result, never a stale hit.
    const [c] = withLandedCosts([product], { ...dest, subdivision: 'OR' }, NOW, fx);
    expect(c.landedCost).not.toBe(a.landedCost);

    // Past the TTL the entry expires and is recomputed, not served.
    const later = new Date(NOW.getTime() + 7 * 60 * 60 * 1000);
    const [d] = withLandedCosts([product], dest, later, fx);
    expect(d.landedCost).not.toBe(a.landedCost);
    clearBreakdownCacheForTests();
  });

  it('results computed on the null (loading) provider are never cached', () => {
    clearBreakdownCacheForTests();
    const [a] = withLandedCosts([product], dest, NOW, new NullFxProvider());
    const [b] = withLandedCosts([product], dest, NOW, new NullFxProvider());
    expect(b.landedCost).not.toBe(a.landedCost);
    clearBreakdownCacheForTests();
  });
});

describe('FX pair matrix', () => {
  const table = {
    asOf: '2026-09-01',
    eurMicros: { USD: 1_083_400, GBP: 843_500, JPY: 171_260_000 },
  };

  it('emits every ordered pair, both directions', () => {
    const pairs = allCrossPairsMicros(table, ['USD', 'GBP', 'EUR', 'JPY']);
    expect(pairs['USD:GBP']).toBeDefined();
    expect(pairs['GBP:USD']).toBeDefined();
    expect(pairs['EUR:JPY']).toBeDefined();
    expect(pairs['GBP:JPY']).toBeDefined();
    expect(pairs['USD:USD']).toBeUndefined();
    // Round-trip sanity: converting there and back is within rounding of 1.
    const roundTrip = (pairs['USD:GBP'] * pairs['GBP:USD']) / 1e12;
    expect(roundTrip).toBeGreaterThan(0.999999);
    expect(roundTrip).toBeLessThan(1.000001);
  });

  it('currencies missing from the ECB table are absent, never guessed', () => {
    const pairs = allCrossPairsMicros(table, ['USD', 'CHF']);
    expect(Object.keys(pairs).some((k) => k.includes('CHF'))).toBe(false);
  });
});

describe('unavailable stays unavailable (no silent zeros end to end)', () => {
  it('a cross-currency offer with no FX summarizes unavailable with the fx code', () => {
    const input = usInput();
    input.item.currency = 'GBP';
    const out = calculateLandedCost(input, usCtx());
    const summary = summarizeTotal(out);
    expect(summary).toMatchObject({ kind: 'unavailable', code: 'fx' });
    // And no line pretends to be a number meanwhile.
    for (const line of out.lines) {
      if (line.kind === 'item' || line.kind === 'shipping') {
        expect(line.amountMinor).toBeNull();
      }
    }
  });

  it('an unknown merchant summarizes unavailable with the seller code', () => {
    const input = usInput();
    input.merchant = { id: 'mystery', country: undefined, incoterm: 'unknown', configConfidence: 'unknown' };
    const out = calculateLandedCost(input, usCtx());
    expect(summarizeTotal(out)).toMatchObject({ kind: 'unavailable', code: 'unknown-seller' });
  });

  it('buildLandedCostInput still refuses garbage prices outright', () => {
    const bad: FeedProduct = {
      id: 'bad',
      name: 'x',
      price: NaN,
      image: '',
      retailer: 'Target',
      url: 'https://example.test/bad',
    };
    expect(buildLandedCostInput(bad, { country: 'US', currency: 'USD' }, NOW)).toBeNull();
  });
});

describe('shipping policies honor their published geography (2026-10-23)', () => {
  const base = {
    categoryId: 'shoes' as string | undefined,
    merchantCountry: 'US',
    destinationCountry: 'US',
    itemPriceMinor: 10_000,
    itemCurrency: 'USD',
    now: NOW,
  };
  const contiguousOnly = policy({
    freeOverMinor: verifiedRow(3500),
    scope: { contiguousOnly: true },
  });
  const unscoped = policy({ freeOverMinor: verifiedRow(3500) });
  const nationwide = policy({ alwaysFree: verifiedRow(true), scope: { nationwide: true } });
  const surcharged = policy({
    freeOverMinor: verifiedRow(4900),
    flatBelowMinor: verifiedRow(1095),
    scope: { nonContiguousSurchargeMinor: verifiedRow(1000) },
  });
  const excludesCa = policy({
    freeOverMinor: verifiedRow(5000),
    scope: { contiguousOnly: true, excludedStates: ['CA'] },
  });

  it('with no state chosen, policies apply as published', () => {
    expect(resolveShipping({ ...base, policy: contiguousOnly })!.costMinor).toBe(0);
    expect(resolveShipping({ ...base, policy: excludesCa })!.costMinor).toBe(0);
  });

  it('in a contiguous state, only an explicit exclusion falls through to the benchmark', () => {
    expect(
      resolveShipping({ ...base, destinationSubdivision: 'NJ', policy: contiguousOnly })!.costMinor
    ).toBe(0);
    const ca = resolveShipping({ ...base, destinationSubdivision: 'CA', policy: excludesCa })!;
    expect(ca.costMinor).toBe(1_580); // Ground Advantage zone-4 benchmark, 5 lb band
    expect(ca.sourceId).toContain('shipping-estimate:US:US');
    expect(
      resolveShipping({ ...base, destinationSubdivision: 'TX', policy: excludesCa })!.costMinor
    ).toBe(0);
  });

  it('in AK or HI, a policy applies only when published nationwide or with a surcharge', () => {
    // Contiguous-only and silent policies do not reach Hawaii; neither does
    // the zone-4 benchmark, so the gap stays open.
    expect(
      resolveShipping({ ...base, destinationSubdivision: 'HI', policy: contiguousOnly })
    ).toBeUndefined();
    expect(
      resolveShipping({ ...base, destinationSubdivision: 'AK', policy: unscoped })
    ).toBeUndefined();
    expect(resolveShipping({ ...base, destinationSubdivision: 'AK' })).toBeUndefined();
    // Published nationwide: free in Alaska too.
    expect(
      resolveShipping({ ...base, destinationSubdivision: 'AK', policy: nationwide })!.costMinor
    ).toBe(0);
    // Published surcharge: added to whichever rule fires, and said so.
    const free = resolveShipping({ ...base, destinationSubdivision: 'HI', policy: surcharged })!;
    expect(free.costMinor).toBe(1_000);
    expect(free.sourceId).toBe('shipping-policy:example.test:free-over+surcharge');
    expect(free.basis).toContain('$10.00 surcharge for delivery to HI');
    const flat = resolveShipping({
      ...base,
      destinationSubdivision: 'HI',
      itemPriceMinor: 2_000,
      policy: surcharged,
    })!;
    expect(flat.costMinor).toBe(2_095);
    expect(flat.sourceId).toBe('shipping-policy:example.test:flat+surcharge');
  });

  it('an unverified surcharge row never produces a figure', () => {
    const unverified = policy({
      freeOverMinor: verifiedRow(4900),
      scope: {
        nonContiguousSurchargeMinor: { ...verifiedRow(1000), verification: 'unverified' },
      },
    });
    expect(
      resolveShipping({ ...base, destinationSubdivision: 'HI', policy: unverified })
    ).toBeUndefined();
  });

  it('the AK/HI gap carries its reason into the breakdown the shopper reads', () => {
    const us = { merchantCountry: 'US', destinationCountry: 'US' };
    expect(shippingGapReason({ ...us, destinationSubdivision: 'NJ' })).toBeUndefined();
    expect(shippingGapReason(us)).toBeUndefined();
    expect(
      shippingGapReason({ ...us, destinationCountry: 'GB', destinationSubdivision: 'HI' })
    ).toBeUndefined();
    const reason = shippingGapReason({ ...us, destinationSubdivision: 'AK' })!;
    expect(reason).toContain('AK');
    expect(reason).not.toContain('—');
    const input = usInput({}, 'AK');
    input.shippingUnknownReason = reason;
    const out = calculateLandedCost(input, usCtx());
    const shipping = out.lines.find((l) => l.kind === 'shipping')!;
    expect(shipping.amountMinor).toBeNull();
    expect(shipping.basis).toBe(reason);
    expect(out.assumptions).toContain(reason);
    // Alaska has a verified zero sales-tax row, so shipping is the only gap.
    expect(summarizeTotal(out)).toMatchObject({ kind: 'subtotal', missing: ['shipping'] });
  });
});
