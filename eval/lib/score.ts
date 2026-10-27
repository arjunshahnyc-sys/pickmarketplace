// Compare each query's result with the owner's benchmark and twin list,
// then roll the comparisons up into the four headline metrics.
//
// Everything is compared BEFORE sales tax: tax depends on the shopper's
// state, not on the store, so it moves every price by the same rate and
// would only add noise to a 3% test. The benchmark is item + shipping as
// found by hand; Pick's side is item + Pick's own shipping figure, or the
// item price alone when Pick has no shipping figure for that listing (the
// row says which, and then compares with the benchmark's item price when
// one was entered).
//
// Two questions are scored separately, so one cannot hide the other:
//   priceStatus  is the exact listing Pick ranks first within 3% of the
//                benchmark? (the lowest price Pick actually presents)
//   coverage     does Pick's result set contain a credible price at or
//                under the benchmark anywhere? (whether Pick's data had it)
// A query whose top listing is a $15 bait price is 'pick-cheaper' on the
// first and can still be 'missed' on the second.

import { collapse, splitSellerSuffix } from '../../src/lib/trust/identity';
import type { ListingRecord, QueryAnalysis } from './analyze';
import { describeTwinSpec, matchRule, twinRule } from './rules';
import type { Benchmark, TestEntry } from './testset';

/** Within this fraction of the benchmark counts as a match. */
export const TOLERANCE = 0.03;

/**
 * A price under this share of the benchmark is not treated as "Pick had a
 * price as good as yours": a $15 AirPods listing is bait or a mislabeled
 * accessory, not a deal Pick failed to rank.
 */
export const CREDIBLE_FLOOR = 0.5;

export type PriceStatus = 'not-benchmarked' | 'no-exact-listing' | 'within-3pct' | 'pick-cheaper' | 'pick-higher';

/**
 *   has-price    a like-for-like listing between half the benchmark and 3%
 *                over it is somewhere in Pick's results
 *   not-counted  no such listing, but the benchmark store's listing near the
 *                benchmark price is there, set aside as not the item
 *   missed       neither: Pick missed the cheaper listing entirely
 */
export type Coverage = 'has-price' | 'not-counted' | 'missed';

export type TwinStatus = 'no-twin' | 'not-reviewed' | 'acceptable' | 'not-acceptable';

export interface Scored {
  id: string;
  priceStatus: PriceStatus;
  /** 'total' compares item + shipping on both sides; 'item' compares item prices. */
  basis: 'total' | 'item' | null;
  pickValue: number | null;
  benchmarkValue: number | null;
  /** (Pick - benchmark) / benchmark, for Pick's top exact listing. */
  delta: number | null;
  coverage: Coverage | null;
  /** The listing that shows the coverage: the price Pick had, or the store listing it set aside. */
  coverageListing: ListingRecord | null;
  note: string;
  twinStatus: TwinStatus;
  /** Which acceptable-twin entry Pick's twin matched. */
  twinMatchedSpec: string | null;
  /** An acceptable twin appears somewhere in Pick's results (labeled or not); null when not reviewed. */
  acceptableTwinInResults: boolean | null;
  /** Days between the capture and the benchmark check; null when either is missing. */
  driftDays: number | null;
}

function storeKey(name: string): string {
  return collapse(name.replace(/&|\band\b/gi, ' '));
}

/** Same store, or a seller on the benchmark's marketplace ("Walmart - SellerCo" for "Walmart"). */
export function sameStore(listingStore: string, benchmarkStore: string): boolean {
  const target = storeKey(benchmarkStore);
  if (!target) return false;
  if (storeKey(listingStore) === target) return true;
  const split = splitSellerSuffix(listingStore);
  return !!split && storeKey(split.platform) === target;
}

