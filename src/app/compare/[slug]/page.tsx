import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UnverifiedSellerNote from '@/components/UnverifiedSellerNote';
import { isAffiliateUrl } from '@/lib/affiliate';
import { buildComparison, formatCheckedDate, type ComparisonRow, type ComparisonTwin } from '@/lib/comparisonPage';
import { brandWord, COMPARISON_CATEGORY_LABELS, COMPARISONS, comparisonCopy, getAlternativeSearch, getComparison } from '@/lib/comparisons';
import { formatMinorUnits } from '@/lib/landedCost/money';
import { currencySymbol, formatPrice, formatRating } from '@/lib/formatters';
import { EXACT_ITEM_CATEGORIES } from '@/lib/exactItem';
import { resolveExactItem } from '@/lib/exactOffers';
import { performLiveSearch } from '@/lib/searchService';

// Static cheaper-twin comparison pages, one per eval test set item
// (lib/comparisons.ts): the real price of the item on top, every listing
// of it Pick trusts enough to show, and the cheaper twin Pick's own engine
// picked, with a stamp saying when the prices were checked.
//
// Cost model. Each render is one paid Google Shopping search for the item
// (2 Serper credits), one or two lookups of Google's offer list for exactly
// that product (2 credits each, see lib/exactOffers.ts) and, on pages that
// look for a twin, one brand-free search for products of its kind (2 more;
// pages that share a search, like the earbuds, share its 30-minute cache):
// 6 to 8 credits. So the page is cached and
// regenerated on a schedule, not per visit: generateStaticParams returns
// nothing, so `next build` renders no comparison page and costs no
// credits; a page renders on its first visit and is then served from the
// cache until REVALIDATE_DAYS have passed, when the next visit serves the
// cached page and regenerates it in the background. Sixty-five pages
// visited constantly cost at most about 200 credits a day; pages nobody
// visits cost nothing. Unknown slugs 404 before any search runs, so a crawler probing
// URLs costs nothing.
const REVALIDATE_DAYS = 3;
// Must be a literal (statically analyzable): 3 days, see REVALIDATE_DAYS.
export const revalidate = 259200;
// A render waits on up to two searches and two offer-list lookups.
export const maxDuration = 60;

export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}

const SITE_URL = 'https://pickmarketplace.app';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getComparison(slug);
  if (!entry) return { title: 'Not found | Pick' };
  // Worded the way shoppers search; see comparisonCopy.
  const { title, description } = comparisonCopy(entry, REVALIDATE_DAYS);
  return {
    title,
    description,
    alternates: { canonical: `/compare/${entry.slug}` },
    openGraph: { title, description, type: 'article', siteName: 'Pick Marketplace', images: ['/og-image.png'] },
  };
}

const money = (minor: number, currency: string) => `${currencySymbol(currency)}${formatMinorUnits(minor, currency)}`;
const price = (row: ComparisonRow) => `${currencySymbol(row.currency)}${formatPrice(row.price, row.currency)}`;
const shippingText = (row: ComparisonRow) =>
  row.shippingMinor === null ? 'Shipping unknown' : row.shippingMinor === 0 ? 'Free shipping' : `${money(row.shippingMinor, row.currency)} shipping`;

