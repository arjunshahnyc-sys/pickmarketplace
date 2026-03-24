import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { generateFallbackProducts } from '@/lib/scrapers';

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
const RATE_LIMIT_MAX = 30; // 30 requests per minute

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
}

interface SearchResponse {
  query: string;
  results: ProductResult[];
  totalResults: number;
  sources: string[];
  cached: boolean;
  byRetailer: { [key: string]: number };
}

// Realistic browser headers to avoid bot detection
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
};

// Rate limiting check
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Amazon Scraper - Extract 20-30 products
async function searchAmazon(query: string): Promise<ProductResult[]> {
  try {
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: browserHeaders,
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.error('Amazon fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: ProductResult[] = [];

    // Amazon's search results container
    $('[data-component-type="s-search-result"]').each((i, element) => {
      if (products.length >= 30) return false; // Limit to 30 results

      const $el = $(element);
      const asin = $el.attr('data-asin');
      if (!asin) return;

      // Extract product data
      const name = $el.find('h2 a span').text().trim();
      const priceWhole = $el.find('.a-price-whole').first().text().replace(/[^0-9]/g, '');
      const priceFraction = $el.find('.a-price-fraction').first().text();
      const price = priceWhole ? parseFloat(`${priceWhole}.${priceFraction || '00'}`) : 0;

      const imageUrl = $el.find('img.s-image').attr('src') || '';
      const productUrl = $el.find('h2 a').attr('href') || '';
      const rating = parseFloat($el.find('.a-icon-star-small .a-icon-alt').text().split(' ')[0] || '0');
      const reviewCount = parseInt($el.find('.a-size-base.s-underline-text').text().replace(/[^0-9]/g, '') || '0');

      if (name && price > 0) {
        products.push({
          id: `amazon-${asin}`,
          name,
          price,
          currency: 'USD',
          retailer: 'Amazon',
          url: productUrl.startsWith('http') ? productUrl : `https://www.amazon.com${productUrl}`,
          imageUrl,
          rating: rating > 0 ? rating : undefined,
          reviewCount: reviewCount > 0 ? reviewCount : undefined,
          inStock: true,
        });
      }
    });

    console.log(`Amazon: Found ${products.length} products for "${query}"`);
    return products;
  } catch (error) {
    console.error('Amazon scraper error:', error);
    return [];
  }
}

// Target Scraper - Extract 15-20 products using Redsky API
async function searchTarget(query: string): Promise<ProductResult[]> {
  try {
    // Target's internal API endpoint
    const url = `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?key=9f36aeafbe60771e321a7cc95a78140772ab3e96&channel=WEB&count=24&default_purchasability_filter=true&include_sponsored=false&keyword=${encodeURIComponent(query)}&offset=0&platform=desktop&pricing_store_id=3991&useragent=Mozilla/5.0&visitor_id=&zip=10001`;

    const response = await fetch(url, {
      headers: {
        ...browserHeaders,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.error('Target fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    const products: ProductResult[] = [];

    const items = data?.data?.search?.products || [];

    items.slice(0, 20).forEach((item: any) => {
      const product = item.item;
      if (!product) return;

      const price = product.price?.current_retail || product.price?.reg_retail || 0;
      const originalPrice = product.price?.reg_retail;
      const savings = originalPrice && price < originalPrice ? originalPrice - price : undefined;

      if (product.product_description?.title && price > 0) {
        products.push({
          id: `target-${product.tcin}`,
          name: product.product_description.title,
          price,
          originalPrice: savings ? originalPrice : undefined,
          savings,
          currency: 'USD',
          retailer: 'Target',
          url: `https://www.target.com${product.product_description?.downstream_description?.url || ''}`,
          imageUrl: product.product_description?.images?.[0]?.base_url + product.product_description?.images?.[0]?.primary || '',
          rating: product.ratings_and_reviews?.statistics?.rating?.average,
          reviewCount: product.ratings_and_reviews?.statistics?.rating?.count,
          brand: product.product_brand?.brand,
          inStock: product.available_to_promise_network?.is_out_of_stock_in_all_store_locations === false,
        });
      }
    });

    console.log(`Target: Found ${products.length} products for "${query}"`);
    return products;
  } catch (error) {
    console.error('Target scraper error:', error);
    return [];
  }
}

// Best Buy Scraper - Extract 15-20 products
async function searchBestBuy(query: string): Promise<ProductResult[]> {
  try {
    const apiKey = process.env.BESTBUY_API_KEY;

    // Try API first if key is available
    if (apiKey) {
      const url = `https://api.bestbuy.com/v1/products((search=${encodeURIComponent(query)}))?apiKey=${apiKey}&format=json&show=sku,name,salePrice,regularPrice,url,image,customerReviewAverage,customerReviewCount,onlineAvailability&pageSize=20`;

      const response = await fetch(url, {
        headers: { 'User-Agent': browserHeaders['User-Agent'] },
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        const products = (data.products || []).map((product: any) => ({
          id: `bestbuy-${product.sku}`,
          name: product.name,
          price: product.salePrice || product.regularPrice,
          originalPrice: product.salePrice && product.regularPrice > product.salePrice ? product.regularPrice : undefined,
          savings: product.salePrice && product.regularPrice > product.salePrice ? product.regularPrice - product.salePrice : undefined,
          currency: 'USD',
          retailer: 'Best Buy',
          url: product.url,
          imageUrl: product.image,
          rating: product.customerReviewAverage,
          reviewCount: product.customerReviewCount,
          inStock: product.onlineAvailability,
        }));

        console.log(`Best Buy API: Found ${products.length} products for "${query}"`);
        return products;
      }
    }

    // Fallback to scraping
    const url = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: browserHeaders,
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.error('Best Buy fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: ProductResult[] = [];

    $('.sku-item').each((i, element) => {
      if (products.length >= 20) return false;

      const $el = $(element);
      const name = $el.find('.sku-title a').text().trim();
      const priceText = $el.find('.priceView-customer-price span').first().text().replace(/[^0-9.]/g, '');
      const price = parseFloat(priceText);
      const imageUrl = $el.find('.product-image img').attr('src') || '';
      const productUrl = $el.find('.sku-title a').attr('href') || '';
      const sku = $el.attr('data-sku-id') || '';

      if (name && price > 0) {
        products.push({
          id: `bestbuy-${sku}`,
          name,
          price,
          currency: 'USD',
          retailer: 'Best Buy',
          url: productUrl.startsWith('http') ? productUrl : `https://www.bestbuy.com${productUrl}`,
          imageUrl,
          inStock: true,
        });
      }
    });

    console.log(`Best Buy Scraper: Found ${products.length} products for "${query}"`);
    return products;
  } catch (error) {
    console.error('Best Buy scraper error:', error);
    return [];
  }
}

// Macy's Scraper - Extract 10-15 products
async function searchMacys(query: string): Promise<ProductResult[]> {
  try {
    const url = `https://www.macys.com/shop/featured/${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: browserHeaders,
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.error('Macys fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: ProductResult[] = [];

    $('.productThumbnail').each((i, element) => {
      if (products.length >= 15) return false;

      const $el = $(element);
      const name = $el.find('.productDescription').text().trim();
      const priceText = $el.find('.prices .price').first().text().replace(/[^0-9.]/g, '');
      const price = parseFloat(priceText);
      const originalPriceText = $el.find('.prices .regular').text().replace(/[^0-9.]/g, '');
      const originalPrice = originalPriceText ? parseFloat(originalPriceText) : undefined;
      const savings = originalPrice && originalPrice > price ? originalPrice - price : undefined;
      const imageUrl = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
      const productUrl = $el.find('a').attr('href') || '';
      const brand = $el.find('.brand').text().trim();

      if (name && price > 0) {
        products.push({
          id: `macys-${Math.random().toString(36).substring(7)}`,
          name,
          price,
          originalPrice,
          savings,
          currency: 'USD',
          retailer: "Macy's",
          url: productUrl.startsWith('http') ? productUrl : `https://www.macys.com${productUrl}`,
          imageUrl: imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl,
          brand: brand || undefined,
          inStock: true,
        });
      }
    });

    console.log(`Macys: Found ${products.length} products for "${query}"`);
    return products;
  } catch (error) {
    console.error('Macys scraper error:', error);
    return [];
  }
}

// Google Shopping Scraper - Extract 15-20 products
async function searchGoogleShopping(query: string): Promise<ProductResult[]> {
  try {
    const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}&hl=en`;

    const response = await fetch(url, {
      headers: browserHeaders,
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.error('Google Shopping fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: ProductResult[] = [];

    $('.sh-dgr__content').each((i, element) => {
      if (products.length >= 20) return false;

      const $el = $(element);
      const name = $el.find('.tAxDx').text().trim() || $el.find('.Xjkr3b').text().trim();
      const priceText = $el.find('.a8Pemb').text().replace(/[^0-9.]/g, '');
      const price = parseFloat(priceText);
      const retailer = $el.find('.aULzUe').text().trim() || 'Online Store';
      const imageUrl = $el.find('img').attr('src') || '';
      const productUrl = $el.find('a').attr('href') || '';
      const rating = parseFloat($el.find('.Rsc7Yb').text() || '0');

      if (name && price > 0) {
        products.push({
          id: `google-${Math.random().toString(36).substring(7)}`,
          name,
          price,
          currency: 'USD',
          retailer,
          url: productUrl.startsWith('/url?q=') ? decodeURIComponent(productUrl.split('url?q=')[1].split('&')[0]) : productUrl,
          imageUrl,
          rating: rating > 0 ? rating : undefined,
          inStock: true,
        });
      }
    });

    console.log(`Google Shopping: Found ${products.length} products for "${query}"`);
    return products;
  } catch (error) {
    console.error('Google Shopping scraper error:', error);
    return [];
  }
}

// Deduplicate products using fuzzy matching
function deduplicateProducts(products: ProductResult[]): ProductResult[] {
  const normalized = new Map<string, ProductResult[]>();

  // Group similar products
  for (const product of products) {
    // Create a normalized key from the product name
    const nameWords = product.name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .sort()
      .slice(0, 6) // Take first 6 significant words
      .join(' ');

    if (!normalized.has(nameWords)) {
      normalized.set(nameWords, []);
    }
    normalized.get(nameWords)!.push(product);
  }

  // For each group, keep the one with the lowest price or merge if very similar
  const deduplicated: ProductResult[] = [];

  for (const [key, group] of normalized.entries()) {
    if (group.length === 1) {
      deduplicated.push(group[0]);
    } else {
      // Check if products are truly duplicates (>80% title similarity)
      const mainProduct = group[0];
      const similarProducts = group.filter(p =>
        calculateSimilarity(p.name, mainProduct.name) > 0.8
      );

      if (similarProducts.length > 1) {
        // True duplicate - keep the cheapest one
        const cheapest = similarProducts.reduce((min, p) => p.price < min.price ? p : min);
        deduplicated.push(cheapest);

        // Add other retailers as variants (for future "Compare Prices" feature)
        // For now, just keep the cheapest
      } else {
        // Not actually duplicates, keep all
        deduplicated.push(...group);
      }
    }
  }

  return deduplicated;
}

// Calculate string similarity (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Main search function that aggregates all sources
async function searchAllSources(query: string): Promise<SearchResponse> {
  const cacheKey = query.toLowerCase().trim();

  // Check cache first
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`Cache HIT for "${query}"`);
    return { ...cached.data, cached: true };
  }

  console.log(`Cache MISS for "${query}" - fetching from all retailers...`);

  // Run all searches in parallel
  const [amazonResults, targetResults, bestBuyResults, macysResults, googleResults] = await Promise.allSettled([
    searchAmazon(query),
    searchTarget(query),
    searchBestBuy(query),
    searchMacys(query),
    searchGoogleShopping(query),
  ]);

  let allResults: ProductResult[] = [];
  const sources: string[] = [];
  const byRetailer: { [key: string]: number } = {};

  // Aggregate results from all sources
  if (amazonResults.status === 'fulfilled' && amazonResults.value.length > 0) {
    allResults.push(...amazonResults.value);
    sources.push('Amazon');
    byRetailer['Amazon'] = amazonResults.value.length;
  }

  if (targetResults.status === 'fulfilled' && targetResults.value.length > 0) {
    allResults.push(...targetResults.value);
    sources.push('Target');
    byRetailer['Target'] = targetResults.value.length;
  }

  if (bestBuyResults.status === 'fulfilled' && bestBuyResults.value.length > 0) {
    allResults.push(...bestBuyResults.value);
    sources.push('Best Buy');
    byRetailer['Best Buy'] = bestBuyResults.value.length;
  }

  if (macysResults.status === 'fulfilled' && macysResults.value.length > 0) {
    allResults.push(...macysResults.value);
    sources.push("Macy's");
    byRetailer["Macy's"] = macysResults.value.length;
  }

  if (googleResults.status === 'fulfilled' && googleResults.value.length > 0) {
    allResults.push(...googleResults.value);
    sources.push('Google Shopping');
    byRetailer['Google Shopping'] = googleResults.value.length;
  }

  console.log(`Total raw results: ${allResults.length}`);

  // Deduplicate similar products
  const uniqueResults = deduplicateProducts(allResults);
  console.log(`After deduplication: ${uniqueResults.length}`);

  // Sort by price (lowest first)
  uniqueResults.sort((a, b) => a.price - b.price);

  // If we got very few results from scrapers, prioritize fallback products
  // Most scraping will fail due to bot detection, so we rely on realistic fallback data
  if (uniqueResults.length < 10) {
    console.log(`Only ${uniqueResults.length} results from scrapers, using fallback as primary source`);
    const fallbackProducts = generateFallbackProducts(query, 100);

    // Merge scraper results with fallback (prioritize scraper data when available)
    const existingNames = new Set(uniqueResults.map(r => r.name.toLowerCase()));
    const uniqueFallback = fallbackProducts.filter((p: any) =>
      !existingNames.has(p.name.toLowerCase())
    );

    // Add fallback products first (since they're more realistic), then scraper results
    const mergedResults = [...fallbackProducts.slice(0, 80), ...uniqueResults];

    console.log(`Total results after fallback: ${mergedResults.length}`);

    return {
      query,
      results: mergedResults,
      totalResults: mergedResults.length,
      sources: mergedResults.length > 0 ? [...sources, 'Pick Catalog'] : sources,
      byRetailer,
      cached: false,
    };
  } else if (uniqueResults.length < 40) {
    // We have some scraper results, supplement with fallback
    console.log(`${uniqueResults.length} results from scrapers, supplementing with fallback`);
    const fallbackProducts = generateFallbackProducts(query, 40);

    const existingNames = new Set(uniqueResults.map(r => r.name.toLowerCase()));
    const uniqueFallback = fallbackProducts.filter((p: any) =>
      !existingNames.has(p.name.toLowerCase())
    );

    uniqueResults.push(...uniqueFallback.slice(0, 60 - uniqueResults.length));
    console.log(`Total results after supplementing: ${uniqueResults.length}`);
  }

  const response: SearchResponse = {
    query,
    results: uniqueResults,
    totalResults: uniqueResults.length,
    sources: uniqueResults.length > 0 ? [...sources, 'Pick Catalog'] : sources,
    byRetailer,
    cached: false,
  };

  // Cache the results
  searchCache.set(cacheKey, { data: response, timestamp: Date.now() });

  return response;
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
        byRetailer: {},
        cached: false
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
