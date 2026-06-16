"use client";

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

const RETAILER_COLORS: Record<string, string> = {
  Amazon: "bg-yellow-100 text-yellow-800",
  Target: "bg-red-100 text-red-800",
  "Best Buy": "bg-blue-100 text-blue-800",
  "Macy's": "bg-pink-100 text-pink-800",
  Walmart: "bg-sky-100 text-sky-800",
  "Google Shopping": "bg-green-100 text-green-800",
};

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
  const savingsPercent = groupSavingsPercent ?? product.groupSavingsPercent;
  const productGroupSize = groupSize ?? product.groupSize;
  const savings = product.originalPrice ? product.originalPrice - product.price : 0;
  const pct = product.originalPrice ? Math.round((savings / product.originalPrice) * 100) : 0;
  const colorClass = RETAILER_COLORS[product.retailer] || "bg-gray-100 text-gray-700";

  const handleClick = (e: React.MouseEvent) => {
    if (isCompareMode && onSelect) {
      e.preventDefault();
      onSelect(product);
    }
  };

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`bg-white rounded-xl border border-pick-border p-3 hover:shadow-md hover:border-pick-teal transition group slide-in block relative ${
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
      <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-pick-bg">
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
        {savings > 0 && !product.isFallback && (
          <span className="absolute top-2 left-2 bg-pick-teal text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            -{pct}%
          </span>
        )}
        {product.isFallback && (
          <span className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-[10px] font-medium px-2 py-0.5 rounded-full border border-yellow-300">
            EXAMPLE
          </span>
        )}
        {/* PINCHPOINT 5 FIX - Best Deal Badge */}
        {isBestDeal && !product.isFallback && (
          <span className="absolute top-2 right-2 bg-pick-teal text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
            ★ Best Price
          </span>
        )}
        {/* Lowest Price Badge - Savings Moment */}
        {showLowestPrice && !product.isFallback && savingsAmount && savingsAmount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600 to-green-500 text-white px-3 py-2 rounded-b-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold leading-tight">Lowest Price</div>
                  {savingsPercent && savingsPercent > 5 && productGroupSize && productGroupSize > 1 && (
                    <div className="text-[10px] opacity-90 leading-tight">
                      {Math.round(savingsPercent)}% less than {productGroupSize - 1} other {productGroupSize === 2 ? 'store' : 'stores'}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs font-bold whitespace-nowrap">
                Save ${savingsAmount.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
        {product.retailer}
      </span>

      <h3 className="text-sm font-medium mt-2 line-clamp-2 leading-tight group-hover:text-pick-teal transition">
        {product.name}
      </h3>

      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <span className="font-heading font-bold text-lg">${product.price.toFixed(2)}</span>
        {product.originalPrice && product.originalPrice > product.price && (
          <>
            <span className="text-pick-muted text-xs line-through">${product.originalPrice.toFixed(2)}</span>
            {/* PINCHPOINT 6 FIX - SALE Badge */}
            {savings > 0 && !product.isFallback && (
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                SALE
              </span>
            )}
          </>
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
