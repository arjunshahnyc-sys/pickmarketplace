"use client";

import { useState, useEffect, useCallback } from "react";
import Chatbot from "@/components/Chatbot";
import ProductCard from "@/components/ProductCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UsageMeter from "@/components/membership/UsageMeter";
import GatedProductCard from "@/components/gating/GatedProductCard";
import BlurOverlay from "@/components/gating/BlurOverlay";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  retailer: string;
  url: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  brand?: string;
}

const CATEGORIES = ["All", "Electronics", "Clothing", "Shoes", "Home", "Beauty", "Kitchen", "Sports", "Toys"];

export default function Home() {
  const { user, isAuthenticated, searchesRemaining, incrementSearchCount, getFeatureLimit } = useAuth();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("relevance");
  const [retailerFilter, setRetailerFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(20);
  const [totalFound, setTotalFound] = useState(0);

  const retailers = ["All", ...Array.from(new Set(products.map((p) => p.retailer)))];

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Check if user has searches remaining (if authenticated and on free plan)
    if (isAuthenticated && user?.plan === 'free' && searchesRemaining <= 0) {
      setSearchStatus("Daily search limit reached. Upgrade to Premium for unlimited searches.");
      return;
    }

    setLoading(true);
    setProducts([]);
    setVisibleCount(20);
    setSearchStatus("Searching across retailers...");

    try {
      const res = await fetch(`/api/search-live?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setProducts(data.results || []);
      setTotalFound(data.results?.length || 0);
      setSearchStatus("");

      // Increment search count for authenticated free users
      if (isAuthenticated && user?.plan === 'free') {
        incrementSearchCount();
      }
    } catch {
      setSearchStatus("Search took longer than expected. Try again!");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, searchesRemaining, incrementSearchCount]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  let filtered = products;
  if (activeCategory !== "All") {
    filtered = filtered.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());
  }
  if (retailerFilter !== "All") {
    filtered = filtered.filter((p) => p.retailer === retailerFilter);
  }
  if (sortBy === "price-low") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sortBy === "price-high") filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sortBy === "rating") filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // Apply result limits based on plan
  const resultLimit = isAuthenticated ? Number(getFeatureLimit('resultsPerSearch')) : 10;
  const limitedResults = filtered.slice(0, resultLimit);
  const excessResults = filtered.slice(resultLimit);

  const visible = limitedResults.slice(0, visibleCount);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Usage Meter for authenticated users */}
        {isAuthenticated && user?.plan === 'free' && (
          <div className="mb-6 max-w-md">
            <UsageMeter />
          </div>
        )}

        {/* Hero when no search */}
        {products.length === 0 && !loading && (
          <div className="text-center py-20">
            <h2 className="font-heading text-4xl font-bold mb-3">Find the best deal on anything</h2>
            <p className="text-pick-muted text-lg mb-8 max-w-lg mx-auto">
              Search any product and we'll compare prices across Amazon, Target, Best Buy, Macy's, and more.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Running Shoes", "Wireless Earbuds", "Air Fryer", "Winter Jacket", "Laptop Stand", "Skincare Set"].map((term) => (
                <button
                  key={term}
                  onClick={() => { setQuery(term); search(term); }}
                  className="px-4 py-2 bg-white border border-pick-border rounded-full text-sm hover:border-pick-teal hover:text-pick-teal transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div>
            <p className="text-center text-pick-muted mb-6 animate-pulse">{searchStatus}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-pick-border">
                  <div className="skeleton h-40 rounded-lg mb-3" />
                  <div className="skeleton h-4 rounded mb-2 w-3/4" />
                  <div className="skeleton h-4 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && products.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <p className="text-sm text-pick-muted">
                Found <span className="font-semibold text-pick-text">{totalFound}</span> results for &quot;{query}&quot;
              </p>
              <div className="flex items-center gap-3">
                <select
                  value={retailerFilter}
                  onChange={(e) => setRetailerFilter(e.target.value)}
                  className="text-sm border border-pick-border rounded-lg px-3 py-1.5 bg-white"
                >
                  {retailers.map((r) => <option key={r}>{r}</option>)}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-pick-border rounded-lg px-3 py-1.5 bg-white"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                    activeCategory === cat
                      ? "bg-pick-teal text-white"
                      : "bg-white border border-pick-border text-pick-muted hover:border-pick-teal"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visible.map((product, i) => (
                <ProductCard key={`${product.name}-${product.retailer}-${i}`} product={product} />
              ))}
            </div>

            {/* Show upgrade prompt if there are excess results */}
            {excessResults.length > 0 && (
              <div className="mt-8 relative">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 opacity-50 blur-sm pointer-events-none">
                  {excessResults.slice(0, 8).map((product, i) => (
                    <ProductCard key={`locked-${product.name}-${product.retailer}-${i}`} product={product} />
                  ))}
                </div>
                <BlurOverlay message={`Upgrade to Premium to see ${excessResults.length} more results`} />
              </div>
            )}

            {visibleCount < limitedResults.length && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setVisibleCount((c) => c + 20)}
                  className="px-6 py-2.5 bg-pick-teal text-white rounded-full hover:bg-opacity-90 transition text-sm font-medium"
                >
                  Load More ({limitedResults.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <Chatbot onSearch={search} />
    </div>
  );
}
