'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useReveal } from '@/lib/motion/useReveal';
import { COMPARISONS, comparisonsByCategory } from '@/lib/comparisons';

// The landing page's directory of comparison pages: every /compare/[slug]
// page gets one plain link from the homepage. Search Console (2026-11-12)
// listed 38 of the 50 pages as "Discovered, currently not indexed"; before
// this their only inbound links were the /compare index and each other, so
// Google had little reason to rank them above the queue.
//
// prefetch is off on purpose. A comparison page renders on its first visit
// with up to two paid searches (see the cost model in
// app/compare/[slug]/page.tsx), and a default <Link> prefetches its target
// as soon as it scrolls into view: fifty links here would have every
// homepage visitor regenerating every expired page.
export function PopularComparisons() {
  const reveal = useReveal();
  return (
    <motion.section
      {...reveal()}
      aria-labelledby="popular-comparisons"
      className="max-w-5xl mx-auto px-6 py-16 md:py-20"
    >
      <h2 id="popular-comparisons" className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
        Cheaper alternatives to popular products
      </h2>
      <p className="mt-3 max-w-2xl text-neutral-600">
        One page per product: its lowest real price across verified stores, and a different product with the same
        key specs for less when one passes Pick&apos;s bar. Each page says when its prices were checked.
      </p>
      <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {comparisonsByCategory().map((group) => (
          <div key={group.category}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#1F7A6F]">{group.label}</h3>
            <ul className="mt-3 space-y-2">
              {group.entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/compare/${entry.slug}`}
                    prefetch={false}
                    className="text-sm text-neutral-700 underline decoration-black/15 underline-offset-4 transition-colors hover:text-[#2A9D8F] hover:decoration-[#2A9D8F]"
                  >
                    {entry.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/compare" className="font-medium text-[#1F7A6F] hover:text-[#2A9D8F]">
          See all {COMPARISONS.length} comparisons
        </Link>
        {/* No prefetch: rendering that page runs paid searches. */}
        <Link href="/price-check/black-friday" prefetch={false} className="font-medium text-[#1F7A6F] hover:text-[#2A9D8F]">
          Black Friday price check: are the deals actually lower?
        </Link>
      </p>
    </motion.section>
  );
}
