// In-process search pipeline for /api/search-live.
//
// The extension-era routes (/api/search, /api/ask, /api/similar) that shared
// this module were removed along with the browser extension.

import { searchTarget, searchGoogleShoppingAPI, buildRetailerDeepLinks } from './scrapers';
import { toAffiliateUrl } from './affiliate';
import type { Product, RetailerSearchLink } from './types';

export interface LiveSearchData {
  results: Product[];
  retailerSearchLinks: RetailerSearchLink[];
  message: string;
  retailersFound: string[];
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

/** Live search (Serper + Target) with a 30-minute in-memory cache. */
export async function performLiveSearch(q: string): Promise<LiveSearchData> {
  const key = q.toLowerCase().trim();

  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < (cached.data.results.length > 0 ? TTL : TTL_EMPTY)) {
    return cached.data;
  }

  // Search both APIs in parallel
  const [googleSearch, targetSearch] = await Promise.all([
    searchGoogleShoppingAPI(q),
    searchTarget(q),
  ]);
  const googleResults = googleSearch.products;
  const targetResults = targetSearch.products;
  const allSourcesFailed = Boolean(googleSearch.sourceError && targetSearch.sourceError);

  // Combine and deduplicate results. Target goes first because dedup keeps
  // the first occurrence, and Target copies carry a direct product URL and
  // originalPrice (sale data) that Google Shopping mirrors of the same
  // listing lack.
  const allResults = [...targetResults, ...googleResults];

  // Deduplicate by product name (case-insensitive)
  const seen = new Set<string>();
  const uniqueResults = allResults
    .filter((product) => {
      const normalizedName = product.name.toLowerCase().trim();
      if (seen.has(normalizedName)) {
        return false;
      }
      seen.add(normalizedName);
      return true;
    })
    // Commission tracking is applied last, to the link only, never to
    // ordering. Results stay ranked by the sources' relevance order.
    .map((product) => ({ ...product, url: toAffiliateUrl(product.url) }));

  // Always generate retailer search links
  const retailerLinks = buildRetailerDeepLinks(q);

  // Get unique retailers from results
  const retailersFound = Array.from(new Set(uniqueResults.map(p => p.retailer)));

  // Determine message based on results
  let message = "";
  if (uniqueResults.length > 0) {
    if (retailersFound.length > 1) {
      message = `Showing results from ${retailersFound.slice(0, -1).join(', ')} and ${retailersFound[retailersFound.length - 1]}. Search more retailers below.`;
    } else {
      message = `Showing results from ${retailersFound[0]}. Search other retailers directly below.`;
    }
  } else {
    message = "No exact product matches found. Search retailers directly:";
  }

  const data: LiveSearchData = {
    results: uniqueResults,
    retailerSearchLinks: retailerLinks,
    message,
    retailersFound, // For frontend to display dynamic header
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

