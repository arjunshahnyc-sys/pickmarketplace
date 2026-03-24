'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, X, Download, Globe, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { SearchBar } from '@/components/SearchBar';
import { ProductCard } from '@/components/ProductCard';
import type { SearchResponse } from '@/lib/types';
import { getTrendingProducts } from '@/lib/scrapers';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import RetailerMarquee from '@/components/RetailerMarquee';
import { TrustedBy } from '@/components/TrustedBy';
import { HowItWorks } from '@/components/HowItWorks';
import { StatsSection } from '@/components/StatsSection';

// Animation variants for staggered product grid
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export default function Home() {
  const { user, isAuthenticated, searchesRemaining, incrementSearchCount, getFeatureLimit } =
    useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Searching retailers...');
  const [hasSearched, setHasSearched] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [searchResponse, setSearchResponse] = useState<any>(null);

  // Cycling loading text
  useEffect(() => {
    if (!isLoading) return;

    const retailers = [
      'Searching Amazon...',
      'Checking Target...',
      'Scanning Best Buy...',
      'Looking at Walmart...',
      "Browsing Macy's...",
      'Checking Nordstrom...',
    ];
    let i = 0;
    const interval = setInterval(() => {
      setLoadingText(retailers[i % retailers.length]);
      i++;
    }, 800);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSearch = async (searchQuery: string) => {
    // Check if user has searches remaining (if authenticated and on free plan)
    if (isAuthenticated && user?.plan === 'free' && searchesRemaining <= 0) {
      alert('Daily search limit reached. Upgrade to Premium for unlimited searches!');
      return;
    }

    setIsLoading(true);
    setQuery(searchQuery);
    setHasSearched(true);
    setResults([]);

    try {
      const response = await fetch(`/api/search-live?q=${encodeURIComponent(searchQuery)}`);
      const data: any = await response.json();
      setResults(data.results || []);
      setSearchResponse(data);

      // Increment search count for authenticated free users
      if (isAuthenticated && user?.plan === 'free') {
        incrementSearchCount();
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load trending products and check for URL query on mount
  useEffect(() => {
    const trending = getTrendingProducts();
    setTrendingProducts(trending);

    // Check for query parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    if (queryParam) {
      handleSearch(queryParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retailers = [
    'Amazon',
    'Walmart',
    'Target',
    'Best Buy',
    'Costco',
    'eBay',
    'Home Depot',
    "Lowe's",
    "Macy's",
    'Nordstrom',
    'Wayfair',
    'Kroger',
  ];

  // Extract unique retailers from results
  const resultRetailers = results.length > 0
    ? Array.from(new Set(results.map((p: any) => p.retailer)))
    : [];

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
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors btn"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                <Globe size={24} className="text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Install Pick Extension</h3>
                <p className="text-sm text-[var(--muted)]">3 simple steps</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] text-white text-sm font-medium flex items-center justify-center">
                  1
                </span>
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
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] text-white text-sm font-medium flex items-center justify-center">
                  2
                </span>
                <div>
                  <p className="font-medium mb-1">Open Chrome Extensions</p>
                  <p className="text-sm text-[var(--muted)]">
                    Go to{' '}
                    <code className="px-1.5 py-0.5 bg-[var(--background)] rounded text-xs">
                      chrome://extensions
                    </code>{' '}
                    and enable <strong>Developer mode</strong> (top right)
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] text-white text-sm font-medium flex items-center justify-center">
                  3
                </span>
                <div>
                  <p className="font-medium mb-1">Load the extension</p>
                  <p className="text-sm text-[var(--muted)]">
                    Unzip the file, click <strong>Load unpacked</strong>, and select the unzipped
                    folder
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
      <Header onInstallClick={() => setShowInstallModal(true)} />

      <main>
        {/* Usage Meter for Free Users */}
        {isAuthenticated && user?.plan === 'free' && (
          <div className="max-w-5xl mx-auto px-6 pt-6">
            <div
              className="bg-white border border-[var(--border)] p-4"
              style={{ borderRadius: '6px' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Daily Searches
                </span>
                <span className="text-sm text-[var(--muted)]">
                  {searchesRemaining} / {getFeatureLimit('searchesPerDay')} remaining
                </span>
              </div>
              <div className="w-full bg-[var(--background)] h-2" style={{ borderRadius: '4px' }}>
                <div
                  className={`h-2 transition-all ${
                    searchesRemaining === 0
                      ? 'bg-red-500'
                      : searchesRemaining <= 2
                      ? 'bg-yellow-500'
                      : 'bg-[var(--accent)]'
                  }`}
                  style={{
                    borderRadius: '4px',
                    width: `${(searchesRemaining / Number(getFeatureLimit('searchesPerDay'))) * 100}%`,
                  }}
                />
              </div>
              {searchesRemaining === 0 && (
                <p className="text-xs text-red-600 mt-2">
                  Limit reached.{' '}
                  <a href="/pricing" className="underline hover:text-red-700">
                    Upgrade to Premium
                  </a>{' '}
                  for unlimited searches.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hero Section with animation */}
        <section className="max-w-5xl mx-auto px-6 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-2xl mb-12"
          >
            <h1 className="text-8xl md:text-9xl font-bold mb-6 tracking-tighter leading-[0.95]">
              FIND SIMILAR. PAY LESS.
            </h1>
            <p
              className="text-base text-[var(--muted)] leading-relaxed max-w-lg mb-8"
              style={{ opacity: 0.7 }}
            >
              We don't just find your product cheaper—we find similar products with comparable
              reviews at better prices that others miss.
            </p>
          </motion.div>

          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          {/* Quick search hints */}
          {!hasSearched && (
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-[var(--muted)]">Try:</span>
              {['Sony WH-1000XM5', 'MacBook Air M3', 'KitchenAid mixer', 'Dyson vacuum'].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => handleSearch(term)}
                    className="btn text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* Trusted By Section */}
        {!hasSearched && <TrustedBy />}

        {/* Retailer Marquee */}
        {!hasSearched && <RetailerMarquee />}

        {/* How It Works Section */}
        {!hasSearched && <HowItWorks />}

        {/* Stats Section */}
        {!hasSearched && <StatsSection />}

        {/* Trending Now Section */}
        {!hasSearched && trendingProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto px-6 pb-16 pt-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={20} className="text-[var(--accent)]" />
              <h2 className="text-xl font-semibold">Trending Now</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {trendingProducts.map((product, idx) => (
                <a
                  key={idx}
                  href={`/?q=${encodeURIComponent(product.name)}`}
                  className="group bg-white border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-all hover:shadow-md"
                >
                  <div className="aspect-square mb-3 bg-[var(--background)] rounded flex items-center justify-center overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="text-sm font-medium line-clamp-2 mb-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-[var(--accent)]">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </motion.section>
        )}

        {/* Results Section */}
        {hasSearched && (
          <section className="max-w-5xl mx-auto px-6 pb-24">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="flex items-center gap-3 text-[var(--muted)] mb-4">
                  <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full spinner" />
                  <span className="text-sm animate-pulse">{loadingText}</span>
                </div>
                {/* Loading skeleton */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white border border-[var(--border)] rounded-lg overflow-hidden animate-pulse"
                    >
                      <div className="aspect-[4/3] bg-gray-200" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-8 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : results.length > 0 ? (
              <>
                {/* Results header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-2">
                    Found {results.length} results for &quot;{query}&quot;
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    {resultRetailers.length > 0 && (
                      <>
                        Across {resultRetailers.join(', ')} •{' '}
                      </>
                    )}
                    Prices checked {searchResponse?.cachedAt || 'just now'}
                  </p>
                </div>

                {/* Product grid with stagger animation */}
                <motion.div
                  variants={gridVariants}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.05 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  {results
                    .slice(
                      0,
                      isAuthenticated ? Number(getFeatureLimit('resultsPerSearch')) : 10
                    )
                    .map((product, i) => (
                      <motion.div key={product.id || i} variants={cardVariants}>
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                </motion.div>

                {/* Show upgrade prompt if there are more results */}
                {results.length >
                  (isAuthenticated ? Number(getFeatureLimit('resultsPerSearch')) : 10) && (
                  <div
                    className="mt-12 text-center p-8 border border-[var(--border)] bg-white"
                    style={{ borderRadius: '8px' }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                      Premium Feature
                    </h3>
                    <p className="text-[var(--muted)] mb-4">
                      Upgrade to Premium to see{' '}
                      {results.length -
                        (isAuthenticated ? Number(getFeatureLimit('resultsPerSearch')) : 10)}{' '}
                      more results
                    </p>
                    <a
                      href="/pricing"
                      className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 hover:shadow-lg transition-shadow"
                      style={{ borderRadius: '6px' }}
                    >
                      Upgrade Now
                    </a>
                  </div>
                )}
              </>
            ) : (
              // Empty state
              <div className="text-center py-24">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No results found for &quot;{query}&quot;</h3>
                <p className="text-[var(--muted)] mb-6">Try a broader search or different keywords</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <span className="text-sm text-[var(--muted)]">Try these popular searches:</span>
                  {['Headphones', 'Laptops', 'Running Shoes', 'Skincare', 'Kitchen'].map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSearch(term)}
                      className="px-4 py-2 bg-[var(--accent)] text-white text-sm rounded hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
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

            {/* Key differentiator section */}
            <motion.section
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="max-w-5xl mx-auto px-6 py-16"
            >
              <div className="max-w-3xl">
                <div
                  className="bg-white border border-[var(--border)] p-8"
                  style={{ borderRadius: '8px' }}
                >
                  <div className="differentiator">
                    <h2 className="text-2xl font-semibold mb-4 tracking-tight">
                      We don't just find your product cheaper—we find better alternatives others
                      miss
                    </h2>
                    <p className="text-[var(--foreground)] leading-relaxed mb-4">
                      Unlike Honey and other extensions that only check if your exact product is
                      cheaper elsewhere, Pick goes further. We search for{' '}
                      <strong>similar products with comparable reviews</strong> across{' '}
                      {retailers.length} major retailers.
                    </p>
                    <p className="text-[var(--muted)] leading-relaxed">
                      The best deal often isn't the same product at a lower price—it's a comparable
                      alternative you didn't know existed.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Retailers grid */}
            <section className="max-w-5xl mx-auto px-6 py-12">
              <p className="text-sm text-[var(--muted)] mb-4">We search across</p>
              <div className="flex flex-wrap gap-2">
                {retailers.map((retailer) => (
                  <span key={retailer} className="retailer-badge">
                    {retailer}
                  </span>
                ))}
              </div>
            </section>

            <div className="max-w-5xl mx-auto px-6 py-4">
              <div className="h-px bg-[var(--border)]" />
            </div>

            {/* How it works - clean asymmetric layout */}
            <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
              <div className="grid md:grid-cols-2 gap-16">
                <motion.div
                  initial={{ opacity: 0, x: -60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                  <h2 className="text-3xl font-semibold mb-4 tracking-tight">How it works</h2>
                  <p className="text-[var(--muted)] mb-12 max-w-sm">
                    We do the comparison shopping so you don&apos;t have to open a dozen browser
                    tabs.
                  </p>

                  <div className="space-y-10">
                    <div className="flex gap-4">
                      <span className="text-sm font-medium text-[var(--accent)] mt-0.5">01</span>
                      <div>
                        <h3 className="font-medium mb-1.5">Enter what you&apos;re looking for</h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                          Type a product name, brand, or category. Be as specific or general as you
                          like.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="text-sm font-medium text-[var(--accent)] mt-0.5">02</span>
                      <div>
                        <h3 className="font-medium mb-1.5">
                          We query {retailers.length} retailers
                        </h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                          Pick checks Amazon, Walmart, Target, Best Buy, and more simultaneously for
                          current prices and similar products.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="text-sm font-medium text-[var(--accent)] mt-0.5">03</span>
                      <div>
                        <h3 className="font-medium mb-1.5">Compare and decide</h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                          See prices side by side, including alternatives you might not have found.
                          Click through to buy from whichever retailer has the best deal.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="flex items-end"
                >
                  <div
                    className="w-full p-6 border border-[var(--border)] bg-white card-hover"
                    style={{ borderRadius: '8px' }}
                  >
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
                      <div
                        className="flex justify-between items-center py-2 px-3 bg-[var(--background)]"
                        style={{ borderRadius: '4px' }}
                      >
                        <span className="text-sm text-[var(--muted)]">Amazon</span>
                        <span className="text-sm font-medium text-[var(--accent)]">$328.00</span>
                      </div>
                      <div
                        className="flex justify-between items-center py-2 px-3 bg-[var(--background)]"
                        style={{ borderRadius: '4px' }}
                      >
                        <span className="text-sm text-[var(--muted)]">Walmart</span>
                        <span className="text-sm font-medium">$348.00</span>
                      </div>
                      <div
                        className="flex justify-between items-center py-2 px-3 bg-[var(--background)]"
                        style={{ borderRadius: '4px' }}
                      >
                        <span className="text-sm text-[var(--muted)]">Best Buy</span>
                        <span className="text-sm font-medium">$349.99</span>
                      </div>
                      <div
                        className="flex justify-between items-center py-2 px-3 bg-[var(--background)]"
                        style={{ borderRadius: '4px' }}
                      >
                        <span className="text-sm text-[var(--muted)]">Target</span>
                        <span className="text-sm font-medium">$349.99</span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--accent)] mt-4 font-medium">
                      Save $21.99 buying from Amazon
                    </p>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Extension CTA */}
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              id="extension"
              className="max-w-5xl mx-auto px-6 py-20"
            >
              <div
                className="border border-[var(--border)] bg-white p-10 md:p-14"
                style={{ borderRadius: '8px' }}
              >
                <div className="max-w-lg">
                  <h2 className="text-2xl md:text-3xl font-semibold mb-4 tracking-tight">
                    See price comparisons while you shop
                  </h2>
                  <p className="text-[var(--muted)] mb-8 leading-relaxed">
                    Install our browser extension. When you visit a product page on any supported
                    retailer, Pick automatically shows you if it&apos;s cheaper somewhere else—or if
                    there&apos;s a better alternative.
                  </p>
                  <button
                    onClick={() => setShowInstallModal(true)}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  >
                    <span>Add to Chrome</span>
                    <ArrowRight size={16} className="arrow" />
                  </button>
                  <p className="text-xs text-[var(--muted)] mt-4">
                    Free forever. No account required.
                  </p>
                </div>
              </div>
            </motion.section>
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
              <a href="/privacy" className="hover:text-[var(--foreground)] transition-colors">
                Privacy
              </a>
              <a href="/terms" className="hover:text-[var(--foreground)] transition-colors">
                Terms
              </a>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
