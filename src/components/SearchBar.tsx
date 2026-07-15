'use client';

import { useState, FormEvent } from 'react';
import { ArrowRight, Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');

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
          placeholder='Try "airpods pro" or "mini dress"'
          className="h-14 md:h-16 w-full rounded-full bg-white pl-12 pr-16 text-base text-neutral-900 placeholder:text-neutral-400 border border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] transition-shadow"
          disabled={isLoading}
        />
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
