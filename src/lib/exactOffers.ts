// The paid half of exactItem.ts: asks Google (Serper /product, 2 credits a
// call) which stores sell exactly a catalog product. Server only.
//
// At most MAX_LOOKUPS calls per product:
//
//   1. The cheapest verified-store row whose title names the product. It is
//      the row that would otherwise top the page on a search title alone,
//      and its offer list replaces it with the store's own title, price and
//      page. A second such row is asked about only when the first answer
//      was not the product or named no verified store, since Google
//      sometimes files one product under several entries.
//   2. One row Pick's grouping files with the product but whose search
//      title does not name it, when it is cheaper than everything confirmed
//      so far. Stores in that list count only if their own titles name the
//      product. This is how Best Buy's $88 "Sony Wireless Noise-Canceling
//      Headphones" is recognised as the WH-CH720N, where a title-only rule
//      left Target's $183.34 as the lowest price (2026-11-12).
//
// A page render therefore costs 2 to 6 credits here on top of its searches.
//
// Nothing is cached in this module: the callers are ISR pages that render
// once per revalidation window, and product ids from a search row stop
// resolving within hours, so a cache keyed by them would only ever miss.

import { toAffiliateUrl } from './affiliate';
import type { ComparisonEntry } from './comparisons';
import {
  exactRule,
  isExactListing,
  offerListCandidates,
  offerListIsExact,
  offersAsListings,
  parseOfferList,
  possibleCandidates,
  titleMismatch,
  withoutOtherSizePrices,
} from './exactItem';
import { listingCondition } from './condition';
import { enhanceProductsWithGroupInfo } from './productGrouping';
import { getRetailerTrust } from './retailerTrust';
import type { LiveSearchData } from './searchService';
import type { Product } from './types';

export const MAX_LOOKUPS = 3;
/** Of which rows whose titles name the product, at most. */
const MAX_NAMED_LOOKUPS = 2;
const LOOKUP_TIMEOUT_MS = 8000;

/** Fetches the raw /product response for a search row's product id; null on any failure. */
export type OfferListFetcher = (productId: string) => Promise<unknown | null>;

/**
 * One /product call. Resolves to the response, or to null when Google has
 * no list for the id (a 404: a row's product id can stop resolving within
 * hours). Throws when the call itself fails, so a caller that caches
 * results can tell "there is none" from "could not ask".
 */
