import { IMAGE_BOX_CLASS } from '@/lib/cardLayout';

/**
 * Loading placeholder shaped exactly like ProductCard (same shell, image
 * box, badge row, two-line title, price), so the grid does not reflow when
 * results land. Decorative: the results section announces loading itself.
 */
export function ProductCardSkeleton() {
  return (
    <div
      className="h-full bg-white rounded-xl border border-gray-200/70 p-3 animate-pulse"
      aria-hidden="true"
    >
      <div className={IMAGE_BOX_CLASS} />
      <div className="mt-3 h-5 w-20 rounded-full bg-black/5" />
      <div className="mt-2 space-y-1.5">
        <div className="h-3.5 w-full rounded bg-black/5" />
        <div className="h-3.5 w-3/4 rounded bg-black/5" />
      </div>
      <div className="mt-3 h-6 w-1/3 rounded bg-black/5" />
      <div className="mt-2 h-3 w-1/2 rounded bg-black/5" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </>
  );
}
