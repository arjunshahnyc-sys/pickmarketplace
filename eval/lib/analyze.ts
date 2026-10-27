// Run one query through Pick's pipeline exactly as the homepage does for a
// US shopper with default settings, then describe what came out.
//
// The steps mirror src/app/page.tsx (the filteredResults memo) with no
// filters on: performLiveSearch -> withLandedCosts (US + the test set's
// state) -> orderByLandedCost (the default "Total cost: Low to High" sort)
// -> enhanceProductsWithGroupInfo (same-item groups, the lowest-price chip,
// similar picks) -> orderForTrust (scam and bait never lead, new before
// not new, a verified store's listing of the searched item on top). Nothing here changes Pick's logic; it only reads the
// result. The harness's own judgments (is this listing the exact item, is
// it new, is it a multipack) come from eval/lib/rules.ts.

import { overlaysFor } from '../../src/lib/cardOverlays';
import { orderByLandedCost, withLandedCosts } from '../../src/lib/landedCost/enrich';
import { NullFxProvider } from '../../src/lib/landedCost/fx';
import { totalResolution } from '../../src/lib/landedCost/rank';
import type { LineKind } from '../../src/lib/landedCost/types';
import { enhanceProductsWithGroupInfo, pickAnchor, type EnhancedProduct } from '../../src/lib/productGrouping';
import { getRetailerTrust, type TrustLevel } from '../../src/lib/retailerTrust';
import { orderForTrust } from '../../src/lib/trustOrder';
import type { LiveSearchData } from '../../src/lib/searchService';
import type { Product } from '../../src/lib/types';
import type { Exchange } from './recorder';
import { sourceStatus } from './recorder';
import {
  conditionOf,
  matchRule,
  multipackPhrase,
  promotionalPhrase,
  variantStatus,
  type Condition,
  type VariantStatus,
} from './rules';
import type { TestEntry } from './testset';

export type CostResolution = 'resolved' | 'partial' | 'unavailable' | 'none';

export interface ListingRecord {
  /** 1-based position in Pick's default sort (Total cost: Low to High). */
  displayRank: number;
  /** 1-based position in source order (Target's direct feed first, then Google Shopping). */
  relevanceRank: number;
  source: 'target-direct' | 'google-shopping' | 'other';
  name: string;
  store: string;
  url: string;
  currency: string;
  itemPrice: number;
  originalPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  trustLevel: TrustLevel;
  /** The badge text a shopper sees: Verified retailer, Unverified seller, Possible scam... */
  trustLabel: string;
  /** From the title and the kind of store; Pick's feeds carry no condition field. */
  condition: Condition;
  /** The phrase that marks a multipack or bundle, or null for a single unit. */
  multipack: string | null;
  /** Pick's own product type for the listing (lib/facets taxonomy), e.g. "Earbuds". */
  productType: string | null;
  /** Matches the test entry's exact-item rule (`all` and `none`). */
  exactName: boolean;
  /** Whether the title states the pinned size, edition or generation. */
  variant: VariantStatus;
  /** A custom, logo-printed or promotional listing: the phrase that shows it, or null. */
  promotional: string | null;
  /**
   * exactName, not a different variant, new (per title and store), one
   * unit, not custom or promotional, and not labeled Possible scam.
   */
  likeForLike: boolean;
  /** Why a listing that matched the name rule is not like-for-like. */
  notLikeForLike: string | null;
  /** Why the name rule failed, for the listings report. */
  exactNameMiss: string | null;
  cost: {
    resolution: CostResolution;
    /** What the card's cost row says, in short. */
    summary: string;
    shipping: number | null;
    /** Where Pick's shipping figure came from (merchant policy, USPS estimate), or null. */
    shippingSource: string | null;
    tax: number | null;
    /** Item + shipping, before sales tax; null when Pick does not know the shipping. */
    preTax: number | null;
    /** Pick's full total including estimated sales tax; null unless resolved. */
    total: number | null;
  };
  pick: {
    matchType: 'same' | 'similar' | null;
    groupId: string | null;
    groupSize: number;
    /** The chip on the card image, as shown: "Same item · Save $12.00" or "Similar pick · 40% less". */
    chip: string | null;
    isLowestInGroup: boolean;
    similarTo: { name: string; savingsPercent: number; sharedSpecs: string[] } | null;
    /** Verified median this listing was flagged against (priced far below verified stores). */
    priceFlagReference: number | null;
    /** In the same-item cluster Pick treats as the searched item. */
    inAnchorCluster: boolean;
  };
}

