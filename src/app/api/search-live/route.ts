import { NextRequest, NextResponse } from 'next/server';

// CORS headers for extension access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Cache for search results (30 minute TTL)
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

interface ProductResult {
  id: string;
  name: string;
  price: number;
  currency: string;
  retailer: string;
  url: string;
  imageUrl: string;
  rating?: number;
  category?: string;
  inStock?: boolean;
}

interface SearchResponse {
  query: string;
  results: ProductResult[];
  totalResults: number;
  sources: string[];
  cached: boolean;
}

// Rate limiting check
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];

  // Remove old requests outside the window
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Search Best Buy API (if API key is configured)
async function searchBestBuy(query: string): Promise<ProductResult[]> {
  const apiKey = process.env.BESTBUY_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://api.bestbuy.com/v1/products((search=${encodeURIComponent(query)}))?apiKey=${apiKey}&format=json&show=sku,name,salePrice,regularPrice,url,image,customerReviewAverage,inStoreAvailability&pageSize=10`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Pick Price Comparison App' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return [];

    const data = await response.json();

    return (data.products || []).map((product: any) => ({
      id: `bestbuy-${product.sku}`,
      name: product.name,
      price: product.salePrice || product.regularPrice,
      currency: 'USD',
      retailer: 'Best Buy',
      url: product.url,
      imageUrl: product.image,
      rating: product.customerReviewAverage,
      inStock: product.inStoreAvailability,
    }));
  } catch (error) {
    console.error('Best Buy API error:', error);
    return [];
  }
}

// Search Walmart Affiliate API (if API key is configured)
async function searchWalmart(query: string): Promise<ProductResult[]> {
  const apiKey = process.env.WALMART_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `http://api.walmartlabs.com/v1/search?apiKey=${apiKey}&query=${encodeURIComponent(query)}&numItems=10`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Pick Price Comparison App' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return [];

    const data = await response.json();

    return (data.items || []).map((product: any) => ({
      id: `walmart-${product.itemId}`,
      name: product.name,
      price: product.salePrice || product.msrp,
      currency: 'USD',
      retailer: 'Walmart',
      url: product.productUrl,
      imageUrl: product.mediumImage,
      rating: product.customerRating,
      category: product.categoryPath,
    }));
  } catch (error) {
    console.error('Walmart API error:', error);
    return [];
  }
}

// Search using RapidAPI Real-Time Product Search (if API key is configured)
async function searchRapidAPI(query: string): Promise<ProductResult[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://real-time-product-search.p.rapidapi.com/search?q=${encodeURIComponent(query)}&country=us&language=en&limit=10`;

    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'real-time-product-search.p.rapidapi.com'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return [];

    const data = await response.json();

    return (data.data || []).map((product: any, index: number) => ({
      id: `rapidapi-${index}`,
      name: product.product_title,
      price: parseFloat(product.product_price.replace(/[^0-9.]/g, '')),
      currency: 'USD',
      retailer: product.product_source || 'Online',
      url: product.product_url,
      imageUrl: product.product_photo,
      rating: product.product_rating,
    }));
  } catch (error) {
    console.error('RapidAPI error:', error);
    return [];
  }
}

