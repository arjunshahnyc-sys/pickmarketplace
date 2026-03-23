import { ProductCard } from './ProductCard';
import type { ProductResult } from '@/lib/types';

interface ProductGridProps {
  products: ProductResult[];
  query: string;
}

export function ProductGrid({ products, query }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg mb-2">
          No results for &ldquo;{query}&rdquo;
        </p>
        <p className="text-sm text-[var(--muted)]">
          Try searching for a different product or check your spelling
        </p>
      </div>
    );
  }

  const totalSavings = products.reduce((acc, p) => {
    const maxSave = p.highestPrice - p.lowestPrice;
    return acc + maxSave;
  }, 0);

  return (
    <section className="w-full">
      {/* Results header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-1">
            {products.length} {products.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
          </h2>
          {totalSavings > 0 && (
            <p className="text-sm text-[var(--muted)]">
              Up to <span className="text-[var(--accent)] font-medium">${totalSavings.toFixed(2)}</span> in potential savings
            </p>
          )}
        </div>
        <p className="text-xs text-[var(--muted)]">
          Prices checked just now
        </p>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Bottom hint */}
      <div className="mt-12 text-center">
        <p className="text-sm text-[var(--muted)]">
          Prices and availability are subject to change. Always verify at the retailer.
        </p>
      </div>
    </section>
  );
}
