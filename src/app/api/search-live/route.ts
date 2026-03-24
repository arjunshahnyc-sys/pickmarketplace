import { NextRequest, NextResponse } from 'next/server';
import { cachedSearch } from '@/lib/scrapers';

// CORS headers for extension access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

// Track cache timestamps for "Prices checked X min ago" display
const cacheTimestamps = new Map<string, number>();

interface ProductResult {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  savings?: number;
  currency: string;
  retailer: string;
  url: string;
  imageUrl: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  brand?: string;
  inStock?: boolean;
  alsoAvailableAt?: Array<{ retailer: string; price: number; url: string }>;
}

interface SearchResponse {
  query: string;
  results: ProductResult[];
  totalResults: number;
  sources: string[];
  cachedAt?: string;
  byRetailer: { [key: string]: number };
}

// Rate limiting check
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  const recentRequests = requests.filter((time) => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Main search function using new multi-source API integration
async function performSearch(query: string): Promise<SearchResponse> {
  const cacheKey = query.toLowerCase().trim();

  // Check if this is a cached result
  const existingTimestamp = cacheTimestamps.get(cacheKey);
  const wasRecentlyCached = existingTimestamp && (Date.now() - existingTimestamp) < 30 * 60 * 1000;

  // Call the new cachedSearch function from scrapers.ts
  let products = await cachedSearch(query);

  // CRITICAL: Filter out any products with invalid data before returning
  products = products.filter((p) => {
    // Must have valid price
    if (!p.price || typeof p.price !== 'number' || isNaN(p.price) || p.price <= 0) {
      console.log(`[API Filter] Removing product with invalid price:`, p.name);
      return false;
    }
    // Must have valid name
    if (!p.name || typeof p.name !== 'string' || p.name.trim() === '') {
      console.log(`[API Filter] Removing product with no name`);
      return false;
    }
    return true;
  });

  // If no valid products found, return trending products
  if (products.length === 0) {
    console.log(`[API] No products found for "${query}", returning trending products`);
    products = [
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
        imageUrl: "https://m.media-amazon.com/images/I/71Ii9xjt+oL._AC_SL1500_.jpg",
        retailer: "Target",
        url: "https://www.target.com/s?searchTerm=stanley+quencher",
        rating: 4.8,
        reviewCount: 12000
      },
      {
        id: 'trending-3',
        name: "Sony WH-1000XM5",
        price: 298.00,
        currency: 'USD',
        imageUrl: "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg",
        retailer: "Amazon",
        url: "https://www.amazon.com/s?k=sony+wh1000xm5",
        rating: 4.7,
        reviewCount: 32000
      },
      {
        id: 'trending-4',
        name: "Ninja Creami Ice Cream Maker",
        price: 149.99,
        currency: 'USD',
        imageUrl: "https://m.media-amazon.com/images/I/61nzEWnbk8L._AC_SL1500_.jpg",
        retailer: "Walmart",
        url: "https://www.walmart.com/search?q=ninja+creami",
        rating: 4.6,
        reviewCount: 18000
      }
    ];
  }

  // Update timestamp if this is a fresh search
  if (!wasRecentlyCached) {
    cacheTimestamps.set(cacheKey, Date.now());
  }

  // Extract unique retailer names and count products per retailer
  const retailerCounts: { [key: string]: number } = {};
  const uniqueRetailers = new Set<string>();

  products.forEach((product) => {
    uniqueRetailers.add(product.retailer);
    retailerCounts[product.retailer] = (retailerCounts[product.retailer] || 0) + 1;
  });

  const sources = Array.from(uniqueRetailers);

  // Calculate cachedAt timestamp for display
  const timestamp = cacheTimestamps.get(cacheKey) || Date.now();
  const minutesAgo = Math.floor((Date.now() - timestamp) / (60 * 1000));
  const cachedAt =
    minutesAgo === 0
      ? 'just now'
      : minutesAgo === 1
      ? '1 minute ago'
      : `${minutesAgo} minutes ago`;

  return {
    query,
    results: products as ProductResult[],
    totalResults: products.length,
    sources,
    cachedAt,
    byRetailer: retailerCounts,
  };
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

  // Rate limit check
  if (!checkRateLimit(clientIP)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again in a minute.' },
      { status: 429, headers: corsHeaders }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const results = await performSearch(query.trim());
    return NextResponse.json(results, { headers: corsHeaders });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        query,
        results: [],
        totalResults: 0,
        sources: [],
        cachedAt: 'just now',
        byRetailer: {},
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
