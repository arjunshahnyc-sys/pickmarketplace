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

// Types for scraper functions
export interface Product {
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
}

export interface RetailerSearchLink {
  retailer: string;
  searchUrl: string;
  logo: string;
}
