// The paid data behind /price-check/[event], loaded once a day and shared:
// the page and the landing page's Black Friday band (through
// /api/black-friday-deals) both call loadPriceCheck, so featuring the deals
// on the landing page costs no searches of its own.
//
// Unlike comparisonData.ts, what is cached here is the finished rows, not
// the raw searches: 27 products would be 27 searches and up to 81 offer
// lists to key one by one, and this page is rebuilt daily anyway. A fix to
// how a row is decided therefore needs DATA_VERSION bumped to show up
// before the next day's refresh.
//
// Each product is one paid search (2 Serper credits) plus one to three
// offer-list lookups (2 each, lib/exactOffers.ts): about 100 to 200 credits
// a day.
//
// Server only.

import { unstable_cache } from 'next/cache';
import { withFixedKeyText } from './comparisonData';
import { buildComparison } from './comparisonPage';
import { resolveExactItem } from './exactOffers';
import { getPriceCheckEvent, priceCheckProducts, priceCheckRow, type PriceCheckRow } from './priceCheck';
import { refreshSearchBudget } from './searchBudget';
import { performLiveSearch } from './searchService';

/** How long one check is reused: a day. */
export const PRICE_CHECK_DATA_SECONDS = 86400;

const DATA_VERSION = 'v1';
const KEY = [DATA_VERSION, process.env.NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER ?? 'untagged'];
const CONCURRENCY = 5;

export interface PriceCheckData {
  rows: PriceCheckRow[];
  /** When the prices were checked, ISO 8601. */
  checkedAt: string;
}

// Fixed key text for the reason given in comparisonData.ts: the page and the
// API route are two bundles and must ask under one key.
const cachedRows = unstable_cache(
  withFixedKeyText('pick-price-check-rows', async (slug: string): Promise<PriceCheckData> => {
    const products = priceCheckProducts();
    const now = new Date();
    const rows: PriceCheckRow[] = new Array(products.length);
    let failed = 0;
    let next = 0;
    // A few products at a time; one whose search fails gets a row with no price.
    const worker = async () => {
      while (next < products.length) {
        const index = next++;
        const entry = products[index];
        try {
          const data = await performLiveSearch(entry.query);
          if (data.results.length === 0) {
            failed++;
            rows[index] = priceCheckRow(entry, null);
            continue;
          }
          const exact = await resolveExactItem(entry, data);
          rows[index] = priceCheckRow(entry, buildComparison(data, entry.query, now, undefined, exact));
        } catch (error) {
          console.error(`[price-check] ${entry.slug} failed:`, error instanceof Error ? error.message : String(error));
          failed++;
          rows[index] = priceCheckRow(entry, null);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    // An outage would otherwise be cached as a day of blanks. Throwing keeps
    // it out of the cache; the page keeps its last good render and the band
    // keeps its plain headline.
    if (failed > products.length / 2) {
      throw new Error(`Price check ${slug}: ${failed} of ${products.length} searches failed`);
    }
    return { rows, checkedAt: now.toISOString() };
  }),
  ['pick-price-check-rows', ...KEY],
  { revalidate: PRICE_CHECK_DATA_SECONDS }
);

/** The day's rows for a price check event. Throws for an unknown event or when most searches failed. */
export async function loadPriceCheck(slug: string): Promise<PriceCheckData> {
  if (!getPriceCheckEvent(slug)) throw new Error(`Unknown price check event: ${slug}`);
  // The spending guard reads the day's starting balance here, outside the
  // cached scope, where that read is safe (lib/searchBudget.ts).
  await refreshSearchBudget();
  return cachedRows(slug);
}
