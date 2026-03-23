import { ArrowUpRight } from 'lucide-react';
import type { ProductResult } from '@/lib/types';

interface ProductCardProps {
  product: ProductResult;
}

export function ProductCard({ product }: ProductCardProps) {
  const sortedPrices = [...product.prices].sort((a, b) => a.amount - b.amount);
  const lowestPrice = sortedPrices[0];
  const savings = product.highestPrice - product.lowestPrice;
  const savingsPercent = Math.round((savings / product.highestPrice) * 100);

  return (
    <article className="card-hover bg-white border border-[var(--border)] overflow-hidden" style={{ borderRadius: '6px' }}>
      {/* Image */}
      <div className="aspect-[4/3] bg-[#F5F5F3] relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-6"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-[var(--muted)]">
            No image
          </div>
        )}
        {savingsPercent >= 5 && (
          <span
            className="absolute top-3 right-3 px-2.5 py-1 text-xs font-medium bg-[var(--accent)] text-white"
            style={{ borderRadius: '4px' }}
          >
            Save {savingsPercent}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-sm leading-snug mb-4 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Best price highlight */}
        <div className="mb-3 pb-3 border-b border-[var(--border)]">
          <p className="text-xs text-[var(--muted)] mb-1">Best price</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-[var(--accent)]">
              ${lowestPrice.amount.toFixed(2)}
            </span>
            <span className="text-sm text-[var(--muted)]">
              at {lowestPrice.retailer}
            </span>
          </div>
        </div>

        {/* All prices */}
        <div className="space-y-1.5">
          {sortedPrices.map((price, index) => (
            <a
              key={`${price.retailer}-${index}`}
              href={price.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-2 px-3 -mx-1 hover:bg-[var(--background)] transition-colors group"
              style={{ borderRadius: '4px' }}
            >
              <span className="text-sm text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
                {price.retailer}
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`text-sm font-medium ${index === 0 ? 'text-[var(--accent)]' : ''}`}>
                  ${price.amount.toFixed(2)}
                </span>
                <ArrowUpRight
                  size={12}
                  className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </span>
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}
