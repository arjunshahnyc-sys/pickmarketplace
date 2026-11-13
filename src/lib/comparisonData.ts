// The paid data behind one /compare/[slug] page, loaded once and shared:
// the page and its share image (opengraph-image.tsx) both call
// loadComparison, and the searches and offer lists underneath are kept in
// Next's data cache for as long as the page itself is.
//
// Why a cache under the page's own ISR cache:
//
//   - The share image is a second route. Without this it would run the
//     page's searches again (6 to 10 Serper credits) the first time anyone
//     pasted the link somewhere.
//   - The data cache outlives a deployment; a page's ISR cache does not.
//     Before this, every deploy made every comparison page pay for its
//     searches again on its next visit (five deploys on 2026-11-12).
//
// What is cached is the raw material, never the page's conclusions: search
// results and offer lists. buildComparison and the exact-item rules run on
// every render, so a fix to them shows up on the next deploy instead of
// waiting days for a cached verdict to expire.
//
// Server only.

import { unstable_cache } from 'next/cache';
import { buildComparison, type Comparison } from './comparisonPage';
import { brandWord, getAlternativeSearch, type ComparisonEntry } from './comparisons';
import { EXACT_ITEM_CATEGORIES } from './exactItem';
import { requestOfferList, resolveExactItem } from './exactOffers';
import { refreshSearchBudget } from './searchBudget';
import { performLiveSearch, type LiveSearchData } from './searchService';

/** How long a search or an offer list is reused: the page's own revalidation window, 3 days. */
export const COMPARISON_DATA_SECONDS = 259200;

// Part of every cache key. Search results carry outbound links that are
// commission-tagged with the configured wrapper, so a change of wrapper
// (a network switched on, or off the day it says no) must not be served
// from data cached under the old one. Bump DATA_VERSION to drop everything
// cached, for instance after a change to what a search result contains.
const DATA_VERSION = 'v1';
const KEY = [DATA_VERSION, process.env.NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER ?? 'untagged'];

// unstable_cache builds its key from the text of the function it is given
// (cb.toString()), followed by the key parts and the arguments. A production
// build compiles this module once per route and names the imports
// differently in each copy, so the page and its share image were asking for
// the same search under two different keys: the image paid for a search of
// its own (4 to 8 credits, seen live 2026-11-13) and, search results being
// noisy, could state a different price from its page or none at all. Giving
// each function a fixed text makes the key depend only on the name below,
// the key parts and the arguments, in every route and across deployments.
function withFixedKeyText<F extends (...args: never[]) => unknown>(name: string, fn: F): F {
  Object.defineProperty(fn, 'toString', { value: () => name });
  return fn;
}

const cachedSearch = unstable_cache(
  withFixedKeyText('pick-comparison-search', async (query: string): Promise<LiveSearchData> => {
    const data = await performLiveSearch(query);
    // The scrapers never throw: an outage returns []. Throwing here keeps an
    // outage out of the cache, and the page then keeps its last good render.
    if (data.results.length === 0 || data.allSourcesFailed) {
      throw new Error(`No live results for "${query}"`);
    }
    return data;
  }),
  ['pick-comparison-search', ...KEY],
  { revalidate: COMPARISON_DATA_SECONDS }
);

// null (Google has no list for the id) is cached like any answer; a failed
// call throws inside the cache scope, is not cached, and reads as null to
// the resolver, which then simply has one list fewer this render.
const cachedOfferList = unstable_cache(
  withFixedKeyText('pick-comparison-offers', async (productId: string): Promise<unknown | null> => requestOfferList(productId)),
  ['pick-comparison-offers', ...KEY],
  { revalidate: COMPARISON_DATA_SECONDS }
);

async function offerList(productId: string): Promise<unknown | null> {
  try {
    return await cachedOfferList(productId);
  } catch (error) {
    console.error('[Serper] offer list lookup failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Everything a comparison page says, for one catalog entry. Throws when a
 * search it depends on returned nothing, so a caller that is being cached
 * keeps what it had: "no twin passed the bar" must mean Pick looked, not
 * that the search was down.
 */
export async function loadComparison(entry: ComparisonEntry, now: Date = new Date()): Promise<Comparison> {
  // A cheaper twin is a different product, so it is looked for in a second,
  // brand-free search (comparisons.ts). Textbooks have none.
  const alternativeSearch = getAlternativeSearch(entry.slug);
  // The spending guard reads the day's starting balance here, outside the
  // cached scopes below, where that read is safe (lib/searchBudget.ts).
  await refreshSearchBudget();
  const [data, alternativeData] = await Promise.all([
    cachedSearch(entry.query),
    alternativeSearch ? cachedSearch(alternativeSearch.query) : Promise.resolve(null),
  ]);

  // Which listings are exactly this product: the titles that name it, and
  // the stores Google lists under it (exactItem.ts). A failed lookup leaves
  // no offers and the page falls back to the exact-titled search rows
  // alone, never to the grouping. Only for the categories this has been
  // checked on.
  const exactItem = EXACT_ITEM_CATEGORIES.includes(entry.category)
    ? await resolveExactItem(entry, data, offerList)
    : undefined;

  return buildComparison(
    data,
    entry.query,
    now,
    alternativeSearch && alternativeData
      ? { data: alternativeData, search: alternativeSearch, brand: brandWord(entry) }
      : undefined,
    exactItem
  );
}
