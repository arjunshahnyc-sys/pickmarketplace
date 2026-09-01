// Landed-cost ranking. Only active behind LANDED_COST_ENABLED; the flag-off
// sort lives untouched in lib/sortResults.ts.
//
// BUCKETED ORDERING (owner-approved 2026-08-31, replacing the 2026-08-26
// displacement rule): "Total cost: Low to High" is only coherent when items
// with no total cannot interleave with items that have one.
//   Bucket A - RESOLVED: every component of the total is a known number
//     (a DDP-to-DAP range with no unknown components counts: it is fully
//     grounded, just interval-valued, and sorts on its low end).
//   Bucket B - PARTIAL: a known-components subtotal with named gaps
//     (e.g. shipping or sales tax unresolved). Sorts by the known subtotal
//     and the UI marks it as partial.
//   Bucket C - UNAVAILABLE: no honest total at all (unconvertible item
//     price, unknown merchant/lane, uncomputable required import charges).
//     Sinks to the bottom in stable incoming order - deliberately NOT
//     sorted by base price, which would smuggle a price ranking into a
//     total-cost sort.
//   The top slot can only be a resolved offer: if bucket A is empty,
//   topSlotOfferId is null - nothing "wins" on missing data.
//   Within a bucket, ties break on item price, then merchant id, then offer
//   id, so the same offers always render in the same order regardless of
//   input permutation.

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

export type TotalResolution = 'resolved' | 'partial' | 'unavailable';

const REQUIRED_BY_LANE: Record<Exclude<Lane, 'unknown'>, LineKind[]> = {
  domestic: [],
  'intra-eu': [],
  'cross-border': ['duty', 'tax'],
};

/**
 * How much of a total this breakdown honestly has. MUST stay consistent
 * with summarizeTotal() in enrich.ts (tested): 'unavailable' here is
 * exactly the summary's unavailable kind; 'resolved' is a total or range
 * with no unknown components; 'partial' is everything between.
 */
export function totalResolution(b: LandedCostBreakdown): TotalResolution {
  const unknown = new Set(b.unknownComponents);
  if (unknown.has('item')) return 'unavailable';
  if (b.lane === 'unknown') return 'unavailable';
  if (b.lane === 'cross-border' && (unknown.has('duty') || unknown.has('tax'))) {
    return 'unavailable';
  }
  return b.unknownComponents.length === 0 ? 'resolved' : 'partial';
}

const BUCKET_ORDER: Record<TotalResolution, number> = {
  resolved: 0,
  partial: 1,
  unavailable: 2,
};

/**
 * May this offer occupy the #1 slot? Only a fully resolved total can win:
 * an offer must never rank first because we failed to compute a charge.
 * (Kept as the lane-required check too, so a future lane whose required
 * components are known but optional ones missing stays partial, not #1.)
 */
export function isTopSlotEligible(b: LandedCostBreakdown): boolean {
  if (totalResolution(b) !== 'resolved') return false;
  if (b.lane === 'unknown') return false;
  return !REQUIRED_BY_LANE[b.lane].some((k) => b.unknownComponents.includes(k));
}

/** The number an offer ranks on: the low end of its honest range. */
export function rankKeyMinor(b: LandedCostBreakdown): number {
  return b.totalRange?.lowMinor ?? b.totalMinor;
}

export interface RankResult<T> {
  ranked: RankedOffer<T>[];
  /** offerId of the #1 slot, or null when no resolved offer exists. */
  topSlotOfferId: string | null;
}

export function rankByLandedCost<T>(offers: RankedOffer<T>[]): RankResult<T> {
  const ranked = [...offers].sort((a, b) => {
    const bucketA = totalResolution(a.breakdown);
    const bucketB = totalResolution(b.breakdown);
    if (bucketA !== bucketB) return BUCKET_ORDER[bucketA] - BUCKET_ORDER[bucketB];
    // Unavailable offers keep their incoming relative order (stable sort):
    // they have no total to sort by, and base price must not stand in.
    if (bucketA === 'unavailable') return 0;
    return (
      rankKeyMinor(a.breakdown) - rankKeyMinor(b.breakdown) ||
      a.itemPriceMinor - b.itemPriceMinor ||
      a.merchantId.localeCompare(b.merchantId) ||
      a.offerId.localeCompare(b.offerId)
    );
  });

  const top = ranked[0];
  return {
    ranked,
    topSlotOfferId: top && isTopSlotEligible(top.breakdown) ? top.offerId : null,
  };
}
