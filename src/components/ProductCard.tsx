"use client";

import { useSavedList } from "@/contexts/SavedListContext";
import { ShoppingBag, Check } from "lucide-react";

interface Product {
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  retailer: string;
  url: string;
  rating?: number;
  reviewCount?: number;
  brand?: string;
  isFallback?: boolean;
  lastVerified?: string;
  isLowestInGroup?: boolean;
  groupSavingsAmount?: number;
  groupSavingsPercent?: number;
  groupSize?: number;
}

interface ProductCardProps {
  product: Product;
  isCompareMode?: boolean;
  isSelected?: boolean;
  onSelect?: (product: Product) => void;
  isBestDeal?: boolean;
  isLowestInGroup?: boolean;
  groupSavingsAmount?: number;
  groupSavingsPercent?: number;
  groupSize?: number;
}

export default function ProductCard({
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
      className={`bg-white rounded-xl border border-gray-200/70 p-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition group slide-in block relative ${
        isCompareMode ? 'cursor-pointer' : ''
      } ${isSelected ? 'ring-2 ring-[#2A9D8F]' : ''}`}
      aria-label={product.isFallback ? `Search for ${product.name} on ${product.retailer}` : `View ${product.name} on ${product.retailer}`}
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
              fallback.innerHTML = `
                <div class="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-2">
                  <svg class="w-8 h-8 text-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <span class="text-xs text-black/40 font-medium">${product.name.substring(0, 30)}${product.name.length > 30 ? '...' : ''}</span>
              `;
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

      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-neutral-600">
        {product.retailer}
      </span>

      <h3 className="text-sm font-semibold text-neutral-900 mt-2 line-clamp-2 leading-tight group-hover:text-pick-teal transition">
        {product.name}
      </h3>

      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        {productGroupSize && productGroupSize > 1 && (
          <span className="text-xs text-neutral-500">from</span>
        )}
        <span className="text-xl font-bold tabular-nums text-neutral-900">${product.price.toFixed(2)}</span>
        {product.originalPrice && product.originalPrice > product.price && (
          <span className="text-sm line-through text-neutral-400 font-normal">${product.originalPrice.toFixed(2)}</span>
        )}
      </div>

      {product.rating && !product.isFallback && (
        <div className="flex items-center gap-1 mt-1 text-xs text-pick-muted">
          <span className="text-yellow-500">{"★".repeat(Math.round(product.rating))}</span>
          <span>{product.rating.toFixed(1)}</span>
          {product.reviewCount && <span>({product.reviewCount.toLocaleString()})</span>}
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
          Price verified {new Date(product.lastVerified).toLocaleDateString()}
        </div>
      )}
    </a>
  );
}
