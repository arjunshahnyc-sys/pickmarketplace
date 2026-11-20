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
// The eight tiles with photos: products people search for by name, one or
// two from each kind of thing Pick covers.
const FEATURED_SLUGS = [
  'bose-quietcomfort-ultra-earbuds',
  'stanley-quencher-40-oz',
  'dyson-airwrap-id',
  'airpods-4-anc',
  'owala-freesip-24-oz',
  'adidas-samba-og',
  'lululemon-align-pant-25',
  'dyson-v8',
];
const FEATURED = FEATURED_SLUGS.map((slug) => COMPARISONS.find((c) => c.slug === slug)).filter(
  (c): c is (typeof COMPARISONS)[number] => Boolean(c)
);

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
        Popular products, and what to buy instead
      </h2>
      {/* Pictures first (2026-11-19, owner: the homepage was a wall of
          words). Eight tiles with photos lead; the full list of names sits
          folded underneath. Photos come from /api/compare-thumb and load
          only as a tile scrolls into view. */}
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FEATURED.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={`/compare/${entry.slug}`}
              prefetch={false}
              className="group block h-full rounded-2xl border border-black/10 bg-white p-3 transition hover:border-[#2A9D8F] hover:shadow-sm"
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
              <span className="mt-2 block text-sm font-medium leading-snug text-neutral-900 line-clamp-2 group-hover:text-[#1F7A6F]">
                {entry.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <Link
          href="/compare"
          prefetch={false}
          className="inline-block rounded-xl bg-[#1F7A6F] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#14524B]"
        >
          See all {COMPARISONS.length}
        </Link>
      </p>
      {/* Every page still gets its plain link from the homepage (see the
          note at the top): the list is folded, not removed, so the links
          stay in the HTML for crawlers. */}
      <details className="group/all mt-8 border-t border-black/10 pt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-neutral-700 hover:text-[#1F7A6F] [&::-webkit-details-marker]:hidden">
          Browse all by name
          <ChevronDown className="h-4 w-4 transition-transform group-open/all:rotate-180" aria-hidden="true" />
        </summary>
      <div className="mt-6 grid gap-x-8 md:gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
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
      </details>
      <p className="mt-6 text-sm">
        {/* No prefetch: rendering that page runs paid searches. */}
        <Link href="/price-check/black-friday" prefetch={false} className="font-medium text-[#1F7A6F] hover:text-[#2A9D8F]">
          Black Friday price check
        </Link>
      </p>
    </motion.section>
  );
}
