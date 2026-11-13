import Link from 'next/link';
import { HeroHeadline } from '@/components/HeroHeadline';
import { isAffiliateUrl } from '@/lib/affiliate';
import { COMPARISON_CATEGORY_LABELS } from '@/lib/comparisons';
import { currencySymbol, formatPrice } from '@/lib/formatters';
import {
  PRICE_CHECK_CATEGORIES,
  type PriceCheckEvent,
  type PriceCheckRow,
  type PriceCheckSummary,
} from '@/lib/priceCheck';

// What /price-check/[event] looks like: a dark sale-day banner, then one
// card per product with its three numbers and a bar that shows them against
// each other. Presentation only; the page loads the rows (and pays for
// them), lib/priceCheck.ts decides what each row says.
//
// The headline is the owner's ("Find the true cheapest price", 2026-11-12).
// The sentence under it carries the exact claim: the lowest price Pick
// could confirm at a verified store today.

const dollars = (amount: number) => `${currencySymbol('USD')}${formatPrice(amount, 'USD')}`;
/** "$198" for round amounts, "$189.74" otherwise: the compact form for tight labels. */
const shortDollars = (amount: number) =>
  `${currencySymbol('USD')}${Number.isInteger(amount) ? amount.toLocaleString('en-US') : formatPrice(amount, 'USD')}`;

const POSITION_COPY = {
  below: { label: 'Below the usual range', tone: 'bg-[#2A9D8F] text-white' },
  within: { label: 'Within the usual range', tone: 'bg-neutral-100 text-neutral-700' },
  above: { label: 'Above the usual range', tone: 'bg-amber-100 text-amber-900' },
} as const;

/**
 * Today's price, the crossed-out price and Google's typical range on one
 * scale. The shaded stretch is the range; the dot is today's price; the
 * hollow tick is the crossed-out price.
 */
function RangeBar({ row }: { row: PriceCheckRow }) {
  if (!row.today || !row.googleTypicalRange) return null;
  const [low, high] = row.googleTypicalRange;
  const marks = [low, high, row.today.price, ...(row.crossedOut !== null ? [row.crossedOut] : [])];
  const min = Math.min(...marks);
  const max = Math.max(...marks);
  // Keep the ends off the edges so a dot at either end is fully visible.
  const span = max - min || 1;
  const at = (value: number) => 4 + ((value - min) / span) * 92;
  return (
    <div className="mt-5" aria-hidden="true">
      <div className="relative h-7">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-100" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#2A9D8F]/30"
          style={{ left: `${at(low)}%`, width: `${Math.max(at(high) - at(low), 1.5)}%` }}
        />
        {row.crossedOut !== null && (
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-500 bg-white"
            style={{ left: `${at(row.crossedOut)}%` }}
          />
        )}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#14524B] ring-4 ring-white"
          style={{ left: `${at(row.today.price)}%` }}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#14524B]" />
          Today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-5 rounded-full bg-[#2A9D8F]/30" />
          Usual range, per Google
        </span>
        {row.crossedOut !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-500" />
            Crossed-out price
          </span>
        )}
      </div>
    </div>
  );
}

