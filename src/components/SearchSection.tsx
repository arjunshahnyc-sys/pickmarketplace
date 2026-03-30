'use client';

import { Tag, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import BlurOverlay from './gating/BlurOverlay';
import { useState } from 'react';

interface SearchSectionProps {
  resultsCount: number;
  sortBy: string;
  onSortChange: (sort: string) => void;
  showOnSaleOnly: boolean;
  onOnSaleToggle: () => void;
  onCompareClick: () => void;
  isCompareMode: boolean;
}

export default function SearchSection({
  resultsCount,
  sortBy,
  onSortChange,
  showOnSaleOnly,
  onOnSaleToggle,
  onCompareClick,
  isCompareMode,
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

  return (
    <div className="mb-6 space-y-4">
      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* On Sale Only Toggle */}
        <button
          onClick={onOnSaleToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            showOnSaleOnly
              ? 'bg-[#2A9D8F] text-white border-[#2A9D8F]'
              : 'bg-white text-black border-black/10 hover:border-[#2A9D8F]'
          }`}
        >
          <Tag size={16} />
          <span className="text-sm font-medium">On Sale Only</span>
        </button>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="appearance-none bg-white border border-black/10 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-black hover:border-[#2A9D8F] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="biggest-sale">Biggest Sale</option>
          </select>
          <ArrowUpDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-black/60 pointer-events-none"
          />
        </div>

        {/* Compare Button */}
        <button
          onClick={handleCompareClick}
          className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            isCompareMode
              ? 'bg-[#2A9D8F] text-white border-[#2A9D8F]'
              : 'bg-white text-black border-black/10 hover:border-[#2A9D8F] hover:text-[#2A9D8F]'
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

      {/* Results Count */}
      <div className="text-sm text-black/60">
        {showOnSaleOnly ? `${resultsCount} products on sale` : `${resultsCount} results`}
      </div>

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
