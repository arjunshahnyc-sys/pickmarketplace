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
