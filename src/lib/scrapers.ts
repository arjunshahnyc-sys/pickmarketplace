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
function isRelevantResult(title: string, query: string): boolean {
  const titleLower = title.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2); // Ignore words <= 2 chars

  if (queryWords.length === 0) return true; // If no meaningful query words, accept all

  const matchingWords = queryWords.filter(word => titleLower.includes(word));
  const matchPercentage = matchingWords.length / queryWords.length;

  return matchPercentage >= 0.5; // At least 50% of query words must appear in title
}

// ─── Google Shopping via Serper.dev API ────────────────────────────────────
export async function searchGoogleShoppingAPI(query: string): Promise<Product[]> {
  const products: Product[] = [];
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.log('[Serper] API key not configured, skipping Google Shopping results');
    return products;
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

    const data = await response.json();
    const items = data?.shopping || [];

    for (const item of items) {
      const name = item.title || "";
      const priceStr = item.price?.replace(/[^0-9.]/g, "") || "0";
      const price = parseFloat(priceStr);
      const retailer = item.source || "Google Shopping";
      const img = item.imageUrl || item.thumbnail || "";
      const rating = item.rating;
      const reviewCount = item.ratingCount;
      const delivery = item.delivery;

      // Relevance filtering: check if product title matches query
      if (!isRelevantResult(name, query)) {
        continue; // Skip irrelevant results
      }

      // Price validation: drop obviously invalid prices
      if (price <= 0 || price > 10000) {
        continue; // Skip products with invalid prices
      }

      if (name) {
        products.push({
          name,
          price,
          image: img,
          retailer,
          url: item.link || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`,
          rating,
          reviewCount,
          category: guessCategory(name),
          brand: guessBrand(name, retailer),
          lastVerified: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('[Serper] API request failed:', error instanceof Error ? error.message : String(error));
  }

  return products;
}

// ─── Target (ONLY WORKING SCRAPER) ────────────────────────────────────────
export async function searchTarget(query: string): Promise<Product[]> {
  const products: Product[] = [];
  try {
    // Use environment variable, fallback to hardcoded key only in development
    const apiKey = process.env.TARGET_API_KEY ||
      (process.env.NODE_ENV === 'development' ? '9f36aeafbe60771e321a7cc95a78140772ab3e96' : '');

    if (!apiKey) {
      console.error('[Target] API key not configured');
      return products;
    }

    const apiUrl = `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?key=${apiKey}&channel=WEB&count=20&keyword=${encodeURIComponent(query)}&offset=0&page=%2Fs%2F${encodeURIComponent(query)}&pricing_store_id=3991&scheduled_delivery_store_id=3991&store_ids=3991&visitor_id=web`;
    const res = await withTimeout(fetch(apiUrl, { headers: HEADERS }), 8000);
    const data = await res.json();

    const items = data?.data?.search?.products || [];
    for (const item of items) {
      const name = item.item?.product_description?.title || "";
      const price = item.price?.formatted_current_price
        ? parseFloat(item.price.formatted_current_price.replace(/[^0-9.]/g, ""))
        : item.price?.current_retail || 0;
      const origPrice = item.price?.reg_retail || undefined;
      const img = item.item?.enrichment?.images?.primary_image_url || "";
      const rating = item.ratings_and_reviews?.statistics?.rating?.average;
      const reviewCount = item.ratings_and_reviews?.statistics?.rating?.count;
      const tcin = item.tcin || "";
      const categoryFromAPI = item.item?.product_classification?.item_type_name || "";

      if (name && price) {
        products.push({
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
    console.error('[Target] API request failed:', error instanceof Error ? error.message : String(error));
  }
  return products;
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
