import { ProductCard } from './ProductCard';
import type { ProductResult } from '@/lib/types';

interface ProductGridProps {
  products: ProductResult[];
  query: string;
}

export function ProductGrid({ products, query }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--muted)]">
          No results found for &ldquo;{query}&rdquo;
        </p>
        <p className="text-sm text-[var(--muted)] mt-2">
          Try a different search term
        </p>
      </div>
    );
  }

  return (
    <section className="w-full">
      <div className="flex items-baseline justify-between mb-6 pb-4 border-b border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">
          Showing <span className="text-[var(--foreground)] font-medium">{products.length}</span> results for &ldquo;{query}&rdquo;
        </p>
        <p className="text-xs text-[var(--muted)]">
          Prices updated moments ago
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
