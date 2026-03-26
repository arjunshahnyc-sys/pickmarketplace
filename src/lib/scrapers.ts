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
  lastVerified?: string; // ISO timestamp when price was last verified
}

// User-Agent constants removed - no longer needed for API-based searches

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function guessCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/headphone|earbud|speaker|tv|monitor|laptop|tablet|phone|camera|charger|cable|keyboard|mouse/i.test(lower)) return "Electronics";
  if (/shoe|sneaker|boot|sandal|slipper/i.test(lower)) return "Shoes";
  if (/shirt|dress|jacket|coat|pant|jean|skirt|blouse|sweater|hoodie|top|shorts/i.test(lower)) return "Clothing";
  if (/sofa|lamp|pillow|blanket|candle|rug|curtain|vase|furniture|decor/i.test(lower)) return "Home";
  if (/moisturizer|serum|cream|makeup|lipstick|foundation|perfume|cologne|lotion|skincare/i.test(lower)) return "Beauty";
  if (/pot|pan|knife|blender|air fryer|mixer|toaster|coffee|kitchen/i.test(lower)) return "Kitchen";
  if (/yoga|running|fitness|gym|ball|racket|bike|camping|hiking|outdoor/i.test(lower)) return "Sports";
  if (/toy|lego|doll|game|puzzle/i.test(lower)) return "Toys";
  return "Other";
}

// Amazon scraper removed - HTML scraping gets blocked by bot protection
// To add Amazon support, use an official API or third-party service

// ─── Target ────────────────────────────────────────────────────────────────
export async function searchTarget(query: string): Promise<Product[]> {
  const products: Product[] = [];
  try {
    const apiUrl = `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?key=9f36aeafbe60771e321a7cc95a78140772ab3e96&channel=WEB&count=20&keyword=${encodeURIComponent(query)}&offset=0&page=%2Fs%2F${encodeURIComponent(query)}&pricing_store_id=3991&scheduled_delivery_store_id=3991&store_ids=3991&visitor_id=web`;
    const res = await withTimeout(fetch(apiUrl, { headers: { Accept: "application/json" } }), 8000);
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
          category: guessCategory(name),
          brand: item.item?.primary_brand?.name || name.split(" ")[0],
        });
      }
    }
  } catch {}
  return products;
}

// ─── Best Buy (Official Products API) ─────────────────────────────────────
export async function searchBestBuy(query: string): Promise<Product[]> {
  const products: Product[] = [];
  const apiKey = process.env.BESTBUY_API_KEY;

  // Skip if no API key configured
  if (!apiKey) {
    console.log('[Best Buy] API key not configured, skipping');
    return products;
  }

  try {
    // Best Buy Products API search endpoint
    // Docs: https://developer.bestbuy.com/documentation/products-api
    const searchUrl = `https://api.bestbuy.com/v1/products((search=${encodeURIComponent(query)}))?apiKey=${apiKey}&format=json&show=sku,name,salePrice,regularPrice,image,url,customerReviewAverage,customerReviewCount,manufacturer&pageSize=20`;

    const res = await withTimeout(fetch(searchUrl), 8000);
    const data = await res.json();

    const items = data?.products || [];
    for (const item of items) {
      const name = item.name || "";
      const price = item.salePrice || item.regularPrice || 0;
      const origPrice = item.regularPrice && item.salePrice && item.regularPrice > item.salePrice
        ? item.regularPrice
        : undefined;
      const img = item.image || "";
      const rating = item.customerReviewAverage;
      const reviewCount = item.customerReviewCount;

      if (name && price) {
        products.push({
          name,
          price,
          originalPrice: origPrice,
          image: img,
          retailer: "Best Buy",
          url: item.url || `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(query)}`,
          rating,
          reviewCount,
          category: guessCategory(name),
          brand: item.manufacturer || name.split(" ")[0],
        });
      }
    }
  } catch (error) {
    console.error('[Best Buy API] Search failed:', error);
  }

  return products;
}

// ─── Walmart (Public Search API) ──────────────────────────────────────────
export async function searchWalmart(query: string): Promise<Product[]> {
  const products: Product[] = [];
  try {
    // Walmart's public search API (used by their website)
    // This is a publicly accessible endpoint that returns JSON data
    const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;

    // Use Walmart's typeahead API for better structured data
    const typeaheadUrl = `https://www.walmart.com/typeahead/v3/complete?query=${encodeURIComponent(query)}&type=all`;

    // Try the search page API first
    const apiUrl = `https://www.walmart.com/orchestra/home/graphql/search?query=${encodeURIComponent(query)}&page=1&prg=desktop`;

    const res = await withTimeout(
      fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }),
      8000
    );

    const data = await res.json();

    // Walmart's API response structure varies, try to extract products
    const itemStacks = data?.data?.search?.searchResult?.itemStacks || [];

    for (const stack of itemStacks) {
      const items = stack?.items || [];
      for (const item of items) {
        const name = item?.name || item?.title || "";
        const priceInfo = item?.priceInfo || item?.price;
        const price = priceInfo?.currentPrice?.price || priceInfo?.price || 0;
        const origPrice = priceInfo?.wasPrice || undefined;
        const img = item?.image || item?.imageInfo?.thumbnailUrl || "";
        const rating = item?.averageRating || item?.rating;
        const reviewCount = item?.numberOfReviews || item?.reviewCount;
        const productId = item?.usItemId || item?.id || "";

        if (name && price) {
          products.push({
            name,
            price: typeof price === 'number' ? price : parseFloat(price),
            originalPrice: origPrice ? (typeof origPrice === 'number' ? origPrice : parseFloat(origPrice)) : undefined,
            image: img.startsWith('http') ? img : `https://i5.walmartimages.com${img}`,
            retailer: "Walmart",
            url: productId ? `https://www.walmart.com/ip/${productId}` : `https://www.walmart.com/search?q=${encodeURIComponent(query)}`,
            rating,
            reviewCount,
            category: guessCategory(name),
            brand: item?.brand || name.split(" ")[0],
          });
        }
      }
    }
  } catch (error) {
    console.error('[Walmart API] Search failed:', error);
  }

  return products;
}

// Macy's scraper removed - HTML scraping gets blocked by bot protection

// Google Shopping scraper removed - HTML scraping gets blocked by bot protection

// Fallback products removed - we only return real search results now

// ─── Cached Search: Search across all retailers ──────────────────────────
export async function cachedSearch(query: string): Promise<Product[]> {
  const results = await Promise.allSettled([
    searchTarget(query),
    searchBestBuy(query),
    searchWalmart(query),
  ]);

  const products: Product[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      products.push(...result.value);
    }
  }

  // Add lastVerified timestamp to real products
  const now = new Date().toISOString();
  return products.map(p => ({ ...p, lastVerified: now }));
}
