import { Product, RetailerSearchLink } from "./types";

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * TODO: Migrate to Official Retail APIs
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Current implementation: Only Target API works via official JSON endpoint.
 * All other scrapers have been removed as they fail in production (bot protection,
 * JS rendering requirements, frequent HTML changes).
 *
 * Recommended API integrations for production:
 *
 * 1. Best Buy Products API
 *    - https://developer.bestbuy.com/
 *    - FREE tier: 50,000 requests/day
 *    - Requires API key (signup at developer.bestbuy.com)
 *    - Reliable JSON responses with product details, pricing, availability
 *
 * 2. Walmart Affiliate API
 *    - https://developer.walmart.com/
 *    - FREE for approved affiliates via Impact Radius partnership
 *    - Requires affiliate approval + API key
 *    - Full product catalog access with real-time pricing
 *
 * 3. Amazon Product Advertising API (PA-API 5.0)
 *    - https://affiliate-program.amazon.com/assoc_credentials/home
 *    - Requires Amazon Associates account + 3 qualifying sales in first 180 days
 *    - Rate limit: 1 request/second (scales with revenue)
 *    - Access Key + Secret Key + Associate Tag required
 *
 * 4. SerpAPI Google Shopping
 *    - https://serpapi.com/google-shopping-api
 *    - $50/month for 5,000 searches (~$0.01/search)
 *    - More reliable than scraping Google directly
 *    - Returns structured JSON with prices, ratings, merchant info
 *
 * 5. Keepa API (Amazon price tracking & history)
 *    - https://keepa.com/#!api
 *    - ~$21/month for 200,000 tokens
 *    - Historical price data for Amazon products
 *    - Great for "price drop" alerts and price history charts
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent": UA,
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

const KNOWN_BRANDS = [
  "Apple", "Samsung", "Sony", "Nike", "Adidas", "Bose", "LG", "Dell", "HP", "Lenovo",
  "Nintendo", "Microsoft", "Google", "Dyson", "KitchenAid", "Ninja", "Stanley",
  "Asus", "Acer", "Canon", "Nikon", "JBL", "Beats", "Roku", "Amazon", "TCL",
  "Vizio", "Hisense", "Philips", "Panasonic", "GE", "Whirlpool", "Frigidaire",
  "Cuisinart", "Hamilton Beach", "Black+Decker", "DeWalt", "Ryobi", "Makita",
  "Bosch", "Under Armour", "Puma", "Reebok", "New Balance", "Asics", "Vans",
  "Converse", "Timberland", "North Face", "Patagonia", "Columbia", "Carhartt",
  "Levi's", "Calvin Klein", "Tommy Hilfiger", "Ralph Lauren", "Gap", "Old Navy",
];

function guessBrand(name: string, retailer: string): string {
  const upperName = name.toUpperCase();
  for (const brand of KNOWN_BRANDS) {
    if (upperName.includes(brand.toUpperCase())) {
      return brand;
    }
  }
  // If no known brand found, use retailer name
  return retailer;
}

function guessCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/headphone|earbud|speaker|tv|monitor|laptop|tablet|phone|camera|charger|cable|keyboard|mouse|gaming|console|playstation|xbox|nintendo/i.test(lower)) return "Electronics";
  if (/shoe|sneaker|boot|sandal|slipper|footwear/i.test(lower)) return "Shoes";
  if (/shirt|dress|jacket|coat|pant|jean|skirt|blouse|sweater|hoodie|top|shorts|clothing|apparel/i.test(lower)) return "Clothing";
  if (/sofa|lamp|pillow|blanket|candle|rug|curtain|vase|furniture|decor|bed|mattress|chair|table/i.test(lower)) return "Home";
  if (/moisturizer|serum|cream|makeup|lipstick|foundation|perfume|cologne|lotion|skincare|beauty|cosmetic/i.test(lower)) return "Beauty";
  if (/pot|pan|knife|blender|air fryer|mixer|toaster|coffee|kitchen|cookware|appliance/i.test(lower)) return "Kitchen";
  if (/yoga|running|fitness|gym|ball|racket|bike|camping|hiking|outdoor|sports|exercise|workout/i.test(lower)) return "Sports";
  if (/toy|lego|doll|game|puzzle|kids|children|baby/i.test(lower)) return "Toys";
  return "Other";
}

