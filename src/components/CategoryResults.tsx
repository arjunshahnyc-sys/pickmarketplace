'use client';

// The interactive part of an ISR category page: filter chips, compare, and
// the grid. The server page fetches and prerenders; this island owns the
// client state it cannot (facet picks, compare picks). Every card is still
// in the server HTML for crawlers; chips only hide cards client-side.

import { useMemo, useState } from 'react';
import { GitCompareArrows } from 'lucide-react';
import ProductCard from './ProductCard';
import FacetChips from './FacetChips';
import CompareDrawer from './CompareDrawer';
import CompareModal from './CompareModal';
import { RESULTS_GRID_CLASS } from '@/lib/cardLayout';
import { compareButtonState } from '@/lib/compare/selection';
import { useCompareSelection } from '@/lib/compare/useCompareSelection';
import {
  applyFacets,
  facetCounts,
  hasFacetSelection,
  toggleFacet,
  type FacetGroup,
  type FacetKey,
  type SelectedFacets,
} from '@/lib/facets/deriveFacets';
import type { EnhancedProduct } from '@/lib/productGrouping';

export default function CategoryResults({
  products,
  facets,
}: {
  products: EnhancedProduct[];
  facets: FacetGroup[];
}) {
  const [selectedFacets, setSelectedFacets] = useState<SelectedFacets>({});
  const compare = useCompareSelection();

  const visible = useMemo(() => applyFacets(products, selectedFacets), [products, selectedFacets]);
  const counts = useMemo(() => facetCounts(products, facets, selectedFacets), [products, facets, selectedFacets]);
  const filtering = hasFacetSelection(selectedFacets);
  const compareState = compareButtonState(compare.selected.length);

  return (
    <>
      {/* Stacked on phones so the chip rows keep the full width to scroll
          in; side by side from sm up. */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <FacetChips
          facets={facets}
          counts={counts}
          selected={selectedFacets}
          onToggle={(key: FacetKey, value: string) =>
            setSelectedFacets((s) => toggleFacet(s, key, value))
          }
          onClear={() => setSelectedFacets({})}
          className="w-full min-w-0 sm:flex-1"
        />
        <button
          type="button"
          onClick={compareState.ready ? compare.openModal : undefined}
          aria-disabled={!compareState.ready}
          title={compareState.hint}
          className={`flex h-10 shrink-0 items-center gap-2 self-end rounded-full px-4 text-sm font-medium transition-all sm:ml-auto sm:self-auto ${
            compareState.ready
              ? 'bg-teal-50 text-[#1F7A6F] ring-1 ring-[#2A9D8F] hover:bg-teal-100'
              : 'bg-gray-100 text-neutral-400 cursor-not-allowed'
          }`}
        >
          <GitCompareArrows size={16} aria-hidden="true" />
          <span className="tabular-nums">{compareState.label}</span>
          <span className="sr-only">. {compareState.hint}</span>
        </button>
      </div>

      <p className="mb-3 text-sm text-black/60" aria-live="polite">
        {filtering ? `Showing ${visible.length} of ${products.length} results` : `${products.length} results`}
      </p>

      {visible.length === 0 ? (
        <div className="mb-6 rounded-xl border border-dashed border-black/10 py-12 text-center">
          <p className="mb-4 text-sm text-black/60">No results match the selected filters.</p>
          <button
            type="button"
            onClick={() => setSelectedFacets({})}
            className="rounded-xl bg-[#2A9D8F] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#238B7E]"
          >
            Show all {products.length} results
          </button>
        </div>
      ) : (
        <div className={RESULTS_GRID_CLASS}>
          {visible.map((product, i) => (
            <ProductCard
              key={product.id || i}
              product={product}
              isSelected={compare.isSelected(product)}
              onSelect={compare.toggle}
            />
          ))}
        </div>
      )}

      {compare.selected.length > 0 && (
        <CompareDrawer
          selectedProducts={compare.selected}
          onRemove={compare.remove}
          onCompare={compare.openModal}
          onClose={compare.clear}
          announcement={compare.announcement}
        />
      )}
      {compare.showModal && compare.selected.length === 2 && (
        <CompareModal
          products={[compare.selected[0], compare.selected[1]]}
          onClose={compare.closeModal}
        />
      )}
    </>
  );
}
