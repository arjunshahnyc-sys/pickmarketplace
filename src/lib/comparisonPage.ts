// What a /compare/[slug] page says, computed from one search's results by
// Pick's own pipeline, exactly as the homepage would rank them for a US
// shopper with no delivery state chosen: landed costs (item plus shipping,
// sales tax unknown without a state) -> the default "Total cost" order ->
// same-item clusters and similar picks -> the trust rules. Nothing here
// judges listings on its own; it reads what the pipeline marked and puts
// it into the shape the page renders. Pure and clock-injected, so it is
// unit-tested on captured fixtures and renders the same on every host.

import { CONDITION_LABELS, listingCondition, type ListingCondition } from './condition';
import { orderByLandedCost, withLandedCosts } from './landedCost/enrich';
import type { AlternativeSearch } from './comparisons';
import { enhanceProductsWithGroupInfo, findAlternatives, pickAnchor, type EnhancedProduct } from './productGrouping';
import { getRetailerTrust, hasUnverifiedSeller, type TrustLevel } from './retailerTrust';
import type { LiveSearchData } from './searchService';
import { orderForTrust } from './trustOrder';
import type { Product } from './types';

/** One listing as the page shows it. */
export interface ComparisonRow {
  name: string;
  store: string;
  url: string;
  /** /api/out link that resolves the store's product page on click; see Product.clickUrl. */
  clickUrl?: string;
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
    /**
     * Google's own "typically $X to $Y" for the product, low and high, when
     * the page has exact-item evidence and Google gives one. Google's
     * figure, not Pick's; the page says so.
     */
    googleTypicalRange: [number, number] | null;
  };
  /** The best cheaper twin, or null when none passed Pick's bar. */
  twin: ComparisonTwin | null;
  /**
   * The brand-free search the twin candidates came from ("wireless noise
   * cancelling earbuds"); null when the page looked only among the item's
   * own search results.
   */
  twinSearch: string | null;
  /** The price a twin's savings are measured against; null when there is no searched-item price. */
  twinReferencePrice: number | null;
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
    clickUrl: p.clickUrl,
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

/** A second search to look for the twin in, and what a twin must be. */
export interface AlternativesInput {
  /** Results of the brand-free search (see comparisons.ts). */
  data: LiveSearchData;
  search: AlternativeSearch;
  /** The searched item's brand as one lowercase word. */
  brand: string;
}

/**
 * Evidence about which listings are exactly the page's product (see
 * exactItem.ts and exactOffers.ts). With it, the page prices that product
 * and nothing filed near it: Pick's general grouping put the Pixel Buds 2a
 * on top of the Pixel Buds Pro 2 page (2026-11-12).
 */
export interface ExactItemInput {
  /** Whether a search listing's own title says it is the exact product, one unit. */
  isExactListing: (product: Product) => boolean;
  /** New-unit offers from Google's offer list for the product, as listings. */
  offers: Product[];
  /** Google's title for the product; null when no offer list was confirmed. */
  listTitle: string | null;
  /** Google's typical price range for the product, when it gives one. */
  typicalRange?: [number, number] | null;
}

/** A typical price needs this many verified stores: fewer is one store's price, or the midpoint of two. */
export const MIN_STORES_FOR_TYPICAL = 3;
/** An unverified seller under this share of the verified median is left out as bait (as on results pages). */
const FAR_BELOW_VERIFIED = 0.6;

const medianOf = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
};

const trustOf = (p: Product) => getRetailerTrust(p.retailer, { market: p.sourceMarket, url: p.url }).level;

/**
 * The listings of exactly the product: every offer in Google's list, then
 * the search rows whose own titles name it, one per store and condition
 * (a store's refurbished unit is a different row from its new one). The
 * offer wins a tie, because its link is the store's own product page.
 */
function exactListings(results: Product[], exact: ExactItemInput): Product[] {
  const kept = new Map<string, Product>();
  for (const p of [...exact.offers, ...results.filter(exact.isExactListing)]) {
    const condition: ListingCondition = listingCondition(p, trustOf(p));
    const key = `${p.retailer}|${condition}`;
    const held = kept.get(key);
    if (!held || p.price < held.price) kept.set(key, p);
  }
  return Array.from(kept.values());
}