export async function requestOfferList(productId: string): Promise<unknown | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error('SERPER_API_KEY is not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch('https://google.serper.dev/product', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, gl: 'us', hl: 'en' }),
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`offer list lookup returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export const fetchOfferListJson: OfferListFetcher = async (productId) => {
  try {
    return await requestOfferList(productId);
  } catch (error) {
    console.error('[Serper] offer list lookup failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

/** What a comparison page needs to price exactly its product. */
export interface ExactItem {
  /**
   * Whether a search listing counts as the exact product on its own title.
   * False for a row an offer list has replaced: the list carries the same
   * offer under the store's own title, which may say what the search title
   * did not ("Renewed").
   */
  isExactListing: (product: Product) => boolean;
  /**
   * Whether a search listing's title names the product at all, replaced or
   * not and with or without a pinned size. Not for pricing: for reading what
   * the product is (its reviews, its specs) when looking for a twin.
   */
  namesProduct: (product: Product) => boolean;
  /**
   * Offers from Google's offer lists for the product, as listings titled
   * and linked by the store. Empty when no list could be confirmed.
   */
  offers: Product[];
  /** Google's title for the confirmed product; null when none was confirmed. */
  listTitle: string | null;
  /** Google's typical price range for the confirmed product, when it gives one. */
  typicalRange: [number, number] | null;
  /** How many paid lookups ran. */
  lookups: number;
}

const trustOf = (p: Product) => getRetailerTrust(p.retailer, { market: p.sourceMarket, url: p.url }).level;
const isVerifiedNew = (p: Product) => trustOf(p) === 'verified' && listingCondition(p, 'verified') === 'new';

/**
 * The exact-item evidence for one catalog product over one search's
 * results. Undefined when the product has no rule, which leaves the page on
 * its general grouping.
 */
export async function resolveExactItem(
  entry: ComparisonEntry,
  data: LiveSearchData,
  fetcher: OfferListFetcher = fetchOfferListJson
): Promise<ExactItem | undefined> {
  const rule = exactRule(entry);
  if (!rule) return undefined;
  const results = data.results.filter((p) => !p.isFallback);

  const offers: Product[] = [];
  const replaced = new Set<Product>();
  let listTitle: string | null = null;
  let typicalRange: [number, number] | null = null;
  let lookups = 0;

  const asked = new Set<Product>();
  const ask = async (row: Product): Promise<boolean> => {
    lookups++;
    asked.add(row);
    const list = parseOfferList(await fetcher(row.googleProductId as string));
    if (!list) return false;
    const kept = offersAsListings(list, rule);
    const whole = offerListIsExact(list, rule);
    if (!whole && kept.length === 0) return false;
    if (whole) {
      listTitle ??= list.title;
      typicalRange ??= list.typicalRange;
    }
    replaced.add(row);
    for (const offer of kept) {
      if (!offers.some((o) => o.retailer === offer.retailer && o.price === offer.price && o.name === offer.name)) {
        offers.push(offer);
      }
    }
    return true;
  };

  // 1. Rows whose titles name the product.
  for (const row of offerListCandidates(results, rule).slice(0, MAX_NAMED_LOOKUPS)) {
    await ask(row);
    if (offers.some(isVerifiedNew)) break;
  }

  const cheapestConfirmed = (): number | null => {
    const prices = offers.filter(isVerifiedNew).map((o) => o.price);
    return prices.length > 0 ? Math.min(...prices) : null;
  };
  const namesProduct = (p: Product) =>
    !replaced.has(p) &&
    isExactListing(p, rule) &&
    // The same store at the same price is the same offer, already listed.
    !offers.some((o) => o.retailer === p.retailer && o.price === p.price);

  // 2. One more row that would undercut everything confirmed so far: a row
  //    that names the product but has not been asked about, or one the
  //    grouping files with the product under a title that does not name it.
  if (lookups < MAX_LOOKUPS) {
    const floor = cheapestConfirmed();
    const under = (p: Product) => floor === null || p.price < floor;
    const filedWithItem = new Set(
      enhanceProductsWithGroupInfo(results, results, { query: entry.query })
        .filter((p) => p.inSearchedItem)
        .map((p) => p.id ?? `${p.retailer}|${p.name}`)
    );
    const unasked = offerListCandidates(results, rule).filter((p) => !replaced.has(p) && !asked.has(p) && isVerifiedNew(p));
    const possible = possibleCandidates(results, rule, (p) => filedWithItem.has(p.id ?? `${p.retailer}|${p.name}`));
    const next = [...unasked, ...possible].filter(under).sort((a, b) => a.price - b.price)[0];
    if (next) await ask(next);
  }

  // Search-row prices proved unreliable on the 2026-11-12 capture: Best
  // Buy's row for the AirPods 4 said $104.99 while Google's own offer list
  // for that row had no Best Buy offer and verified stores from $161.99.
  // So once any verified store is confirmed by a list, a verified store's
  // search row that undercuts it does not count unless a list confirmed it.
  const kept = withoutOtherSizePrices(offers, rule);
  const keptPrices = kept.filter(isVerifiedNew).map((o) => o.price);
  const floor = keptPrices.length > 0 ? Math.min(...keptPrices) : null;
  const countsOnTitle = (p: Product) =>
    namesProduct(p) && !(floor !== null && isVerifiedNew(p) && p.price < floor);

  return {
    isExactListing: countsOnTitle,
    namesProduct: (p) => titleMismatch(p.name, p.retailer, rule, true) === null,
    // Offer links are the stores' own pages, so they are commission-tagged
    // here the way search results are in searchService (and not at all for
    // the excluded retailers).
    offers: kept.map((offer) => ({
      ...offer,
      url: toAffiliateUrl(offer.url, { retailer: offer.retailer, market: offer.sourceMarket }),
    })),
    listTitle,
    typicalRange,
    lookups,
  };
}
