import { describe, expect, it } from 'vitest';
import { isTopSlotEligible, rankByLandedCost, rankKeyMinor, type RankedOffer } from '../rank';
import type { Lane, LandedCostBreakdown, LineKind } from '../types';

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

describe('rankKeyMinor and eligibility', () => {
  it('ranges rank on their low end', () => {
    expect(rankKeyMinor(breakdown({ totalMinor: 300, totalRange: { lowMinor: 250, highMinor: 300 } }))).toBe(250);
    expect(rankKeyMinor(breakdown({ totalMinor: 300 }))).toBe(300);
  });

  it('domestic offers with unknown shipping stay eligible (owner decision)', () => {
    expect(isTopSlotEligible(breakdown({ totalMinor: 100, lane: 'domestic', unknownComponents: ['shipping'] }))).toBe(true);
  });

  it('cross-border offers need duty and tax; unknown lane is never eligible', () => {
    expect(isTopSlotEligible(breakdown({ totalMinor: 100, lane: 'cross-border', unknownComponents: ['shipping'] }))).toBe(true);
    expect(isTopSlotEligible(breakdown({ totalMinor: 100, lane: 'cross-border', unknownComponents: ['duty'] }))).toBe(false);
    expect(isTopSlotEligible(breakdown({ totalMinor: 100, lane: 'cross-border', unknownComponents: ['tax'] }))).toBe(false);
    expect(isTopSlotEligible(breakdown({ totalMinor: 100, lane: 'unknown' }))).toBe(false);
  });
});

describe('rankByLandedCost', () => {
  it('sorts ascending on the low estimate, ranges included', () => {
    const { ranked, topSlotOfferId } = rankByLandedCost([
      offer('flat300', breakdown({ totalMinor: 300 })),
      offer('range250to400', breakdown({ totalMinor: 400, totalRange: { lowMinor: 250, highMinor: 400 } })),
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

  it('an offer never wins the top slot on missing required data', () => {
    const cheapButUnknownDuty = offer(
      'cheap-unknown',
      breakdown({ totalMinor: 50, lane: 'cross-border', unknownComponents: ['duty'] })
    );
    const alsoUnknown = offer(
      'also-unknown',
      breakdown({ totalMinor: 60, lane: 'cross-border', unknownComponents: ['tax'] })
    );
    const eligible = offer('eligible', breakdown({ totalMinor: 200 }));
    const expensive = offer('expensive', breakdown({ totalMinor: 900 }));

    const { ranked, topSlotOfferId } = rankByLandedCost([
      expensive,
      cheapButUnknownDuty,
      eligible,
      alsoUnknown,
    ]);
    expect(topSlotOfferId).toBe('eligible');
    // Displaced leaders keep their relative order right below the winner.
    expect(ids(ranked)).toEqual(['eligible', 'cheap-unknown', 'also-unknown', 'expensive']);
  });

  it('with no eligible offer there is no top slot and order is untouched', () => {
    const a = offer('a', breakdown({ totalMinor: 50, lane: 'unknown' }));
    const b = offer('b', breakdown({ totalMinor: 60, lane: 'unknown' }));
    const { ranked, topSlotOfferId } = rankByLandedCost([b, a]);
    expect(topSlotOfferId).toBeNull();
    expect(ids(ranked)).toEqual(['a', 'b']); // still sorted, just no winner
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