function OutboundLink({
  href,
  clickHref,
  className,
  children,
}: {
  href: string;
  /** Click-time resolver link (row.clickUrl); href stays the identity that decides rel. */
  clickHref?: string;
  className?: string;
  children: React.ReactNode;
}) {
  // rel=sponsored is a machine-readable paid-link claim; only make it when
  // the link really carries commission tracking (ProductCard does the same).
  return (
    <a
      href={clickHref ?? href}
      target="_blank"
      rel={isAffiliateUrl(href) ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
      className={className}
    >
      {children}
    </a>
  );
}

function TrustBadge({ row }: { row: ComparisonRow }) {
  const tone =
    row.trustLevel === 'verified'
      ? 'bg-teal-50 text-[#1F7A6F]'
      : row.trustLevel === 'marketplace'
        ? 'bg-sky-50 text-sky-700'
        : row.trustLevel === 'flagged'
          ? 'bg-red-50 text-red-700'
          : 'bg-amber-50 text-amber-700';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{row.trustLabel}</span>;
}

function Reviews({ row }: { row: ComparisonRow }) {
  if (!row.rating || !row.reviewCount) return null;
  return (
    <span className="text-xs text-neutral-500">
      {formatRating(row.rating)} ({row.reviewCount.toLocaleString('en-US')} reviews)
    </span>
  );
}

function TwinCard({ twin, against }: { twin: ComparisonTwin; against: string }) {
  return (
    <div className="rounded-2xl border border-[#2A9D8F]/30 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#1F7A6F]">
        Similar pick · {twin.savingsPercent}% less
      </p>
      <h3 className="mt-1 text-lg font-semibold text-neutral-900">{twin.name}</h3>
      <p className="mt-1 text-sm text-neutral-600">
        {price(twin)} at {twin.store} · {shippingText(twin)}
        {twin.conditionLabel ? ` · ${twin.conditionLabel}` : ''}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2">
        <TrustBadge row={twin} />
        <Reviews row={twin} />
      </p>
      {twin.sharedSpecs.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-neutral-500">What it shares with the {against}, read from both listings:</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {twin.sharedSpecs.map((spec) => (
              <li key={spec} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                {spec}
              </li>
            ))}
          </ul>
        </div>
      )}
      <OutboundLink
        href={twin.url}
        clickHref={twin.clickUrl}
        className="mt-4 inline-block rounded-xl bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#238B7E]"
      >
        See it at {twin.store} ↗
      </OutboundLink>
    </div>
  );
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getComparison(slug);
  // Before any paid search: an unknown slug is a 404, not a query.
  if (!entry) notFound();

  // A cheaper twin is a different product, so it is looked for in a second,
  // brand-free search (lib/comparisons.ts). Textbooks have none.
  const alternativeSearch = getAlternativeSearch(entry.slug);
  const [data, alternativeData] = await Promise.all([
    performLiveSearch(entry.query),
    alternativeSearch ? performLiveSearch(alternativeSearch.query) : Promise.resolve(null),
  ]);
  // The scrapers never throw: an outage returns [] and would otherwise
  // render an empty page into the cache for REVALIDATE_DAYS. Throwing
  // keeps the last good page (or, on a first render, retries next visit).
  if (data.results.length === 0) {
    throw new Error(`No live results for "${entry.query}", keeping last good page`);
  }
  // Same for the twin search: "no twin passed the bar" must mean Pick
  // looked, not that the search was down.
  if (alternativeSearch && (!alternativeData || alternativeData.allSourcesFailed)) {
    throw new Error(`No live results for "${alternativeSearch.query}", keeping last good page`);
  }

  // Which listings are exactly this product: the titles that name it, and
  // the stores Google lists under it. Without this the page priced whatever
  // Pick's grouping filed near the product (the Pixel Buds 2a on the Pixel
  // Buds Pro 2 page). A failed lookup leaves no offers and the page falls
  // back to the exact-titled search rows alone, never to the grouping.
  // Only for the categories this has been checked on (EXACT_ITEM_CATEGORIES).
  const exactItem = EXACT_ITEM_CATEGORIES.includes(entry.category) ? await resolveExactItem(entry, data) : undefined;

  const comparison = buildComparison(
    data,
    entry.query,
    new Date(),
    alternativeSearch && alternativeData
      ? { data: alternativeData, search: alternativeSearch, brand: brandWord(entry) }
      : undefined,
    exactItem
  );
  const { item, twin } = comparison;
  const checked = formatCheckedDate(comparison.checkedAt);
  const categoryLabel = COMPARISON_CATEGORY_LABELS[entry.category];
  const copy = comparisonCopy(entry, REVALIDATE_DAYS);
  const related = COMPARISONS.filter((c) => c.category === entry.category && c.slug !== entry.slug);

  // Product with an AggregateOffer over the listings shown, for search
  // engines. Only what the table says; nothing is claimed beyond it.
  const jsonLd =
    item.rows.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: entry.name,
          ...(item.top?.image ? { image: item.top.image } : {}),
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: item.rows[0].currency,
            lowPrice: formatPrice(Math.min(...item.rows.map((r) => r.price)), item.rows[0].currency),
            highPrice: formatPrice(Math.max(...item.rows.map((r) => r.price)), item.rows[0].currency),
            offerCount: item.rows.length,
            url: `${SITE_URL}/compare/${entry.slug}`,
          },
        }
      : null;

  return (
    <div className="relative z-10 texture-bg min-h-screen">
      <Header />
      <main id="main-content" className="max-w-4xl mx-auto px-6 pt-12 pb-24">
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
          />
        )}

        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-neutral-500">
          <Link href="/compare" className="hover:text-[#2A9D8F]">Cheaper twins</Link>
          <span className="mx-1.5">/</span>
          <span>{categoryLabel}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-3">
          {copy.heading}
        </h1>
        <p className="text-sm text-neutral-600 mb-8 max-w-2xl">
          Prices checked <time dateTime={comparison.checkedAt}>{checked}</time> across {comparison.listingCount}{' '}
          listings from {comparison.storeCount} stores on Google Shopping. Pick refreshes this page at most every{' '}
          {REVALIDATE_DAYS} days, so prices here can be a few days old;{' '}
          <Link href={`/?q=${encodeURIComponent(entry.query)}`} className="underline decoration-dotted underline-offset-2 hover:text-[#2A9D8F]">
            run the live search
          </Link>{' '}
          for today&apos;s.
        </p>

        {/* The price on top */}
        <section aria-labelledby="real-price" className="mb-10">
          <h2 id="real-price" className="text-xl font-semibold text-neutral-900 mb-3">
            Lowest real price for the {entry.name}
          </h2>
          {item.top ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-3xl font-bold text-neutral-900">
                {price(item.top)}{' '}
                <span className="ml-2 text-base font-medium text-neutral-600">at {item.top.store}</span>
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {shippingText(item.top)}
                {item.top.preTaxMinor !== null && item.top.shippingMinor !== 0
                  ? ` · ${money(item.top.preTaxMinor, item.top.currency)} before sales tax`
                  : ' · before sales tax'}
                {item.top.conditionLabel ? ` · ${item.top.conditionLabel}` : ''}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2">
                <TrustBadge row={item.top} />
                <Reviews row={item.top} />
              </p>
              <p className="mt-2 text-sm text-neutral-700">{item.top.name}</p>
              {item.top.originalPrice !== null && item.top.originalPrice > item.top.price && (
                <p className="mt-2 text-xs text-neutral-500">
                  {item.top.store} shows this as marked down from {currencySymbol(item.top.currency)}
                  {formatPrice(item.top.originalPrice, item.top.currency)}. That is the store&apos;s own crossed-out
                  price; Pick has not checked it.
                </p>
              )}
              {!item.topIsVerifiedNew && (
                <p className="mt-2 text-xs text-amber-700">
                  No verified store listed a new unit on {checked}; this is the first listing of the item in Pick&apos;s order.
                </p>
              )}
              {item.referencePrice !== null && (
                <p className="mt-2 text-xs text-neutral-500">
                  {item.priceBasis === 'verified' ? 'Verified stores typically charge' : 'Listings typically ask'}{' '}
                  {currencySymbol(item.top.currency)}{formatPrice(item.referencePrice, item.top.currency)} for it.
                </p>
              )}
              {item.googleTypicalRange && (
                <p className="mt-1 text-xs text-neutral-500">
                  Google lists its typical price as {currencySymbol(item.top.currency)}
                  {formatPrice(item.googleTypicalRange[0], item.top.currency)} to {currencySymbol(item.top.currency)}
                  {formatPrice(item.googleTypicalRange[1], item.top.currency)}. That is Google&apos;s figure, not Pick&apos;s.
                </p>
              )}
              <OutboundLink
                href={item.top.url}
                clickHref={item.top.clickUrl}
                className="mt-4 inline-block rounded-xl border border-[#2A9D8F] px-4 py-2 text-sm font-medium text-[#1F7A6F] transition hover:bg-teal-50"
              >
                See it at {item.top.store} ↗
              </OutboundLink>
            </div>
          ) : (
            <p className="text-neutral-600">
              Pick could not confirm a new {entry.name} at a verified store among the {comparison.listingCount}{' '}
              listings it found on {checked}. It counts a listing only when a title names this exact product or Google
              lists the store under it, so a similar model, a bundle or a refurbished unit is never priced as this
              one. The live search shows everything it found.
            </p>
          )}
        </section>

        {/* Every listing of the item */}
        {item.rows.length > (item.top ? 1 : 0) && (
          <section aria-labelledby="all-listings" className="mb-10">
            <h2 id="all-listings" className="text-xl font-semibold text-neutral-900 mb-1">
              {item.top ? 'Where else it is sold' : 'Other listings of it'}
            </h2>
            <p className="text-xs text-neutral-500 mb-3">
              Only listings Pick could confirm as exactly this product: stores Google lists under it, and listings
              whose titles name it. In Pick&apos;s order: item plus shipping, before sales tax, for delivery in the US.
              Shipping comes from each store&apos;s published policy or a carrier estimate where Pick has one.
              {item.leftOut > 0 &&
                ` ${item.leftOut} ${item.leftOut === 1 ? 'listing' : 'listings'} left out: priced far below verified stores, or from a seller with scam reports.`}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Store</th>
                    <th scope="col" className="px-4 py-2.5">Price</th>
                    <th scope="col" className="px-4 py-2.5">Shipping</th>
                    <th scope="col" className="px-4 py-2.5">Before tax</th>
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((row, i) => (
                    <tr key={`${row.store}|${row.name}|${i}`} className="border-t border-black/5 align-top">
                      <td className="px-4 py-2.5">
                        <OutboundLink href={row.url} clickHref={row.clickUrl} className="font-medium text-neutral-900 hover:text-[#2A9D8F]">
                          {row.store}
                        </OutboundLink>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <TrustBadge row={row} />
                          {row.conditionLabel && (
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">{row.conditionLabel}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{price(row)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-neutral-600">
                        {row.shippingMinor === null ? 'Unknown' : row.shippingMinor === 0 ? 'Free' : money(row.shippingMinor, row.currency)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                        {row.preTaxMinor === null ? 'Unknown' : money(row.preTaxMinor, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* The cheaper twin */}
        <section aria-labelledby="cheaper-twin" className="mb-10">
          <h2 id="cheaper-twin" className="text-xl font-semibold text-neutral-900 mb-1">
            {copy.alternativesHeading}
          </h2>
          {comparison.twinSearch ? (
            <p className="text-xs text-neutral-500 mb-3">
              A different product from another brand. Pick searched for &ldquo;{comparison.twinSearch}&rdquo; and kept
              only products of the same kind that state at least one spec the {entry.name} states, are rated 4 stars
              or more (and no more than half a star below it) from at least 50 reviews, are sold new by a verified
              store, and cost at least 25% less
              {comparison.twinReferencePrice !== null
                ? ` than ${currencySymbol(item.top?.currency ?? 'USD')}${formatPrice(comparison.twinReferencePrice, item.top?.currency ?? 'USD')}, the lower of the price on top and what it typically costs`
                : ''}
              . The chips are specs both products&apos; listings state, nothing more.
            </p>
          ) : (
            <p className="text-xs text-neutral-500 mb-3">
              Pick does not look for a twin here: a different book is not an equivalent of this one.
            </p>
          )}
          {twin ? (
            <>
              <TwinCard twin={twin} against={entry.name} />
              {comparison.moreTwins.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-neutral-500 mb-2">Also passed the bar:</p>
                  <ul className="space-y-2">
                    {comparison.moreTwins.map((t) => (
                      <li key={`${t.store}|${t.name}`} className="text-sm text-neutral-700">
                        <OutboundLink href={t.url} clickHref={t.clickUrl} className="font-medium text-neutral-900 hover:text-[#2A9D8F]">
                          {t.name}
                        </OutboundLink>{' '}
                        · {price(t)} at {t.store} · {t.savingsPercent}% less
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : comparison.twinSearch ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-5 text-sm text-neutral-600">
              No product passed that bar on {checked}. Pick would rather show nothing than a lookalike that is not
              as good, so this section stays empty until a search turns one up.
            </div>
          ) : null}
        </section>

        {comparison.hasUnverifiedSeller && <UnverifiedSellerNote className="mb-10" />}

        <div className="mt-4 border-t border-black/10 pt-8">
          <p className="text-sm text-neutral-600 mb-3">
            Want today&apos;s prices, your state&apos;s sales tax, and every listing with filters and compare?
          </p>
          <Link
            href={`/?q=${encodeURIComponent(entry.query)}`}
            className="inline-block px-5 py-2.5 rounded-xl bg-[#2A9D8F] text-white text-sm font-medium hover:bg-[#238B7E] transition"
          >
            Search {entry.name} on Pick
          </Link>
        </div>

        {related.length > 0 && (
          <nav className="mt-10" aria-label={`Other ${categoryLabel.toLowerCase()}`}>
            <p className="text-xs uppercase tracking-wide text-black/40 mb-3">More {categoryLabel.toLowerCase()}</p>
            <div className="flex flex-wrap gap-2">
              {related.map((c) => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  // A prefetch would render the target, and a render is a paid search.
                  prefetch={false}
                  className="px-3 py-1.5 bg-white border border-black/10 rounded-full text-xs text-black/70 hover:border-[#2A9D8F] hover:text-[#2A9D8F] transition"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </main>
      <Footer />
    </div>
  );
}
