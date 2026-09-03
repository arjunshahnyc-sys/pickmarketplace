'use client';

// The landing page's proof: one real comparison, the product a shopper
// searched beside the cheaper equivalent Pick found, with both prices, both
// retailers, and the saving.
//
// This component only renders what it is given. The data object lives at the
// top of src/app/page.tsx (HERO_COMPARISON); while its isPlaceholder flag is
// true the card wears a visible TODO ribbon, so filler can never pass for a
// real result. Shape mirrors the Product type and the similar-pick rationale
// in src/lib/productGrouping.ts so a genuine result can be pasted in as-is.

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { getRetailerLogo } from './RetailerLogos';
import { isAffiliateUrl } from '@/lib/affiliate';
import { currencySymbol, formatPrice, formatRating } from '@/lib/formatters';

export interface ComparisonOffer {
  name: string;
  price: number;
  /** ISO 4217 currency of `price`. Absent = USD. */
  currency?: string;
  retailer: string;
  url: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  /** Feed market the offer came from ('US', 'GB'), for logo resolution. */
  sourceMarket?: string;
}

export interface ComparisonResultData {
  /** What the shopper typed. */
  query: string;
  /** The product searched for: the top result, the anchor of the comparison. */
  input: ComparisonOffer;
  /** The cheaper equivalent Pick found (a 'similar' match, not a same-item listing). */
  pick: ComparisonOffer;
  /** Key name words the two share, as the result card shows them. */
  sharedSpecs: string[];
  /** ISO timestamp of the live check the prices came from. */
  checkedAt: string;
  /** True while the data is filler: renders a visible TODO ribbon. */
  isPlaceholder?: boolean;
  /**
   * True for an illustrative pair at list prices rather than a captured
   * live result: the card is captioned "Example result", the footnote says
   * so, and each offer links to a Pick search for that product instead of a
   * retailer page.
   */
  isExample?: boolean;
}

interface ComparisonResultProps {
  data: ComparisonResultData;
  labels?: Partial<typeof DEFAULT_LABELS>;
}

const DEFAULT_LABELS = {
  sectionLabel: 'A real result',
  inputLabel: 'What you searched',
  pickLabel: 'Its cheaper twin',
  whyLabel: 'What they share',
  /** {date} is replaced with the formatted checkedAt date. */
  footnote: 'Prices checked on {date}. Retailers change prices, so confirm at checkout.',
};

// Filler must never be captioned as real, ribbon or no ribbon: the section
// label and the footnote both switch to say so, since a made-up checkedAt
// would otherwise render as a real "checked on" date.
const PLACEHOLDER_SECTION_LABEL = 'Placeholder result';
const PLACEHOLDER_FOOTNOTE =
  'Placeholder data. No prices have been checked; replace this with a real search result.';
// Illustrative pair: real products at list prices, not a live check.
const EXAMPLE_SECTION_LABEL = 'Example result';
const EXAMPLE_FOOTNOTE =
  'An example at list prices, not a live check. Search above to see current listings.';

// Explicit locale and UTC so server and client render the same string.
const checkedDateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-500" aria-hidden="true">
      {'★'.repeat(Math.min(5, Math.max(0, Math.round(rating))))}
    </span>
  );
}

function OfferPanel({
  offer,
  label,
  chip,
  emphasized,
  placeholder,
}: {
  offer: ComparisonOffer;
  label: string;
  chip?: string;
  emphasized: boolean;
  placeholder: boolean;
}) {
  const logo = getRetailerLogo(offer.retailer, offer.sourceMarket);
  const symbol = currencySymbol(offer.currency);
  const price = `${symbol}${formatPrice(offer.price, offer.currency)}`;
  const hasRating = typeof offer.rating === 'number' && offer.rating > 0;
  // Retailer thumbnails expire; a dead one falls back to the "No image"
  // box instead of a broken-image icon (same pattern as ProductCard).
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const showImage = Boolean(offer.image) && failedImage !== offer.image;

  const body = (
    <>
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.15em] mb-3 ${
          emphasized ? 'text-[#2A9D8F]' : 'text-neutral-500'
        }`}
      >
        {label}
      </p>
      {/* Phones: a thumbnail-left row, since the two panels stack there.
          sm and up: image on top, kept squat so the whole card sits above
          the fold on a laptop viewport. The savings chip overlays the image
          on wide screens, pinned to the top-left corner like every card
          chip on the site; on phones it sits on its own line above the row,
          where it has the full panel width and never wraps (never both). */}
      {chip && (
        <span className="sm:hidden inline-flex mb-2 whitespace-nowrap bg-[#14524B] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
          {chip}
        </span>
      )}
      <div className="flex gap-3 sm:block">
        <div className="relative shrink-0 w-24 h-24 sm:w-auto sm:h-auto sm:aspect-[3/2] rounded-xl overflow-hidden bg-gray-100 p-2 sm:p-3 sm:mb-3">
          {showImage ? (
            <img
              src={offer.image}
              alt={offer.name}
              className="w-full h-full object-contain"
              loading="eager"
              onError={() => setFailedImage(offer.image ?? null)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-black/40">
              No image
            </div>
          )}
          {chip && (
            <span className="hidden sm:inline-flex absolute top-2 left-2 bg-[#14524B] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {chip}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {logo ? (
              <span
                title={offer.retailer}
                className="inline-flex items-center justify-center w-[72px] h-5 shrink-0 rounded-full bg-gray-100"
              >
                <img src={logo.src} alt={offer.retailer} className="w-14 h-3.5 object-contain" />
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-neutral-600">
                {offer.retailer}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 leading-tight line-clamp-2">
            {offer.name}
          </h3>
          <p
            className={`mt-1.5 text-2xl font-bold tabular-nums ${
              emphasized ? 'text-[#14524B]' : 'text-neutral-900'
            }`}
          >
            {price}
          </p>
          {hasRating && (
            <p className="mt-1 flex items-center gap-1 text-xs text-black/60">
              <Stars rating={offer.rating as number} />
              <span>{formatRating(offer.rating)}</span>
              {offer.reviewCount ? <span>({offer.reviewCount.toLocaleString('en-US')})</span> : null}
            </p>
          )}
        </div>
      </div>
    </>
  );

  const panelClass = `block rounded-xl p-3 transition ${
    emphasized ? 'bg-white border-2 border-[#14524B]/25' : 'bg-white border border-black/10'
  }`;

  // Filler never links anywhere: a placeholder URL is not a product page.
  if (placeholder || !offer.url) {
    return <div className={panelClass}>{body}</div>;
  }
  // Site-relative URLs (the example pair links to Pick searches) open in
  // the same tab; only retailer links get a new tab and the affiliate rel.
  if (offer.url.startsWith('/')) {
    return (
      <a
        href={offer.url}
        aria-label={`Search Pick for ${offer.name}`}
        className={`${panelClass} hover:border-[#2A9D8F] hover:shadow-md`}
      >
        {body}
      </a>
    );
  }
  return (
    <a
      href={offer.url}
      target="_blank"
      rel={isAffiliateUrl(offer.url) ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
      aria-label={`View ${offer.name} on ${offer.retailer}, ${price}`}
      className={`${panelClass} hover:border-[#2A9D8F] hover:shadow-md`}
    >
      {body}
    </a>
  );
}

