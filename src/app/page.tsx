'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Footer from '@/components/Footer';
import { SearchBar } from '@/components/SearchBar';
import ProductCard from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/ProductCardSkeleton';
import { RESULTS_GRID_CLASS } from '@/lib/cardLayout';
import SearchSection from '@/components/SearchSection';
import UnverifiedSellerNote from '@/components/UnverifiedSellerNote';
import CompareDrawer from '@/components/CompareDrawer';
import CompareModal from '@/components/CompareModal';
import { useCompareSelection } from '@/lib/compare/useCompareSelection';
import {
  applyFacets,
  facetCounts as countFacets,
  hasFacetSelection,
  toggleFacet,
  type FacetGroup,
  type FacetKey,
  type SelectedFacets,
} from '@/lib/facets/deriveFacets';
import type { SearchResponse, Product } from '@/lib/types';
import Header from '@/components/Header';
import { TrustedBy } from '@/components/TrustedBy';
import { GlobalMarketplaceSection } from '@/components/GlobalMarketplaceSection';
import ComparisonResult, { type ComparisonResultData } from '@/components/ComparisonResult';
import { enhanceProductsWithGroupInfo } from '@/lib/productGrouping';
import { sortProducts } from '@/lib/sortResults';
import { orderForTrust } from '@/lib/trustOrder';
import { landedCostEnabled } from '@/lib/flags';
import { orderByLandedCost, withLandedCosts } from '@/lib/landedCost/enrich';
import { useFxProvider } from '@/lib/landedCost/useFxProvider';
import { useDestination } from '@/contexts/DestinationContext';
import { getRetailerTrust, hasUnverifiedSeller, isRecognizedSeller } from '@/lib/retailerTrust';
import { affiliateLinksEnabled } from '@/lib/affiliate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useReveal } from '@/lib/motion/useReveal';