export function buildComparison(
  data: LiveSearchData,
  query: string,
  now: Date,
  alternatives?: AlternativesInput,
  exact?: ExactItemInput
): Comparison {
  const results: Product[] = data.results.filter((p) => !p.isFallback);
  // With exact-item evidence the page is built from those listings alone;
  // without it, from the search results and Pick's grouping.
  const listings = exact ? exactListings(results, exact) : results;

  // The homepage pipeline, default settings, no delivery state.
  const enriched = withLandedCosts([...listings], { country: 'US', currency: 'USD' }, now);
  const ordered = orderByLandedCost(enriched).products;
  const ranked = orderForTrust(enhanceProductsWithGroupInfo(ordered, listings, { query }), 'total-cost');

  const isVerifiedNew = (p: Product) => {
    const level = trustOf(p);
    return level === 'verified' && listingCondition(p, level) === 'new';
  };

  // What verified stores typically charge. From the grouping it is the
  // cluster's own statistic; from exact listings it is the median across
  // verified stores' new units, and only with enough stores to mean it.
  const groupingAnchor = pickAnchor(results, { query });
  const verifiedPrices = exact ? listings.filter(isVerifiedNew).map((p) => p.price) : [];
  const exactTypical = verifiedPrices.length >= MIN_STORES_FOR_TYPICAL ? medianOf(verifiedPrices) : null;
  // The reference a twin is compared with (specs, rating) comes from the
  // exact-titled search rows when they form one, since offer-list rows
  // carry no review counts.
  const anchor = exact
    ? pickAnchor(results.filter(exact.isExactListing), { query }) ?? groupingAnchor
    : groupingAnchor;

  const baitCeiling = verifiedPrices.length > 0 ? medianOf(verifiedPrices) * FAR_BELOW_VERIFIED : null;
  const isFlagged = (p: EnhancedProduct) => {
    const level = trustOf(p);
    if (p.priceFlag || level === 'flagged') return true;
    return exact !== undefined && baitCeiling !== null && level !== 'verified' && p.price < baitCeiling;
  };

  const ofItem = exact ? ranked : ranked.filter((p) => p.inSearchedItem);
  const shown = ofItem.filter((p) => !isFlagged(p));
  // With exact-item evidence the price on top is a verified store's new
  // unit or nothing: a marketplace or resale listing is still shown in the
  // table, but "$25 at eBay" is not the product's lowest real price.
  const topProduct = shown.find(isVerifiedNew) ?? (exact ? null : (shown[0] ?? null));
  const tableProducts = (topProduct ? [topProduct, ...shown.filter((p) => p !== topProduct)] : exact ? shown : []).slice(
    0,
    MAX_ITEM_ROWS
  );

  // A twin's savings are measured against the price the page puts on top
  // when that is a verified store's new unit and lower than the typical
  // price: a twin that is "54% less" than a typical $329 but only 24% under
  // today's $198 at Best Buy would be a claim the page itself contradicts.
  const typicalPrice = exact ? exactTypical : (groupingAnchor?.price ?? null);
  const topVerifiedNew = topProduct && isVerifiedNew(topProduct) ? topProduct.price : null;
  const twinReferencePrice = exact
    ? // Exactly the product: its lowest verified price, else its typical one.
      (topVerifiedNew ?? exactTypical)
    : groupingAnchor
      ? topVerifiedNew !== null
        ? Math.min(groupingAnchor.price, topVerifiedNew)
        : groupingAnchor.price
      : null;

  let similar: EnhancedProduct[];
  if (alternatives) {
    // Candidates from the brand-free search, plus anything else the item's
    // own search returned, priced like every other listing on the page.
    const pool = withLandedCosts(
      [...alternatives.data.results.filter((p) => !p.isFallback), ...results],
      { country: 'US', currency: 'USD' },
      now
    );
    // Cheaper has to survive shipping: a $9.88 pair of earbuds with $6.99
    // shipping is not a cheaper twin of a $14.99 pair that ships free (live
    // on 2026-11-12). Where Pick has both delivered totals, the twin's must
    // be the lower one.
    const topDelivered = topProduct ? rowOf(topProduct).preTaxMinor : null;
    const cheaperDelivered = (p: EnhancedProduct) => {
      const delivered = rowOf(p).preTaxMinor;
      return topDelivered === null || delivered === null || delivered < topDelivered;
    };
    similar =
      anchor && twinReferencePrice !== null
        ? findAlternatives({ ...anchor, price: twinReferencePrice }, pool, {
            query,
            kind: alternatives.search.kind,
            not: alternatives.search.not,
            brand: alternatives.brand,
          }).filter(cheaperDelivered)
        : [];
  } else if (exact) {
    // Exact listings are all the product itself; a twin only ever comes
    // from the second search.
    similar = [];
  } else {
    similar = ranked.filter((p) => p.matchType === 'similar' && !isFlagged(p));
  }
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
      anchorName: exact ? (exact.listTitle ?? topProduct?.name ?? null) : (groupingAnchor?.name ?? null),
      referencePrice: typicalPrice,
      priceBasis: exact ? (exactTypical !== null ? 'verified' : null) : (groupingAnchor?.priceBasis ?? null),
      top: topProduct ? rowOf(topProduct) : null,
      topIsVerifiedNew: !!topProduct && isVerifiedNew(topProduct),
      rows: tableProducts.map(rowOf),
      leftOut: ofItem.length - shown.length,
      googleTypicalRange: exact?.typicalRange ?? null,
    },
    twin: twinProduct ? twinOf(twinProduct) : null,
    twinSearch: alternatives ? alternatives.search.query : null,
    twinReferencePrice,
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
