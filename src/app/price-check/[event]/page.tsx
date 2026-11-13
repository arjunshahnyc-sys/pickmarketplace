import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { buildComparison, formatCheckedDate } from '@/lib/comparisonPage';
import type { ComparisonEntry } from '@/lib/comparisons';
import { resolveExactItem } from '@/lib/exactOffers';
import { PriceCheckView } from '@/components/PriceCheckView';
import { getPriceCheckEvent, priceCheckProducts, priceCheckRow, summarize, type PriceCheckRow } from '@/lib/priceCheck';
import { performLiveSearch } from '@/lib/searchService';

// A price check for a sale event (/price-check/black-friday): for each
// electronics and appliance product in the comparison catalog, the lowest
// price Pick could confirm today, the crossed-out price that store shows,
// and the range Google says the product typically sells for, side by side
// (lib/priceCheck.ts says why it does not compare two dates).
//
// Cost model. Each product is one paid search (2 Serper credits) plus one
// to three offer-list lookups (2 each, lib/exactOffers.ts): about 100 to
// 200 credits for the 27 products. So, like the comparison pages, the route
// is a dynamic segment with no static params (`next build` renders nothing
// and costs nothing), it renders on its first visit and is then served
// from the cache for a day, and links to it never prefetch. Unknown events
// 404 before any search runs.
const REVALIDATE_HOURS = 24;
// Must be a literal (statically analyzable): one day, see REVALIDATE_HOURS.
export const revalidate = 86400;
// 27 products, each waiting on a search and up to three lookups.
export const maxDuration = 120;

export function generateStaticParams(): Array<{ event: string }> {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ event: string }> }): Promise<Metadata> {
  const { event: slug } = await params;
  const event = getPriceCheckEvent(slug);
  if (!event) return { title: 'Not found | Pick' };
  const title = `${event.name} price check: find the true cheapest price | Pick`;
  const description = `For ${priceCheckProducts().length} popular headphones, earbuds and dorm appliances: today's lowest confirmed price at a verified store, the store's crossed-out price, and the range Google says the product typically sells for. See whether a ${event.name} deal is really a deal.`;
  return {
    title,
    description,
    alternates: { canonical: `/price-check/${event.slug}` },
    // The share image is this route's own opengraph-image.tsx.
    openGraph: { title, description, type: 'article', siteName: 'Pick Marketplace' },
  };
}

const CONCURRENCY = 5;

/** Each product's row, a few at a time; a product whose search fails gets a row with no price. */
async function loadRows(products: ComparisonEntry[], now: Date): Promise<{ rows: PriceCheckRow[]; failed: number }> {
  const rows: PriceCheckRow[] = new Array(products.length);
  let failed = 0;
  let next = 0;
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
  return { rows, failed };
}

export default async function PriceCheckPage({ params }: { params: Promise<{ event: string }> }) {
  const { event: slug } = await params;
  const event = getPriceCheckEvent(slug);
  // Before any paid search: an unknown event is a 404, not 27 queries.
  if (!event) notFound();

  const products = priceCheckProducts();
  const now = new Date();
  const { rows, failed } = await loadRows(products, now);
  // An outage would otherwise cache a page of blanks for a day. Throwing
  // keeps the last good page (or, on a first render, retries next visit).
  if (failed > products.length / 2) {
    throw new Error(`Price check: ${failed} of ${products.length} searches failed, keeping last good page`);
  }

  return (
    <div className="relative z-10 texture-bg min-h-screen">
      <Header />
      <PriceCheckView
        event={event}
        rows={rows}
        summary={summarize(rows)}
        checkedAt={now.toISOString()}
        checkedLabel={formatCheckedDate(now.toISOString())}
        eventDayLabel={formatCheckedDate(`${event.date}T12:00:00Z`)}
        refreshHours={REVALIDATE_HOURS}
      />
      <Footer />
    </div>
  );
}
