export interface PriceData {
  retailer: string;
  amount: number;
  url: string;
}

export interface ProductResult {
  id: string;
  name: string;
  imageUrl: string;
  prices: PriceData[];
  lowestPrice: number;
  highestPrice: number;
}

export interface SearchResponse {
  query: string;
  results: ProductResult[];
  totalResults: number;
}

import type { LandedCostBreakdown } from './landedCost/types';

// Types for scraper functions
export interface Product {
  id?: string;
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
  lastVerified?: string;
  /**
   * Google Shopping product id from the feed row. Lets /api/out look up the
   * merchant's real product page when the shopper clicks (lib/outbound.ts).
   */
  googleProductId?: string;
  /**
   * Site-relative /api/out link that resolves the merchant's product page
   * on click. Prefer it over `url` for the outbound href; `url` stays the
   * offer's identity (saved list, trust, rel=sponsored) and the fallback.
   * Absent when the offer keeps its plain link.
   */
  clickUrl?: string;
  /** True for example/deep-link cards shown when live results are thin */
  isFallback?: boolean;
  /**
   * ISO 4217 currency of `price`. Absent = USD (the legacy US feed shape;
   * flag-off responses are US-only and unchanged in meaning).
   */
  currency?: string;
  /**
   * ISO country of the shopping feed this offer came from ('US', 'GB').
   * Absent = US. Merchant-country inference and dedup are scoped by it.
   */
  sourceMarket?: string;
  /**
   * Landed-cost breakdown for the shopper's destination. Attached only when
   * LANDED_COST_ENABLED is on (see lib/landedCost/enrich.ts); absent
   * otherwise and on server-rendered category pages.
   */
  landedCost?: LandedCostBreakdown;
  /**
   * Filter-chip attributes derived from the result set by
   * lib/facets/deriveFacets.ts (product type, recurring series, real brand).
   * Attached by performLiveSearch; absent on older cached responses.
   */
  attributes?: ProductAttributes;
}

export interface ProductAttributes {
  /** Shopper-facing product type, e.g. "Golf Balls". */
  type?: string;
  /** Recurring model or series codes in this listing, e.g. ["Pro V1"]. */
  lines?: string[];
  /** Recurring descriptive phrases, e.g. ["Noise Cancelling"]. */
  features?: string[];
  /** The brand, only when it is a real brand word and not the store. */
  brand?: string;
}

export interface RetailerSearchLink {
  retailer: string;
  searchUrl: string;
  logo: string;
}
