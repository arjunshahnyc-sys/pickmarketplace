import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import SellerTrustKey from '@/components/SellerTrustKey';
import { performLiveSearch } from '@/lib/searchService';
import { enhanceProductsWithGroupInfo } from '@/lib/productGrouping';
import { SEARCH_CATEGORIES, getSearchCategory } from '@/lib/searchCategories';
import { RESULTS_GRID_CLASS } from '@/lib/cardLayout';

// Server-rendered landing pages for popular categories so Google indexes
// real comparison content (the homepage search is client-fetched and
// invisible to crawlers). Only the slugs from SEARCH_CATEGORIES exist —
// dynamicParams=false 404s everything else, which also caps how often the
// paid Serper pipeline can be triggered by crawlers.
export const dynamicParams = false;
// Revalidate hourly; must be a literal (statically analyzable), not 60 * 60.
export const revalidate = 3600;

export function generateStaticParams() {
  return SEARCH_CATEGORIES.map((c) => ({ query: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ query: string }>;
}): Promise<Metadata> {
  const { query } = await params;
  const category = getSearchCategory(query);
  const label = category?.label ?? query;
  return {
    title: `${label} Price Comparison Across Major Retailers | Pick`,
    description: `Compare ${label.toLowerCase()} prices from Amazon, Walmart, Target, Best Buy, and more in one search. Live prices, verified sellers, and deals, so you never overpay for ${label.toLowerCase()}.`,
    alternates: { canonical: `/search/${query}` },
  };
}

export default async function CategorySearchPage({
  params,
}: {
  params: Promise<{ query: string }>;
}) {
  const { query } = await params;
  // dynamicParams=false guarantees the slug exists; the fallback keeps
  // TypeScript honest.
  const category = getSearchCategory(query) ?? {
    slug: query,
    query,
    label: query,
  };

  const data = await performLiveSearch(category.query);
  const products = enhanceProductsWithGroupInfo(data.results);

  // The scrapers never throw — a transient outage returns [] and would
  // otherwise successfully render the thin fallback, replacing a
  // product-rich indexed page for the whole revalidate window. Throwing
  // here makes ISR keep serving the last good page instead. During
  // `next build` we still render the fallback so a build without API
  // access succeeds.
  if (products.length === 0 && process.env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error(
      `No live results for "${category.query}" — keeping last good page`
    );
  }

  return (
    <div className="relative z-10 texture-bg min-h-screen">
      <Header />
      <main id="main-content" className="max-w-5xl mx-auto px-6 pt-12 pb-24">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-2">
          {category.label} Price Comparison
        </h1>
        <p className="text-neutral-600 mb-6 max-w-2xl">
          Live prices for {category.label.toLowerCase()} across major
          retailers{data.retailersFound.length > 1 &&
            `, currently comparing ${data.retailersFound.slice(0, 4).join(', ')}${
              data.retailersFound.length > 4
                ? ` and ${data.retailersFound.length - 4} more stores`
                : ''
            }`}. Refreshed hourly.
        </p>

        {products.length > 0 ? (
          <>
            <h2 className="sr-only">Results</h2>
            <SellerTrustKey />
            <div className={RESULTS_GRID_CLASS}>
              {products.map((product, i) => (
                <ProductCard key={product.id || i} product={product} />
              ))}
            </div>
          </>
        ) : (
          // Build-time or revalidation hiccup — still give crawlers and
          // users somewhere to go rather than an empty page.
          <div className="py-12">
            <p className="text-neutral-600 mb-4">
              Live prices are being refreshed. Search{' '}
              {category.label.toLowerCase()} directly on these stores:
            </p>
            <div className="flex flex-wrap gap-2">
              {data.retailerSearchLinks.slice(0, 8).map((link) => (
                <a
                  key={link.retailer}
                  href={link.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="px-4 py-2 rounded-xl border border-black/10 text-sm text-black/70 hover:border-[#2A9D8F] hover:text-[#2A9D8F] transition"
                >
                  {link.retailer} ↗
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 border-t border-black/10 pt-8">
          <p className="text-sm text-neutral-600 mb-3">
            Looking for something specific? Run a live search with filters,
            sorting, and side-by-side compare:
          </p>
          <Link
            href={`/?q=${encodeURIComponent(category.query)}`}
            className="inline-block px-5 py-2.5 rounded-xl bg-[#2A9D8F] text-white text-sm font-medium hover:bg-[#238B7E] transition"
          >
            Search {category.label.toLowerCase()} on Pick
          </Link>
        </div>

        <nav className="mt-10" aria-label="Other categories">
          <p className="text-xs uppercase tracking-wide text-black/40 mb-3">
            Browse other categories
          </p>
          <div className="flex flex-wrap gap-2">
            {SEARCH_CATEGORIES.filter((c) => c.slug !== category.slug).map(
              (c) => (
                <Link
                  key={c.slug}
                  href={`/search/${c.slug}`}
                  className="px-3 py-1.5 bg-white border border-black/10 rounded-full text-xs text-black/70 hover:border-[#2A9D8F] hover:text-[#2A9D8F] transition"
                >
                  {c.label}
                </Link>
              )
            )}
          </div>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
