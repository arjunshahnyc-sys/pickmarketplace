'use client';

import { useState, useEffect, useSyncExternalStore, FormEvent } from 'react';
import { ArrowRight, History, Search, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  clearSearchHistory,
  getSearchHistory,
  getServerSearchHistory,
  matchingSearches,
  removeSearch,
  subscribeSearchHistory,
} from '@/lib/searchHistory';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

// Realistic example queries, rotated through the placeholder while the
// input is empty so the box demonstrates what to type. The native
// placeholder keeps the text for assistive tech but is drawn transparent;
// a visual copy on top swaps with a short fade and rise (none under
// prefers-reduced-motion), since a placeholder attribute cannot animate.
const PLACEHOLDER_QUERIES = [
  'wireless earbuds',
  'laptop stand',
  'hoodie',
  'air fryer',
  'running shoes',
  'water bottle',
  'desk lamp',
];

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  // Recent searches from this device (lib/searchHistory.ts). The list opens
  // under the box while the box has focus, narrows as the shopper types, and
  // is recorded by the page's handleSearch, so chip and link searches count.
  const history = useSyncExternalStore(subscribeSearchHistory, getSearchHistory, getServerSearchHistory);
  const [open, setOpen] = useState(false);
  const recent = matchingSearches(history, query);
  const showRecent = open && !isLoading && recent.length > 0;
  const placeholder = `Try "${PLACEHOLDER_QUERIES[placeholderIndex]}"`;

  // Only rotate while the field is empty — once the user types, the
  // placeholder is invisible and the interval is just wasted renders.
  useEffect(() => {
    if (query) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_QUERIES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [query]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      onSearch(query.trim());
    }
  };

  const searchAgain = (term: string) => {
    setQuery(term);
    setOpen(false);
    onSearch(term);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div
        className="relative"
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Stay open while focus moves between the box and the list.
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
        <input
          id="pick-search"
          type="text"
          enterKeyHint="search"
          autoCapitalize="none"
          autoCorrect="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          autoComplete="off"
          aria-controls={showRecent ? 'pick-recent-searches' : undefined}
          placeholder={placeholder}
          className="h-14 md:h-16 w-full rounded-full bg-white pl-12 pr-16 text-base text-neutral-900 placeholder:text-transparent border border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] transition-shadow"
          disabled={isLoading}
        />
        {!query && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-12 right-16 flex items-center overflow-hidden text-base text-neutral-400"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={placeholder}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
                className="truncate"
              >
                {placeholder}
              </motion.span>
            </AnimatePresence>
          </span>
        )}
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          aria-label="Search deals"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-[#2A9D8F] hover:bg-[#21867A] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
          ) : (
            <ArrowRight size={18} />
          )}
        </button>
        {showRecent && (
          <div
            id="pick-recent-searches"
            role="group"
            aria-label="Recent searches"
            // Keeps the cursor in the box on a mouse press (Safari gives a
            // pressed button no focus, which would close the list before
            // the click lands).
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white py-2 shadow-[0_8px_30px_rgba(0,0,0,0.14)] ring-1 ring-black/5"
          >
            <div className="flex items-center justify-between px-4 pb-1 pt-1">
              <span className="text-xs font-medium text-neutral-500">Recent searches</span>
              <button
                type="button"
                onClick={() => clearSearchHistory()}
                className="-mr-2 rounded-full px-2 py-1 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Clear all
              </button>
            </div>
            <ul>
              {recent.map((term) => (
                <li key={term} className="flex items-center hover:bg-neutral-50">
                  <button
                    type="button"
                    onClick={() => searchAgain(term)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left text-base text-neutral-800"
                  >
                    <History className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                    <span className="truncate">{term}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSearch(term)}
                    aria-label={`Remove ${term} from recent searches`}
                    className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:text-neutral-800 transition-colors"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </form>
  );
}
