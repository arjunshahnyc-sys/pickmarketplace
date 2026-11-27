'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomeDeal, HomeDeals } from '@/lib/blackFridayDeal';
import { isBlackFridayWindow } from '@/lib/season';

// The Black Friday price check, featured on the landing page: a pill above
// the headline (in the first fold on every screen) and a dark band right
// under the hero, in the look of the page they link to
// (PriceCheckView.tsx). The headline is the owner's, the same one that page
// carries.
//
// Both are in the markup all year and hidden by CSS (.black-friday-only,
// globals.css) unless HolidayTheme.tsx has marked
// <html data-sale="black-friday">, which it does from 2026-11-20 through
// 2026-11-30 on the visitor's own clock (lib/season.ts). Nothing to remove
// on December 1.
//
// The band leads with the real deals (2026-11-27, owner: "Black Friday
// deals", not more cheaper alternatives): up to four products from the price
// check page that are below their usual price today, with photos. They come
// from /api/black-friday-deals, which reads the page's own day-long data and
// runs no searches of its own. Until they arrive, or if there are none, the
// band is the plain headline and button.
//
// The links never prefetch: rendering /price-check/black-friday runs about a
// hundred paid searches. The page is cached for a day, so more visitors from
// here do not mean more searches.
//
// The event's name is written out here and not read from lib/priceCheck.ts,
// which would pull the whole exact-item rule set into the landing page's
// bundle. Next year's event is a new decision anyway (the dates are pinned).
const EVENT_NAME = 'Black Friday 2026';
const HREF = '/price-check/black-friday';

export function BlackFridayPill() {
  return (
    <p className="black-friday-only mb-4">
      <Link
        href={HREF}
        prefetch={false}
        className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-[#07110F] py-2 pl-4 pr-3.5 text-sm font-semibold text-white transition hover:bg-[#14524B] md:min-h-0"
      >
        <span className="h-2 w-2 rounded-full bg-[#8DEBDD]" aria-hidden="true" />
        Black Friday price check
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </p>
  );
}

const money = (n: number) => `$${Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2)}`;

function DealTile({ deal }: { deal: HomeDeal }) {
  return (
    <li>
      <a
        href={deal.href}
        target="_blank"
        rel={deal.sponsored ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
        className="group flex h-full flex-col rounded-2xl bg-white p-3 text-neutral-900 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <span className="block aspect-square overflow-hidden rounded-xl bg-gray-100 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={deal.image}
            alt=""
            loading="lazy"
            decoding="async"
            width={240}
            height={240}
            className="h-full w-full object-contain mix-blend-multiply transition-transform duration-200 group-hover:scale-[1.04]"
          />
        </span>
        <span className="mt-3 block text-2xl font-black leading-none tracking-tight md:text-3xl">{money(deal.price)}</span>
        <span className="mt-1 block text-xs text-neutral-500">Usually {money(deal.usualLow)} and up</span>
        <span className="mt-2 block text-sm font-medium leading-snug line-clamp-2">{deal.name}</span>
        <span className="mt-auto block pt-1 text-sm text-[#1F7A6F]">at {deal.store} ↗</span>
      </a>
    </li>
  );
}

export function BlackFridayBand() {
  const [data, setData] = useState<HomeDeals | null>(null);
  useEffect(() => {
    // Nothing is asked for outside the window: the band is hidden then.
    if (!isBlackFridayWindow(new Date())) return;
    let live = true;
    fetch('/api/black-friday-deals')
      .then((r) => (r.ok ? (r.json() as Promise<HomeDeals>) : null))
      .then((d) => {
        if (live && d && Array.isArray(d.deals) && d.deals.length > 0) setData(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const deals = data?.deals ?? [];

  return (
    <section aria-labelledby="black-friday-band" className="black-friday-only relative overflow-hidden bg-[#07110F] text-white">
      {/* Two soft lights behind the type; decoration only. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#2A9D8F]/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[#8DEBDD]/10 blur-3xl" />
      <div className="relative mx-auto max-w-5xl px-6 py-12 md:py-16">
        {deals.length > 0 ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8DEBDD] md:text-base">Real deals today</p>
            <h2
              id="black-friday-band"
              className="mt-4 max-w-4xl text-[2.5rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl"
            >
              Black Friday deals 2026
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
              Priced below what they usually sell for. Checked today.
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {deals.map((deal) => (
                <DealTile key={deal.slug} deal={deal} />
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8DEBDD] md:text-base">{EVENT_NAME}</p>
            <h2
              id="black-friday-band"
              className="mt-4 max-w-4xl text-[2.5rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl"
            >
              Find the true cheapest price
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
              Is the deal real? See today&apos;s price next to what it usually sells for.
            </p>
          </>
        )}
        <Link
          href={HREF}
          prefetch={false}
          className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-[#07110F] transition hover:bg-[#8DEBDD]"
        >
          {data && data.total > deals.length ? `See all ${data.total} deals` : 'Check the prices'}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
