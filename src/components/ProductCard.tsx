import { ExternalLink } from 'lucide-react';
import type { ProductResult } from '@/lib/types';

interface ProductCardProps {
  product: ProductResult;
}

export function ProductCard({ product }: ProductCardProps) {
  const savings = product.highestPrice - product.lowestPrice;
  const savingsPercent = Math.round((savings / product.highestPrice) * 100);

  return (
    <article className="bg-white border border-[var(--border)] rounded-md overflow-hidden shadow-[var(--card-shadow)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow">
      <div className="aspect-square bg-[#F5F5F3] relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
            No image
          </div>
        )}
        {savingsPercent > 0 && (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-[var(--accent)] text-white rounded" style={{ borderRadius: '4px' }}>
            Save up to {savingsPercent}%
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-[var(--foreground)] leading-snug mb-3 line-clamp-2 min-h-[2.75rem]">
          {product.name}
        </h3>

        <div className="space-y-2">
          {product.prices
            .sort((a, b) => a.amount - b.amount)
            .map((price, index) => (
              <a
                key={`${price.retailer}-${index}`}
                href={price.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2 px-3 rounded bg-[#FAFAF8] hover:bg-[#F0F0EE] transition-colors group"
                style={{ borderRadius: '4px' }}
              >
                <span className="text-sm text-[var(--muted)]">{price.retailer}</span>
                <span className="flex items-center gap-2">
                  <span className={`font-medium ${index === 0 ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}`}>
                    ${price.amount.toFixed(2)}
                  </span>
                  <ExternalLink size={14} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </a>
            ))}
        </div>
      </div>
    </article>
  );
}