function ProductCard({ row }: { row: PriceCheckRow }) {
  const comparePath = `/compare/${row.entry.slug}`;
  if (!row.today) {
    return (
      <li className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-5">
        <h3 className="font-semibold text-neutral-700">{row.entry.name}</h3>
        <p className="mt-2 text-sm text-neutral-500">
          No confirmed price today. Pick did not find a new unit of exactly this product at a verified store.
        </p>
        {/* A prefetch would render the target, and a render is a paid search. */}
        <Link href={comparePath} prefetch={false} className="mt-3 inline-block text-sm font-medium text-[#1F7A6F] hover:text-[#2A9D8F]">
          See what Pick did find
        </Link>
      </li>
    );
  }
  const position = row.position ? POSITION_COPY[row.position] : null;
  return (
    <li className="flex flex-col rounded-2xl border border-black/10 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug text-neutral-900">{row.entry.name}</h3>
        {position && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${position.tone}`}>
            {position.label}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-4xl font-bold tracking-tight text-neutral-900">{dollars(row.today.price)}</span>
        {row.crossedOut !== null && (
          <span className="text-lg text-neutral-400 line-through decoration-neutral-400">{dollars(row.crossedOut)}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-600">
        at{' '}
        <a
          href={row.today.clickUrl ?? row.today.url}
          target="_blank"
          rel={isAffiliateUrl(row.today.url) ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
          className="font-medium text-[#1F7A6F] underline decoration-[#2A9D8F]/30 underline-offset-4 hover:text-[#2A9D8F]"
        >
          {row.today.store} ↗
        </a>
      </p>

      <RangeBar row={row} />

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Usual range, per Google</dt>
          <dd className="text-right text-neutral-900">
            {row.googleTypicalRange
              ? `${shortDollars(row.googleTypicalRange[0])} to ${shortDollars(row.googleTypicalRange[1])}`
              : 'None given'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Store&apos;s crossed-out price</dt>
          <dd className="text-right text-neutral-900">{row.crossedOut !== null ? shortDollars(row.crossedOut) : 'None shown'}</dd>
        </div>
      </dl>
      {row.crossedOutAboveTypical && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          The crossed-out price is above what Google says this usually sells for, so the discount looks bigger than it is.
        </p>
      )}

      <div className="mt-auto pt-4">
        {/* A prefetch would render the target, and a render is a paid search. */}
        <Link href={comparePath} prefetch={false} className="text-sm font-medium text-[#1F7A6F] hover:text-[#2A9D8F]">
          Every store, and a cheaper alternative
        </Link>
      </div>
    </li>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">{value}</div>
      <div className="mt-1 text-sm leading-snug text-white/70">{label}</div>
    </div>
  );
}

export interface PriceCheckViewProps {
  event: PriceCheckEvent;
  rows: PriceCheckRow[];
  summary: PriceCheckSummary;
  /** When the prices were checked, ISO 8601, and the same as display text. */
  checkedAt: string;
  checkedLabel: string;
  /** The event's day as display text. */
  eventDayLabel: string;
  refreshHours: number;
}

export function PriceCheckView({ event, rows, summary, checkedAt, checkedLabel, eventDayLabel, refreshHours }: PriceCheckViewProps) {
  return (
    <>
      {/* The banner */}
      <section className="relative overflow-hidden bg-[#07110F] text-white">
        {/* Two soft lights behind the type; decoration only. */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#2A9D8F]/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[#8DEBDD]/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 pb-14 pt-12 md:pb-20 md:pt-16">
          <nav aria-label="Breadcrumb" className="mb-8 text-xs text-white/50">
            <Link href="/compare" className="hover:text-white">Cheaper twins</Link>
            <span className="mx-1.5">/</span>
            <span>Price check</span>
          </nav>

          <HeroHeadline
            className="font-black uppercase leading-[0.92] tracking-tight text-white"
            ink="#FFFFFF"
            lightEdge="#8DEBDD"
            lightCore="#2A9D8F"
          >
            {/* Solid mint, outside the light: the fill is set on the span itself. */}
            <span
              className="mb-4 block text-base font-semibold tracking-[0.3em] md:text-xl"
              style={{ WebkitTextFillColor: '#8DEBDD', color: '#8DEBDD' }}
            >
              {event.name}
            </span>{' '}
            <span className="block text-[2.75rem] sm:text-6xl md:text-8xl">Find the true cheapest price</span>
          </HeroHeadline>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            A sale sticker shows the price the store wants you to compare against. Pick shows the lowest price it could
            confirm at a verified store today, the price that store crossed out, and what Google says the product
            usually sells for.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <Stat value={`${summary.confirmed} of ${rows.length}`} label="products with a price Pick could confirm today" />
            <Stat value={String(summary.below)} label="priced below their usual range" />
            <Stat value={String(summary.inflatedCrossedOut)} label="with a crossed-out price above their usual range" />
          </div>

          <p className="mt-6 text-sm text-white/50">
            {event.name} is {eventDayLabel}. Prices checked <time dateTime={checkedAt}>{checkedLabel}</time>, refreshed at
            most once every {refreshHours} hours.
          </p>
        </div>
      </section>

      <main id="main-content" className="mx-auto max-w-5xl px-6 pb-24 pt-12">
        {PRICE_CHECK_CATEGORIES.map((category) => {
          const group = rows.filter((r) => r.entry.category === category);
          // Confirmed prices first; the order within each half is the catalog's.
          const ordered = [...group.filter((r) => r.today), ...group.filter((r) => !r.today)];
          const id = `cat-${category.replace(/\s+/g, '-')}`;
          return (
            <section key={category} aria-labelledby={id} className="mb-14">
              <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-black/10 pb-3">
                <h2 id={id} className="text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl">
                  {COMPARISON_CATEGORY_LABELS[category]}
                </h2>
                <span className="text-sm text-neutral-500">
                  {group.filter((r) => r.today).length} of {group.length} confirmed
                </span>
              </div>
              <ul className="grid gap-4 md:grid-cols-2">
                {ordered.map((row) => (
                  <ProductCard key={row.entry.slug} row={row} />
                ))}
              </ul>
            </section>
          );
        })}

        <section aria-labelledby="how-to-read" className="mb-12 rounded-2xl bg-[#07110F] p-6 text-white md:p-8">
          <h2 id="how-to-read" className="text-2xl font-bold tracking-tight">How to read this</h2>
          <ul className="mt-4 grid gap-x-8 gap-y-4 text-sm leading-relaxed text-white/75 md:grid-cols-2">
            <li>
              <strong className="font-semibold text-white">The big price</strong> is a new unit of exactly that product
              at a store Pick verifies. A listing counts only when a title names the exact product or Google lists the
              store under it, so a similar model, a bundle or a refurbished unit is never priced as the product. It is
              the item price, before shipping and sales tax.
            </li>
            <li>
              <strong className="font-semibold text-white">It is the lowest price Pick confirmed, not a promise of the
              lowest anywhere.</strong> Pick sees the stores a search turns up, and colours of one product are often
              priced differently, so another check can find a different store or price.
            </li>
            <li>
              <strong className="font-semibold text-white">The crossed-out price</strong> is the store&apos;s own claim
              about what the product used to cost. Pick shows it and has not checked it.
            </li>
            <li>
              <strong className="font-semibold text-white">The usual range</strong> is Google&apos;s figure for what the
              listing Pick looked up typically sells for, not Pick&apos;s. Pick keeps no price history of its own, so
              this page cannot tell you what a product cost last week.
            </li>
            <li>
              <strong className="font-semibold text-white">Only headphones, earbuds and dorm appliances are here.</strong>{' '}
              They are sold as one model, which a title or a store can confirm. Skincare listings rarely state the
              size and clothing prices vary by colour and cut.
            </li>
          </ul>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-neutral-600">
            Each product&apos;s page lists every store Pick could confirm, and a cheaper alternative with the same key
            specs when one passes Pick&apos;s bar.
          </p>
          <Link
            href="/compare"
            className="inline-block rounded-xl bg-[#2A9D8F] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#238B7E]"
          >
            See all comparisons
          </Link>
        </div>
      </main>
    </>
  );
}
