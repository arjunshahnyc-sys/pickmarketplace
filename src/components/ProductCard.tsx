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
}

const RETAILER_COLORS: Record<string, string> = {
  Amazon: "bg-yellow-100 text-yellow-800",
  Target: "bg-red-100 text-red-800",
  "Best Buy": "bg-blue-100 text-blue-800",
  "Macy's": "bg-pink-100 text-pink-800",
  Walmart: "bg-sky-100 text-sky-800",
  "Google Shopping": "bg-green-100 text-green-800",
};

export default function ProductCard({ product }: { product: Product }) {
  const savings = product.originalPrice ? product.originalPrice - product.price : 0;
  const pct = product.originalPrice ? Math.round((savings / product.originalPrice) * 100) : 0;
  const colorClass = RETAILER_COLORS[product.retailer] || "bg-gray-100 text-gray-700";

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="bg-white rounded-xl border border-pick-border p-3 hover:shadow-md hover:border-pick-teal transition group slide-in block"
      aria-label={product.isFallback ? `Search for ${product.name} on ${product.retailer}` : `View ${product.name} on ${product.retailer}`}
    >
      <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-pick-bg">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/300x300/FAFAF8/6B6B6B?text=${encodeURIComponent(product.retailer)}`;
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
      </div>

      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
        {product.retailer}
      </span>

      <h3 className="text-sm font-medium mt-2 line-clamp-2 leading-tight group-hover:text-pick-teal transition">
        {product.name}
      </h3>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-heading font-bold text-lg">${product.price.toFixed(2)}</span>
        {product.originalPrice && product.originalPrice > product.price && (
          <span className="text-pick-muted text-xs line-through">${product.originalPrice.toFixed(2)}</span>
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
