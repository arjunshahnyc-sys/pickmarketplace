// In-process search pipeline for /api/search-live.
//
// The extension-era routes (/api/search, /api/ask, /api/similar) that shared
// this module were removed along with the browser extension.

import { searchGoogleShoppingAPI, buildRetailerDeepLinks, type FeedMarket } from './scrapers';
import { toAffiliateUrl } from './affiliate';
import { deriveFacets, type FacetGroup } from './facets/deriveFacets';
import type { Product, RetailerSearchLink } from './types';

export interface LiveSearchData {
  results: Product[];
  retailerSearchLinks: RetailerSearchLink[];
  message: string;
  retailersFound: string[];
  /** Filter chips derived from the result set (lib/facets); [] when none can narrow it. */
  facets: FacetGroup[];
  checkedAt: string;
  /** Set when every price source failed — an outage, not a genuine zero-match. */
  allSourcesFailed?: boolean;
}

// Anchored on globalThis because Next bundles each route with its own copy
// of this module — a plain module-level Map would give every route a private
// cache and multiply paid Serper calls for the same query.
const globalStore = globalThis as unknown as {
  __pickSearchCache?: Map<string, { data: LiveSearchData; ts: number }>;
};
const cache = (globalStore.__pickSearchCache ??= new Map<string, { data: LiveSearchData; ts: number }>());
const TTL = 30 * 60 * 1000;
// Empty result sets get a short TTL: they're usually a transient scraper
// timeout, and caching them for the full 30 minutes blanks that query for
// everyone. The short window still stops hopeless queries from hammering
// the paid API on every request.
const TTL_EMPTY = 60 * 1000;
const MAX_CACHE_SIZE = 100;
const CACHE_EVICTION_COUNT = 20;

/**
 * Live search (Google Shopping via Serper) with a 30-minute in-memory cache.
 *
 * `extraMarkets` adds non-US Google Shopping feeds beside the US one (the
 * landed-cost flow passes the shopper's market so local offers compete with
 * US imports). Empty = the legacy US-only search, byte-identical, on the
 * legacy cache key.
 */
export async function performLiveSearch(
  q: string,
  extraMarkets: FeedMarket[] = []
): Promise<LiveSearchData> {
  const markets = Array.from(new Set(extraMarkets)).sort();
  const key =
    markets.length === 0
      ? q.toLowerCase().trim()
      : `${q.toLowerCase().trim()}|${markets.join(',')}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < (cached.data.results.length > 0 ? TTL : TTL_EMPTY)) {
    return cached.data;
  }

  // Search every market's feed in parallel (the US feed first).
  const [googleSearch, ...extraSearches] = await Promise.all([
    searchGoogleShoppingAPI(q),
    ...markets.map((m) => searchGoogleShoppingAPI(q, m)),
  ]);
  const allSourcesFailed = Boolean(
    googleSearch.sourceError && extraSearches.every((s) => s.sourceError)
  );

  const allResults = [...googleSearch.products, ...extraSearches.flatMap((s) => s.products)];

  // Drop exact repeats only: the same store's same title in the same
  // market. Two stores selling under one title are two offers to compare
  // (keying on the title alone hid a $12.99 T.J.Maxx CeraVe behind
  // Walmart's $17.97 in a 2026-09-22 capture), and the same title in two
  // markets is two offers in two currencies.
  const seen = new Set<string>();
  const uniqueResults = allResults
    .filter((product) => {
      const dedupKey = `${product.sourceMarket ?? 'US'}|${product.retailer.toLowerCase().trim()}|${product.name.toLowerCase().trim()}`;
      if (seen.has(dedupKey)) {
        return false;
      }
      seen.add(dedupKey);
      return true;
    })
    // Commission tracking is applied last, to the link only, never to
    // ordering. Results stay ranked by the sources' relevance order.
    // Identity is passed through because some merchants (Amazon) are barred
    // from tagging entirely; see isCommissionExcluded.
    .map((product) => ({
      ...product,
      url: toAffiliateUrl(product.url, {
        retailer: product.retailer,
        market: product.sourceMarket,
      }),
    }));

  // Filter chips come from the result set itself, computed once here so
  // the API response, the cache entry, and the ISR category page share
  // them. Attaches per-product attributes; order, ids and urls unchanged.
  // Never allowed to fail the paid search path.
  let facets: FacetGroup[] = [];
  let results: Product[] = uniqueResults;
  try {
    ({ products: results, facets } = deriveFacets(uniqueResults, q));
  } catch (error) {
    console.error('Facet derivation failed:', error);
  }

  // Always generate retailer search links
  const retailerLinks = buildRetailerDeepLinks(q);

  // Get unique retailers from results
  const retailersFound = Array.from(new Set(results.map(p => p.retailer)));

  // Determine message based on results
  let message = "";
  if (results.length > 0) {
    if (retailersFound.length > 1) {
      message = `Showing results from ${retailersFound.slice(0, -1).join(', ')} and ${retailersFound[retailersFound.length - 1]}. Search more retailers below.`;
    } else {
      message = `Showing results from ${retailersFound[0]}. Search other retailers directly below.`;
    }
  } else {
    message = "No exact product matches found. Search retailers directly:";
  }

  const data: LiveSearchData = {
    results,
    retailerSearchLinks: retailerLinks,
    message,
    retailersFound, // For frontend to display dynamic header
    facets,
    checkedAt: new Date().toISOString(), // preserved in cache so the UI can show real freshness
    allSourcesFailed,
  };

  // A total outage is not a result — caching it would serve the failure to
  // everyone for the TTL window.
  if (allSourcesFailed) {
    return data;
  }

  // Cache eviction: if cache is too large, delete oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].ts - b[1].ts);
    // Delete oldest entries
    for (let i = 0; i < CACHE_EVICTION_COUNT && i < entries.length; i++) {
      cache.delete(entries[i][0]);
    }
  }

  // Add to cache
  cache.set(key, { data, ts: Date.now() });

  return data;
}

