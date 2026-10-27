// What a /compare/[slug] page says, computed from one search's results by
// Pick's own pipeline, exactly as the homepage would rank them for a US
// shopper with no delivery state chosen: landed costs (item plus shipping,
// sales tax unknown without a state) -> the default "Total cost" order ->
// same-item clusters and similar picks -> the trust rules. Nothing here
// judges listings on its own; it reads what the pipeline marked and puts
// it into the shape the page renders. Pure and clock-injected, so it is
// unit-tested on captured fixtures and renders the same on every host.

import { CONDITION_LABELS, listingCondition } from './condition';
import { orderByLandedCost, withLandedCosts } from './landedCost/enrich';
import { enhanceProductsWithGroupInfo, pickAnchor, type EnhancedProduct } from './productGrouping';
import { getRetailerTrust, hasUnverifiedSeller, type TrustLevel } from './retailerTrust';
import type { LiveSearchData } from './searchService';
import { orderForTrust } from './trustOrder';
import type { Product } from './types';

/** One listing as the page shows it. */
export interface ComparisonRow {
  name: string;
  store: string;
  url: string;
  image: string;
  price: number;
  currency: string;
  originalPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  trustLevel: TrustLevel;
  /** The badge text a shopper sees: Verified, Marketplace seller, Unverified seller... */
  trustLabel: string;
  /** Refurbished, Open box, Resale store...; null for a new unit. */
  conditionLabel: string | null;
  /** Shipping in minor units when Pick has a figure (a published policy or a USPS estimate); null when unknown. */
  shippingMinor: number | null;
  /** What the shipping line says, e.g. "Shipping (Best Buy policy)"; null when unknown. */
  shippingLabel: string | null;
  /** Item plus shipping in minor units, before sales tax; null when shipping is unknown. */
  preTaxMinor: number | null;
}

export interface ComparisonTwin extends ComparisonRow {
  /** How much cheaper than the searched item's typical price, as the chip says. */
  savingsPercent: number;
  /** What the two items share, as chip text (see sharedSpecs.ts). */
  sharedSpecs: string[];
}

export interface Comparison {
  /** When the prices were checked, ISO 8601. */
  checkedAt: string;
  /** How many listings the search returned and from how many stores. */
  listingCount: number;
  storeCount: number;
  item: {
    /** The listing name Pick treats as the searched item, or null when it found no cluster for it. */
    anchorName: string | null;
    /** What verified stores typically charge for it (or the cluster median when no verified price exists). */
    referencePrice: number | null;
    priceBasis: 'verified' | 'all' | null;
    /**
     * The price on top: the first listing of the searched item in Pick's
     * order that is a verified store's new unit, else the first listing of
     * it at all (topIsVerifiedNew says which).
     */
    top: ComparisonRow | null;
    topIsVerifiedNew: boolean;
    /** Listings of the searched item in Pick's order, the top one first; bait and flagged sellers left out. */
    rows: ComparisonRow[];
    /** Listings of the item Pick left out of the table: priced far below verified stores, or a flagged seller. */
    leftOut: number;
  };
  /** The first listing wearing the Similar pick chip, or null when none passed Pick's bar. */
  twin: ComparisonTwin | null;
  /** Further similar picks of other items, in Pick's order. */
  moreTwins: ComparisonTwin[];
  /** A row in view carries the Unverified seller badge, so the page shows its disclosure. */
  hasUnverifiedSeller: boolean;
}

/** Listings of the searched item the table shows, at most. */
export const MAX_ITEM_ROWS = 8;
/** Similar picks beyond the first, at most. */
export const MAX_MORE_TWINS = 3;