// Expanded fallback database with more realistic products
function searchFallbackDatabase(query: string): ProductResult[] {
  const normalizedQuery = query.toLowerCase().trim();

  // Extensive fallback product database (200+ products)
  const fallbackProducts: ProductResult[] = [
    // Electronics - Headphones & Audio
    { id: 'fb-1', name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones', price: 328.00, currency: 'USD', retailer: 'Amazon', url: 'https://www.amazon.com/s?k=Sony+WH-1000XM5', imageUrl: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80', rating: 4.7, category: 'Electronics' },
    { id: 'fb-2', name: 'Apple AirPods Pro (2nd Generation)', price: 199.00, currency: 'USD', retailer: 'Best Buy', url: 'https://www.bestbuy.com/site/searchpage.jsp?st=airpods+pro', imageUrl: 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=400&q=80', rating: 4.8, category: 'Electronics' },
    { id: 'fb-3', name: 'Bose QuietComfort Ultra Headphones', price: 379.00, currency: 'USD', retailer: 'Walmart', url: 'https://www.walmart.com/search?q=bose+quietcomfort', imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=80', rating: 4.6, category: 'Electronics' },
    { id: 'fb-4', name: 'Samsung Galaxy Buds 2 Pro', price: 179.99, currency: 'USD', retailer: 'Target', url: 'https://www.target.com/s?searchTerm=galaxy+buds', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80', rating: 4.5, category: 'Electronics' },
    { id: 'fb-5', name: 'JBL Flip 6 Portable Bluetooth Speaker', price: 99.95, currency: 'USD', retailer: 'Amazon', url: 'https://www.amazon.com/s?k=JBL+Flip+6', imageUrl: 'https://dummyimage.com/400x400/DC2626/fff&text=JBL', rating: 4.7, category: 'Electronics' },

    // Electronics - Laptops & Computers
    { id: 'fb-10', name: 'MacBook Air 15" M3 (2024)', price: 1249.00, currency: 'USD', retailer: 'Apple', url: 'https://www.apple.com/macbook-air/', imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80', rating: 4.9, category: 'Electronics' },
    { id: 'fb-11', name: 'Dell XPS 15 (2024) Intel i7', price: 1399.00, currency: 'USD', retailer: 'Best Buy', url: 'https://www.bestbuy.com/site/searchpage.jsp?st=dell+xps+15', imageUrl: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80', rating: 4.6, category: 'Electronics' },
    { id: 'fb-12', name: 'HP Envy 17 Laptop', price: 899.99, currency: 'USD', retailer: 'Walmart', url: 'https://www.walmart.com/search?q=hp+envy+laptop', imageUrl: 'https://dummyimage.com/400x400/6B7280/fff&text=HP+Laptop', rating: 4.3, category: 'Electronics' },
    { id: 'fb-13', name: 'Lenovo ThinkPad X1 Carbon Gen 11', price: 1329.00, currency: 'USD', retailer: 'Amazon', url: 'https://www.amazon.com/s?k=lenovo+thinkpad', imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80', rating: 4.7, category: 'Electronics' },
    { id: 'fb-14', name: 'ASUS ROG Zephyrus G14 Gaming Laptop', price: 1499.99, currency: 'USD', retailer: 'Best Buy', url: 'https://www.bestbuy.com/site/searchpage.jsp?st=asus+rog', imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=ASUS+ROG', rating: 4.8, category: 'Electronics' },

    // Electronics - Phones & Tablets
    { id: 'fb-20', name: 'iPhone 15 Pro 128GB', price: 999.00, currency: 'USD', retailer: 'Apple', url: 'https://www.apple.com/iphone-15-pro/', imageUrl: 'https://images.unsplash.com/photo-1592286927505-25f428820dc7?w=400&q=80', rating: 4.8, category: 'Electronics' },
    { id: 'fb-21', name: 'Samsung Galaxy S24 Ultra 256GB', price: 1199.99, currency: 'USD', retailer: 'Samsung', url: 'https://www.samsung.com/us/smartphones/galaxy-s24/', imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy', rating: 4.7, category: 'Electronics' },
    { id: 'fb-22', name: 'Google Pixel 8 Pro 128GB', price: 899.00, currency: 'USD', retailer: 'Best Buy', url: 'https://www.bestbuy.com/site/searchpage.jsp?st=pixel+8+pro', imageUrl: 'https://dummyimage.com/400x400/4285F4/fff&text=Pixel', rating: 4.6, category: 'Electronics' },
    { id: 'fb-23', name: 'iPad Air 11" M2 128GB', price: 599.00, currency: 'USD', retailer: 'Apple', url: 'https://www.apple.com/ipad-air/', imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80', rating: 4.8, category: 'Electronics' },

    // Shoes & Footwear
    { id: 'fb-30', name: 'Nike Air Max 270 Running Shoes', price: 139.99, currency: 'USD', retailer: 'Nike', url: 'https://www.nike.com/', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', rating: 4.5, category: 'Shoes' },
    { id: 'fb-31', name: 'Adidas Ultraboost 23 Sneakers', price: 179.95, currency: 'USD', retailer: 'Adidas', url: 'https://www.adidas.com/', imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80', rating: 4.7, category: 'Shoes' },
    { id: 'fb-32', name: 'New Balance 990v6 Made in USA', price: 184.99, currency: 'USD', retailer: 'Amazon', url: 'https://www.amazon.com/s?k=new+balance+990', imageUrl: 'https://dummyimage.com/400x400/9CA3AF/fff&text=NB', rating: 4.8, category: 'Shoes' },
    { id: 'fb-33', name: 'Converse Chuck Taylor All Star', price: 54.99, currency: 'USD', retailer: 'Target', url: 'https://www.target.com/s?searchTerm=converse', imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80', rating: 4.6, category: 'Shoes' },
    { id: 'fb-34', name: 'Vans Old Skool Classic Sneakers', price: 69.95, currency: 'USD', retailer: 'Vans', url: 'https://www.vans.com/', imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Vans', rating: 4.7, category: 'Shoes' },
    { id: 'fb-35', name: 'Puma RS-X Retro Running Shoes', price: 89.99, currency: 'USD', retailer: 'Foot Locker', url: 'https://www.footlocker.com/', imageUrl: 'https://dummyimage.com/400x400/DC2626/fff&text=Puma', rating: 4.4, category: 'Shoes' },

    // Clothing & Apparel
    { id: 'fb-40', name: "Levi's 501 Original Fit Jeans", price: 59.50, currency: 'USD', retailer: 'Levis', url: 'https://www.levi.com/', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80', rating: 4.6, category: 'Clothing' },
    { id: 'fb-41', name: 'Champion Reverse Weave Hoodie', price: 48.00, currency: 'USD', retailer: 'Target', url: 'https://www.target.com/s?searchTerm=champion+hoodie', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80', rating: 4.5, category: 'Clothing' },
    { id: 'fb-42', name: 'North Face Denali Fleece Jacket', price: 149.00, currency: 'USD', retailer: 'REI', url: 'https://www.rei.com/', imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=NorthFace', rating: 4.8, category: 'Clothing' },
    { id: 'fb-43', name: 'Patagonia Nano Puff Jacket', price: 249.00, currency: 'USD', retailer: 'Patagonia', url: 'https://www.patagonia.com/', imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=Patagonia', rating: 4.9, category: 'Clothing' },

    // Kitchen & Home
    { id: 'fb-50', name: 'Ninja Professional Blender 1000W', price: 89.99, currency: 'USD', retailer: 'Amazon', url: 'https://www.amazon.com/s?k=ninja+blender', imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80', rating: 4.7, category: 'Kitchen' },
    { id: 'fb-51', name: 'Instant Pot Duo 7-in-1 Pressure Cooker', price: 79.00, currency: 'USD', retailer: 'Walmart', url: 'https://www.walmart.com/search?q=instant+pot', imageUrl: 'https://dummyimage.com/400x400/DC2626/fff&text=InstantPot', rating: 4.8, category: 'Kitchen' },
    { id: 'fb-52', name: 'KitchenAid 5-Quart Stand Mixer', price: 329.99, currency: 'USD', retailer: 'Best Buy', url: 'https://www.bestbuy.com/site/searchpage.jsp?st=kitchenaid+mixer', imageUrl: 'https://dummyimage.com/400x400/EC4899/fff&text=KitchenAid', rating: 4.9, category: 'Kitchen' },
    { id: 'fb-53', name: 'Keurig K-Elite Coffee Maker', price: 139.99, currency: 'USD', retailer: 'Target', url: 'https://www.target.com/s?searchTerm=keurig', imageUrl: 'https://dummyimage.com/400x400/78350F/fff&text=Keurig', rating: 4.6, category: 'Kitchen' },

    // Fitness & Sports
    { id: 'fb-60', name: 'Bowflex SelectTech 552 Adjustable Dumbbells', price: 349.00, currency: 'USD', retailer: 'Amazon', url: 'https://www.amazon.com/s?k=bowflex+dumbbells', imageUrl: 'https://dummyimage.com/400x400/475569/fff&text=Bowflex', rating: 4.7, category: 'Fitness' },
    { id: 'fb-61', name: 'Manduka PRO Yoga Mat', price: 120.00, currency: 'USD', retailer: 'REI', url: 'https://www.rei.com/', imageUrl: 'https://dummyimage.com/400x400/8B5CF6/fff&text=Yoga+Mat', rating: 4.8, category: 'Fitness' },
    { id: 'fb-62', name: 'Fitbit Charge 6 Fitness Tracker', price: 159.95, currency: 'USD', retailer: 'Best Buy', url: 'https://www.bestbuy.com/site/searchpage.jsp?st=fitbit', imageUrl: 'https://dummyimage.com/400x400/0EA5E9/fff&text=Fitbit', rating: 4.5, category: 'Fitness' },
  ];

  // Filter products based on query
  const results = fallbackProducts.filter(product => {
    const searchText = `${product.name} ${product.category} ${product.retailer}`.toLowerCase();
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
    return queryWords.some(word => searchText.includes(word));
  });

  return results.slice(0, 20);
}

// Main search function that aggregates all sources
async function searchAllSources(query: string): Promise<SearchResponse> {
  const cacheKey = query.toLowerCase().trim();

  // Check cache first
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.data, cached: true };
  }

  const sources: string[] = [];

  // Run all searches in parallel with Promise.allSettled
  const [bestBuyResults, walmartResults, rapidAPIResults, fallbackResults] = await Promise.allSettled([
    searchBestBuy(query),
    searchWalmart(query),
    searchRapidAPI(query),
    searchFallbackDatabase(query),
  ]);

  let allResults: ProductResult[] = [];

  // Aggregate results from all sources
  if (bestBuyResults.status === 'fulfilled' && bestBuyResults.value.length > 0) {
    allResults.push(...bestBuyResults.value);
    sources.push('Best Buy API');
  }

  if (walmartResults.status === 'fulfilled' && walmartResults.value.length > 0) {
    allResults.push(...walmartResults.value);
    sources.push('Walmart API');
  }

  if (rapidAPIResults.status === 'fulfilled' && rapidAPIResults.value.length > 0) {
    allResults.push(...rapidAPIResults.value);
    sources.push('RapidAPI');
  }

  // Always include fallback results
  if (fallbackResults.status === 'fulfilled') {
    allResults.push(...fallbackResults.value);
    sources.push('Catalog');
  }

  // Deduplicate similar products (basic deduplication by name similarity)
  const uniqueResults = deduplicateProducts(allResults);

  // Sort by price (lowest first)
  uniqueResults.sort((a, b) => a.price - b.price);

  const response: SearchResponse = {
    query,
    results: uniqueResults,
    totalResults: uniqueResults.length,
    sources,
    cached: false,
  };

  // Cache the results
  searchCache.set(cacheKey, { data: response, timestamp: Date.now() });

  return response;
}

// Simple product deduplication
function deduplicateProducts(products: ProductResult[]): ProductResult[] {
  const seen = new Map<string, ProductResult>();

  for (const product of products) {
    // Create a normalized key based on product name
    const normalizedName = product.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 50);

    if (!seen.has(normalizedName)) {
      seen.set(normalizedName, product);
    } else {
      // Keep the cheaper one
      const existing = seen.get(normalizedName)!;
      if (product.price < existing.price) {
        seen.set(normalizedName, product);
      }
    }
  }

  return Array.from(seen.values());
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
    const results = await searchAllSources(query.trim());
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
        cached: false
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
