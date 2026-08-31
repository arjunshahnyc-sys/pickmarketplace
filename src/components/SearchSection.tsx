'use client';

import { Tag, ArrowUpDown, BadgeCheck } from 'lucide-react';
import SellerTrustKey from './SellerTrustKey';
import { Product } from '@/lib/types';
import { landedCostEnabled } from '@/lib/flags';
import { currencySymbol, formatPrice } from '@/lib/formatters';

interface SearchSectionProps {
  resultsCount: number;
  sortBy: string;
  onSortChange: (sort: string) => void;
  showOnSaleOnly: boolean;
  onOnSaleToggle: () => void;
  showVerifiedOnly?: boolean;
  onVerifiedToggle?: () => void;
  verifiedCount?: number;
  onCompareClick: () => void;
  isCompareMode: boolean;
  products?: Product[];
  query?: string;
  onSearch?: (query: string) => void;
  saleCount?: number;
}

export default function SearchSection({
  resultsCount,
  sortBy,
  onSortChange,
  showOnSaleOnly,
  onOnSaleToggle,
  showVerifiedOnly = false,
  onVerifiedToggle,
  verifiedCount = 0,
  onCompareClick,
  isCompareMode,
  products = [],
  query = '',
  onSearch,
  saleCount = 0,
}: SearchSectionProps) {
  // PINCHPOINT 3 FIX - Calculate price range. Only meaningful when every
  // offer shares one currency: mixed-market results (international pilot)
  // hide the range rather than compare pounds to dollars numerically.
  const currencies = new Set(products.map((p) => p.currency ?? 'USD'));
  const singleCurrency = currencies.size <= 1;
  const rangeSymbol = currencySymbol(products[0]?.currency);
  const minPrice = products.length > 0 ? Math.min(...products.map(p => p.price)) : 0;
  const maxPrice = products.length > 0 ? Math.max(...products.map(p => p.price)) : 0;

  // PINCHPOINT 8 FIX - Generate search refinements
  const getSearchRefinements = (q: string): string[] => {
    if (!q) return [];
    const lower = q.toLowerCase();
    const refinements: string[] = [];

    // Price modifiers
    if (!lower.includes('under') && !lower.includes('cheap')) {
      refinements.push(`cheap ${q}`);
      refinements.push(`${q} under $50`);
      refinements.push(`${q} under $100`);
    }

    // Quality modifiers
    if (!lower.includes('best') && !lower.includes('rated')) {
      refinements.push(`best rated ${q}`);
    }

    if (!lower.includes('sale') && !lower.includes('discount')) {
      refinements.push(`${q} on sale`);
    }

    // Category-specific modifiers
    if (lower.includes('shoe') || lower.includes('sneaker')) {
      if (!lower.includes('boys')) refinements.push(`boys ${q}`);
      if (!lower.includes('girls')) refinements.push(`girls ${q}`);
      if (!lower.includes('toddler')) refinements.push(`toddler ${q}`);
      if (!lower.includes('running')) refinements.push(`running ${q}`);
    }

    if (lower.includes('laptop') || lower.includes('computer')) {
      if (!lower.includes('gaming')) refinements.push(`gaming ${q}`);
      if (!lower.includes('student')) refinements.push(`${q} for students`);
    }

    return refinements.slice(0, 6);
  };

  const refinements = getSearchRefinements(query);

  return (
    // Fragment, not a wrapper div: position:sticky only sticks within its
    // parent's box, so wrapping the bar in a short div (as before) meant it
    // never actually stuck. As a direct child of the results <section> it
    // pins below the site header for the whole grid scroll.
    <>
      {/* PINCHPOINT 2 FIX - Sticky Filter Bar. top matches the sticky site
          header's h-[72px] so the bar lands below it instead of under it. */}
      <div className="sticky top-[72px] z-20 bg-white py-3 border-b border-pick-border mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* On Sale Only Toggle — disabled when no result carries sale-price data */}
          <button
            onClick={onOnSaleToggle}
            aria-pressed={showOnSaleOnly}
            disabled={saleCount === 0 && !showOnSaleOnly}
            title={
              saleCount === 0 && !showOnSaleOnly
                ? 'None of these results include sale-price data'
                : undefined
            }
            className={`flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all ${
              showOnSaleOnly
                ? 'bg-teal-50 text-[#1F7A6F] ring-1 ring-[#2A9D8F]'
                : saleCount === 0
                  ? 'bg-gray-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-gray-100 text-neutral-700 hover:bg-gray-200'
            }`}
          >
            <Tag size={16} />
            <span className="text-sm font-medium">
              On Sale Only{saleCount > 0 && !showOnSaleOnly ? ` (${saleCount})` : ''}
            </span>
          </button>

          {/* Verified Sellers Only Toggle */}
          {onVerifiedToggle && (
            <button
              onClick={onVerifiedToggle}
              aria-pressed={showVerifiedOnly}
              disabled={verifiedCount === 0 && !showVerifiedOnly}
              title={
                verifiedCount === 0 && !showVerifiedOnly
                  ? 'No results from sellers Pick recognizes'
                  : 'Only show results from retailers and marketplaces Pick recognizes'
              }
              className={`flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all ${
                showVerifiedOnly
                  ? 'bg-teal-50 text-[#1F7A6F] ring-1 ring-[#2A9D8F]'
                  : verifiedCount === 0
                    ? 'bg-gray-100 text-neutral-400 cursor-not-allowed'
                    : 'bg-gray-100 text-neutral-700 hover:bg-gray-200'
              }`}
            >
              <BadgeCheck size={16} />
              <span className="text-sm font-medium">
                Verified Only{verifiedCount > 0 && !showVerifiedOnly ? ` (${verifiedCount})` : ''}
              </span>
            </button>
          )}

          {/* Sort Dropdown with Label */}
          <div className="flex items-center gap-2">
            <span id="sort-label" className="text-sm font-medium text-black">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                aria-labelledby="sort-label"
                className="appearance-none h-10 bg-gray-100 rounded-full px-4 pr-10 text-sm font-medium text-neutral-700 hover:bg-gray-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20"
              >
                {/* Landed cost is the default sort when the flag is on;
                    item-price sorts stay available as the toggle. */}
                {landedCostEnabled() && (
                  <option value="total-cost">Total cost: Low to High (est.)</option>
                )}
                <option value="relevance">Relevance</option>
                <option value="price-low">{landedCostEnabled() ? 'Item price: Low to High' : 'Price: Low to High'}</option>
                <option value="price-high">{landedCostEnabled() ? 'Item price: High to Low' : 'Price: High to Low'}</option>
                <option value="biggest-sale">Biggest Sale</option>
              </select>
              <ArrowUpDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/60 pointer-events-none"
              />
            </div>
          </div>

          {/* Compare Button */}
          <button
            onClick={onCompareClick}
            aria-pressed={isCompareMode}
            className={`ml-auto flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all ${
              isCompareMode
                ? 'bg-teal-50 text-[#1F7A6F] ring-1 ring-[#2A9D8F]'
                : 'bg-gray-100 text-neutral-700 hover:bg-gray-200'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="text-sm font-medium">
              {isCompareMode ? 'Exit Compare' : 'Compare'}
            </span>
          </button>
        </div>

        {/* Results Count with Price Range - PINCHPOINT 3 */}
        <div className="text-sm text-black/60 mt-2">
          {showOnSaleOnly ? `${resultsCount} products on sale` : `${resultsCount} results`}
          {products.length > 0 && singleCurrency && (
            <span className="ml-2 text-pick-teal font-semibold">
              • {rangeSymbol}{formatPrice(minPrice, products[0]?.currency)} to {rangeSymbol}{formatPrice(maxPrice, products[0]?.currency)}
            </span>
          )}
        </div>
      </div>

      {/* Seller-trust key — explains the badges on result cards */}
      <SellerTrustKey />

      {/* PINCHPOINT 8 - Search Refinement Suggestions */}
      {refinements.length > 0 && onSearch && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {refinements.map((term) => (
            <button
              key={term}
              onClick={() => onSearch(term)}
              className="px-3 py-1.5 bg-white border border-pick-border rounded-full text-xs whitespace-nowrap hover:border-pick-teal hover:text-pick-teal transition"
            >
              {term}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
