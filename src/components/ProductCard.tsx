'use client';

import { ArrowUpRight, ArrowRight, Bookmark, Eye } from 'lucide-react';
import { useState, useMemo } from 'react';
import { retailerDomains } from './RetailerLogos';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    savings?: number;
    currency: string;
    retailer: string;
    url: string;
    imageUrl: string;
    rating?: number;
    reviewCount?: number;
    category?: string;
    brand?: string;
    inStock?: boolean;
    alsoAvailableAt?: Array<{ retailer: string; price: number; url: string }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const savingsPercent = product.originalPrice && product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Extract brand initial for fallback image
  const brandInitial = (product.brand || product.name.charAt(0)).toUpperCase();
  const brandColor = stringToColor(product.brand || product.name);

  // Generate urgency signal (randomized but deterministic per product)
  const viewCount = useMemo(() => {
    const hash = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 15 + (hash % 85); // Between 15-100 views
  }, [product.id]);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsBookmarked(!isBookmarked);
    // TODO: Save to localStorage or backend
  };

  return (
    <article
      className="group bg-white dark:bg-black border border-[var(--border)] overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:border-[var(--accent)]"
      style={{ borderRadius: '6px' }}
      aria-label={`${product.name} - $${product.price.toFixed(2)} at ${product.retailer}`}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-[#F5F5F3] relative overflow-hidden" role="img" aria-label={product.name}>
        {!imageError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-6"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `#${brandColor}` }}
          >
            <span className="text-6xl font-bold text-white opacity-90">
              {brandInitial}
            </span>
          </div>
        )}

        {/* Savings badge */}
        {product.savings && product.savings > 0 && savingsPercent >= 5 && (
          <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
            <span
              className="px-2.5 py-1 text-xs font-medium bg-[var(--accent)] text-white shadow-md"
              style={{ borderRadius: '4px' }}
            >
              SAVE ${product.savings.toFixed(2)}
            </span>
            <span
              className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-black text-[var(--accent)] border border-[var(--accent)]"
              style={{ borderRadius: '4px' }}
            >
              {savingsPercent}% OFF
            </span>
          </div>
        )}

        {/* Retailer badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="retailer-badge flex items-center gap-1.5">
            {retailerDomains[product.retailer] && (
              <img
                src={`https://logo.clearbit.com/${retailerDomains[product.retailer]}`}
                alt={product.retailer}
                className="h-4 w-4 object-contain rounded-sm"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.src.includes('google.com')) {
                    img.src = `https://www.google.com/s2/favicons?domain=${retailerDomains[product.retailer]}&sz=32`;
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
            )}
            {product.retailer}
          </span>
          {product.rating && product.rating > 0 && (
            <span className="text-xs bg-white/90 dark:bg-black/90 px-2 py-1 rounded flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              <span className="font-medium">{product.rating.toFixed(1)}</span>
              {product.reviewCount && product.reviewCount > 0 && (
                <span className="text-gray-400">({product.reviewCount.toLocaleString()})</span>
              )}
            </span>
          )}
        </div>

        {/* Bookmark button */}
        <button
          onClick={handleBookmark}
          className="absolute top-3 left-3 p-2 bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black rounded-full shadow-md transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
          aria-label={isBookmarked ? 'Remove from saved' : 'Save for later'}
          title={isBookmarked ? 'Remove from saved' : 'Save for later'}
        >
          <Bookmark
            className={`w-4 h-4 transition-colors ${isBookmarked ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--muted)]'}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Urgency signal */}
        {savingsPercent >= 10 && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--muted)]">
            <Eye className="w-3.5 h-3.5 text-[var(--accent-secondary)]" aria-hidden="true" />
            <span>
              <span className="font-medium text-[var(--accent-secondary)]">{viewCount}</span> people viewed in the last hour
            </span>
          </div>
        )}

        <h3 className="font-medium text-sm leading-snug mb-3 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Price display */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-semibold text-[var(--accent)]">
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-gray-400 line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* View Deal button */}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-view-product inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-white text-sm font-medium w-full justify-center hover:bg-[var(--accent-hover)] transition-all"
            style={{ borderRadius: '6px' }}
            aria-label={`View ${product.name} deal at ${product.retailer} for $${product.price.toFixed(2)}`}
          >
            <span>View Deal</span>
            <ArrowRight size={14} className="arrow group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </a>
        </div>

        {/* Also available at - Enhanced with price comparison */}
        {product.alsoAvailableAt && product.alsoAvailableAt.length > 0 && (
          <div className="pt-4 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted)] mb-2 font-medium" id={`also-available-${product.id}`}>
              Compare {product.alsoAvailableAt.length} {product.alsoAvailableAt.length === 1 ? 'retailer' : 'retailers'}:
            </p>
            <div className="space-y-1" role="list" aria-labelledby={`also-available-${product.id}`}>
              {product.alsoAvailableAt.slice(0, 3).map((option, index) => {
                const priceDiff = option.price - product.price;
                const isHigher = priceDiff > 0;
                return (
                  <a
                    key={`${option.retailer}-${index}`}
                    href={option.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-1.5 px-2 -mx-1 hover:bg-[var(--background)] transition-colors group/link text-xs"
                    style={{ borderRadius: '4px' }}
                    role="listitem"
                    aria-label={`${option.retailer} - $${option.price.toFixed(2)}`}
                  >
                    <span className="text-[var(--muted)] group-hover/link:text-[var(--foreground)] transition-colors">
                      {option.retailer}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium">
                        ${option.price.toFixed(2)}
                      </span>
                      {Math.abs(priceDiff) > 0.5 && (
                        <span className={`text-[10px] ${isHigher ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                          {isHigher ? `+$${priceDiff.toFixed(2)}` : `-$${Math.abs(priceDiff).toFixed(2)}`}
                        </span>
                      )}
                      <ArrowUpRight
                        size={12}
                        className="text-[var(--muted)] opacity-0 group-hover/link:opacity-100 transition-opacity"
                        aria-hidden="true"
                      />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Brand & category tags */}
        {(product.brand || product.category) && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-2 flex-wrap">
            {product.brand && (
              <span className="text-xs px-2 py-1 bg-[var(--background)] text-[var(--muted)] rounded">
                {product.brand}
              </span>
            )}
            {product.category && (
              <span className="text-xs px-2 py-1 bg-[var(--background)] text-[var(--muted)] rounded">
                {product.category}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// Helper function to generate color from string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '00000'.substring(0, 6 - c.length) + c;
}
