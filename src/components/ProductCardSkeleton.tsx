export function ProductCardSkeleton() {
  return (
    <div
      className="bg-white border border-[var(--border)] overflow-hidden animate-pulse"
      style={{ borderRadius: '6px' }}
      role="status"
      aria-label="Loading product"
    >
      {/* Image skeleton */}
      <div className="aspect-[4/3] bg-gray-200" />

      {/* Content skeleton */}
      <div className="p-4">
        {/* Title skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>

        {/* Price skeleton */}
        <div className="mb-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
          <div className="h-6 bg-gray-200 rounded w-16" />
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
      </div>
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
