'use client';

import { X } from 'lucide-react';
import { Product } from '@/lib/types';

interface CompareDrawerProps {
  selectedProducts: Product[];
  onRemove: (productId: string) => void;
  onCompare: () => void;
  onClose: () => void;
}

export default function CompareDrawer({
  selectedProducts,
  onRemove,
  onCompare,
  onClose,
}: CompareDrawerProps) {
  const canCompare = selectedProducts.length === 2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/10 shadow-2xl">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Selected Products */}
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm font-medium text-black">
              Compare Products ({selectedProducts.length}/2)
            </span>

            <div className="flex items-center gap-2">
              {selectedProducts.map((product) => (
                <div
                  key={product.url}
                  className="relative group bg-white border border-black/10 rounded-lg p-2 flex items-center gap-2 hover:border-[#2A9D8F] transition-colors"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 object-contain rounded"
                  />
                  <div className="max-w-[120px]">
                    <p className="text-xs font-medium text-black line-clamp-1">
                      {product.name}
                    </p>
                    <p className="text-xs text-black/60">${product.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => onRemove(product.url)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Empty slots */}
              {[...Array(2 - selectedProducts.length)].map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-[180px] h-[68px] border-2 border-dashed border-black/10 rounded-lg flex items-center justify-center"
                >
                  <span className="text-xs text-black/40">Select a product</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
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
              onClick={onClose}
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
