'use client';

import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';
import type { ProductResult, SearchResponse } from '@/lib/types';

export default function Home() {
  const [results, setResults] = useState<ProductResult[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setQuery(searchQuery);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data: SearchResponse = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <ShoppingBag size={22} strokeWidth={1.5} className="text-[var(--accent)]" />
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              pick
            </span>
          </a>
          <nav className="flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              How it works
            </a>
            <a
              href="#"
              className="text-sm px-4 py-2 border border-[var(--border)] hover:border-[var(--foreground)] transition-colors"
              style={{ borderRadius: '6px' }}
            >
              Get the extension
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight">
              Stop overpaying.
            </h1>
            <p className="text-lg text-[var(--muted)] leading-relaxed">
              Search any product. Compare prices across Amazon, Walmart, Best Buy, and Target in seconds.
            </p>
          </div>

          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </section>

        {/* Popular searches hint - only show before first search */}
        {!hasSearched && (
          <section className="max-w-6xl mx-auto px-6 pb-12">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-[var(--muted)]">Try:</span>
              {['headphones', 'laptop', 'keyboard', 'monitor'].map((term) => (
                <button
                  key={term}
                  onClick={() => handleSearch(term)}
                  className="px-3 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--foreground)] transition-colors"
                  style={{ borderRadius: '4px' }}
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        {hasSearched && (
          <section className="max-w-6xl mx-auto px-6 pb-20">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-[var(--muted)]">
                  <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                  <span>Searching across retailers...</span>
                </div>
              </div>
            ) : (
              <ProductGrid products={results} query={query} />
            )}
          </section>
        )}

        {/* Hand-drawn divider */}
        <div className="max-w-6xl mx-auto px-6">
          <svg viewBox="0 0 800 20" className="w-full h-5 text-[var(--border)]" preserveAspectRatio="none">
            <path
              d="M0,10 Q100,5 200,10 T400,10 T600,10 T800,10"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* How it works - asymmetric layout */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-semibold mb-12">How it works</h2>

          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-5">
              <div className="mb-8">
                <span className="inline-block text-xs font-medium text-[var(--accent)] mb-2">01</span>
                <h3 className="text-lg font-medium mb-2">Search for any product</h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">
                  Type in what you&apos;re looking for. We support electronics, home goods, clothing, and more.
                </p>
              </div>
              <div>
                <span className="inline-block text-xs font-medium text-[var(--accent)] mb-2">02</span>
                <h3 className="text-lg font-medium mb-2">We check the major retailers</h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">
                  Our system queries Amazon, Walmart, Best Buy, and Target simultaneously to find current prices.
                </p>
              </div>
            </div>

            <div className="md:col-span-2" />

            <div className="md:col-span-5 md:pt-16">
              <div className="mb-8">
                <span className="inline-block text-xs font-medium text-[var(--accent)] mb-2">03</span>
                <h3 className="text-lg font-medium mb-2">Compare and save</h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">
                  See prices side by side, sorted from lowest to highest. Click through to purchase from whichever retailer you prefer.
                </p>
              </div>
              <div className="p-4 bg-white border border-[var(--border)]" style={{ borderRadius: '6px' }}>
                <p className="text-sm text-[var(--muted)]">
                  <span className="text-[var(--foreground)] font-medium">Pro tip:</span> Install our browser extension to automatically see price comparisons while you shop.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Simple CTA */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="border border-[var(--border)] p-8 md:p-12 text-center bg-white" style={{ borderRadius: '8px' }}>
            <h2 className="text-2xl font-semibold mb-3">
              Never miss a deal again
            </h2>
            <p className="text-[var(--muted)] mb-6 max-w-md mx-auto">
              Get our free browser extension and see price comparisons automatically on any product page.
            </p>
            <a
              href="#"
              className="inline-block px-6 py-3 bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors"
              style={{ borderRadius: '6px' }}
            >
              Add to Chrome — It&apos;s free
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-sm text-[var(--muted)]">
              &copy; {new Date().getFullYear()} Pick Marketplace
            </span>
            <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Terms</a>
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
