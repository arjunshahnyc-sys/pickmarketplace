'use client';

import { X } from 'lucide-react';
import { Product } from '@/lib/types';
import { COMPARE_MAX, selectionKey } from '@/lib/compare/selection';
import { currencySymbol, formatPrice } from '@/lib/formatters';

interface CompareDrawerProps {
  selectedProducts: Product[];
  /** Called with the product's selection key (see lib/compare/selection). */
  onRemove: (key: string) => void;
  onCompare: () => void;
  /** Clears the whole selection. */
  onClose: () => void;
  /** Live-region sentence for the latest selection change. */
  announcement?: string;
}

export default function CompareDrawer({
  selectedProducts,
  onRemove,
  onCompare,
  onClose,
  announcement = '',
}: CompareDrawerProps) {
  const canCompare = selectedProducts.length >= COMPARE_MAX;

  return (
    <div
      role="region"
      aria-label="Compare selection"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/10 shadow-2xl"
    >
      {/* One polite announcement per change; the visible count below is
          not live, so a screen reader hears each pick exactly once. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        {/* Stacks on phones: the old single no-wrap row with fixed-width
            slots pushed Compare Now and the close button off a 375px screen. */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Selected Products */}
          <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
            <span className="text-sm font-medium text-black">
              Compare Products ({selectedProducts.length}/{COMPARE_MAX})
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedProducts.map((product) => (
                <div
                  key={selectionKey(product)}
                  className="relative group bg-white border border-black/10 rounded-lg p-2 flex items-center gap-2 hover:border-[#2A9D8F] transition-colors"
                >
                  <img
                    src={product.image}
                    alt=""
                    className="w-12 h-12 object-contain rounded"
                  />
                  <div className="max-w-[120px]">
                    <p className="text-xs font-medium text-black line-clamp-1">
                      {product.name}
                    </p>
                    <p className="text-xs text-black/60">
                      {currencySymbol(product.currency)}
                      {formatPrice(product.price, product.currency)}
                    </p>
                  </div>
                  {/* Always visible on touch (no hover to reveal it); on
                      pointer devices it fades in on hover or keyboard focus */}
                  <button
                    type="button"
                    onClick={() => onRemove(selectionKey(product))}
                    aria-label={`Remove ${product.name} from comparison`}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Empty slots */}
              {[...Array(Math.max(0, COMPARE_MAX - selectedProducts.length))].map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-[140px] sm:w-[180px] h-[68px] border-2 border-dashed border-black/10 rounded-lg flex items-center justify-center"
                >
                  <span className="text-xs text-black/60">Tick Compare on a card</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onCompare}
              disabled={!canCompare}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                canCompare
                  ? 'bg-[#2A9D8F] text-white hover:bg-[#238B7E]'
                  : 'bg-black/5 text-black/40 cursor-not-allowed'
              }`}
            >
              Compare Now
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Clear selection"
              title="Clear selection"
              className="p-2 text-black/60 hover:text-black transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
