'use client';

import { useState } from 'react';
import { ShoppingBag, ArrowRight, X, Download, Chrome } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';
import type { ProductResult, SearchResponse } from '@/lib/types';

export default function Home() {
  const [results, setResults] = useState<ProductResult[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

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
    <div className="relative z-10 texture-bg min-h-screen">
      {/* Install Extension Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowInstallModal(false)}
          />
          <div
            className="relative bg-white w-full max-w-md p-8 shadow-xl"
            style={{ borderRadius: '8px' }}
          >
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                <Chrome size={24} className="text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Install Pick Extension</h3>
                <p className="text-sm text-[var(--muted)]">3 simple steps</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] text-white text-sm font-medium flex items-center justify-center">1</span>
                <div>
                  <p className="font-medium mb-1">Download the extension</p>
                  <a
                    href="/extension.zip"
                    download
                    className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline"
                  >
                    <Download size={14} />
                    Download pick-extension.zip
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] text-white text-sm font-medium flex items-center justify-center">2</span>
                <div>
                  <p className="font-medium mb-1">Open Chrome Extensions</p>
                  <p className="text-sm text-[var(--muted)]">
                    Go to <code className="px-1.5 py-0.5 bg-[var(--background)] rounded text-xs">chrome://extensions</code> and enable <strong>Developer mode</strong> (top right)
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] text-white text-sm font-medium flex items-center justify-center">3</span>
                <div>
                  <p className="font-medium mb-1">Load the extension</p>
                  <p className="text-sm text-[var(--muted)]">
                    Unzip the file, click <strong>Load unpacked</strong>, and select the unzipped folder
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted)] text-center">
                Works on Chrome, Edge, Brave, and other Chromium browsers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <ShoppingBag size={22} strokeWidth={1.5} className="text-[var(--accent)]" />
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              pick
            </span>
          </a>
          <nav className="flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
            >
              How it works
            </a>
            <button
              onClick={() => setShowInstallModal(true)}
              className="text-sm px-4 py-2 border border-[var(--border)] hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-white transition-all cursor-pointer"
              style={{ borderRadius: '6px' }}
            >
              Get extension
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-16">
          <div className="max-w-xl mb-12">
            <h1 className="text-5xl md:text-6xl font-semibold mb-5 tracking-tight leading-[1.1]">
              Stop overpaying<br />
              <span className="text-[var(--muted)]">for the same product.</span>
            </h1>
            <p className="text-lg text-[var(--muted)] leading-relaxed max-w-md">
              Search any product. Compare prices across Amazon, Walmart, Best Buy, and Target in seconds.
            </p>
          </div>

          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          {/* Quick search hints */}
          {!hasSearched && (
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-[var(--muted)]">Popular:</span>
              {['Sony headphones', 'MacBook Air', 'mechanical keyboard', '4K monitor'].map((term) => (
                <button
                  key={term}
                  onClick={() => handleSearch(term)}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Results */}
        {hasSearched && (
          <section className="max-w-5xl mx-auto px-6 pb-24">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex items-center gap-3 text-[var(--muted)]">
                  <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full spinner" />
                  <span className="text-sm">Checking prices across retailers...</span>
                </div>
              </div>
            ) : (
              <div className="fade-in">
                <ProductGrid products={results} query={query} />
              </div>
            )}
          </section>
        )}

        {/* Divider */}
        {!hasSearched && (
          <>
            <div className="max-w-5xl mx-auto px-6 py-8">
              <div className="h-px bg-[var(--border)]" />
            </div>

            {/* Stats section - subtle social proof */}
            <section className="max-w-5xl mx-auto px-6 py-12">
              <div className="grid grid-cols-3 gap-8 max-w-2xl">
                <div>
                  <p className="text-3xl font-semibold tracking-tight">4</p>
                  <p className="text-sm text-[var(--muted)] mt-1">Major retailers</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold tracking-tight">~15%</p>
                  <p className="text-sm text-[var(--muted)] mt-1">Avg. savings found</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold tracking-tight">&lt;2s</p>
                  <p className="text-sm text-[var(--muted)] mt-1">Search time</p>
                </div>
              </div>
            </section>

            {/* How it works - clean asymmetric layout */}
            <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
              <div className="grid md:grid-cols-2 gap-16">
                <div>
                  <h2 className="text-3xl font-semibold mb-4 tracking-tight">
                    How it works
                  </h2>
                  <p className="text-[var(--muted)] mb-12 max-w-sm">
                    We do the comparison shopping so you don&apos;t have to open 10 browser tabs.
                  </p>

                  <div className="space-y-10">
                    <div className="flex gap-4">
                      <span className="text-sm font-medium text-[var(--accent)] mt-0.5">01</span>
                      <div>
                        <h3 className="font-medium mb-1.5">Enter what you&apos;re looking for</h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                          Type a product name, brand, or category. Be as specific or general as you like.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="text-sm font-medium text-[var(--accent)] mt-0.5">02</span>
                      <div>
                        <h3 className="font-medium mb-1.5">We query the retailers</h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                          Pick checks Amazon, Walmart, Best Buy, and Target simultaneously to find current prices.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="text-sm font-medium text-[var(--accent)] mt-0.5">03</span>
                      <div>
                        <h3 className="font-medium mb-1.5">See every price, sorted</h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                          Compare prices side by side. Click through to buy from whichever retailer has the best deal.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-end">
                  <div className="w-full p-6 border border-[var(--border)] bg-white" style={{ borderRadius: '8px' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--subtle-warm)] flex items-center justify-center">
                        <ShoppingBag size={18} className="text-[var(--accent)]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Sony WH-1000XM5</p>
                        <p className="text-xs text-[var(--muted)]">Same product, different prices</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 px-3 bg-[var(--background)]" style={{ borderRadius: '4px' }}>
                        <span className="text-sm text-[var(--muted)]">Amazon</span>
                        <span className="text-sm font-medium text-[var(--accent)]">$328.00</span>
                      </div>
                      <div className="flex justify-between items-center py-2 px-3 bg-[var(--background)]" style={{ borderRadius: '4px' }}>
                        <span className="text-sm text-[var(--muted)]">Walmart</span>
                        <span className="text-sm font-medium">$348.00</span>
                      </div>
                      <div className="flex justify-between items-center py-2 px-3 bg-[var(--background)]" style={{ borderRadius: '4px' }}>
                        <span className="text-sm text-[var(--muted)]">Best Buy</span>
                        <span className="text-sm font-medium">$349.99</span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--accent)] mt-4 font-medium">
                      Save $21.99 buying from Amazon
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Extension CTA */}
            <section id="extension" className="max-w-5xl mx-auto px-6 py-20">
              <div className="border border-[var(--border)] bg-white p-10 md:p-14" style={{ borderRadius: '8px' }}>
                <div className="max-w-lg">
                  <h2 className="text-2xl md:text-3xl font-semibold mb-4 tracking-tight">
                    See price comparisons while you shop
                  </h2>
                  <p className="text-[var(--muted)] mb-8 leading-relaxed">
                    Install our browser extension. When you visit a product page on Amazon, Walmart, or any supported retailer, Pick automatically shows you if it&apos;s cheaper somewhere else.
                  </p>
                  <button
                    onClick={() => setShowInstallModal(true)}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  >
                    <span>Add to Chrome</span>
                    <ArrowRight size={16} />
                  </button>
                  <p className="text-xs text-[var(--muted)] mt-4">
                    Free forever. No account required.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} strokeWidth={1.5} className="text-[var(--accent)]" />
              <span className="text-sm font-medium">pick</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Terms</a>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
