// The homepage results sort, extracted VERBATIM from app/page.tsx so it can
// be characterization-tested. The comparators are the pre-landed-cost
// originals; with LANDED_COST_ENABLED off this is the entire sort behavior
// and must stay byte-identical (see sortResults.characterization.test.ts).

import type { Product } from './types';

export type SortOption = 'relevance' | 'price-low' | 'price-high' | 'biggest-sale';

/** Sorts a copy; 'relevance' (and anything unrecognized) keeps input order. */
export function sortProducts(products: Product[], sortBy: string): Product[] {
  const filtered = [...products];
  switch (sortBy) {
    case 'price-low':
      filtered.sort((a: Product, b: Product) => a.price - b.price);
      break;
    case 'price-high':
      filtered.sort((a: Product, b: Product) => b.price - a.price);
      break;
    case 'biggest-sale':
      filtered.sort((a: Product, b: Product) => {
        const discountA =
          a.originalPrice && a.originalPrice > a.price
            ? ((a.originalPrice - a.price) / a.originalPrice) * 100
            : 0;
        const discountB =
          b.originalPrice && b.originalPrice > b.price
            ? ((b.originalPrice - b.price) / b.originalPrice) * 100
            : 0;
        return discountB - discountA;
      });
      break;
    case 'relevance':
    default:
      // Keep original order
      break;
  }
  return filtered;
}