export interface QueryAnalysis {
  id: string;
  query: string;
  category: string;
  exactItem: string;
  capturedAt: string;
  sources: {
    googleShopping: string;
    targetDirect: string;
    googleShoppingItems: number | null;
    targetDirectItems: number | null;
  };
  /** Every listing Pick returned, in the order a shopper sees them. */
  listings: ListingRecord[];
  /** The same-item cluster Pick treats as the searched item (the twin reference), or null. */
  anchor: {
    name: string;
    referencePrice: number;
    priceBasis: 'verified' | 'all';
    clusterSize: number;
    /** Cluster listings that match the exact-item name rule. */
    clusterExactName: number;
  } | null;
  counts: {
    listings: number;
    exactName: number;
    likeForLike: number;
    /** Like-for-like listings whose title does not state the pinned variant. */
    variantUnstated: number;
    differentVariant: number;
    notNew: number;
    multipack: number;
    possibleScam: number;
    /** Like-for-like exact listings inside Pick's anchor cluster. */
    likeForLikeInAnchor: number;
  };
  /**
   * PICK'S CHEAPEST EXACT LISTING, as Pick ranks it: the first like-for-like
   * listing of the exact item in the default Total cost sort. That sort
   * puts listings Pick can total (known stores) first, cheapest first, so
   * this is the lowest price Pick actually presents for the item.
   */
  pickTopExact: ListingRecord | null;
  /** 'total' = item + Pick's shipping figure; 'item' = Pick had no shipping figure. */
  pickTopExactBasis: 'total' | 'item' | null;
  /**
   * The lowest cost anywhere in Pick's results for a like-for-like listing
   * (item + shipping where known, else the item alone), whatever its rank
   * or seller. A diagnostic: it can be a junk or bait price that Pick
   * rightly ranks low.
   */
  cheapestAnywhere: ListingRecord | null;
  /**
   * The anchor-cluster listing Pick marks as that item's lowest price (the
   * "from" price, plus the "Same item · Save" chip when the saving is 1% or
   * more), if any.
   */
  lowestMarkedOnAnchor: ListingRecord | null;
  /** Listings wearing the "Similar pick" chip, in display order. */
  twins: ListingRecord[];
}

const toMajor = (minor: number | null | undefined): number | null =>
  minor === null || minor === undefined ? null : minor / 100;

function costOf(p: Product): ListingRecord['cost'] {
  const b = p.landedCost;
  if (!b) {
    return { resolution: 'none', summary: 'no breakdown', shipping: null, shippingSource: null, tax: null, preTax: null, total: null };
  }
  const line = (kind: LineKind) => b.lines.find((l) => l.kind === kind);
  const item = line('item')?.amountMinor ?? null;
  const ship = line('shipping');
  const shipping = ship?.amountMinor ?? null;
  const resolution = totalResolution(b);
  const lowMinor = b.totalRange?.lowMinor ?? b.totalMinor;
  let summary: string;
  if (resolution === 'resolved') summary = `Total $${(lowMinor / 100).toFixed(2)}`;
  else if (resolution === 'partial') summary = `Known costs $${(b.totalMinor / 100).toFixed(2)}, missing ${b.unknownComponents.join('+')}`;
  else summary = 'Total cost unavailable';
  return {
    resolution,
    summary,
    shipping: toMajor(shipping),
    shippingSource: shipping === null ? null : (ship?.sourceId ?? null),
    tax: toMajor(line('tax')?.amountMinor),
    preTax: item !== null && shipping !== null ? (item + shipping) / 100 : null,
    total: resolution === 'resolved' ? lowMinor / 100 : null,
  };
}

function chipText(p: EnhancedProduct): string | null {
  const { savings } = overlaysFor(p);
  if (!savings) return null;
  if (savings.kind === 'similar') return `Similar pick · ${savings.percent}% less`;
  return `Same item · Save $${savings.amount.toFixed(2)}`;
}

/** The comparable cost Pick knows before tax: item + shipping, or the item alone. */
export function knownCost(l: ListingRecord): number {
  return l.cost.preTax ?? l.itemPrice;
}

/** Lowest known cost before tax; ties go to a listing with a known total, then to display order. */
function cheapestOf(listings: ListingRecord[]): ListingRecord | null {
  if (listings.length === 0) return null;
  return listings.reduce((best, l) => {
    const a = knownCost(l);
    const b = knownCost(best);
    if (a < b - 1e-9) return l;
    if (Math.abs(a - b) <= 1e-9 && l.cost.preTax !== null && best.cost.preTax === null) return l;
    return best;
  });
}

function countItems(exchanges: Exchange[], source: 'serper' | 'target'): number | null {
  const ex = exchanges.find((e) => e.source === source);
  if (!ex || ex.error || !ex.body || typeof ex.body !== 'object') return null;
  if (source === 'serper') {
    const shopping = (ex.body as { shopping?: unknown }).shopping;
    return Array.isArray(shopping) ? shopping.length : 0;
  }
  const products = (ex.body as { data?: { search?: { products?: unknown } } }).data?.search?.products;
  return Array.isArray(products) ? products.length : 0;
}

