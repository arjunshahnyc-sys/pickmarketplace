'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
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
//
// Phones (2026-11-15): 65 links in one column made the homepage about nine
// screens long with rows too close together to tap. Below md each category
// is a row that opens on tap, one at a time, and its links are finger
// height. The links stay in the HTML when a category is closed (hidden with
// CSS, not removed), so crawlers still find all of them from the homepage.
export function PopularComparisons() {
  const reveal = useReveal();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
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
      <div className="mt-8 grid gap-x-8 md:gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {comparisonsByCategory().map((group) => {
          const open = openCategory === group.category;
          const listId = `comparisons-${group.category}`;
          return (
          <div key={group.category} className="border-b border-black/10 md:border-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#1F7A6F]">
              <span className="hidden md:inline">{group.label}</span>
              <button
                type="button"
                data-no-lift=""
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpenCategory(open ? null : group.category)}
                className="md:hidden flex min-h-12 w-full items-center justify-between gap-3 text-left text-xs font-semibold uppercase tracking-wide"
              >
                <span>
                  {group.label}{' '}
                  <span className="font-normal text-neutral-500">({group.entries.length})</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <ul id={listId} className={`${open ? 'block pb-3' : 'hidden'} md:block md:mt-3 md:space-y-2 md:pb-0`}>
              {group.entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/compare/${entry.slug}`}
                    prefetch={false}
                    className="block py-2.5 md:inline md:py-0 text-sm text-neutral-700 underline decoration-black/15 underline-offset-4 transition-colors hover:text-[#2A9D8F] hover:decoration-[#2A9D8F]"
                  >
                    {entry.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          );
        })}
      </div>
      <p className="mt-8 flex flex-col md:flex-row md:flex-wrap gap-x-6 md:gap-y-2 text-sm [&_a]:py-2.5 md:[&_a]:py-0">
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
