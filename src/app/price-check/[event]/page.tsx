import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatCheckedDate } from '@/lib/comparisonPage';
import { PriceCheckView } from '@/components/PriceCheckView';
import { getPriceCheckEvent, priceCheckProducts, realDeals, summarize } from '@/lib/priceCheck';
import { loadPriceCheck } from '@/lib/priceCheckData';

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
// The page itself is rebuilt hourly, which is free: the prices under it are
// the day's shared data (lib/priceCheckData.ts, REVALIDATE_HOURS). Must be
// a literal (statically analyzable).
export const revalidate = 3600;
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

export default async function PriceCheckPage({ params }: { params: Promise<{ event: string }> }) {
  const { event: slug } = await params;
  const event = getPriceCheckEvent(slug);
  // Before any paid search: an unknown event is a 404, not 27 queries.
  if (!event) notFound();

  // The day's rows, shared with the landing page's band
  // (lib/priceCheckData.ts). It throws when most searches failed, which
  // keeps the last good page (or, on a first render, retries next visit).
  const { rows, checkedAt } = await loadPriceCheck(event.slug);

  return (
    <div className="relative z-10 texture-bg min-h-screen">
      <Header />
      <PriceCheckView
        event={event}
        rows={rows}
        deals={realDeals(rows)}
        summary={summarize(rows)}
        checkedAt={checkedAt}
        checkedLabel={formatCheckedDate(checkedAt)}
        eventDayLabel={formatCheckedDate(`${event.date}T12:00:00Z`)}
        refreshHours={REVALIDATE_HOURS}
      />
      <Footer />
    </div>
  );
}
