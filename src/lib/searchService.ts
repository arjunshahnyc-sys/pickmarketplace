// In-process search pipeline for /api/search-live.
//
// The extension-era routes (/api/search, /api/ask, /api/similar) that shared
// this module were removed along with the browser extension.

import { searchTarget, searchGoogleShoppingAPI, buildRetailerDeepLinks } from './scrapers';
import type { Product, RetailerSearchLink } from './types';

export interface LiveSearchData {
  results: Product[];
  retailerSearchLinks: RetailerSearchLink[];
  message: string;
  retailersFound: string[];
  checkedAt: string;
}

// Anchored on globalThis because Next bundles each route with its own copy
// of this module — a plain module-level Map would give every route a private
// cache and multiply paid Serper calls for the same query.
const globalStore = globalThis as unknown as {
  __pickSearchCache?: Map<string, { data: LiveSearchData; ts: number }>;
};
const cache = (globalStore.__pickSearchCache ??= new Map<string, { data: LiveSearchData; ts: number }>());
const TTL = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const CACHE_EVICTION_COUNT = 20;

/** Live search (Serper + Target) with a 30-minute in-memory cache. */
export async function performLiveSearch(q: string): Promise<LiveSearchData> {
  const key = q.toLowerCase().trim();

  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) {
    return cached.data;
  }

  // Search both APIs in parallel
  const [googleResults, targetResults] = await Promise.all([
    searchGoogleShoppingAPI(q),
    searchTarget(q),
  ]);

  // Combine and deduplicate results (prefer Target results for same products)
  const allResults = [...googleResults, ...targetResults];

  // Deduplicate by product name (case-insensitive)
  const seen = new Set<string>();
  const uniqueResults = allResults.filter((product) => {
    const normalizedName = product.name.toLowerCase().trim();
    if (seen.has(normalizedName)) {
      return false;
    }
    seen.add(normalizedName);
    return true;
  });

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
  };

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

