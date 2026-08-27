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
}

export interface RetailerSearchLink {
  retailer: string;
  searchUrl: string;
  logo: string;
}