function rowOf(p: EnhancedProduct): ComparisonRow {
  const trust = getRetailerTrust(p.retailer, { market: p.sourceMarket, url: p.url });
  const condition = listingCondition(p, trust.level);
  const shipping = p.landedCost?.lines.find((l) => l.kind === 'shipping');
  const item = p.landedCost?.lines.find((l) => l.kind === 'item');
  const shippingMinor = shipping?.amountMinor ?? null;
  const itemMinor = item?.amountMinor ?? null;
  return {
    name: p.name,
    store: p.retailer,
    url: p.url,
    image: p.image,
    price: p.price,
    currency: p.currency ?? 'USD',
    originalPrice: p.originalPrice ?? null,
    rating: p.rating ?? null,
    reviewCount: p.reviewCount ?? null,
    trustLevel: trust.level,
    trustLabel: trust.label,
    conditionLabel: CONDITION_LABELS[condition],
    shippingMinor,
    shippingLabel: shippingMinor === null ? null : (shipping?.label ?? 'Shipping'),
    preTaxMinor: shippingMinor !== null && itemMinor !== null ? itemMinor + shippingMinor : null,
  };
}

function twinOf(p: EnhancedProduct): ComparisonTwin {
  return {
    ...rowOf(p),
    savingsPercent: p.similarTo?.savingsPercent ?? 0,
    sharedSpecs: p.similarTo?.sharedSpecs ?? [],
  };
}

/** The twin's own item, so two listings of one alternative count once. */
const twinKey = (p: EnhancedProduct) => p.groupId ?? p.name;

export function buildComparison(data: LiveSearchData, query: string, now: Date): Comparison {
  const results: Product[] = data.results.filter((p) => !p.isFallback);

  // The homepage pipeline, default settings, no delivery state.
  const enriched = withLandedCosts([...results], { country: 'US', currency: 'USD' }, now);
  const ordered = orderByLandedCost(enriched).products;
  const ranked = orderForTrust(enhanceProductsWithGroupInfo(ordered, results, { query }), 'total-cost');
  const anchor = pickAnchor(results, { query });

  const isVerifiedNew = (p: EnhancedProduct) => {
    const level = getRetailerTrust(p.retailer, { market: p.sourceMarket, url: p.url }).level;
    return level === 'verified' && listingCondition(p, level) === 'new';
  };
  const isFlagged = (p: EnhancedProduct) =>
    !!p.priceFlag || getRetailerTrust(p.retailer, { market: p.sourceMarket, url: p.url }).level === 'flagged';

  const ofItem = ranked.filter((p) => p.inSearchedItem);
  const shown = ofItem.filter((p) => !isFlagged(p));
  const topProduct = shown.find(isVerifiedNew) ?? shown[0] ?? null;
  const tableProducts = topProduct
    ? [topProduct, ...shown.filter((p) => p !== topProduct)].slice(0, MAX_ITEM_ROWS)
    : [];

  const similar = ranked.filter((p) => p.matchType === 'similar' && !isFlagged(p));
  const twinProduct = similar[0] ?? null;
  const seen = new Set<string>(twinProduct ? [twinKey(twinProduct)] : []);
  const more: EnhancedProduct[] = [];
  for (const p of similar.slice(1)) {
    const key = twinKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    more.push(p);
    if (more.length === MAX_MORE_TWINS) break;
  }

  const inView = [...tableProducts, ...(twinProduct ? [twinProduct] : []), ...more];

  return {
    checkedAt: data.checkedAt,
    listingCount: results.length,
    storeCount: new Set(results.map((p) => p.retailer)).size,
    item: {
      anchorName: anchor?.name ?? null,
      referencePrice: anchor?.price ?? null,
      priceBasis: anchor?.priceBasis ?? null,
      top: topProduct ? rowOf(topProduct) : null,
      topIsVerifiedNew: !!topProduct && isVerifiedNew(topProduct),
      rows: tableProducts.map(rowOf),
      leftOut: ofItem.length - shown.length,
    },
    twin: twinProduct ? twinOf(twinProduct) : null,
    moreTwins: more.map(twinOf),
    hasUnverifiedSeller: hasUnverifiedSeller(inView),
  };
}

// Deterministic across server and client (explicit locale and UTC), like
// the card's "Price verified" line, so a prerendered page hydrates cleanly.
const checkedDateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "Oct 27, 2026" for the freshness stamp. */
export function formatCheckedDate(iso: string): string {
  return checkedDateFormat.format(new Date(iso));
}
