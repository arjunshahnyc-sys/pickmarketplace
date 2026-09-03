'use client';

// Filter chips derived from the result set (lib/facets). One row per group,
// each chip an aria-pressed toggle that filters the current results in
// place: no chip ever triggers a new search. Chips whose count would be
// zero under the other active picks stay in place (aria-disabled) so the
// row never shifts under a keyboard user.

import { X } from 'lucide-react';
import type { FacetGroup, FacetKey, SelectedFacets } from '@/lib/facets/deriveFacets';

interface FacetChipsProps {
  facets: FacetGroup[];
  /** "group:value" -> count under the other groups' picks. */
  counts: Record<string, number>;
  selected: SelectedFacets;
  onToggle: (key: FacetKey, value: string) => void;
  onClear: () => void;
  className?: string;
}

export default function FacetChips({
  facets,
  counts,
  selected,
  onToggle,
  onClear,
  className = '',
}: FacetChipsProps) {
  const groups = facets.filter((g) => g.values.length >= 2);
  if (groups.length === 0) return null;
  const anySelected = Object.values(selected).some((v) => v && v.length > 0);

  return (
    <div className={`flex w-full min-w-0 flex-col gap-2 ${className}`}>
      {groups.map((group) => (
        <div
          key={group.key}
          role="group"
          aria-label={`Filter by ${group.label.toLowerCase()}`}
          className="flex w-full max-w-full items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
        >
          <span className="w-[4.5rem] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            {group.label}
          </span>
          {group.values.map((v) => {
            const on = selected[group.key]?.includes(v.value) ?? false;
            const count = counts[`${group.key}:${v.value}`] ?? v.count;
            const empty = count === 0 && !on;
            return (
              <button
                key={v.value}
                type="button"
                data-no-lift=""
                aria-pressed={on}
                aria-disabled={empty || undefined}
                onClick={() => {
                  if (!empty) onToggle(group.key, v.value);
                }}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition ${
                  on
                    ? 'border-[#2A9D8F] bg-teal-50 text-[#1F7A6F]'
                    : empty
                      ? 'border-dashed border-pick-border bg-white text-neutral-400 cursor-not-allowed'
                      : 'border-pick-border bg-white text-neutral-700 hover:border-pick-teal hover:text-pick-teal'
                }`}
              >
                <span className="sr-only">{group.label}: </span>
                {v.label}
                <span className={`ml-1 tabular-nums ${on ? 'text-[#1F7A6F]/70' : 'text-neutral-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ))}
      {anySelected && (
        <div>
          <button
            type="button"
            data-no-lift=""
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-pick-teal"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
