"use client";

import { memo, useState } from "react";
import { useSavedList } from "@/contexts/SavedListContext";
import { ShoppingBag, Check, BadgeCheck, AlertTriangle, HelpCircle, Store, Users } from "lucide-react";
import { getRetailerTrust } from "@/lib/retailerTrust";
import { getRetailerLogo } from "./RetailerLogos";
import { isAffiliateUrl } from "@/lib/affiliate";
import { currencySymbol, formatPrice, formatRating } from "@/lib/formatters";
import LandedCostPanel from "./LandedCostPanel";
import type { Product } from "@/lib/types";
import type { EnhancedProduct } from "@/lib/productGrouping";

// Deterministic across server and client (explicit locale + UTC) — cards are
// prerendered on /search/[slug] pages, and locale/timezone-dependent output
// like bare toLocaleDateString() causes React hydration mismatches there.
const verifiedDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

interface ProductCardProps {
  product: EnhancedProduct;
  isCompareMode?: boolean;
  isSelected?: boolean;
  onSelect?: (product: Product) => void;
  isBestDeal?: boolean;
  isLowestInGroup?: boolean;
  groupSavingsAmount?: number;
  groupSavingsPercent?: number;
  groupSize?: number;
  /** True while FX rates are loading; the cost panel shows a loading state. */
  fxPending?: boolean;
}