export default function ComparisonResult({ data, labels }: ComparisonResultProps) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const placeholder = Boolean(data.isPlaceholder);
  const example = !placeholder && Boolean(data.isExample);
  const sectionLabel = placeholder
    ? PLACEHOLDER_SECTION_LABEL
    : example
      ? EXAMPLE_SECTION_LABEL
      : t.sectionLabel;

  // Savings only make sense in one currency; a cross-currency pair shows the
  // two prices and nothing else, rather than a made-up conversion.
  const sameCurrency = (data.input.currency ?? 'USD') === (data.pick.currency ?? 'USD');
  const savingsAmount = sameCurrency ? data.input.price - data.pick.price : 0;
  const savingsPercent =
    sameCurrency && data.input.price > 0
      ? Math.round((savingsAmount / data.input.price) * 100)
      : 0;
  const showSavings = sameCurrency && savingsAmount > 0;
  const symbol = currencySymbol(data.input.currency);

  const checkedDate = Number.isNaN(Date.parse(data.checkedAt))
    ? data.checkedAt
    : checkedDateFormat.format(new Date(data.checkedAt));

  return (
    <div className="relative">
      {placeholder && (
        // Visible TODO: this ribbon stays until real data replaces the filler
        // in HERO_COMPARISON (src/app/page.tsx).
        <div
          role="note"
          className="mb-2 rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-yellow-800"
        >
          TODO: placeholder data. Replace HERO_COMPARISON in page.tsx with a real result from a live search.
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm border border-black/10 rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        {/* The label never wraps; the query is what truncates on narrow
            screens (min-w-0 lets the flex child actually shrink). */}
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <p className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
            {sectionLabel}
          </p>
          {data.query && (
            <p className="min-w-0 text-xs text-neutral-500 truncate">
              Search: <span className="font-medium text-neutral-700">&quot;{data.query}&quot;</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <OfferPanel
            offer={data.input}
            label={t.inputLabel}
            emphasized={false}
            placeholder={placeholder}
          />
          <div className="flex sm:flex-col items-center justify-center text-[#2A9D8F]" aria-hidden="true">
            <ArrowRight className="w-6 h-6 rotate-90 sm:rotate-0" />
          </div>
          <OfferPanel
            offer={data.pick}
            label={t.pickLabel}
            chip={showSavings ? `Similar pick · ${savingsPercent}% less` : undefined}
            emphasized
            placeholder={placeholder}
          />
        </div>

        <div className="mt-3 pt-3 border-t border-black/10 flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
          {showSavings ? (
            <p className="text-sm text-neutral-700">
              <span className="text-2xl font-bold tabular-nums text-[#14524B]">
                Save {symbol}
                {formatPrice(savingsAmount, data.input.currency)}
              </span>{' '}
              <span className="ml-1 text-neutral-500">
                {savingsPercent}% less than the product you searched
              </span>
            </p>
          ) : sameCurrency ? (
            // Same currency but no saving: say nothing rather than invent one.
            <p className="text-sm text-neutral-500">No saving on this pair.</p>
          ) : (
            <p className="text-sm text-neutral-500">Two prices, two currencies: compare them directly.</p>
          )}
          {data.sharedSpecs.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 md:justify-end">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#14524B] mr-1">
                {t.whyLabel}
              </span>
              {data.sharedSpecs.map((spec, i) => (
                <span
                  key={`${spec}-${i}`}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#14524B]/5 text-[#14524B]"
                >
                  {spec}
                </span>
              ))}
            </p>
          )}
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">
          {placeholder
            ? PLACEHOLDER_FOOTNOTE
            : example
              ? EXAMPLE_FOOTNOTE
              : t.footnote.replace('{date}', checkedDate)}
        </p>
      </div>
    </div>
  );
}
