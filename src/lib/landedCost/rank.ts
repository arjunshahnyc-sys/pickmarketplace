// Landed-cost ranking. Only active behind LANDED_COST_ENABLED; the flag-off
// sort lives untouched in lib/sortResults.ts.
//
// RULES (from the product brief, enforced here and tested):
//   - Sort ascending on the LOW estimate: totalRange.lowMinor when a range
//     exists (unknown incoterm), else totalMinor. Offers with unknown
//     components therefore sort optimistically BUT:
//   - An offer must never win the top slot because we failed to compute a
//     required charge. Required components depend on the lane: cross-border
//     requires duty and tax; domestic and intra-EU require nothing beyond
//     the item (shipping-unknown is tolerated everywhere by owner decision,
//     2026-08-26); an unknown lane is never eligible. Ineligible offers are
//     displaced below the first eligible one and the UI labels them
//     "estimate unavailable".
//   - The sort is stable and deterministic: ties break on item price, then
//     merchant id, then offer id, so the same offers always render in the
//     same order regardless of input permutation.

import type { LandedCostBreakdown, Lane, LineKind } from './types';

export interface RankedOffer<T> {
  offer: T;
  breakdown: LandedCostBreakdown;
  /** Item price in minor units, for the first tiebreak. */
  itemPriceMinor: number;
  merchantId: string;
  /** Stable offer identity, final tiebreak. */
  offerId: string;
}

const REQUIRED_BY_LANE: Record<Exclude<Lane, 'unknown'>, LineKind[]> = {
  domestic: [],
  'intra-eu': [],
  'cross-border': ['duty', 'tax'],
};

/** May this offer occupy the #1 slot? */
export function isTopSlotEligible(b: LandedCostBreakdown): boolean {
  if (b.lane === 'unknown') return false;
  return !REQUIRED_BY_LANE[b.lane].some((k) => b.unknownComponents.includes(k));
}

/** The number an offer ranks on: the low end of its honest range. */
export function rankKeyMinor(b: LandedCostBreakdown): number {
  return b.totalRange?.lowMinor ?? b.totalMinor;
}

export interface RankResult<T> {
  ranked: RankedOffer<T>[];
  /** offerId of the #1 slot, or null when no offer is eligible for it. */
  topSlotOfferId: string | null;
}

export function rankByLandedCost<T>(offers: RankedOffer<T>[]): RankResult<T> {
  const ranked = [...offers].sort(
    (a, b) =>
      rankKeyMinor(a.breakdown) - rankKeyMinor(b.breakdown) ||
      a.itemPriceMinor - b.itemPriceMinor ||
      a.merchantId.localeCompare(b.merchantId) ||
      a.offerId.localeCompare(b.offerId)
  );

  const firstEligible = ranked.findIndex((o) => isTopSlotEligible(o.breakdown));
  if (firstEligible > 0) {
    // Displace the ineligible leaders to just below the first eligible
    // offer, preserving their relative order: they still show (with their
    // "estimate unavailable" labeling) but cannot win on missing data.
    const leaders = ranked.splice(0, firstEligible);
    ranked.splice(1, 0, ...leaders);
  }

  return {
    ranked,
    topSlotOfferId: firstEligible === -1 ? null : ranked[0].offerId,
  };
}
