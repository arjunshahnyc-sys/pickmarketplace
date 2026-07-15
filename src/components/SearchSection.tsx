'use client';

import { Tag, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import BlurOverlay from './gating/BlurOverlay';
import { useState } from 'react';
import { Product } from '@/lib/types';

interface SearchSectionProps {
  resultsCount: number;
  sortBy: string;
  onSortChange: (sort: string) => void;
  showOnSaleOnly: boolean;
  onOnSaleToggle: () => void;
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
  onCompareClick,
  isCompareMode,
  products = [],
  query = '',
  onSearch,
  saleCount = 0,
}: SearchSectionProps) {
  const { canUseFeature } = useAuth();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const handleCompareClick = () => {
    if (!canUseFeature('priceComparison')) {
      setShowUpgradePrompt(true);
    } else {
      onCompareClick();
    }
  };

  // PINCHPOINT 3 FIX - Calculate price range
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
    <div className="mb-6">
      {/* PINCHPOINT 2 FIX - Sticky Filter Bar */}
      <div className="sticky top-0 z-20 bg-white py-3 border-b border-pick-border mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* On Sale Only Toggle — disabled when no result carries sale-price data */}
          <button
            onClick={onOnSaleToggle}
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

          {/* Sort Dropdown with Label */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-black">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="appearance-none h-10 bg-gray-100 rounded-full px-4 pr-10 text-sm font-medium text-neutral-700 hover:bg-gray-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20"
              >
                <option value="relevance">Relevance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
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
            onClick={handleCompareClick}
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
          {products.length > 0 && (
            <span className="ml-2 text-pick-teal font-semibold">
              • ${minPrice.toFixed(2)} to ${maxPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>

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

      {/* Upgrade Prompt for Compare Feature */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUpgradePrompt(false)}
          />
          <div className="relative z-10">
            <button
              onClick={() => setShowUpgradePrompt(false)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-black/5 transition-colors z-20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <BlurOverlay message="Upgrade to Premium to compare products side by side" />
          </div>
        </div>
      )}
    </div>
  );
}