// ============================================================================
// HERO COMPARISON DATA: AN ILLUSTRATIVE EXAMPLE, NOT A CAPTURED LIVE RESULT.
//
// This object feeds the comparison card in the first fold, the single most
// important element on the page. Arjun's call on 2026-09-02: show a
// consistent real-world pair at list prices rather than an empty
// placeholder. The pair was swapped on 2026-09-10: the previous one saved
// $70 and its shared words were brand names, so it showed nothing Pick
// does. This one tells the story: the Sony WH-1000XM6 and its cheaper
// twin, the Soundcore Space One, 78% less.
//
// What is real here: both are real products; the prices are their list
// prices, and each is the price of a real listing in Pick's own live
// search on 2026-09-10 (Best Buy for the XM6, Micro Center for the Space
// One); the store, rating and review count on each panel are that
// listing's, counts over a thousand rounded down to the thousand; the
// thumbnails are that search's images. Product names are the canonical
// names rather than Best Buy's "Best Wireless ..." listing title.
//
// What is NOT claimed: that Pick's engine produced this pairing on a live
// page (a live XM6 search returned no Soundcore listing that day), or that
// these prices were checked live (verified stores had the Space One at
// $59.99 to $79.99). Run through the matcher with both searches' results
// together, the Micro Center listing IS a similar pick at 78% less
// (verified store, 4.7 with 3,200 reviews, far under the $458 reference),
// and the "What they share" chips below are exactly the ones it produces:
// specs read from the two items' listing names (src/lib/sharedSpecs.ts),
// pinned by the "landing page pair" test in productGrouping.test.ts.
// Bluetooth multipoint is real on both but appears in no listing name, so
// no chip says it; the battery chip is the lower of the two figures the
// listings quote. With isExample true the card is captioned "Example
// result", the footnote says "at list prices, not a live check", and each
// panel links to a Pick search for that product instead of a retailer
// page.
//
// To swap in a captured live result: search on the site, find a card
// wearing the "Similar pick" chip (that card is `pick`; the top result of
// the same search is `input`), copy both entries out of the
// /api/search-live response (name, price, currency, retailer, url, image,
// rating, reviewCount, sourceMarket), set `sharedSpecs` from the chips
// under "Alternative to", set `checkedAt` from the response, drop the
// intro and payoff lines (they describe this example), and drop isExample.
// Both offers must share a currency or the card shows no saving.
// ============================================================================
const HERO_COMPARISON: ComparisonResultData = {
  isExample: true,
  query: 'sony wh-1000xm6',
  intro:
    "Say you want headphones that cancel noise, last a long time on a charge, and switch between your phone and laptop, and Sony's XM6 caught your eye.",
  input: {
    name: 'Sony WH-1000XM6 Wireless Noise Canceling Headphones',
    price: 459.99,
    currency: 'USD',
    retailer: 'Best Buy',
    url: '/?q=sony%20wh-1000xm6',
    image:
      'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcQEVYaSWLPsP6VSnS2HdhRUodQWypMlUa_Y4ytkEIlqJ5XKZ31A5_buJB8KLdeZO8VVQ1gXinQwiWtReThsaDFNh13qwDuGUHPREz83K5_3',
    rating: 4.5,
    reviewCount: 384,
  },
  pick: {
    name: 'Soundcore by Anker Space One Wireless Noise Canceling Headphones',
    price: 99.99,
    currency: 'USD',
    retailer: 'Micro Center',
    url: '/?q=soundcore%20space%20one',
    image:
      'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcSoyagE6zpRrMUr0UqCqlu8Tqz_MWcnGHCLkLvJc1LemKZ9TAmt8LX9vR05HkwO_eUZwaCQXDgJxWGtAb8Z4wW9EON-yPU0ZmNi4l2L1-msB_CBBazTWrUYbA',
    rating: 4.7,
    reviewCount: 3000,
  },
  // Exactly what the matcher produces for this pair (see the note above
  // and the pinned test); keep the two in step.
  sharedSpecs: ['Over ear', 'Active noise canceling', 'LDAC audio', 'Bluetooth', '30+ hr battery'],
  // {saving} is filled from the two prices above, so it can never drift.
  payoff: 'The features you were shopping for, {saving} less.',
  checkedAt: '2026-09-10T20:29:58.225Z',
};

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
  const { destination } = useDestination();
  const reduceMotion = useReducedMotion();
  const reveal = useReveal();
  const { provider: fxProvider, status: fxStatus } = useFxProvider();
  const [results, setResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Searching retailers...');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResponse, setSearchResponse] = useState<any>(null);
  const [searchError, setSearchError] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);

  // Compare selection: no mode, every card carries a checkbox; the hook
  // owns the picks, the drawer's announcement, the modal, and Escape.
  const compare = useCompareSelection();

  // Filter and sort state. Landed cost is the default sort when the flag is
  // on; 'relevance' stays the flag-off default (characterized behavior).
  const [sortBy, setSortBy] = useState(landedCostEnabled() ? 'total-cost' : 'relevance');
  const [showOnSaleOnly, setShowOnSaleOnly] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  // Result-derived filter chips (type, series, brand, store), OR within a
  // group and AND across groups; the chip list itself comes with the
  // search response.
  const [selectedFacets, setSelectedFacets] = useState<SelectedFacets>({});
  const facets: FacetGroup[] = useMemo(
    () => (Array.isArray(searchResponse?.facets) ? searchResponse.facets : []),
    [searchResponse]
  );
  const facetsActive = hasFacetSelection(selectedFacets);
  const handleFacetToggle = useCallback(
    (key: FacetKey, value: string) => setSelectedFacets((s) => toggleFacet(s, key, value)),
    []
  );
  const handleFacetsClear = useCallback(() => setSelectedFacets({}), []);

  // Cycling loading text
  useEffect(() => {
    if (!isLoading) return;

    const retailers = [
      'Checking Google Shopping...',
      'Comparing prices...',
      'Finding cheaper equivalents...',
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

  const handleSearch = async (searchQuery: string) => {
    setIsLoading(true);
    // A new result set: picks from the previous one must not linger in
    // the drawer, and its chips do not apply to the new results.
    compare.clear();
    setSelectedFacets({});
    setQuery(searchQuery);
    setHasSearched(true);
    setResults([]);
    setSearchError(false);
    setSearchErrorMessage(null);

    try {
      // The shopper's destination adds their local market feed server-side
      // (flag-gated there too); without the flag the param is never sent.
      const destParam = landedCostEnabled()
        ? `&dest=${encodeURIComponent(destination.country)}`
        : '';
      const response = await fetch(
        `/api/search-live?q=${encodeURIComponent(searchQuery)}${destParam}`
      );
      const data: any = await response.json();
      setResults(data.results || []);
      // Even error responses carry retailerSearchLinks we can offer as a fallback
      setSearchResponse(data);
      if (!response.ok || data.error) {
        setSearchError(true);
        // Prefer the server's message (rate limit, source outage) over the
        // generic one, so a 429 doesn't read as "something broke".
        if (typeof data.error === 'string' && data.error) {
          setSearchErrorMessage(data.error);
        }
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

  // Re-run the active search when the destination changes: the destination
  // decides which market feeds the server queries (flag-on only), so a
  // shopper switching to GB gets UK offers into the running results. Also
  // fires when the geo default lands after a search.
  const destCountry = destination.country;
  useEffect(() => {
    if (!landedCostEnabled() || !hasSearched || !query) return;
    handleSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destCountry]);

  // Check for a URL query on mount
  useEffect(() => {
    // Check for query parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    if (queryParam) {
      handleSearch(queryParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extract unique retailers from results
  const resultRetailers = results.length > 0
    ? Array.from(new Set(results.map((p: any) => p.retailer)))
    : [];

  // Filter and sort results. Memoized so the (fairly heavy) group-enhance
  // pass doesn't rerun — and the grid doesn't get new object identities —
  // on unrelated re-renders like compare-mode selection.
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // Apply "On Sale Only" filter
    if (showOnSaleOnly) {
      filtered = filtered.filter(
        (p: Product) => p.originalPrice && p.originalPrice > p.price
      );
    }

    // Apply "Verified sellers only" filter: registered retailers AND
    // registered marketplace platforms count; independent marketplace
    // sellers, unknowns, and flagged sellers don't.
    if (showVerifiedOnly) {
      filtered = filtered.filter((p: Product) =>
        isRecognizedSeller(getRetailerTrust(p.retailer, { market: p.sourceMarket }).level)
      );
    }

    // Facet chips filter here too, before enrichment and sorting, so a
    // narrowed set still ranks and groups exactly like a full one.
    filtered = applyFacets(filtered, selectedFacets);

    if (landedCostEnabled()) {
      // Attach a landed-cost breakdown for the shopper's destination to
      // every offer (per-line provenance and confidence; unknowns stay
      // unknown). The date only feeds rules-staleness warnings. FX starts
      // as the null provider and upgrades once /api/fx delivers ECB rates,
      // which recomputes this memo via the fxProvider dependency.
      filtered = withLandedCosts(filtered, destination, new Date(), fxProvider);
    }

    if (landedCostEnabled() && sortBy === 'total-cost') {
      // Landed-cost ranking: ascending on the honest low estimate, with the
      // top-slot rule (an offer never wins on missing required data).
      filtered = orderByLandedCost(filtered).products;
    } else {
      // Apply sorting (extracted verbatim to sortResults.ts and pinned by
      // characterization tests; behavior must not drift while the
      // landed-cost flag is off)
      filtered = sortProducts(filtered, sortBy);
    }

    // Enhance with product grouping and savings info. The raw results, in
    // source relevance order, seed the same-item clusters and choose the
    // similar-pick reference (the searched item's cluster and its median
    // price), so re-sorting or filtering never changes which listings count
    // as the same item or what the alternatives are compared against.
    // Then the trust rules (lib/trustOrder.ts): Possible scam and bait
    // never lead, new units come before units that are not new, and a
    // verified store's listing of the searched item takes the top slot.
    return orderForTrust(enhanceProductsWithGroupInfo(filtered, results, { query }), sortBy);
  }, [results, query, sortBy, showOnSaleOnly, showVerifiedOnly, selectedFacets, destination, fxProvider]);

  // Each toggle's count is computed against the OTHER active filters, so
  // the number on the button always matches what clicking it would show.
  const saleCount = useMemo(() => {
    const pool = applyFacets(
      showVerifiedOnly
        ? results.filter((p: Product) =>
            isRecognizedSeller(getRetailerTrust(p.retailer, { market: p.sourceMarket }).level)
          )
        : results,
      selectedFacets
    );
    return pool.filter((p: Product) => p.originalPrice && p.originalPrice > p.price).length;
  }, [results, showVerifiedOnly, selectedFacets]);
  const verifiedCount = useMemo(() => {
    const pool = applyFacets(
      showOnSaleOnly
        ? results.filter((p: Product) => p.originalPrice && p.originalPrice > p.price)
        : results,
      selectedFacets
    );
    return pool.filter((p: Product) =>
      isRecognizedSeller(getRetailerTrust(p.retailer, { market: p.sourceMarket }).level)
    ).length;
  }, [results, showOnSaleOnly, selectedFacets]);
  // Chip counts follow the same rule: the pool is the results with the
  // sale and verified toggles applied; each group ignores its own picks.
  const facetCounts = useMemo(() => {
    let pool: Product[] = results;
    if (showOnSaleOnly) pool = pool.filter((p) => p.originalPrice && p.originalPrice > p.price);
    if (showVerifiedOnly) {
      pool = pool.filter((p) =>
        isRecognizedSeller(getRetailerTrust(p.retailer, { market: p.sourceMarket }).level)
      );
    }
    return countFacets(pool, facets, selectedFacets);
  }, [results, facets, showOnSaleOnly, showVerifiedOnly, selectedFacets]);
  // The Unverified badge's standing disclosure appears under the grid only
  // while a card in view carries the badge (never with Verified Only on).
  const showUnverifiedNote = useMemo(() => hasUnverifiedSeller(filteredResults), [filteredResults]);

  return (
    <div className="relative z-10 texture-bg min-h-screen">
      {/* Header */}
      <Header />

      <main id="main-content">
        {/* Hero: the pitch on the left, the proof on the right. The whole
            first fold is about cheaper equivalents; exact-item matching gets
            one supporting line under How it works and nowhere else. */}
        <section className="max-w-5xl mx-auto px-6 pt-12 md:pt-16 pb-10">
          <div className={hasSearched ? '' : 'grid gap-10 lg:grid-cols-12 lg:items-center'}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
              className={hasSearched ? 'max-w-2xl' : 'lg:col-span-6'}
            >
              {/* Hero Text First on Mobile, Search Second */}
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] text-[#14524B] max-w-[16ch]">
                Find a cheaper product.
              </h1>
              <p className="text-lg text-neutral-600 leading-relaxed max-w-xl mt-4 mb-6">
                Type in what you were about to buy. Pick looks for its cheaper twin:{' '}
                <strong className="font-semibold text-neutral-800">
                  a different product with the same key specs, reviews about as good, and a
                  lower price
                </strong>
                , and shows you why they compare. Buy that one instead.
              </p>

              {/* Search Bar */}
              <div className="mt-8">
                <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              </div>

              {/* Quick search hints */}
              {!hasSearched && (
                <div className="mt-6 flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm text-neutral-500">Try:</span>
                  {['AirPods', 'Textbooks', 'Dorm Stuff', 'Skincare Dupes', 'Oversized Hoodie', 'Laptops', 'Mini Dresses'].map(
                    (term) => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="rounded-full bg-gray-100 px-3.5 py-1.5 text-sm text-neutral-700 hover:bg-gray-200 active:scale-[0.97] transition-[background-color,scale] duration-200"
                      >
                        {term}
                      </button>
                    )
                  )}
                </div>
              )}
            </motion.div>

            {/* The proof: one real comparison, above the fold. Data lives in
                HERO_COMPARISON at the top of this file. Hidden once a search
                runs so results take the space. */}
            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                className="lg:col-span-6"
              >
                <ComparisonResult data={HERO_COMPARISON} />
              </motion.div>
            )}
          </div>
        </section>

        {/* How Pick makes money: one prominent line, wording tied to
            affiliateLinksEnabled() so it can't drift from what links do */}
        <div className="border-y border-black/5 bg-[#2A9D8F]/[0.06]">
          <p className="max-w-5xl mx-auto px-6 py-3 text-sm text-neutral-700">
            <span className="font-semibold text-[#14524B]">Pick is free to use.</span>{' '}
            {affiliateLinksEnabled()
              ? 'Retailers pay us a commission when you buy through our links, and results are never ranked by commission.'
              : "Retailer commissions will keep it that way: once our affiliate partnerships go live, we'll earn a commission when you buy through our links. Results are never ranked by commission."}{' '}
            <a href="/compliance" className="underline decoration-black/20 hover:text-[#14524B] transition-colors">
              Full disclosure
            </a>
          </p>
        </div>

        {/* How it works: the page's ONE how-it-works section (two near
            duplicates were merged here on 2026-09-01). Step 2 describes the
            equivalents engine and deliberately does not name the price
            sources; that sentence lives once, on the retailer strip below.
            The footnote is the page's single mention of exact-item matching. */}
        {!hasSearched && (
          <motion.section {...reveal()} id="how-it-works" className="max-w-5xl mx-auto px-6 py-16 md:py-20">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2A9D8F] mb-3">
              How it works
            </p>
            <h2 className="text-center text-3xl font-bold tracking-tight text-neutral-900 mb-3">
              Three steps to the cheaper twin
            </h2>
            <p className="text-center text-black/60 max-w-md mx-auto mb-10">
              We do the comparison shopping so you don&apos;t have to open a dozen browser tabs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  {...reveal(0.1)}
                  className="p-6 text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2A9D8F]/10 text-[#2A9D8F] font-bold text-lg mb-4">
                    1
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Paste or search</h3>
                  <p className="text-sm text-neutral-600">
                    Drop in what you want: a product name, a brand, or a whole category. Be as
                    specific or general as you like.
                  </p>
                </motion.div>
                <motion.div
                  {...reveal(0.18)}
                  className="p-6 text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2A9D8F]/10 text-[#2A9D8F] font-bold text-lg mb-4">
                    2
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-2">We find the cheaper twin</h3>
                  <p className="text-sm text-neutral-600">
                    Pick goes through current listings for a different product that shares the
                    key specs of what you searched, costs well under it, and is reviewed about
                    as well, by enough people to count.
                  </p>
                </motion.div>
                <motion.div
                  {...reveal(0.26)}
                  className="p-6 text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2A9D8F]/10 text-[#2A9D8F] font-bold text-lg mb-4">
                    3
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Compare and decide</h3>
                  <p className="text-sm text-neutral-600">
                    Each pick shows what it shares with the original. Click through to
                    whichever store has it. Move on with your day.
                  </p>
                </motion.div>
            </div>
            <p className="mt-6 text-center text-sm text-neutral-500">
              If the exact item shows up at more than one store, Pick flags the cheapest
              listing while it&apos;s at it.
            </p>
          </motion.section>
        )}

        {/* Retailer strip: the page's one retailer list and one sourcing
            sentence (see the note in TrustedBy.tsx). */}
        {!hasSearched && <TrustedBy />}

        {/* One World, One Marketplace: the landed-cost value prop. Gated on
            the flag because it CLAIMS the capability; it appears the day
            landed costs do, and never on a deployment that lacks them. */}
        {!hasSearched && landedCostEnabled() && <GlobalMarketplaceSection />}

        {/* Results Section */}
        {hasSearched && (
          <section className="max-w-5xl mx-auto px-6 pb-32">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="flex items-center gap-3 text-black/60 mb-4">
                  <div className="w-5 h-5 border-2 border-black/10 border-t-[#2A9D8F] rounded-full spinner" />
                  <span className="text-sm animate-pulse">{loadingText}</span>
                </div>
                {/* Loading skeleton: the same grid and card shell as the
                    results, so nothing reflows when they land. */}
                <div className={`w-full mt-8 ${RESULTS_GRID_CLASS}`}>
                  <ProductGridSkeleton count={8} />
                </div>
              </div>
            ) : results.length > 0 ? (
              <>
                {/* Results header */}
                <div className="mb-6">
                  <h2 className="text-3xl font-bold tracking-tight mb-2 text-neutral-900">
                    Results for &quot;{query}&quot;{' '}
                    <span className="text-lg font-normal text-neutral-500">
                      ({results.length})
                    </span>
                  </h2>
                  <p className="text-sm text-neutral-500 mb-4">
                    {resultRetailers.length > 0 && (
                      <>
                        Across {resultRetailers.slice(0, 5).join(', ')}
                        {resultRetailers.length > 5 && ` and ${resultRetailers.length - 5} more stores`} •{' '}
                      </>
                    )}
                    Prices checked {formatCheckedAt(searchResponse?.checkedAt)}
                    {landedCostEnabled() && (
                      <>
                        {' '}• Totals estimated for delivery to {destination.country}
                        {destination.subdivision &&
                          ` (${destination.subdivision}${destination.postalCode ? ` ${destination.postalCode}` : ''})`}{' '}
                        in {destination.currency}, duties not prepaid unless shown
                      </>
                    )}
                  </p>
                </div>

                {/* Search Section with Filters */}
                <SearchSection
                  resultsCount={filteredResults.length}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  showOnSaleOnly={showOnSaleOnly}
                  onOnSaleToggle={() => setShowOnSaleOnly(!showOnSaleOnly)}
                  showVerifiedOnly={showVerifiedOnly}
                  onVerifiedToggle={() => setShowVerifiedOnly(!showVerifiedOnly)}
                  verifiedCount={verifiedCount}
                  compareCount={compare.selected.length}
                  onCompareClick={compare.openModal}
                  products={filteredResults}
                  saleCount={saleCount}
                  facets={facets}
                  facetCounts={facetCounts}
                  selectedFacets={selectedFacets}
                  onFacetToggle={handleFacetToggle}
                  onFacetsClear={handleFacetsClear}
                />

                {/* A filter is active but nothing qualifies */}
                {(showOnSaleOnly || showVerifiedOnly || facetsActive) && filteredResults.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-black/10 rounded-xl mb-6">
                    <p className="text-sm text-black/60 mb-4">
                      {showVerifiedOnly && !showOnSaleOnly && !facetsActive
                        ? 'None of these results come from a verified major retailer.'
                        : showOnSaleOnly && !showVerifiedOnly && !facetsActive
                          ? "None of these results include sale-price data, so there's nothing to show with this filter on."
                          : 'No results match the active filters.'}
                    </p>
                    <button
                      onClick={() => {
                        setShowOnSaleOnly(false);
                        setShowVerifiedOnly(false);
                        setSelectedFacets({});
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#2A9D8F] text-white text-sm font-medium hover:bg-[#238B7E] transition"
                    >
                      Show all {results.length} results
                    </button>
                  </div>
                )}

                {/* Product grid with stagger animation. A single bad result
                    object degrades to the boundary fallback instead of
                    blanking the whole results view. */}
                <ErrorBoundary>
                  <motion.div
                    variants={gridVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.05 }}
                    className={RESULTS_GRID_CLASS}
                  >
                    {filteredResults.map((product, i) => (
                      // flex so the card stretches to the row height (equal
                      // card heights across a row; the card is h-full).
                      <motion.div key={product.id || i} variants={cardVariants} className="flex">
                        <ProductCard
                          product={product}
                          isSelected={compare.isSelected(product)}
                          onSelect={compare.toggle}
                          fxPending={fxStatus === 'loading'}
                          destinationCountry={destination.country}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </ErrorBoundary>

                {showUnverifiedNote && <UnverifiedSellerNote className="mt-4" />}

                {/* Affiliate Disclosure */}
                {!isLoading && results.length > 0 && (
                  <>
                    <p className="mt-6 text-xs text-black/60 text-center">
                      {affiliateLinksEnabled()
                        ? 'Pick earns a commission from the retailer when you buy through these links. Results are ranked by price and relevance, never by pay.'
                        : "Pick doesn't currently earn commissions from these links. Results are ranked by price and relevance, never by pay."}
                    </p>
                    <details className="mt-4 border border-black/10 rounded-lg bg-white/50 text-xs text-black/50">
                      <summary className="px-4 py-3 cursor-pointer hover:bg-black/5">
                        Full Disclosure & Legal
                      </summary>
                      <div className="px-4 pb-4 space-y-2">
                        {affiliateLinksEnabled() ? (
                          <p>Pick participates in retailer affiliate programs: when you buy through a link
                             on this site, the retailer pays us a commission at no extra cost to you.
                             Commissions never affect which results appear or how they are ranked.</p>
                        ) : (
                          <p>Pick doesn&apos;t currently participate in retailer affiliate programs, so clicking
                             through earns us nothing. If we join affiliate programs in the future, we&apos;ll
                             disclose it here before any commission-earning links go live.</p>
                        )}
                        <p>Prices shown are current as of the last check of Google Shopping.
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
                <p className="text-black/60 mb-6">
                  {searchError
                    ? (searchErrorMessage ??
                        'Our price check failed, and it’s not you. Try again, or search the stores directly below.')
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
                    <p className="text-xs uppercase tracking-wide text-black/60 mb-3">
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

      </main>

      {/* Footer */}
      <Footer />

      {/* Compare tray: appears with the first pick, stays until cleared */}
      {compare.selected.length > 0 && (
        <CompareDrawer
          selectedProducts={compare.selected}
          onRemove={compare.remove}
          onCompare={compare.openModal}
          onClose={compare.clear}
          announcement={compare.announcement}
        />
      )}

      {/* Compare Modal */}
      {compare.showModal && compare.selected.length === 2 && (
        <CompareModal
          products={[compare.selected[0], compare.selected[1]]}
          onClose={compare.closeModal}
        />
      )}
    </div>
  );
}
