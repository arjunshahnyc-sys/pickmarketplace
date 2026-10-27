'use client';

import { useState, useEffect, FormEvent } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

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
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
      </div>
    </form>
  );
}
