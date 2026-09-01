import { describe, expect, it } from 'vitest';
import {
  isTopSlotEligible,
  rankByLandedCost,
  rankKeyMinor,
  totalResolution,
  type RankedOffer,
} from '../rank';
import type { Lane, LandedCostBreakdown, LineKind } from '../types';

// Bucketed ordering, owner-approved 2026-08-31 (replacing the 2026-08-26
// displacement rule): resolved totals first, labeled partials second,
// unavailable last in stable incoming order. Only a resolved offer can be
// the top slot.

function breakdown(over: {
  totalMinor: number;
  lane?: Lane;
  unknownComponents?: LineKind[];
  totalRange?: { lowMinor: number; highMinor: number };
}): LandedCostBreakdown {
  return {
    lines: [],
    totalMinor: over.totalMinor,
    totalRange: over.totalRange,
    confidence: over.unknownComponents?.length ? 'unknown' : 'estimated',
    assumptions: [],
    warnings: [],
    unknownComponents: over.unknownComponents ?? [],
    lane: over.lane ?? 'domestic',
    currency: 'USD',
  };
}

function offer(
  id: string,
  b: LandedCostBreakdown,
  itemPriceMinor = b.totalMinor,
  merchantId = 'm'
): RankedOffer<string> {
  return { offer: id, breakdown: b, itemPriceMinor, merchantId, offerId: id };
}

const ids = <T,>(xs: RankedOffer<T>[]) => xs.map((x) => x.offerId);

describe('totalResolution buckets', () => {
  it('a fully known breakdown is resolved; a clean range too', () => {
    expect(totalResolution(breakdown({ totalMinor: 100 }))).toBe('resolved');
    expect(
      totalResolution(
        breakdown({ totalMinor: 300, lane: 'cross-border', totalRange: { lowMinor: 250, highMinor: 300 } })
      )
    ).toBe('resolved');
  });

  it('unknown optional components make it partial, on any lane', () => {
    expect(totalResolution(breakdown({ totalMinor: 100, unknownComponents: ['shipping'] }))).toBe('partial');
    expect(totalResolution(breakdown({ totalMinor: 100, unknownComponents: ['tax'] }))).toBe('partial');
    expect(
      totalResolution(breakdown({ totalMinor: 100, lane: 'cross-border', unknownComponents: ['shipping'] }))
    ).toBe('partial');
  });

  it('unknown item, unknown lane, or unknown required import charges are unavailable', () => {
    expect(totalResolution(breakdown({ totalMinor: 0, unknownComponents: ['item'] }))).toBe('unavailable');
    expect(totalResolution(breakdown({ totalMinor: 100, lane: 'unknown' }))).toBe('unavailable');
    expect(
      totalResolution(breakdown({ totalMinor: 100, lane: 'cross-border', unknownComponents: ['duty'] }))
    ).toBe('unavailable');
    expect(
      totalResolution(breakdown({ totalMinor: 100, lane: 'cross-border', unknownComponents: ['tax'] }))
    ).toBe('unavailable');
  });
});

describe('rankKeyMinor and eligibility', () => {
  it('ranges rank on their low end', () => {
    expect(rankKeyMinor(breakdown({ totalMinor: 300, totalRange: { lowMinor: 250, highMinor: 300 } }))).toBe(250);
    expect(rankKeyMinor(breakdown({ totalMinor: 300 }))).toBe(300);
  });

  it('only a fully resolved offer may take the top slot', () => {
    expect(isTopSlotEligible(breakdown({ totalMinor: 100 }))).toBe(true);
    expect(
      isTopSlotEligible(
        breakdown({ totalMinor: 300, lane: 'cross-border', totalRange: { lowMinor: 250, highMinor: 300 } })
      )
    ).toBe(true);
    // Partial offers (unknown shipping or tax) are rankable but never #1:
    // deliberate tightening of the 2026-08-26 shipping-tolerated rule.
    expect(isTopSlotEligible(breakdown({ totalMinor: 100, lane: 'domestic', unknownComponents: ['shipping'] }))).toBe(false);
    expect(isTopSlotEligible(breakdown({ totalMinor: 100, lane: 'domestic', unknownComponents: ['tax'] }))).toBe(false);
    expect(isTopSlotEligible(breakdown({ totalMinor: 100, lane: 'cross-border', unknownComponents: ['duty'] }))).toBe(false);
    expect(isTopSlotEligible(breakdown({ totalMinor: 100, lane: 'unknown' }))).toBe(false);
    // The unconvertible-item hole is closed: such an offer summarizes as
    // unavailable, so it can never be #1 either.
    expect(isTopSlotEligible(breakdown({ totalMinor: 0, unknownComponents: ['item'] }))).toBe(false);
  });
});

