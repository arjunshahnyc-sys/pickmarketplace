'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, X, Download, Globe, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { SearchBar } from '@/components/SearchBar';
import ProductCard from '@/components/ProductCard';
import SearchSection from '@/components/SearchSection';
import CompareDrawer from '@/components/CompareDrawer';
import CompareModal from '@/components/CompareModal';
import type { SearchResponse, Product } from '@/lib/types';
// Removed getTrendingProducts - using static trending searches instead
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { formatPrice } from '@/lib/formatters';
import RetailerMarquee from '@/components/RetailerMarquee';
import { TrustedBy } from '@/components/TrustedBy';
import { HowItWorks } from '@/components/HowItWorks';
import { StatsSection } from '@/components/StatsSection';
import { ChatWidget } from '@/components/ChatWidget';
import { PickLogo } from '@/components/PickLogo';
// SavingsCounter intentionally unmounted: it fabricated an ever-growing "users
// have saved $X" figure client-side. Re-add once /api/stats serves real data.
import Testimonials from '@/components/home/Testimonials';
import { enhanceProductsWithGroupInfo } from '@/lib/productGrouping';

// Animation variants for staggered product grid
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1 },
};

// Honest freshness label: results can be served from a 30-minute server cache
function formatCheckedAt(checkedAt?: string): string {
  if (!checkedAt) return 'just now';
  const ageMin = Math.floor((Date.now() - new Date(checkedAt).getTime()) / 60000);
  if (ageMin < 1) return 'just now';
  if (ageMin === 1) return '1 minute ago';
  return `${ageMin} minutes ago`;
}

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
  const [searchError, setSearchError] = useState(false);

  // Compare mode state
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Filter and sort state
  const [sortBy, setSortBy] = useState('relevance');
  const [showOnSaleOnly, setShowOnSaleOnly] = useState(false);

  // Cycling loading text
  useEffect(() => {
    if (!isLoading) return;

    const retailers = [
      'Searching Target...',
      'Checking Google Shopping...',
      'Finding best prices...',
      'Comparing deals...',
      'Analyzing products...',
      'Loading results...',
    ];
    let i = 0;
    const interval = setInterval(() => {
      setLoadingText(retailers[i % retailers.length]);
      i++;
    }, 800);

    return () => clearInterval(interval);
  }, [isLoading]);

  // ESC key handler to exit compare mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCompareMode) {
        setIsCompareMode(false);
        setSelectedProducts([]);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isCompareMode]);

  // Compare mode handlers
  const handleCompareClick = () => {
    setIsCompareMode(!isCompareMode);
    if (isCompareMode) {
      setSelectedProducts([]);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProducts((prev) => {
      const isAlreadySelected = prev.some((p) => p.url === product.url);
      if (isAlreadySelected) {
        return prev.filter((p) => p.url !== product.url);
      }
      if (prev.length >= 2) {
        return [prev[1], product];
      }
      return [...prev, product];
    });
  };

  const handleRemoveProduct = (productUrl: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.url !== productUrl));
  };

  const handleCompareNow = () => {
    if (selectedProducts.length === 2) {
      setShowCompareModal(true);
    }
  };

  const handleCloseCompareMode = () => {
    setIsCompareMode(false);
    setSelectedProducts([]);
  };

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
    setSearchError(false);

    try {
      const response = await fetch(`/api/search-live?q=${encodeURIComponent(searchQuery)}`);
      const data: any = await response.json();
      setResults(data.results || []);
      // Even error responses carry retailerSearchLinks we can offer as a fallback
      setSearchResponse(data);
      if (!response.ok || data.error) {
        setSearchError(true);
      }

      // Increment search count for authenticated free users
      if (isAuthenticated && user?.plan === 'free') {
        incrementSearchCount();
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setSearchResponse(null);
      setSearchError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Load trending products and check for URL query on mount
  useEffect(() => {
    const trending = [
      {
        id: 'trending-1',
        name: "Apple AirPods Pro 2nd Gen",
        price: 189.99,
        currency: 'USD',
        imageUrl: "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg",
        retailer: "Amazon",
        url: "https://www.amazon.com/s?k=airpods+pro+2",
        rating: 4.7,
        reviewCount: 45000
      },
      {
        id: 'trending-2',
        name: "Stanley Quencher H2.0 40oz",
        price: 35.00,
        currency: 'USD',
        imageUrl: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcTY1hB8Jy9sKeePkORMfRQ2uki2WnDWLglkr8hq_KOrQShA_VIKXdc0HN3wm6s2d50WjaeugWFLU6EuXDP-mgkm7NOU3M7YmDJdoxBdTUfVvOljy1td6nKHPw",
        retailer: "Target",
        url: "https://www.target.com/s?searchTerm=stanley+quencher",
        rating: 4.8,
        reviewCount: 12000
      },
      {
        id: 'trending-3',
        name: "Nike Dunk Low",
        price: 110.00,
        currency: 'USD',
        imageUrl: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcS4K2IMnIFmWcj2D0hzrwAx-t8W_GPiwM_ipNdIVwuItmho5atWVA1AaZAvpXG67Ks5hK6mpwVqoaxS5j0jayDARTI-cEtfxRZxIECJ29c",
        retailer: "Nike",
        url: "https://www.nike.com/w/dunk-shoes-90aohZ8y3qp",
        rating: 4.6,
        reviewCount: 8500
      },
      {
        id: 'trending-4',
        name: "Dyson Airwrap Complete",
        price: 499.99,
        currency: 'USD',
        imageUrl: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcR_sr_aR_BCSPZX5qr-8ZnCvFa_jOQzcL5Oid0pbR4KqNNRXP8LnzExKWGAiO-e8jc3z12pVYxLxSJt-BHwu8HAU0_gi7Pst96Ndcoqr4bP1u4xCTZG_S48kg",
        retailer: "Best Buy",
        url: "https://www.bestbuy.com/site/searchpage.jsp?st=dyson+airwrap",
        rating: 4.5,
        reviewCount: 6200
      },
      {
        id: 'trending-5',
        name: "Sony WH-1000XM5",
        price: 328.00,
        currency: 'USD',
        imageUrl: "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg",
        retailer: "Amazon",
        url: "https://www.amazon.com/s?k=sony+wh1000xm5",
        rating: 4.7,
        reviewCount: 32000
      },
      {
        id: 'trending-6',
        name: "Lululemon Align Leggings",
        price: 98.00,
        currency: 'USD',
        imageUrl: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRSZBZFDswbhXsfgcscQ7KamBr6lFoHklbdPf_9XjiJRPSveAEYitlUxX53o0aB0avGrVt3A2qrBVwUM1BAXq6B7fvCeeIr5amE9lzOSKtISLJuH5dGUkrRdA",
        retailer: "Nordstrom",
        url: "https://www.nordstrom.com/sr?origin=keywordsearch&keyword=lululemon+align",
        rating: 4.8,
        reviewCount: 15000
      },
      {
        id: 'trending-7',
        name: "CeraVe Moisturizing Cream 16oz",
        price: 15.99,
        currency: 'USD',
        imageUrl: "https://m.media-amazon.com/images/I/61S7BrCBj7L._SL1000_.jpg",
        retailer: "Target",
        url: "https://www.target.com/s?searchTerm=cerave+moisturizing+cream",
        rating: 4.7,
        reviewCount: 89000
      },
      {
        id: 'trending-8',
        name: "Ninja Creami Ice Cream Maker",
        price: 149.99,
        currency: 'USD',
        imageUrl: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcR58LO9Il2TZTUZXpkBzzWdMBo1Ui67ny3FQABxpEsdbbrXrE3DZ8RAXCmVry9dNVTIiLxBlbk6PNEuYb1Je5JlyPRn0b71FkTfOA5irieccUiwo04scuKCZA",
        retailer: "Walmart",
        url: "https://www.walmart.com/search?q=ninja+creami",
        rating: 4.6,
        reviewCount: 18000
      },
    ];
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

  // Filter and sort results
  const getFilteredAndSortedResults = () => {
    let filtered = [...results];

    // Apply "On Sale Only" filter
    if (showOnSaleOnly) {
      filtered = filtered.filter(
        (p: Product) => p.originalPrice && p.originalPrice > p.price
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a: Product, b: Product) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a: Product, b: Product) => b.price - a.price);
        break;
      case 'biggest-sale':
        filtered.sort((a: Product, b: Product) => {
          const discountA =
            a.originalPrice && a.originalPrice > a.price
              ? ((a.originalPrice - a.price) / a.originalPrice) * 100
              : 0;
          const discountB =
            b.originalPrice && b.originalPrice > b.price
              ? ((b.originalPrice - b.price) / b.originalPrice) * 100
              : 0;
          return discountB - discountA;
        });
        break;
      case 'relevance':
      default:
        // Keep original order
        break;
    }

    // Enhance with product grouping and savings info
    const enhanced = enhanceProductsWithGroupInfo(filtered);
    return enhanced;
  };

  const filteredResults = getFilteredAndSortedResults();

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
            className="relative bg-white text-black w-full max-w-md p-8 shadow-xl border border-black/10"
            style={{ borderRadius: '8px' }}
          >
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 text-black/60 hover:text-black transition-colors btn"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#2A9D8F]/10 flex items-center justify-center">
                <Globe size={24} className="text-[#2A9D8F]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-black">Install Pick Extension</h3>
                <p className="text-sm text-black/60">3 simple steps</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2A9D8F] text-white text-sm font-medium flex items-center justify-center">
                  1
                </span>
                <div>
                  <p className="font-medium mb-1 text-black">Download the extension</p>
                  <a
                    href="/extension.zip"
                    download
                    className="inline-flex items-center gap-2 text-sm text-[#2A9D8F] hover:underline"
                  >
                    <Download size={14} />
                    Download pick-extension.zip
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2A9D8F] text-white text-sm font-medium flex items-center justify-center">
                  2
                </span>
                <div>
                  <p className="font-medium mb-1 text-black">Open Chrome Extensions</p>
                  <p className="text-sm text-black/60">
                    Go to{' '}
                    <code className="px-1.5 py-0.5 bg-black/5 rounded text-xs">
                      chrome://extensions
                    </code>{' '}
                    and enable <strong>Developer mode</strong> (top right)
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2A9D8F] text-white text-sm font-medium flex items-center justify-center">
                  3
                </span>
                <div>
                  <p className="font-medium mb-1 text-black">Load the extension</p>
                  <p className="text-sm text-black/60">
                    Unzip the file, click <strong>Load unpacked</strong>, and select the unzipped
                    folder
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-black/10">
              <p className="text-xs text-black/60 text-center">
                Works on Chrome, Edge, Brave, and other Chromium browsers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <Header />

      <main>
        {/* Usage Meter for Free Users */}
        {isAuthenticated && user?.plan === 'free' && (
          <div className="max-w-5xl mx-auto px-6 pt-6">
            <div
              className="bg-white border border-black/10 p-4"
              style={{ borderRadius: '6px' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-black">
                  Daily Searches
                </span>
                <span className="text-sm text-black/60">
                  {searchesRemaining} / {getFeatureLimit('searchesPerDay')} remaining
                </span>
              </div>
              <div className="w-full bg-black/5 h-2" style={{ borderRadius: '4px' }}>
                <div
                  className={`h-2 transition-all ${
                    searchesRemaining === 0
                      ? 'bg-[#EF4444]'
                      : searchesRemaining <= 2
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#2A9D8F]'
                  }`}
                  style={{
                    borderRadius: '4px',
                    width: `${(searchesRemaining / Number(getFeatureLimit('searchesPerDay'))) * 100}%`,
                  }}
                />
              </div>
              {searchesRemaining === 0 && (
                <p className="text-xs text-[#EF4444] mt-2">
                  Limit reached.{' '}
                  <a href="/pricing" className="underline hover:text-[#EF4444]/80">
                    Upgrade to Premium
                  </a>{' '}
                  for unlimited searches.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hero Section with animation */}
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-2xl mb-8"
          >
            {/* Hero Text First on Mobile, Search Second */}
            <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-black">
              Still broke. Still shopping.
            </h1>
            <p className="text-sm text-black/60 leading-relaxed max-w-lg mb-6">
              Find the same item for less, or a near-identical one that costs less. We compare prices across major retailers so you stop overpaying.
            </p>

            {/* Savings Counter */}

            {/* Search Bar */}
            <div className="mt-6">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            </div>
          </motion.div>

          {/* Quick search hints */}
          {!hasSearched && (
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-black/60">Try:</span>
              {['AirPods', 'Textbooks', 'Dorm Stuff', 'Skincare Dupes', 'Oversized Hoodie', 'Laptops', 'Mini Dresses'].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => handleSearch(term)}
                    className="btn text-sm text-black/60 hover:text-black transition-colors link-underline"
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

        {/* How It Works Section - Simple 3-card version */}
        {!hasSearched && (
          <section className="max-w-5xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2A9D8F]/10 text-[#2A9D8F] font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="font-semibold text-black mb-2">Paste or search</h3>
                <p className="text-sm text-black/60">Drop in what you want. We'll take it from there.</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2A9D8F]/10 text-[#2A9D8F] font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="font-semibold text-black mb-2">See every store</h3>
                <p className="text-sm text-black/60">Compare prices from multiple online stores.</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2A9D8F]/10 text-[#2A9D8F] font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="font-semibold text-black mb-2">Go where it's cheapest</h3>
                <p className="text-sm text-black/60">Click. Buy. Move on with your day.</p>
              </div>
            </div>
          </section>
        )}

        {/* Testimonials */}
        {!hasSearched && <Testimonials />}

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
              <TrendingUp size={20} className="text-[#2A9D8F]" />
              <h2 className="text-xl font-semibold text-black">Trending Now</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {trendingProducts.map((product, idx) => (
                <a
                  key={idx}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white border border-black/10 rounded-lg p-4 hover:border-[#2A9D8F] transition-all hover:shadow-md"
                >
                  <div className="relative aspect-square mb-3 bg-black/5 rounded flex items-center justify-center overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.image-fallback')) {
                          const fallback = document.createElement('div');
                          fallback.className = 'image-fallback absolute inset-0 flex flex-col items-center justify-center text-center p-4';
                          fallback.innerHTML = `
                            <div class="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-2">
                              <svg class="w-8 h-8 text-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                            <span class="text-xs text-black/40 font-medium">${product.name.substring(0, 30)}${product.name.length > 30 ? '...' : ''}</span>
                          `;
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  </div>
                  <h3 className="text-sm font-medium line-clamp-2 mb-2 min-h-[2.5rem] text-black">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-[#2A9D8F]">
                      ${formatPrice(product.price)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </motion.section>
        )}

        {/* Results Section - PINCHPOINT 9 FIX - Added pb-24 for chatbot clearance */}
        {hasSearched && (
          <section className="max-w-5xl mx-auto px-6 pb-32">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="flex items-center gap-3 text-black/60 mb-4">
                  <div className="w-5 h-5 border-2 border-black/10 border-t-[#2A9D8F] rounded-full spinner" />
                  <span className="text-sm animate-pulse">{loadingText}</span>
                </div>
                {/* Loading skeleton */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white border border-black/10 rounded-lg overflow-hidden animate-pulse"
                    >
                      <div className="aspect-[4/3] bg-black/5" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-black/5 rounded w-3/4" />
                        <div className="h-4 bg-black/5 rounded w-1/2" />
                        <div className="h-8 bg-black/5 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : results.length > 0 ? (
              <>
                {/* Results header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-2 text-black">
                    Found {results.length} results for &quot;{query}&quot;
                  </h2>
                  <p className="text-sm text-black/60 mb-4">
                    {resultRetailers.length > 0 && (
                      <>
                        Across {resultRetailers.slice(0, 5).join(', ')}
                        {resultRetailers.length > 5 && ` and ${resultRetailers.length - 5} more stores`} •{' '}
                      </>
                    )}
                    Prices checked {formatCheckedAt(searchResponse?.checkedAt)}
                  </p>
                </div>

                {/* Search Section with Filters */}
                <SearchSection
                  resultsCount={filteredResults.length}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  showOnSaleOnly={showOnSaleOnly}
                  onOnSaleToggle={() => setShowOnSaleOnly(!showOnSaleOnly)}
                  onCompareClick={handleCompareClick}
                  isCompareMode={isCompareMode}
                  products={filteredResults}
                  query={query}
                  onSearch={handleSearch}
                />

                {/* Product grid with stagger animation */}
                <motion.div
                  variants={gridVariants}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.05 }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {(() => {
                    // Show ALL results for unauthenticated users, limit for authenticated free users
                    const visible = filteredResults.slice(
                      0,
                      !isAuthenticated
                        ? filteredResults.length  // No limit for anonymous first-time visitors
                        : Number(getFeatureLimit('resultsPerSearch'))  // Limit for logged-in free users
                    );

                    return visible.map((product, i) => (
                      <motion.div key={product.id || i} variants={cardVariants}>
                        <ProductCard
                          product={product}
                          isCompareMode={isCompareMode}
                          isSelected={selectedProducts.some((p) => p.url === product.url)}
                          onSelect={handleProductSelect}
                        />
                      </motion.div>
                    ));
                  })()}
                </motion.div>

                {/* Show upgrade prompt only for authenticated free users */}
                {isAuthenticated && user?.plan === 'free' &&
                  filteredResults.length > Number(getFeatureLimit('resultsPerSearch')) && (
                  <div
                    className="mt-12 text-center p-8 border border-black/10 bg-white"
                    style={{ borderRadius: '8px' }}
                  >
                    <div className="w-12 h-12 bg-[#2A9D8F] rounded-full flex items-center justify-center mx-auto mb-4">
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
                    <h3 className="text-lg font-semibold text-black mb-2">
                      Premium Feature
                    </h3>
                    <p className="text-black/60 mb-4">
                      Upgrade to Premium to see{' '}
                      {filteredResults.length - Number(getFeatureLimit('resultsPerSearch'))}{' '}
                      more results
                    </p>
                    <a
                      href="/pricing"
                      className="inline-block bg-[#2A9D8F] text-white px-6 py-2 hover:bg-[#238B7E] transition-colors"
                      style={{ borderRadius: '6px' }}
                    >
                      Upgrade Now
                    </a>
                  </div>
                )}

                {/* Affiliate Disclosure */}
                {!isLoading && results.length > 0 && (
                  <>
                    <p className="mt-6 text-xs text-black/40 text-center">
                      Pick may earn affiliate commissions from purchases. Rankings based on price, not commission amount.
                    </p>
                    <details className="mt-4 border border-black/10 rounded-lg bg-white/50 text-xs text-black/50">
                      <summary className="px-4 py-3 cursor-pointer hover:bg-black/5">
                        Full Disclosure & Legal
                      </summary>
                      <div className="px-4 pb-4 space-y-2">
                        <p>Pick may earn a commission from purchases made through our links.
                           This doesn&apos;t affect prices you pay or how we rank results.</p>
                        <p>Prices shown are current as of the last check from Target API and Google Shopping.
                           Always verify final pricing on retailer sites before purchasing.</p>
                      </div>
                    </details>
                  </>
                )}
              </>
            ) : (
              // Empty state — a failed search is not the same as zero matches
              <div className="text-center py-16">
                <svg
                  className="w-16 h-16 mx-auto text-black/10 mb-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  viewBox="0 0 24 24"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-black mb-2">
                  {searchError
                    ? 'Something went wrong on our end'
                    : <>No results found for &quot;{query}&quot;</>}
                </h3>
                <p className="text-black/50 mb-6">
                  {searchError
                    ? 'Our price check failed — it’s not you. Try again, or search the stores directly below.'
                    : 'Try a different search term, browse popular categories, or search the stores directly below.'}
                </p>
                {searchError && (
                  <button
                    onClick={() => handleSearch(query)}
                    className="mb-8 px-6 py-2.5 rounded-xl bg-[#2A9D8F] text-white text-sm font-medium hover:bg-[#238B7E] transition"
                  >
                    Try again
                  </button>
                )}
                {searchResponse?.retailerSearchLinks?.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs uppercase tracking-wide text-black/40 mb-3">
                      Search &quot;{query}&quot; on
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {searchResponse.retailerSearchLinks.slice(0, 8).map((link: any) => (
                        <a
                          key={link.retailer}
                          href={link.searchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl border border-black/10 text-sm text-black/70 hover:border-[#2A9D8F] hover:text-[#2A9D8F] transition"
                        >
                          {link.retailer} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {!searchError && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Headphones', 'Laptops', 'Running Shoes', 'Skincare', 'Kitchen', 'Watches', 'Backpacks'].map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="px-4 py-2 rounded-xl border border-black/10 text-sm text-black/60 hover:border-[#2A9D8F] hover:text-[#2A9D8F] transition"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Divider */}
        {!hasSearched && (
          <>
            <div className="max-w-5xl mx-auto px-6 py-8">
              <div className="h-px bg-black/10" />
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
                  className="bg-white border border-black/10 p-8"
                  style={{ borderRadius: '8px' }}
                >
                  <div className="differentiator">
                    <h2 className="text-2xl font-semibold mb-4 tracking-tight text-black">
                      Same product, lower price. Plus alternatives you might prefer.
                    </h2>
                    <p className="text-black leading-relaxed mb-4">
                      First, we show you where your exact product costs less. Then we search for{' '}
                      <strong>similar products with comparable reviews</strong> that might save you even more.
                    </p>
                    <p className="text-black/60 leading-relaxed">
                      The best deal is often the same item at a different retailer, but sometimes it's a near-identical alternative you didn't know existed.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Retailers - Compact badges */}
            <section className="max-w-5xl mx-auto px-6 py-12">
              <h3 className="text-sm font-medium text-black mb-4 text-center">We check these stores</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {retailers.map((retailer) => (
                  <span
                    key={retailer}
                    className="px-3 py-1.5 bg-white border border-black/10 rounded-full text-xs text-black/70"
                  >
                    {retailer}
                  </span>
                ))}
              </div>
            </section>

            <div className="max-w-5xl mx-auto px-6 py-4">
              <div className="h-px bg-black/10" />
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
                  <h2 className="text-3xl font-semibold mb-4 tracking-tight text-black">How it works</h2>
                  <p className="text-black/60 mb-12 max-w-sm">
                    We do the comparison shopping so you don&apos;t have to open a dozen browser
                    tabs.
                  </p>

                  <div className="space-y-10">
                    <div className="flex gap-4">
                      <span className="text-sm font-medium text-[#2A9D8F] mt-0.5">01</span>
                      <div>
                        <h3 className="font-medium mb-1.5 text-black">Enter what you&apos;re looking for</h3>
                        <p className="text-sm text-black/60 leading-relaxed">
                          Type a product name, brand, or category. Be as specific or general as you
                          like.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="text-sm font-medium text-[#2A9D8F] mt-0.5">02</span>
                      <div>
                        <h3 className="font-medium mb-1.5 text-black">
                          We check Target directly and aggregate Google Shopping results from various merchants
                        </h3>
                        <p className="text-sm text-black/60 leading-relaxed">
                          Pick queries Target API directly and aggregates results from Google Shopping for
                          current prices and similar products.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="text-sm font-medium text-[#2A9D8F] mt-0.5">03</span>
                      <div>
                        <h3 className="font-medium mb-1.5 text-black">Compare and decide</h3>
                        <p className="text-sm text-black/60 leading-relaxed">
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
                    className="w-full p-6 border border-black/10 bg-white card-hover"
                    style={{ borderRadius: '8px' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[#2A9D8F]/10 flex items-center justify-center">
                        <PickLogo size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-black">Sony WH-1000XM5</p>
                        <p className="text-xs text-black/60">Same product, different prices</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div
                        className="flex justify-between items-center py-2 px-3 bg-black/5"
                        style={{ borderRadius: '4px' }}
                      >
                        <span className="text-sm text-black/60">Amazon</span>
                        <span className="text-sm font-medium text-[#2A9D8F]">$328.00</span>
                      </div>
                      <div
                        className="flex justify-between items-center py-2 px-3 bg-black/5"
                        style={{ borderRadius: '4px' }}
                      >
                        <span className="text-sm text-black/60">Walmart</span>
                        <span className="text-sm font-medium text-black">$348.00</span>
                      </div>
                      <div
                        className="flex justify-between items-center py-2 px-3 bg-black/5"
                        style={{ borderRadius: '4px' }}
                      >
                        <span className="text-sm text-black/60">Best Buy</span>
                        <span className="text-sm font-medium text-black">$349.99</span>
                      </div>
                      <div
                        className="flex justify-between items-center py-2 px-3 bg-black/5"
                        style={{ borderRadius: '4px' }}
                      >
                        <span className="text-sm text-black/60">Target</span>
                        <span className="text-sm font-medium text-black">$349.99</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#2A9D8F] mt-4 font-medium">
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
              className="max-w-5xl mx-auto px-6 py-20 hidden md:block"
            >
              <div
                className="border border-black/10 bg-white p-10 md:p-14"
                style={{ borderRadius: '8px' }}
              >
                <div className="max-w-lg">
                  <h2 className="text-2xl md:text-3xl font-semibold mb-4 tracking-tight text-black">
                    See price comparisons while you shop
                  </h2>
                  <p className="text-black/60 mb-8 leading-relaxed">
                    Install our browser extension. When you visit a product page on any supported
                    retailer, Pick automatically shows you if it&apos;s cheaper somewhere else, or if
                    there&apos;s a better alternative.
                  </p>
                  <button
                    onClick={() => setShowInstallModal(true)}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 bg-[#2A9D8F] text-white font-medium hover:bg-[#238B7E] cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  >
                    <span>Add to Chrome</span>
                    <ArrowRight size={16} className="arrow" />
                  </button>
                  <p className="text-xs text-black/60 mt-4">
                    Free browser extension. Desktop only.
                  </p>
                </div>
              </div>
            </motion.section>
          </>
        )}

        {/* Founder Story */}
        <section className="py-20 px-6 border-t border-black/5">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-heading font-bold text-black mb-6">
              Why I Built Pick
            </h2>
            <div className="text-black/60 space-y-4 text-base leading-relaxed">
              <p>
                I started Pick because I was tired of overpaying for things. Every time I found a product I wanted,
                the price felt too high, and I knew there had to be a better deal somewhere, but I didn't have
                the time to check every single retailer.
              </p>
              <p>
                Even more frustrating was when a product was genuinely out of my budget. Instead of just being
                bummed about it, I wanted a way to find similar products that I'd be just as happy with, but
                at a price I could actually afford.
              </p>
              <p>
                That's what Pick does. It searches across retailers to find you the best price on the exact product
                you want, and helps you discover alternatives you might not have found on your own.
                Save money without settling.
              </p>
            </div>
            <p className="mt-8 text-sm text-black/40">Arjun Shah, Founder</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <PickLogo size={20} />
              <span className="text-sm font-medium text-black">pick</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-black/60">
              <a href="/privacy" className="hover:text-black transition-colors">
                Privacy
              </a>
              <a href="/terms" className="hover:text-black transition-colors">
                Terms
              </a>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Chatbot */}
      <ChatWidget />

      {/* Compare Drawer */}
      {isCompareMode && selectedProducts.length > 0 && (
        <CompareDrawer
          selectedProducts={selectedProducts}
          onRemove={handleRemoveProduct}
          onCompare={handleCompareNow}
          onClose={handleCloseCompareMode}
        />
      )}

      {/* Compare Modal */}
      {showCompareModal && selectedProducts.length === 2 && (
        <CompareModal
          products={[selectedProducts[0], selectedProducts[1]]}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}