function ProductCard({
  product,
  isCompareMode = false,
  isSelected = false,
  onSelect,
  isBestDeal = false,
  isLowestInGroup,
  groupSavingsAmount,
  groupSavingsPercent,
  groupSize,
  fxPending = false
}: ProductCardProps) {
  // Use props first, fallback to product properties
  const showLowestPrice = isLowestInGroup ?? product.isLowestInGroup;
  const savingsAmount = groupSavingsAmount ?? product.groupSavingsAmount;
  const productGroupSize = groupSize ?? product.groupSize;
  const savings = product.originalPrice ? product.originalPrice - product.price : 0;
  const pct = product.originalPrice ? Math.round((savings / product.originalPrice) * 100) : 0;

  const { isSaved, toggleItem } = useSavedList();
  const saved = isSaved(product.url);
  // Market-scoped identity: "Target" in the AU feed is Target Australia,
  // not Target US. The URL feeds the registry's lookalike guard.
  const trust = getRetailerTrust(product.retailer, {
    market: product.sourceMarket,
    url: product.url,
  });
  const retailerLogo = getRetailerLogo(product.retailer, product.sourceMarket);

  // Track the failed URL, not a boolean: memoized cards get recycled under
  // index keys, and a bare flag would keep showing the fallback after the
  // card is reused for a product whose image loads fine.
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageFailed = !product.image || failedImage === product.image;

  const handleClick = (e: React.MouseEvent) => {
    if (isCompareMode && onSelect) {
      e.preventDefault();
      onSelect(product);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({
      name: product.name,
      price: product.price,
      image: product.image,
      retailer: product.retailer,
      url: product.url,
    });
  };

  return (
    // Wrapper div exists so the save button is a sibling of the link, not a
    // descendant: interactive-inside-interactive is invalid HTML and trips
    // screen readers. The hover lift lives here so link and button move
    // together.
    <div className="relative group transition hover:-translate-y-0.5">
    <a
      href={product.url}
      target="_blank"
      // rel=sponsored is a machine-readable paid-link claim; only make it
      // when THIS link actually carries commission tracking. Per-link, not
      // site-wide: commission-excluded merchants (Amazon) keep a plain rel
      // even when affiliate links are live everywhere else.
      rel={isAffiliateUrl(product.url) ? "noopener noreferrer sponsored" : "noopener noreferrer"}
      className={`bg-white rounded-xl border p-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition slide-in block relative ${
        trust.level === 'flagged' ? 'border-red-300' : 'border-gray-200/70'
      } ${isCompareMode ? 'cursor-pointer' : ''} ${
        isSelected
          ? 'ring-2 ring-[#2A9D8F]'
          : trust.level === 'flagged'
            ? 'ring-2 ring-red-400/70'
            : ''
      }`}
      aria-label={`${
        product.isFallback
          ? `Search for ${product.name} on ${product.retailer}`
          : `View ${product.name} on ${product.retailer}, ${currencySymbol(product.currency)}${formatPrice(product.price, product.currency)}`
      }${
        trust.level === 'flagged'
          ? '. Warning: possible scam, not from a verified reseller'
          : trust.level === 'unknown'
            ? '. Unverified seller'
            : trust.level === 'marketplace-seller'
              ? '. Independent marketplace seller'
              : ''
      }`}
      onClick={handleClick}
    >
      {/* Compare Mode Checkbox */}
      {isCompareMode && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-[#2A9D8F] border-[#2A9D8F]'
                : 'bg-white border-black/20'
            }`}
          >
            {isSelected && (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      )}
      <div className="relative aspect-square mb-3 rounded-xl overflow-hidden bg-gray-100 p-4">
        {imageFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs text-black/60 font-medium">
              {product.name.length > 30 ? `${product.name.substring(0, 30)}...` : product.name}
            </span>
          </div>
        ) : (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            onError={() => setFailedImage(product.image)}
          />
        )}
        {savings > 0 && !product.isFallback && (
          <span className="absolute top-2 left-2 bg-neutral-900/80 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            -{pct}%
          </span>
        )}
        {product.isFallback && (
          <span className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-[10px] font-medium px-2 py-0.5 rounded-full border border-yellow-300">
            EXAMPLE
          </span>
        )}
        {/* Same-item chip: this exact product, cheapest of its listings.
            A listing that is also a similar pick shows that chip instead:
            the two share a corner, and the alternative is the bigger news
            ("from $X" below still marks it as its item's cheapest). */}
        {showLowestPrice && !product.isFallback && savingsAmount && savingsAmount > 0 && product.matchType !== 'similar' && (
          <span className="absolute bottom-2 left-2 bg-white text-[#1F7A6F] text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Same item · Save {currencySymbol(product.currency)}{formatPrice(savingsAmount, product.currency)}
          </span>
        )}
        {/* Similar-alternative chip: a different product, much cheaper.
            Solid dark fill so the two decisions never look alike. */}
        {product.matchType === 'similar' && product.similarTo && !product.isFallback && (
          <span className="absolute bottom-2 left-2 bg-[#14524B] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Similar pick · {product.similarTo.savingsPercent}% less
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {retailerLogo ? (
          // Fixed-size box so every card's logo badge is identical;
          // object-contain centers wordmarks of any aspect ratio inside it.
          // alt carries the retailer name so screen readers hear the same
          // label the text badge gave them.
          <span
            title={product.retailer}
            className="inline-flex items-center justify-center w-[72px] h-5 shrink-0 rounded-full bg-gray-100"
          >
            <img
              src={retailerLogo.src}
              alt={product.retailer}
              className="w-14 h-3.5 object-contain"
              loading="lazy"
            />
          </span>
        ) : (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-neutral-600">
            {product.retailer}
          </span>
        )}
        {trust.level === 'verified' && (
          <span
            title={trust.description}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-[#1F7A6F]"
          >
            <BadgeCheck className="w-3 h-3" aria-hidden="true" />
            Verified
          </span>
        )}
        {trust.level === 'marketplace' && (
          <span
            title={trust.description}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700"
          >
            <Store className="w-3 h-3" aria-hidden="true" />
            Marketplace
          </span>
        )}
        {trust.level === 'marketplace-seller' && (
          <span
            title={trust.description}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
          >
            <Users className="w-3 h-3" aria-hidden="true" />
            Marketplace seller
          </span>
        )}
        {trust.level === 'unknown' && (
          <span
            title={trust.description}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
          >
            <HelpCircle className="w-3 h-3" aria-hidden="true" />
            Unverified seller
          </span>
        )}
        {trust.level === 'flagged' && (
          <span
            title={trust.description}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700"
          >
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            Possible scam
          </span>
        )}
      </div>
      {trust.level === 'flagged' && (
        <p className="mt-1 text-[11px] leading-tight text-red-600">
          Not from a verified reseller. Buy with caution.
        </p>
      )}

      <h3 className="text-sm font-semibold text-neutral-900 mt-2 line-clamp-2 leading-tight group-hover:text-pick-teal transition">
        {product.name}
      </h3>

      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        {/* "from" only on the card that actually carries the group's lowest
            price; on the others it would advertise a floor the price isn't. */}
        {productGroupSize && productGroupSize > 1 && showLowestPrice && (
          <span className="text-xs text-neutral-500">from</span>
        )}
        <span className="text-xl font-bold tabular-nums text-neutral-900">{currencySymbol(product.currency)}{formatPrice(product.price, product.currency)}</span>
        {product.originalPrice && product.originalPrice > product.price && (
          <span className="text-sm line-through text-neutral-400 font-normal">{currencySymbol(product.currency)}{formatPrice(product.originalPrice, product.currency)}</span>
        )}
      </div>

      {typeof product.rating === "number" && product.rating > 0 && !product.isFallback && (
        <div className="flex items-center gap-1 mt-1 text-xs text-pick-muted">
          <span className="text-yellow-500">
            {"★".repeat(Math.min(5, Math.max(0, Math.round(product.rating))))}
          </span>
          <span>{formatRating(product.rating)}</span>
          {product.reviewCount ? (
            <span>({product.reviewCount.toLocaleString("en-US")})</span>
          ) : null}
        </div>
      )}

      {/* Why this alternative is comparable: reviews above, shared specs here */}
      {product.matchType === 'similar' && product.similarTo && !product.isFallback && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-[11px] leading-snug text-[#14524B]">
            Alternative to{' '}
            <span className="font-medium">
              {product.similarTo.name.length > 34
                ? `${product.similarTo.name.substring(0, 34)}…`
                : product.similarTo.name}
            </span>
          </p>
          {product.similarTo.sharedSpecs.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {product.similarTo.sharedSpecs.map((spec) => (
                <span
                  key={spec}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#14524B]/5 text-[#14524B]"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {product.isFallback && (
        <div className="mt-2 pt-2 border-t border-pick-border">
          <p className="text-[10px] text-pick-muted leading-tight">
            Example product • Click to search on {product.retailer}
          </p>
        </div>
      )}

      {!product.isFallback && product.lastVerified && (
        <div className="mt-1 text-[10px] text-pick-muted">
          Price verified {verifiedDateFormat.format(new Date(product.lastVerified))}
        </div>
      )}
    </a>
      {/* Landed-cost breakdown, only present when the flag-on enrichment
          attached one. A sibling of the link, not a child: <details> is
          interactive and interactive-inside-interactive is invalid HTML
          (same reason the save button lives out here). */}
      {product.landedCost && !product.isFallback && (
        <LandedCostPanel breakdown={product.landedCost} fxPending={fxPending} />
      )}
      {/* Sibling of the link (see wrapper comment). top/right = card padding
          (12px) + the old inset (8px). */}
      {!isCompareMode && (
        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
          title={saved ? 'Remove from saved items' : 'Save to your list'}
          className={`absolute top-5 right-5 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
            saved
              ? 'bg-pick-teal text-white'
              : 'bg-white/90 text-black/50 hover:text-pick-teal hover:bg-white'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

// Memoized: the results grid re-renders on every compare-mode selection and
// filter change; cards only need to re-render when their own props change.
export default memo(ProductCard);
