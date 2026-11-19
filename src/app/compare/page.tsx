import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { comparisonsByCategory, COMPARISONS } from '@/lib/comparisons';

// The index of cheaper-twin pages (lib/comparisons.ts), as a grid of
// product photos. Static: it reads the catalog only, so building and
// serving it costs no search; the photos load one by one as tiles come
// into view (api/compare-thumb).
export const metadata: Metadata = {
  title: 'Cheaper alternatives and dupes for popular products, with real prices | Pick',
  description: `For ${COMPARISONS.length} popular products: the lowest real price across verified stores, item plus shipping, and a cheaper product with the same key specs when one passes Pick's bar.`,
  alternates: { canonical: '/compare' },
};

export default function CompareIndexPage() {
  return (
    <div className="relative z-10 texture-bg min-h-screen">
      <Header />
      <main id="main-content" className="max-w-5xl mx-auto px-6 pt-12 pb-24">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-3">
          Cheaper alternatives to popular products
        </h1>
        <p className="text-neutral-600 mb-10 max-w-2xl">
          Pick a product to see its cheaper alternatives: different products with the same key specs for much
          less, when Pick&apos;s engine found one, next to the lowest real price for the original across verified
          stores. Each page says when its prices were checked.
        </p>
        <p className="-mt-6 mb-10 text-sm">
          {/* No prefetch: rendering that page runs paid searches. */}
          <Link href="/price-check/black-friday" prefetch={false} className="font-medium text-[#1F7A6F] hover:text-[#2A9D8F]">
            Black Friday price check: are the deals actually lower?
          </Link>
        </p>
        {comparisonsByCategory().map((group) => (
          <section key={group.category} aria-labelledby={`cat-${group.category.replace(/\s+/g, '-')}`} className="mb-10">
            <h2 id={`cat-${group.category.replace(/\s+/g, '-')}`} className="text-xl font-semibold text-neutral-900 mb-3">
              {group.label}
            </h2>
            {/* Picture tiles. The photo comes from /api/compare-thumb, which
                looks it up only when a tile scrolls into view (see that
                route for the cost model); the name under it is static, so
                the grid is complete and clickable before any photo loads. */}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/compare/${entry.slug}`}
                    // A prefetch would render the target, and a render is a
                    // paid search (see the cost model on the page itself).
                    prefetch={false}
                    className="group block h-full rounded-2xl border border-black/10 bg-white p-3 transition hover:border-[#2A9D8F] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2A9D8F]"
                  >
                    <span className="block aspect-square overflow-hidden rounded-xl bg-gray-100 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/compare-thumb/${entry.slug}`}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={240}
                        height={240}
                        className="h-full w-full object-contain mix-blend-multiply transition-transform duration-200 group-hover:scale-[1.04]"
                      />
                    </span>
                    <span className="mt-2 block text-sm font-medium leading-snug text-neutral-900 group-hover:text-[#1F7A6F]">
                      {entry.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#1F7A6F]">See cheaper alternatives</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
