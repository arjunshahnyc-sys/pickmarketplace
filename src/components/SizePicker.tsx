'use client';

// The size picker over clothing and shoe results (lib/sizeSearch.ts decides
// when it appears and what it offers). Picking a size re-runs the search for
// that size; picking it again, or "Any", goes back to every size. The note
// under it says what a size search is and is not: a search for that size,
// which Google answers loosely (lookups on 2026-11-17 found XL and XXL
// listings in a size L search), not a promise about any one listing.

import { SIZE_LABELS, SIZE_OPTIONS, type SizeKind } from '@/lib/sizeSearch';

interface SizePickerProps {
  kind: SizeKind;
  size: string | null;
  onChange: (size: string | null) => void;
  className?: string;
  /** What the automatic check of the first cards found, in place of the standing note. */
  note?: string;
}

export default function SizePicker({ kind, size, onChange, className = '', note }: SizePickerProps) {
  const label = SIZE_LABELS[kind];
  const options = SIZE_OPTIONS[kind];

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span id={`size-picker-${kind}`} className="mr-1 text-sm font-medium text-neutral-700">
          {label}
        </span>
        {kind === 'letters' ? (
          <div role="group" aria-labelledby={`size-picker-${kind}`} className="flex flex-wrap gap-2">
            {options.map((option) => {
              const selected = option === size;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(selected ? null : option)}
                  className={`min-h-11 min-w-11 md:min-h-9 md:min-w-10 rounded-full border px-3 text-sm font-medium active:scale-[0.97] transition-[background-color,border-color,color,scale] duration-200 ${
                    selected
                      ? 'border-[#14524B] bg-[#14524B] text-white'
                      : 'border-black/10 bg-white text-neutral-700 hover:border-[#2A9D8F] hover:text-[#14524B]'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <select
            aria-labelledby={`size-picker-${kind}`}
            value={size ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            // 16px on phones so iOS does not zoom the page on focus.
            className={`min-h-11 md:min-h-9 rounded-full border bg-white pl-4 pr-8 text-base md:text-sm font-medium transition-colors ${
              size ? 'border-[#14524B] text-[#14524B]' : 'border-black/10 text-neutral-700'
            }`}
          >
            <option value="">Any</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        {size && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-11 md:min-h-9 px-2 text-sm text-neutral-500 underline decoration-black/20 hover:text-neutral-900 transition-colors"
          >
            All sizes
          </button>
        )}
      </div>
      {size && (
        <p className="mt-2 text-xs text-neutral-500">
          {note ??
            `Searched for size ${size}. Some listings may be another size, so tap Check size on a card or confirm at the store.`}
        </p>
      )}
    </div>
  );
}