// ─── Relevance Filtering Helper ────────────────────────────────────────
// Price/quality modifiers ("under $50", "best rated", "on sale") never appear
// in product titles, so they must not count against the title-match ratio —
// with them included, the app's own refinement chips produced queries that
// rejected nearly every result.
function coreProductQuery(query: string): string {
  const stripped = query
    .toLowerCase()
    .replace(/\b(?:under|over|below|above|around)\s*\$?\d+(?:\.\d+)?\b/g, ' ')
    .replace(/\$\d+(?:\.\d+)?/g, ' ')
    .replace(/\b(?:cheap|cheapest|best rated|top rated|on sale|deals?|discount(?:ed)?|for students?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || query;
}

function isRelevantResult(title: string, query: string): boolean {
  const titleLower = title.toLowerCase();
  const queryWords = coreProductQuery(query).split(/\s+/).filter(word => word.length > 2); // Ignore words <= 2 chars

  if (queryWords.length === 0) return true; // If no meaningful query words, accept all

  // Match singular/plural variants: "laptops" should match a title saying "laptop"
  const matchingWords = queryWords.filter(word => {
    if (titleLower.includes(word)) return true;
    const singular = word.replace(/(ses|xes|zes|ches|shes)$/, (m) => m.slice(0, -2)).replace(/s$/, '');
    return singular.length > 2 && titleLower.includes(singular);
  });
  const matchPercentage = matchingWords.length / queryWords.length;

  return matchPercentage >= 0.5; // At least 50% of query words must appear in title
}

// ─── Direct Retailer Search URL Builder ────────────────────────────────
/**
 * Maps a retailer source name to a direct search URL for a product.
 * This avoids Google intermediary pages and sends users directly to the retailer.
 */
// Word-boundary patterns, not substring includes: with loose matching,
// unrelated merchants were rewritten to the wrong store ('CVS Pharmacy'
// contains 'macy' → macys.com, '1-800-Flowers.com' contains 'lowe' →
// lowes.com, 'Kohler' contains 'kohl' → kohls.com).
const RETAILER_SEARCH_URLS: Array<{
  pattern: RegExp;
  build: (encodedTitle: string) => string;
}> = [
  { pattern: /\bamazon\b/, build: (t) => `https://www.amazon.com/s?k=${t}` },
  { pattern: /\bwalmart\b/, build: (t) => `https://www.walmart.com/search?q=${t}` },
  { pattern: /\bbest ?buy\b/, build: (t) => `https://www.bestbuy.com/site/searchpage.jsp?st=${t}` },
  { pattern: /\btarget\b/, build: (t) => `https://www.target.com/s?searchTerm=${t}` },
  { pattern: /\bmacy'?s\b/, build: (t) => `https://www.macys.com/shop/search?keyword=${t}` },
  { pattern: /\bebay\b/, build: (t) => `https://www.ebay.com/sch/i.html?_nkw=${t}` },
  { pattern: /\bnordstrom\b/, build: (t) => `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${t}` },
  { pattern: /\bhome ?depot\b/, build: (t) => `https://www.homedepot.com/s/${t}` },
  { pattern: /\blowe'?s\b/, build: (t) => `https://www.lowes.com/search?searchTerm=${t}` },
  { pattern: /\bcostco\b/, build: (t) => `https://www.costco.com/CatalogSearch?keyword=${t}` },
  { pattern: /\bwayfair\b/, build: (t) => `https://www.wayfair.com/keyword.php?keyword=${t}` },
  { pattern: /\betsy\b/, build: (t) => `https://www.etsy.com/search?q=${t}` },
  { pattern: /\bnike\b/, build: (t) => `https://www.nike.com/w?q=${t}` },
  { pattern: /\bkohl'?s\b/, build: (t) => `https://www.kohls.com/search.jsp?submit-search=web-regular&search=${t}` },
];

function buildDirectRetailerUrl(retailerSource: string, productTitle: string): string | null {
  const retailerLower = retailerSource.toLowerCase();
  const match = RETAILER_SEARCH_URLS.find(({ pattern }) => pattern.test(retailerLower));
  return match ? match.build(encodeURIComponent(productTitle)) : null;
}

// "$15.99 - $29.99" must parse as 15.99, not parseFloat('15.9929.99');
// returns the first (lowest) number in the string.
function parseFirstPrice(priceStr: string | undefined | null): number {
  const match = priceStr?.match(/\d+(?:,\d{3})*(?:\.\d+)?/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
}

/** Distinguishes "the source failed" from "the source found nothing". */
export interface ScraperResult {
  products: Product[];
  sourceError?: string;
}

// ─── Google Shopping via Serper.dev API ────────────────────────────────────
export async function searchGoogleShoppingAPI(query: string): Promise<ScraperResult> {
  const products: Product[] = [];
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.log('[Serper] API key not configured, skipping Google Shopping results');
    return { products, sourceError: 'Serper API key not configured' };
  }

  try {
    const response = await withTimeout(
      fetch('https://google.serper.dev/shopping', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          gl: 'us',
          hl: 'en',
          num: 30, // Increased from 20 to get more results before filtering
        }),
      }),
      8000
    );

    // Serper returns auth/quota failures (401/403/429) as JSON bodies that
    // would otherwise parse cleanly into zero results and look like a
    // genuine no-match.
    if (!response.ok) {
      console.error(`[Serper] API returned ${response.status}`);
      return { products, sourceError: `Serper API returned ${response.status}` };
    }

    const data = await response.json();
    const items = data?.shopping || [];

    for (const item of items) {
      const name = item.title || "";
      const price = parseFirstPrice(item.price);
      const retailer = item.source || "Google Shopping";
      const img = item.imageUrl || item.thumbnail || "";
      const rating = item.rating;
      const reviewCount = item.ratingCount;

      // Relevance filtering: check if product title matches query
      if (!isRelevantResult(name, query)) {
        continue; // Skip irrelevant results
      }

      // Price validation: drop obviously invalid prices
      if (price <= 0 || price > 10000) {
        continue; // Skip products with invalid prices
      }

      if (name) {
        // Build direct retailer URL instead of using Google intermediary link
        const directUrl = buildDirectRetailerUrl(retailer, name);
        const productUrl = directUrl || item.link || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;

        products.push({
          // Stable identity so React keys don't fall back to array index
          id: `serper:${retailer}:${name}`.toLowerCase(),
          name,
          price,
          image: img,
          retailer,
          url: productUrl,
          rating,
          reviewCount,
          category: guessCategory(name),
          brand: guessBrand(name, retailer),
          lastVerified: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Serper] API request failed:', message);
    return { products, sourceError: `Serper request failed: ${message}` };
  }

  return { products };
}

// ─── Target (ONLY WORKING SCRAPER) ────────────────────────────────────────
export async function searchTarget(query: string): Promise<ScraperResult> {
  const products: Product[] = [];
  try {
    const apiKey = process.env.TARGET_API_KEY || '';

    if (!apiKey) {
      console.error('[Target] API key not configured');
      return { products, sourceError: 'Target API key not configured' };
    }

    const apiUrl = `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?key=${apiKey}&channel=WEB&count=20&keyword=${encodeURIComponent(query)}&offset=0&page=%2Fs%2F${encodeURIComponent(query)}&pricing_store_id=3991&scheduled_delivery_store_id=3991&store_ids=3991&visitor_id=web`;
    const res = await withTimeout(fetch(apiUrl, { headers: HEADERS }), 8000);
    if (!res.ok) {
      console.error(`[Target] API returned ${res.status}`);
      return { products, sourceError: `Target API returned ${res.status}` };
    }
    const data = await res.json();

    const items = data?.data?.search?.products || [];
    for (const item of items) {
      const name = item.item?.product_description?.title || "";
      const price = item.price?.formatted_current_price
        ? parseFirstPrice(item.price.formatted_current_price)
        : item.price?.current_retail || 0;
      const origPrice = item.price?.reg_retail || undefined;
      const img = item.item?.enrichment?.images?.primary_image_url || "";
      const rating = item.ratings_and_reviews?.statistics?.rating?.average;
      const reviewCount = item.ratings_and_reviews?.statistics?.rating?.count;
      const tcin = item.tcin || "";
      const categoryFromAPI = item.item?.product_classification?.item_type_name || "";

      if (name && price) {
        products.push({
          id: tcin ? `target:${tcin}` : `target:${name.toLowerCase()}`,
          name,
          price,
          originalPrice: origPrice && origPrice > price ? origPrice : undefined,
          image: img,
          retailer: "Target",
          url: `https://www.target.com/p/-/A-${tcin}`,
          rating,
          reviewCount,
          category: categoryFromAPI || guessCategory(name),
          brand: item.item?.primary_brand?.name || guessBrand(name, "Target"),
          lastVerified: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Target] API request failed:', message);
    return { products, sourceError: `Target request failed: ${message}` };
  }
  return { products };
}

// ─── Retailer Deep Links ────────────────────────────────────────────────
// Provides direct search links to retailer websites with proper brand colors
export function buildRetailerDeepLinks(query: string): RetailerSearchLink[] {
  const encodedQuery = encodeURIComponent(query);

  return [
    {
      retailer: "Amazon",
      searchUrl: `https://www.amazon.com/s?k=${encodedQuery}`,
      logo: "#FF9900", // Amazon orange
    },
    {
      retailer: "Best Buy",
      searchUrl: `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedQuery}`,
      logo: "#0046BE", // Best Buy blue
    },
    {
      retailer: "Walmart",
      searchUrl: `https://www.walmart.com/search?q=${encodedQuery}`,
      logo: "#0071CE", // Walmart blue
    },
    {
      retailer: "Target",
      searchUrl: `https://www.target.com/s?searchTerm=${encodedQuery}`,
      logo: "#CC0000", // Target red
    },
    {
      retailer: "Macy's",
      searchUrl: `https://www.macys.com/shop/search?keyword=${encodedQuery}`,
      logo: "#E21A2C", // Macy's red
    },
    {
      retailer: "Google Shopping",
      searchUrl: `https://www.google.com/search?tbm=shop&q=${encodedQuery}`,
      logo: "#4285F4", // Google blue
    },
  ];
}
