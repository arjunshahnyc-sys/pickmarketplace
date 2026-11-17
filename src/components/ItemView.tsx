'use client';

// The body of Pick's product page (/item). Shows at once what the signed
// link carries (title, the search's price, image, the button to the store),
// then fills in the store's own listing from /api/item: photos, its price
// and stock notes, the size verdict, and the other stores selling it. If
// the details cannot be loaded the first view simply stays, button and all.

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { currencySymbol, formatPrice } from '@/lib/formatters';
import type { TrustLevel } from '@/lib/retailerTrust';
import type { ItemBase, ItemDetails, ItemOffer } from '@/lib/itemView';
import { sizeCheckMessage } from './SizeCheckButton';

const TRUST_LABEL: Record<TrustLevel, { text: string; tone: string }> = {
  verified: { text: 'Verified store', tone: 'text-[#1F7A6F] bg-teal-50' },
  marketplace: { text: 'Marketplace', tone: 'text-neutral-700 bg-gray-100' },
  'marketplace-seller': { text: 'Marketplace seller', tone: 'text-neutral-700 bg-gray-100' },
  unknown: { text: 'Unverified seller', tone: 'text-amber-800 bg-amber-50' },
  flagged: { text: 'Possible scam', tone: 'text-red-700 bg-red-50' },
};

function TrustTag({ level }: { level: TrustLevel }) {
  const { text, tone } = TRUST_LABEL[level];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{text}</span>;
}

const relFor = (sponsored: boolean) => (sponsored ? 'noopener noreferrer sponsored' : 'noopener noreferrer');

function OtherStore({ offer }: { offer: ItemOffer }) {
  return (
    <li className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-900">
          {offer.store} <TrustTag level={offer.trust} />
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">{offer.title}</p>
        {offer.details.length > 0 && (
          <p className="mt-0.5 text-xs text-neutral-500">{offer.details.slice(0, 2).join(' · ')}</p>
        )}
      </div>
      {offer.price && <span className="shrink-0 text-sm font-semibold text-neutral-900">{offer.price}</span>}
      <a
        href={offer.url}
        target="_blank"
        rel={relFor(offer.sponsored)}
        aria-label={`Go to ${offer.store}`}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-black/10 px-4 text-sm font-medium text-neutral-800 hover:border-[#2A9D8F] hover:text-[#14524B] transition-colors"
      >
        Visit
      </a>
    </li>
  );
}

interface ItemViewProps {
  base: ItemBase;
  detailsUrl: string;
  /** The search the shopper came from; '' when unknown. */
  backQuery: string;
}

export default function ItemView({ base, detailsUrl, backQuery }: ItemViewProps) {
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let live = true;
    fetch(detailsUrl)
      .then((r) => r.json())
      .then((d: ItemDetails) => live && setDetails(d))
      .catch(() => live && setDetails({ ok: false }));
    return () => {
      live = false;
    };
  }, [detailsUrl]);

  const loading = details === null;
  const ok = details?.ok ? details : null;
  const seller = ok?.seller ?? null;

  const images = ok && ok.images.length > 0 ? ok.images : base.image ? [base.image] : [];
  const mainImage = images[Math.min(shown, images.length - 1)];
  const title = ok?.title ?? base.title;
  const storeUrl = ok?.storeUrl ?? base.storeUrl;
  // The store's own price once the listing is in; until then the search's.
  const price = seller?.price ?? `${currencySymbol(base.currency)}${formatPrice(base.price, base.currency)}`;
  const goLabel = seller?.host ? `Go to ${seller.host}` : `Go to ${base.retailer}`;
  const sizeResult = details?.size ?? null;
  const sizeLine = base.size && sizeResult ? sizeCheckMessage(sizeResult, base.size.size, base.retailer) : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 md:py-10">
      {/* Back to the search: a plain link to it. The results page keeps the
          last search for the tab (lib/lastSearch.ts), so this shows the same
          results at the same place without running the search again. */}
      <a
        href={backQuery ? `/?q=${encodeURIComponent(backQuery)}` : '/'}
        className="mb-5 -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-neutral-700 hover:text-[#14524B] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backQuery ? 'Back to results' : 'Back to search'}
      </a>
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Photos */}
        <div>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gray-50">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage} alt={title} className="h-full w-full object-contain mix-blend-multiply p-6" />
            ) : (
              <span className="text-sm text-neutral-400">No photo</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setShown(i)}
                  aria-label={`Photo ${i + 1} of ${images.length}`}
                  aria-pressed={i === shown}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-gray-50 transition-colors ${
                    i === shown ? 'border-[#14524B]' : 'border-transparent hover:border-black/20'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-contain mix-blend-multiply p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* The listing */}
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            Sold by <span className="font-semibold text-neutral-900">{base.retailer}</span>
            <TrustTag level={base.trust} />
          </p>
          <h1 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight leading-tight text-neutral-900">
            {title}
          </h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-neutral-900">{price}</span>
            {seller?.originalPrice && (
              <span className="text-lg text-neutral-400 line-through">{seller.originalPrice}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {seller
              ? `${base.retailer}'s listed price, checked just now. Shipping and tax may be extra.`
              : 'Price from the search. The store has the final price.'}
          </p>

          {base.size && (
            <div className="mt-5 rounded-xl border border-black/10 px-4 py-3">
              <p className="text-xs font-medium text-neutral-500">Size {base.size.size}</p>
              {sizeLine ? (
                <>
                  <p className={`mt-0.5 text-sm font-medium ${sizeLine.tone}`}>{sizeLine.text}</p>
                  {sizeResult && sizeResult.alsoAt.length > 0 && sizeResult.status !== 'in-stock' && (
                    <p className="mt-0.5 text-sm text-neutral-600">
                      Size {base.size.size} in stock at {sizeResult.alsoAt.join(' and ')}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-0.5 text-sm text-neutral-600">
                  {loading ? 'Checking the store for your size' : 'Could not check this one. Check at the store.'}
                </p>
              )}
            </div>
          )}

          {seller && seller.details.length > 0 && (
            <ul className="mt-5 space-y-1.5 text-sm text-neutral-700">
              {seller.details.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                  {line}
                </li>
              ))}
            </ul>
          )}
          {loading && (
            <div className="mt-5 space-y-2" aria-hidden="true">
              <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-56 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
            </div>
          )}

          <a
            href={storeUrl}
            target="_blank"
            rel={relFor(base.sponsored)}
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#2A9D8F] px-8 text-base font-semibold text-white hover:bg-[#21867A] active:scale-[0.99] transition-[background-color,scale] md:w-auto"
          >
            {goLabel}
            <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
          </a>
          <p className="mt-3 text-xs text-neutral-500">
            You buy on {base.retailer}&apos;s site. Pick does not sell anything or handle your payment.
          </p>

          {ok?.description && (
            <div className="mt-8 border-t border-black/10 pt-6">
              <h2 className="text-sm font-semibold text-neutral-900">About this product</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{ok.description}</p>
            </div>
          )}
        </div>
      </div>

      {ok && ok.others.length > 0 && (
        <section className="mt-12 border-t border-black/10 pt-8">
          <h2 className="text-lg font-semibold text-neutral-900">Other stores selling this</h2>
          <ul className="mt-2 divide-y divide-black/5">
            {ok.others.map((offer) => (
              <OtherStore key={`${offer.store}|${offer.url}`} offer={offer} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
