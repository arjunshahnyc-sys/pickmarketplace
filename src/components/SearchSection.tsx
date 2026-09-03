'use client';

import { useId } from 'react';
import { Tag, ArrowUpDown, BadgeCheck, GitCompareArrows } from 'lucide-react';
import { compareButtonState } from '@/lib/compare/selection';
import FacetChips from './FacetChips';
import type { FacetGroup, FacetKey, SelectedFacets } from '@/lib/facets/deriveFacets';
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
  /** Number of products currently ticked for comparison. */
  compareCount: number;
  /** Opens the side-by-side comparison; only called when two are ticked. */
  onCompareClick: () => void;
  products?: Product[];
  saleCount?: number;
  /** Result-derived filter chips (lib/facets) and their state. */
  facets?: FacetGroup[];
  facetCounts?: Record<string, number>;
  selectedFacets?: SelectedFacets;
  onFacetToggle?: (key: FacetKey, value: string) => void;
  onFacetsClear?: () => void;
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
  compareCount,
  onCompareClick,
  products = [],
  saleCount = 0,
  facets = [],
  facetCounts = {},
  selectedFacets = {},
  onFacetToggle,
  onFacetsClear,
}: SearchSectionProps) {
  // PINCHPOINT 3 FIX - Calculate price range. Only meaningful when every
  // offer shares one currency: mixed-market results (international pilot)
  // hide the range rather than compare pounds to dollars numerically.
  const currencies = new Set(products.map((p) => p.currency ?? 'USD'));
  const singleCurrency = currencies.size <= 1;
  const rangeSymbol = currencySymbol(products[0]?.currency);
  const minPrice = products.length > 0 ? Math.min(...products.map(p => p.price)) : 0;
  const maxPrice = products.length > 0 ? Math.max(...products.map(p => p.price)) : 0;

  // Compare: the count is always in the label so the sticky bar never
  // reflows; below two picks the button is inert but still focusable, and
  // its hint tells keyboard and screen-reader users what to do.
  const compare = compareButtonState(compareCount);
  const compareHintId = useId();

  return (
    // Fragment, not a wrapper div: position:sticky only sticks within its
    // parent's box, so wrapping the bar in a short div (as before) meant it
    // never actually stuck. As a direct child of the results <section> it
    // pins below the site header for the whole grid scroll.
    <>
      {/* PINCHPOINT 2 FIX - Sticky Filter Bar. top matches the sticky site
          header's h-[72px] so the bar lands below it instead of under it. */}
      <div className="sticky top-[72px] z-20 bg-white py-3 border-b border-pick-border mb-4">
        {/* One scrollable row on phones (three wrapped rows used to pin
            ~200px of a 812px screen); wraps normally from sm up. */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0">
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
            className={`flex shrink-0 items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all ${
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
              className={`flex shrink-0 items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all ${
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
          <div className="flex shrink-0 items-center gap-2">
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
            type="button"
            onClick={compare.ready ? onCompareClick : undefined}
            aria-disabled={!compare.ready}
            aria-describedby={compareHintId}
            title={compare.hint}
            className={`flex shrink-0 items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all sm:ml-auto ${
              compare.ready
                ? 'bg-teal-50 text-[#1F7A6F] ring-1 ring-[#2A9D8F] hover:bg-teal-100'
                : 'bg-gray-100 text-neutral-400 cursor-not-allowed'
            }`}
          >
            <GitCompareArrows size={16} aria-hidden="true" />
            <span className="text-sm font-medium tabular-nums">{compare.label}</span>
          </button>
          <span id={compareHintId} className="sr-only">
            {compare.hint}
          </span>
        </div>

        {/* Results Count with Price Range - PINCHPOINT 3 */}
        <div className="text-sm text-black/60 mt-2" aria-live="polite">
          {showOnSaleOnly ? `${resultsCount} products on sale` : `${resultsCount} results`}
          {products.length > 0 && singleCurrency && (
            <span className="ml-2 text-pick-teal font-semibold">
              • {rangeSymbol}{formatPrice(minPrice, products[0]?.currency)} to {rangeSymbol}{formatPrice(maxPrice, products[0]?.currency)}
            </span>
          )}
        </div>
      </div>

      {/* Filter chips derived from the result set: type, series, brand,
          store. Each filters the current results in place (never a new
          paid search); the old query-string suggestions are gone. */}
      {onFacetToggle && onFacetsClear && (
        <FacetChips
          facets={facets}
          counts={facetCounts}
          selected={selectedFacets}
          onToggle={onFacetToggle}
          onClear={onFacetsClear}
          className="mb-4"
        />
      )}
    </>
  );
}
