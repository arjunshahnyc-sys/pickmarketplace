import { Product, RetailerSearchLink } from "./types";

// Price sources for live search.
//
// One source today: Google Shopping results through the Serper.dev API
// (searchGoogleShoppingAPI). Pick does not scrape retailer websites. The
// direct Target call (an internal target.com endpoint) was removed on
// 2026-10-03: Target's site terms bar automated access, and it returned a
// bot challenge on every request. Official sources that could be added,
// with their access rules and terms, are compared in eval/PLAN.md.

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

// Words that never decide relevance on their own.
const RELEVANCE_FILLER = new Set(['the', 'and', 'for', 'with', 'from', 'edition']);

// One spelling per meaning, so a title that abbreviates still matches the
// query that spells it out (and the reverse): "Active Noise Cancellation"
// and "ANC", "T-shirt" and "Tee", "Refrigerator" and "Fridge". Live
// searches on 2026-09-22 lost real listings to each of these.
function relevanceText(text: string): string {
  return ` ${text.toLowerCase()} `
    .replace(/\b(?:active\s+)?noise[\s-]*cancel+(?:ing|ation|ed|ers?)?\b/g, ' anc ')
    .replace(/\bt[\s-]?shirts?\b/g, ' tee ')
    .replace(/\brefrigerators?\b/g, ' fridge ');
}

// A model or part number in the query ("wh-1000xm5", "k87", "af141"):
// letters and digits together, not a size ("16oz") or an ordinal ("4th").
function queryModelNumbers(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter(
      (t) =>
        t.length >= 3 &&
        /[a-z]/.test(t) &&
        /\d/.test(t) &&
        !/^\d+(?:st|nd|rd|th)$/.test(t) &&
        !/^\d+(?:oz|ml|g|kg|lb|lbs|gb|tb|qt|w|in|ft|mm|cm|pk|ct|hr|hrs|mah|hz)$/.test(t)
    );
}

/** Exported for tests. */
export function isRelevantResult(title: string, query: string): boolean {
  // A title carrying the query's model number is the product asked for,
  // however few of the query's other words it repeats ("K87 Tee - Navy").
  const titleAlnum = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (queryModelNumbers(query).some((model) => titleAlnum.includes(model))) return true;

  const titleText = relevanceText(title);
  const queryWords = relevanceText(coreProductQuery(query))
    .split(/\s+/)
    .filter((word) => word.length > 2 && !RELEVANCE_FILLER.has(word));

  if (queryWords.length === 0) return true; // If no meaningful query words, accept all

  // Match singular/plural variants: "laptops" should match a title saying "laptop"
  const matchingWords = queryWords.filter(word => {
    if (titleText.includes(word)) return true;
    const singular = word.replace(/(ses|xes|zes|ches|shes)$/, (m) => m.slice(0, -2)).replace(/s$/, '');
    return singular.length > 2 && titleText.includes(singular);
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
// returns the first (lowest) number in the string. Handles every feed
// market's format (probed live 2026-08-27: hl:'en' yields "€217.89",
// "¥35,343" — dot decimals, comma thousands, everywhere). Exported for the
// per-market format tests.
export function parseFirstPrice(priceStr: string | undefined | null): number {
  const match = priceStr?.match(/\d+(?:,\d{3})*(?:\.\d+)?/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
}

/** Distinguishes "the source failed" from "the source found nothing". */
export interface ScraperResult {
  products: Product[];
  sourceError?: string;
}

// ─── Google Shopping via Serper.dev API ────────────────────────────────────

/**
 * Shopping-feed markets the pipeline can query. Each market's feed prices
 * in its own currency; adding a market means adding it here after PROBING
 * its live price format (all markets verified 2026-08-27: Serper with
 * hl:'en' returns dot-decimal English formatting everywhere, e.g.
 * "€217.89", "¥35,343", so parseFirstPrice handles every feed). maxPrice
 * is the junk-price ceiling in the market's own currency: the legacy
 * 10,000 bound would drop nearly every JPY offer.
 */
export const FEED_MARKETS = {
  us: { gl: 'us', country: 'US', currency: 'USD', maxPrice: 10_000 },
  gb: { gl: 'gb', country: 'GB', currency: 'GBP', maxPrice: 10_000 },
  de: { gl: 'de', country: 'DE', currency: 'EUR', maxPrice: 10_000 },
  fr: { gl: 'fr', country: 'FR', currency: 'EUR', maxPrice: 10_000 },
  ca: { gl: 'ca', country: 'CA', currency: 'CAD', maxPrice: 15_000 },
  au: { gl: 'au', country: 'AU', currency: 'AUD', maxPrice: 15_000 },
  jp: { gl: 'jp', country: 'JP', currency: 'JPY', maxPrice: 2_000_000 },
} as const;
export type FeedMarket = keyof typeof FEED_MARKETS;

export async function searchGoogleShoppingAPI(
  query: string,
  market: FeedMarket = 'us'
): Promise<ScraperResult> {
  const products: Product[] = [];
  const apiKey = process.env.SERPER_API_KEY;
  const marketInfo = FEED_MARKETS[market];

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
          gl: marketInfo.gl,
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

      // Price validation: drop obviously invalid prices (ceiling is
      // per-market currency, see FEED_MARKETS)
      if (price <= 0 || price > marketInfo.maxPrice) {
        continue; // Skip products with invalid prices
      }

      if (name) {
        // Build direct retailer URL instead of using Google intermediary
        // link. US market only: the deep-link builders point at .com US
        // storefronts, which would be the WRONG store for another market's
        // merchant (Amazon.co.uk must not deep-link to amazon.com).
        const directUrl = market === 'us' ? buildDirectRetailerUrl(retailer, name) : null;
        const productUrl = directUrl || item.link || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;

        products.push({
          // Stable identity so React keys don't fall back to array index.
          // Non-US ids carry the market so the same listing name in two
          // markets stays two offers; US ids keep their legacy shape.
          id: (market === 'us'
            ? `serper:${retailer}:${name}`
            : `serper:${market}:${retailer}:${name}`
          ).toLowerCase(),
          name,
          price,
          currency: marketInfo.currency,
          sourceMarket: marketInfo.country,
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
