'use client';

import { useSavedList } from '@/contexts/SavedListContext';
import { X, Trash2, ExternalLink, ShoppingBag } from 'lucide-react';

export default function SavedListDrawer() {
  const { items, removeItem, clearAll, total, isDrawerOpen, closeDrawer } = useSavedList();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-label="Saved items"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#2A9D8F]" />
            <h2 className="text-lg font-semibold text-black">
              Saved items {items.length > 0 && `(${items.length})`}
            </h2>
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 text-black/40 hover:text-black rounded-lg hover:bg-black/5 transition"
            aria-label="Close saved items"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-black/20" />
            </div>
            <p className="text-black font-medium mb-1">Nothing saved yet</p>
            <p className="text-sm text-black/50">
              Tap the bag icon on any product to build a list and see your total.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-black/5">
              {items.map((item) => (
                <li key={item.url} className="flex gap-3 px-5 py-4">
                  <div className="w-16 h-16 rounded-lg bg-black/5 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-black/20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black line-clamp-2 leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs text-black/50 mt-0.5">{item.retailer}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm font-semibold text-black">
                        ${item.price.toFixed(2)}
                      </span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="text-xs text-[#2A9D8F] hover:underline inline-flex items-center gap-1"
                      >
                        View at {item.retailer} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.url)}
                    className="self-start p-1.5 text-black/30 hover:text-red-500 rounded transition"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-black/10 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-black/60">
                  Total ({items.length} {items.length === 1 ? 'item' : 'items'})
                </span>
                <span className="text-2xl font-bold text-black">${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-black/40 leading-relaxed">
                Prices from the last check — confirm at checkout. You buy directly
                on each retailer's site; this list just keeps your running total.
              </p>
              <button
                onClick={clearAll}
                className="w-full py-2 text-sm text-black/50 hover:text-red-500 border border-black/10 rounded-lg transition"
              >
                Clear all
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