describe('rankByLandedCost', () => {
  it('sorts ascending on the low estimate, ranges included', () => {
    const { ranked, topSlotOfferId } = rankByLandedCost([
      offer('flat300', breakdown({ totalMinor: 300 })),
      offer(
        'range250to400',
        breakdown({ totalMinor: 400, lane: 'cross-border', totalRange: { lowMinor: 250, highMinor: 400 } })
      ),
      offer('flat100', breakdown({ totalMinor: 100 })),
    ]);
    expect(ids(ranked)).toEqual(['flat100', 'range250to400', 'flat300']);
    expect(topSlotOfferId).toBe('flat100');
  });

  it('ties break on item price, then merchant id, then offer id', () => {
    const tied = (id: string, itemPrice: number, merchant: string) =>
      offer(id, breakdown({ totalMinor: 500 }), itemPrice, merchant);
    const { ranked } = rankByLandedCost([
      tied('c', 200, 'zeta'),
      tied('b', 200, 'alpha'),
      tied('a', 100, 'zeta'),
      tied('d', 200, 'alpha'),
    ]);
    // a wins on item price; b/d beat c on merchant; b beats d on offer id
    expect(ids(ranked)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('is deterministic under input permutation', () => {
    const offers = [
      offer('x', breakdown({ totalMinor: 300 })),
      offer('y', breakdown({ totalMinor: 300 })),
      offer('z', breakdown({ totalMinor: 100 })),
    ];
    const a = rankByLandedCost(offers);
    const b = rankByLandedCost([offers[2], offers[0], offers[1]]);
    const c = rankByLandedCost([offers[1], offers[2], offers[0]]);
    expect(ids(a.ranked)).toEqual(ids(b.ranked));
    expect(ids(b.ranked)).toEqual(ids(c.ranked));
  });

  it('buckets: resolved totals, then partials, then unavailable at the bottom', () => {
    const resolvedExpensive = offer('resolved-900', breakdown({ totalMinor: 900 }));
    const resolvedCheap = offer('resolved-200', breakdown({ totalMinor: 200 }));
    const partialCheapest = offer(
      'partial-50',
      breakdown({ totalMinor: 50, unknownComponents: ['shipping'] })
    );
    const unavailable = offer('unavailable', breakdown({ totalMinor: 10, lane: 'unknown' }));

    const { ranked, topSlotOfferId } = rankByLandedCost([
      unavailable,
      partialCheapest,
      resolvedExpensive,
      resolvedCheap,
    ]);
    // The cheapest KNOWN subtotal does not beat a resolved total: partials
    // sort within their own bucket, below every resolved offer.
    expect(ids(ranked)).toEqual(['resolved-200', 'resolved-900', 'partial-50', 'unavailable']);
    expect(topSlotOfferId).toBe('resolved-200');
  });

  it('unavailable offers sink in stable incoming order, never sorted by price', () => {
    const a = offer('a', breakdown({ totalMinor: 900, lane: 'unknown' }));
    const b = offer('b', breakdown({ totalMinor: 50, lane: 'unknown' }));
    const { ranked, topSlotOfferId } = rankByLandedCost([a, b]);
    expect(topSlotOfferId).toBeNull();
    // a arrived first and stays first despite its higher known sum.
    expect(ids(ranked)).toEqual(['a', 'b']);
  });

  it('with only partials, nothing wins the top slot', () => {
    const p = offer('p', breakdown({ totalMinor: 100, unknownComponents: ['tax'] }));
    const q = offer('q', breakdown({ totalMinor: 200, unknownComponents: ['shipping'] }));
    const { ranked, topSlotOfferId } = rankByLandedCost([q, p]);
    expect(ids(ranked)).toEqual(['p', 'q']);
    expect(topSlotOfferId).toBeNull();
  });

  it('does not mutate its input', () => {
    const offers = [
      offer('n2', breakdown({ totalMinor: 200 })),
      offer('n1', breakdown({ totalMinor: 100 })),
    ];
    rankByLandedCost(offers);
    expect(ids(offers)).toEqual(['n2', 'n1']);
  });
});