export function analyzeQuery(
  entry: TestEntry,
  data: LiveSearchData,
  exchanges: Exchange[],
  capturedAt: string,
  state: string
): QueryAnalysis {
  const results = data.results;
  const now = new Date(capturedAt);

  // The homepage pipeline, default settings (see the header comment).
  const enriched = withLandedCosts([...results], { country: 'US', currency: 'USD', subdivision: state }, now, new NullFxProvider());
  const ordered = orderByLandedCost(enriched).products;
  const enhanced = orderForTrust(enhanceProductsWithGroupInfo(ordered, results, { query: entry.query }), 'total-cost');
  const anchor = pickAnchor(results, { query: entry.query });

  const relevanceRank = new Map<string, number>();
  results.forEach((p, i) => relevanceRank.set(p.id ?? `${p.retailer}|${p.name}`, i + 1));

  // The anchor's cluster: the group of its representative listing (names
  // are unique within one market's results after Pick's dedup).
  const representative = anchor ? enhanced.find((p) => p.name === anchor.name) : undefined;
  const inAnchor = (p: EnhancedProduct): boolean =>
    !!representative &&
    (representative.groupId ? p.groupId === representative.groupId : p === representative);

  const rule = entry.exactItem.match;
  const listings: ListingRecord[] = enhanced.map((p, i) => {
    const trust = getRetailerTrust(p.retailer, { market: p.sourceMarket, url: p.url });
    const condition = conditionOf(p.name, p.retailer);
    const multipack = multipackPhrase(p.name);
    const promotional = promotionalPhrase(p.name);
    const verdict = matchRule(p.name, rule, p.retailer);
    const variant = variantStatus(p.name, rule);
    const reasons: string[] = [];
    if (verdict.matched) {
      if (variant === 'different') reasons.push('states a different size, edition or generation');
      if (condition === 'resale') reasons.push('resale or auction store');
      else if (condition === 'lease') reasons.push('lease-to-own price');
      else if (condition === 'digital') reasons.push('digital copy (e-textbook store)');
      else if (condition !== 'new') reasons.push(condition);
      if (multipack) reasons.push(`multipack or bundle (${multipack})`);
      if (promotional) reasons.push(`custom or promotional (${promotional})`);
      if (trust.level === 'flagged') reasons.push('Possible scam');
    }
    const id = p.id ?? `${p.retailer}|${p.name}`;
    return {
      displayRank: i + 1,
      relevanceRank: relevanceRank.get(id) ?? 0,
      source: id.startsWith('target:') ? 'target-direct' : id.startsWith('serper:') ? 'google-shopping' : 'other',
      name: p.name,
      store: p.retailer,
      url: p.url,
      currency: p.currency ?? 'USD',
      itemPrice: p.price,
      originalPrice: p.originalPrice ?? null,
      rating: p.rating ?? null,
      reviewCount: p.reviewCount ?? null,
      trustLevel: trust.level,
      trustLabel: trust.label,
      condition,
      multipack,
      productType: p.attributes?.type ?? null,
      promotional,
      exactName: verdict.matched,
      variant,
      likeForLike: verdict.matched && reasons.length === 0,
      notLikeForLike: verdict.matched && reasons.length > 0 ? reasons.join(', ') : null,
      exactNameMiss: verdict.matched ? null : (verdict.reason ?? null),
      cost: costOf(p),
      pick: {
        matchType: p.matchType ?? null,
        groupId: p.groupId ?? null,
        groupSize: p.groupSize ?? 1,
        chip: chipText(p),
        isLowestInGroup: !!p.isLowestInGroup,
        similarTo: p.similarTo ?? null,
        priceFlagReference: p.priceFlag?.referencePrice ?? null,
        inAnchorCluster: inAnchor(p),
      },
    };
  });

  const likeForLike = listings.filter((l) => l.likeForLike);
  const exact = listings.filter((l) => l.exactName);
  const pickTopExact = likeForLike[0] ?? null;
  const anchorListings = listings.filter((l) => l.pick.inAnchorCluster);

  return {
    id: entry.id,
    query: entry.query,
    category: entry.category,
    exactItem: entry.exactItem.description,
    capturedAt,
    sources: {
      googleShopping: sourceStatus(exchanges, 'serper'),
      targetDirect: sourceStatus(exchanges, 'target'),
      googleShoppingItems: countItems(exchanges, 'serper'),
      targetDirectItems: countItems(exchanges, 'target'),
    },
    listings,
    anchor: anchor
      ? {
          name: anchor.name,
          referencePrice: anchor.price,
          priceBasis: anchor.priceBasis,
          clusterSize: anchor.listingCount,
          clusterExactName: anchorListings.filter((l) => l.exactName).length,
        }
      : null,
    counts: {
      listings: listings.length,
      exactName: exact.length,
      likeForLike: likeForLike.length,
      variantUnstated: likeForLike.filter((l) => l.variant === 'unstated').length,
      differentVariant: exact.filter((l) => l.variant === 'different').length,
      notNew: exact.filter((l) => l.condition !== 'new').length,
      multipack: exact.filter((l) => l.multipack !== null).length,
      possibleScam: exact.filter((l) => l.trustLevel === 'flagged').length,
      likeForLikeInAnchor: anchorListings.filter((l) => l.likeForLike).length,
    },
    pickTopExact,
    pickTopExactBasis: pickTopExact ? (pickTopExact.cost.preTax !== null ? 'total' : 'item') : null,
    cheapestAnywhere: cheapestOf(likeForLike),
    lowestMarkedOnAnchor: anchorListings.find((l) => l.pick.isLowestInGroup) ?? null,
    twins: listings.filter((l) => l.pick.matchType === 'similar'),
  };
}
