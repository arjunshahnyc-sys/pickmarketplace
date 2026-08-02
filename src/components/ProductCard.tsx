"use client";

import { memo } from "react";
import { useSavedList } from "@/contexts/SavedListContext";
import { ShoppingBag, Check, BadgeCheck, AlertTriangle, HelpCircle } from "lucide-react";
import { getRetailerTrust } from "@/lib/retailerTrust";
import { formatPrice, formatRating } from "@/lib/formatters";
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
  groupSize
}: ProductCardProps) {
  // Use props first, fallback to product properties
  const showLowestPrice = isLowestInGroup ?? product.isLowestInGroup;
  const savingsAmount = groupSavingsAmount ?? product.groupSavingsAmount;
  const productGroupSize = groupSize ?? product.groupSize;
  const savings = product.originalPrice ? product.originalPrice - product.price : 0;
  const pct = product.originalPrice ? Math.round((savings / product.originalPrice) * 100) : 0;

  const { isSaved, toggleItem } = useSavedList();
  const saved = isSaved(product.url);
  const trust = getRetailerTrust(product.retailer);

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
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`bg-white rounded-xl border p-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition group slide-in block relative ${
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
          : `View ${product.name} on ${product.retailer}, $${formatPrice(product.price)}`
      }${
        trust.level === 'flagged'
          ? ' — warning: possible scam, not from a verified reseller'
          : trust.level === 'unknown'
            ? ' — unverified seller'
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
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.image-fallback')) {
              const fallback = document.createElement('div');
              fallback.className = 'image-fallback absolute inset-0 flex flex-col items-center justify-center text-center p-4';
              // Static markup only — the product name is attacker-influenced
              // (Serper feed) and must go through textContent, never innerHTML.
              fallback.innerHTML = `
                <div class="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-2">
                  <svg class="w-8 h-8 text-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              `;
              const label = document.createElement('span');
              label.className = 'text-xs text-black/40 font-medium';
              label.textContent =
                product.name.length > 30 ? `${product.name.substring(0, 30)}...` : product.name;
              fallback.appendChild(label);
              parent.appendChild(fallback);
            }
          }}
        />
        {!isCompareMode && (
          <button
            type="button"
            onClick={handleSave}
            aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
            title={saved ? 'Remove from saved items' : 'Save to your list'}
            className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
              saved
                ? 'bg-pick-teal text-white'
                : 'bg-white/90 text-black/50 hover:text-pick-teal hover:bg-white'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
          </button>
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
        {/* Lowest-of-group chip — quiet, factual */}
        {showLowestPrice && !product.isFallback && savingsAmount && savingsAmount > 0 && (
          <span className="absolute bottom-2 left-2 bg-white text-[#1F7A6F] text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Lowest price · Save ${savingsAmount.toFixed(2)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-neutral-600">
          {product.retailer}
        </span>
        {trust.level === 'verified' && (
          <span
            title={trust.description}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-[#1F7A6F]"
          >
            <BadgeCheck className="w-3 h-3" aria-hidden="true" />
            Verified
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
          Not from a verified reseller — buy with caution.
        </p>
      )}

      <h3 className="text-sm font-semibold text-neutral-900 mt-2 line-clamp-2 leading-tight group-hover:text-pick-teal transition">
        {product.name}
      </h3>

      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        {productGroupSize && productGroupSize > 1 && (
          <span className="text-xs text-neutral-500">from</span>
        )}
        <span className="text-xl font-bold tabular-nums text-neutral-900">${formatPrice(product.price)}</span>
        {product.originalPrice && product.originalPrice > product.price && (
          <span className="text-sm line-through text-neutral-400 font-normal">${formatPrice(product.originalPrice)}</span>
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
  );
}

// Memoized: the results grid re-renders on every compare-mode selection and
// filter change; cards only need to re-render when their own props change.
export default memo(ProductCard);