function daysBetween(isoA: string, dateB: string): number | null {
  if (!isoA || !/^\d{4}-\d{2}-\d{2}$/.test(dateB)) return null;
  const a = Date.parse(isoA.slice(0, 10));
  const b = Date.parse(dateB);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Pick's number for a listing and the benchmark number it is fair to set
 * beside it: item + shipping against the benchmark total, or, when Pick
 * has no shipping figure, the item price against the benchmark's item
 * price (its total when no item price was entered).
 */
export function comparable(l: ListingRecord, bench: Benchmark): { basis: 'total' | 'item'; pick: number; reference: number } {
  const total = bench.totalPrice as number;
  if (l.cost.preTax !== null) return { basis: 'total', pick: l.cost.preTax, reference: total };
  return { basis: 'item', pick: l.itemPrice, reference: bench.itemPrice ?? total };
}

/** Pick's number is as good as the benchmark (within tolerance above, credible below). */
function asGoodAs(l: ListingRecord, bench: Benchmark): boolean {
  const { pick, reference } = comparable(l, bench);
  return pick <= reference * (1 + TOLERANCE) + 1e-9 && pick >= reference * CREDIBLE_FLOOR;
}

function whySetAside(l: ListingRecord): string {
  if (l.exactName) return `it matches the item but was set aside (${l.notLikeForLike})`;
  return `its name did not match the exact item (${l.exactNameMiss})`;
}

function coverageOf(analysis: QueryAnalysis, bench: Benchmark): { coverage: Coverage; listing: ListingRecord | null } {
  const had = analysis.listings.find((l) => l.likeForLike && asGoodAs(l, bench));
  if (had) return { coverage: 'has-price', listing: had };
  const ref = bench.itemPrice ?? (bench.totalPrice as number);
  const fromStore = analysis.listings
    .filter(
      (l) =>
        !l.likeForLike &&
        sameStore(l.store, bench.store) &&
        l.itemPrice <= ref * (1 + TOLERANCE) + 1e-9 &&
        l.itemPrice >= ref * CREDIBLE_FLOOR
    )
    .sort((a, b) => a.itemPrice - b.itemPrice)[0];
  if (fromStore) return { coverage: 'not-counted', listing: fromStore };
  return { coverage: 'missed', listing: null };
}

function coverageNote(coverage: Coverage, l: ListingRecord | null, top: ListingRecord | null, bench: Benchmark): string {
  if (coverage === 'missed') {
    return bench.store
      ? `Nothing in Pick's results at or under your price, and no ${bench.store} listing near it.`
      : "Nothing in Pick's results at or under your price (benchmark store not recorded).";
  }
  if (!l) return '';
  if (coverage === 'not-counted') {
    return `Pick had ${l.store} at $${l.itemPrice.toFixed(2)}, but ${whySetAside(l)}.`;
  }
  if (top && l !== top) {
    return `Pick had ${l.store} at $${comparable(l, bench).pick.toFixed(2)} (${l.trustLabel}, ${l.cost.summary}) at #${l.displayRank}, below its top exact listing at #${top.displayRank}.`;
  }
  return '';
}

export function scoreQuery(entry: TestEntry, analysis: QueryAnalysis): Scored {
  const bench = entry.benchmark;
  const twin = analysis.twins[0];

  // ── Twins ───────────────────────────────────────────────────────────
  let twinStatus: TwinStatus;
  let twinMatchedSpec: string | null = null;
  const specs = entry.acceptableTwins;
  if (!twin) {
    twinStatus = 'no-twin';
  } else if (specs === null) {
    twinStatus = 'not-reviewed';
  } else {
    const hit = specs.find((spec) => matchRule(twin.name, twinRule(spec)).matched);
    twinStatus = hit === undefined ? 'not-acceptable' : 'acceptable';
    twinMatchedSpec = hit === undefined ? null : describeTwinSpec(hit);
  }
  const acceptableTwinInResults =
    specs === null
      ? null
      : analysis.listings.some(
          (l) => !l.exactName && specs.some((spec) => matchRule(l.name, twinRule(spec)).matched)
        );

  const base = {
    id: entry.id,
    twinStatus,
    twinMatchedSpec,
    acceptableTwinInResults,
    driftDays: daysBetween(analysis.capturedAt, bench.checkedOn),
  };

  // ── Price ───────────────────────────────────────────────────────────
  if (bench.totalPrice === null) {
    return {
      ...base,
      priceStatus: 'not-benchmarked',
      basis: null,
      pickValue: null,
      benchmarkValue: null,
      delta: null,
      coverage: null,
      coverageListing: null,
      note: '',
    };
  }

  const { coverage, listing } = coverageOf(analysis, bench);
  const top = analysis.pickTopExact;
  if (!top) {
    const why =
      analysis.counts.exactName > 0
        ? `Pick returned ${analysis.counts.exactName} listing(s) of the item, none like-for-like.`
        : 'Pick returned no listing of the exact item.';
    return {
      ...base,
      priceStatus: 'no-exact-listing',
      basis: null,
      pickValue: null,
      benchmarkValue: bench.totalPrice,
      delta: null,
      coverage,
      coverageListing: listing,
      note: [why, coverageNote(coverage, listing, null, bench)].filter(Boolean).join(' '),
    };
  }

  const { basis, pick, reference } = comparable(top, bench);
  const delta = (pick - reference) / reference;
  let priceStatus: PriceStatus;
  let lead = '';
  if (Math.abs(delta) <= TOLERANCE + 1e-9) {
    priceStatus = 'within-3pct';
  } else if (delta < 0) {
    priceStatus = 'pick-cheaper';
    lead = "Pick's top exact listing is more than 3% under your benchmark: check it is the same item, new, one unit, and a real offer.";
  } else {
    priceStatus = 'pick-higher';
  }
  return {
    ...base,
    priceStatus,
    basis,
    pickValue: pick,
    benchmarkValue: reference,
    delta,
    coverage,
    coverageListing: listing,
    note: [lead, priceStatus === 'within-3pct' ? '' : coverageNote(coverage, listing, top, bench)].filter(Boolean).join(' '),
  };
}

export interface Metrics {
  queries: number;
  benchmarked: number;
  within3pct: number;
  pickCheaper: number;
  pickHigher: number;
  noExactListing: number;
  /** Benchmark price nowhere in Pick's results (coverage 'missed'). */
  missedEntirely: number;
  /** Pick ranked a higher price first while a price as good as the benchmark sat lower down. */
  hadItLowerDown: number;
  /** The benchmark store's listing was in the results but not counted as the item. */
  hadItNotCounted: number;
  noTwin: number;
  twinShown: number;
  twinReviewed: number;
  twinAcceptable: number;
  twinListsFilled: number;
}

export function rollUp(scored: Scored[], analyses: QueryAnalysis[], entries: TestEntry[]): Metrics {
  const count = (status: PriceStatus) => scored.filter((s) => s.priceStatus === status).length;
  const notTop = scored.filter((s) => s.priceStatus === 'pick-higher' || s.priceStatus === 'no-exact-listing');
  return {
    queries: scored.length,
    benchmarked: scored.filter((s) => s.priceStatus !== 'not-benchmarked').length,
    within3pct: count('within-3pct'),
    pickCheaper: count('pick-cheaper'),
    pickHigher: count('pick-higher'),
    noExactListing: count('no-exact-listing'),
    missedEntirely: scored.filter((s) => s.coverage === 'missed').length,
    hadItLowerDown: notTop.filter((s) => s.coverage === 'has-price').length,
    hadItNotCounted: notTop.filter((s) => s.coverage === 'not-counted').length,
    noTwin: analyses.filter((a) => a.twins.length === 0).length,
    twinShown: analyses.filter((a) => a.twins.length > 0).length,
    twinReviewed: scored.filter((s) => s.twinStatus === 'acceptable' || s.twinStatus === 'not-acceptable').length,
    twinAcceptable: scored.filter((s) => s.twinStatus === 'acceptable').length,
    twinListsFilled: entries.filter((e) => e.acceptableTwins !== null).length,
  };
}
