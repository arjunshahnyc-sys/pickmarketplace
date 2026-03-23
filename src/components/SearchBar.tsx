'use client';

import { useState, FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';

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
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any product..."
          className="w-full px-5 py-4 pr-36 text-base border border-[var(--border)] bg-white placeholder:text-[#A3A3A3] transition-all"
          style={{ borderRadius: '8px' }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          style={{ borderRadius: '6px' }}
        >
          <span>{isLoading ? 'Searching' : 'Compare prices'}</span>
          {!isLoading && <ArrowRight size={14} />}
          {isLoading && (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spinner" />
          )}
        </button>
      </div>
    </form>
  );
}
