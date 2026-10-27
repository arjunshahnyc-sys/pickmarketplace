import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { comparisonsByCategory, COMPARISONS } from '@/lib/comparisons';

// The index of cheaper-twin pages (lib/comparisons.ts). Static: it reads
// the catalog only, so it costs no search and never goes stale.
export const metadata: Metadata = {
  title: 'Cheaper twins: the real price of popular products, and what matches them for less | Pick',
  description: `For ${COMPARISONS.length} popular products: the lowest real price across verified stores, item plus shipping, and a cheaper product with the same key specs when one passes Pick's bar.`,
  alternates: { canonical: '/compare' },
};

export default function CompareIndexPage() {
  return (
    <div className="relative z-10 texture-bg min-h-screen">
      <Header />
      <main id="main-content" className="max-w-4xl mx-auto px-6 pt-12 pb-24">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-3">Cheaper twins</h1>
        <p className="text-neutral-600 mb-10 max-w-2xl">
          One page per product: the lowest real price Pick found across verified stores, every listing of it worth
          showing, and a different product with the same key specs for much less, when Pick&apos;s engine found one.
          Each page says when its prices were checked.
        </p>
        {comparisonsByCategory().map((group) => (
          <section key={group.category} aria-labelledby={`cat-${group.category.replace(/\s+/g, '-')}`} className="mb-10">
            <h2 id={`cat-${group.category.replace(/\s+/g, '-')}`} className="text-xl font-semibold text-neutral-900 mb-3">
              {group.label}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {group.entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/compare/${entry.slug}`}
                    className="block rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-800 transition hover:border-[#2A9D8F] hover:text-[#2A9D8F]"
                  >
                    {entry.name}
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
