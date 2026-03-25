import * as cheerio from "cheerio";

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
  isFallback?: boolean; // True if this is example/demo data, not real scraped data
  lastVerified?: string; // ISO timestamp when price was last verified
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

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

// ─── Amazon ────────────────────────────────────────────────────────────────
export async function searchAmazon(query: string): Promise<Product[]> {
  const products: Product[] = [];
  try {
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
    const res = await withTimeout(fetch(url, { headers: HEADERS }), 8000);
    const html = await res.text();
    const $ = cheerio.load(html);

    $('[data-component-type="s-search-result"]').each((_, el) => {
      const name = $(el).find("h2 a span").text().trim();
      const priceWhole = $(el).find(".a-price .a-price-whole").first().text().replace(/[^0-9]/g, "");
      const priceFraction = $(el).find(".a-price .a-price-fraction").first().text().replace(/[^0-9]/g, "");
      const img = $(el).find("img.s-image").attr("src") || "";
      const link = $(el).find("h2 a").attr("href") || "";
      const ratingText = $(el).find(".a-icon-alt").first().text();
      const reviewText = $(el).find('[aria-label*="stars"] + span, .a-size-base.s-underline-text').first().text();
      const oldPrice = $(el).find(".a-price.a-text-price .a-offscreen").first().text().replace(/[^0-9.]/g, "");

      if (name && priceWhole) {
        const price = parseFloat(`${priceWhole}.${priceFraction || "00"}`);
        const rating = ratingText ? parseFloat(ratingText) : undefined;
        const reviewCount = reviewText ? parseInt(reviewText.replace(/[^0-9]/g, ""), 10) || undefined : undefined;

        products.push({
          name,
          price,
          originalPrice: oldPrice ? parseFloat(oldPrice) : undefined,
          image: img,
          retailer: "Amazon",
          url: link.startsWith("http") ? link : `https://www.amazon.com${link}`,
          rating,
          reviewCount,
          category: guessCategory(name),
          brand: name.split(" ")[0],
        });
      }
    });
  } catch {}
  return products;
}

// ─── Target ────────────────────────────────────────────────────────────────
export async function searchTarget(query: string): Promise<Product[]> {
  const products: Product[] = [];
  try {
    const apiUrl = `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?key=9f36aeafbe60771e321a7cc95a78140772ab3e96&channel=WEB&count=20&keyword=${encodeURIComponent(query)}&offset=0&page=%2Fs%2F${encodeURIComponent(query)}&pricing_store_id=3991&scheduled_delivery_store_id=3991&store_ids=3991&visitor_id=web`;
    const res = await withTimeout(fetch(apiUrl, { headers: { ...HEADERS, Accept: "application/json" } }), 8000);
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

// ─── Best Buy ──────────────────────────────────────────────────────────────
export async function searchBestBuy(query: string): Promise<Product[]> {
  const products: Product[] = [];
  try {
    const url = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(query)}`;
    const res = await withTimeout(fetch(url, { headers: HEADERS }), 8000);
    const html = await res.text();
    const $ = cheerio.load(html);

    $(".sku-item").each((_, el) => {
      const name = $(el).find(".sku-title a").text().trim();
      const priceText = $(el).find(".priceView-customer-price span").first().text().replace(/[^0-9.]/g, "");
      const img = $(el).find(".product-image img").attr("src") || "";
      const link = $(el).find(".sku-title a").attr("href") || "";
      const ratingText = $(el).find(".c-ratings-reviews").text();
      const oldPriceText = $(el).find(".pricing-price__regular-price").text().replace(/[^0-9.]/g, "");

      if (name && priceText) {
        const price = parseFloat(priceText);
        products.push({
          name,
          price,
          originalPrice: oldPriceText ? parseFloat(oldPriceText) : undefined,
          image: img.startsWith("http") ? img : `https://www.bestbuy.com${img}`,
          retailer: "Best Buy",
          url: link.startsWith("http") ? link : `https://www.bestbuy.com${link}`,
          rating: ratingText ? parseFloat(ratingText) || undefined : undefined,
          category: guessCategory(name),
          brand: name.split(" ")[0],
        });
      }
    });
  } catch {}
  return products;
}

// ─── Macy's ────────────────────────────────────────────────────────────────
export async function searchMacys(query: string): Promise<Product[]> {
  const products: Product[] = [];
  try {
    const url = `https://www.macys.com/shop/featured/${encodeURIComponent(query)}`;
    const res = await withTimeout(fetch(url, { headers: HEADERS }), 8000);
    const html = await res.text();
    const $ = cheerio.load(html);

    $(".productDetail").each((_, el) => {
      const name = $(el).find(".productDescription a").text().trim();
      const priceText = $(el).find(".regular, .sale, .lowest").first().text().replace(/[^0-9.]/g, "");
      const img = $(el).find("img").attr("src") || "";
      const link = $(el).find(".productDescription a").attr("href") || "";
      const brand = $(el).find(".productBrand").text().trim();

      if (name && priceText) {
        products.push({
          name,
          price: parseFloat(priceText),
          image: img.startsWith("http") ? img : `https://www.macys.com${img}`,
          retailer: "Macy's",
          url: link.startsWith("http") ? link : `https://www.macys.com${link}`,
          category: guessCategory(name),
          brand: brand || name.split(" ")[0],
        });
      }
    });
  } catch {}
  return products;
}

// ─── Google Shopping ───────────────────────────────────────────────────────
export async function searchGoogleShopping(query: string): Promise<Product[]> {
  const products: Product[] = [];
  try {
    const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}&num=30`;
    const res = await withTimeout(fetch(url, { headers: HEADERS }), 8000);
    const html = await res.text();
    const $ = cheerio.load(html);

    $(".sh-dgr__gr-auto, .sh-dlr__list-result").each((_, el) => {
      const name = $(el).find("h3, .tAxDx, .Xjkr3b").first().text().trim();
      const priceText = $(el).find(".a8Pemb, .HRLxBb, .kHxwFf").first().text().replace(/[^0-9.]/g, "");
      const img = $(el).find("img").attr("src") || "";
      const retailer = $(el).find(".aULzUe, .IuHnof, .E5ocAb").first().text().trim();
      const link = $(el).find("a").attr("href") || "";
      const ratingText = $(el).find('[aria-label*="rating"], .Rsc7Yb').first().text();

      if (name && priceText) {
        products.push({
          name,
          price: parseFloat(priceText),
          image: img,
          retailer: retailer || "Google Shopping",
          url: link.startsWith("http") ? link : `https://www.google.com${link}`,
          rating: ratingText ? parseFloat(ratingText) || undefined : undefined,
          category: guessCategory(name),
          brand: name.split(" ")[0],
        });
      }
    });
  } catch {}
  return products;
}

// ─── Fallback: generate realistic products when scrapers are blocked ─────
// WARNING: This generates EXAMPLE products for demo purposes
// These are NOT real products with verified prices
// URLs link to retailer search pages, not actual product pages
export function generateFallbackProducts(query: string): Product[] {
  const q = query.toLowerCase();
  const products: Product[] = [];
  const retailers = ["Amazon", "Target", "Best Buy", "Macy's", "Walmart"];

  // Product templates by category keyword
  const templates: Record<string, Array<{ name: string; basePrice: number; cat: string }> | string> = {
    headphone: [
      { name: "Sony WH-1000XM5 Wireless Noise Cancelling", basePrice: 348, cat: "Electronics" },
      { name: "Apple AirPods Max", basePrice: 449, cat: "Electronics" },
      { name: "Bose QuietComfort Ultra", basePrice: 379, cat: "Electronics" },
      { name: "JBL Tune 760NC Wireless", basePrice: 79, cat: "Electronics" },
      { name: "Samsung Galaxy Buds2 Pro", basePrice: 159, cat: "Electronics" },
      { name: "Beats Studio Pro", basePrice: 299, cat: "Electronics" },
      { name: "Sennheiser Momentum 4", basePrice: 299, cat: "Electronics" },
      { name: "Audio-Technica ATH-M50x", basePrice: 149, cat: "Electronics" },
      { name: "Skullcandy Crusher ANC 2", basePrice: 149, cat: "Electronics" },
      { name: "Sony WF-1000XM5 Earbuds", basePrice: 278, cat: "Electronics" },
    ],
    laptop: [
      { name: "Apple MacBook Air M3 15-inch", basePrice: 1299, cat: "Electronics" },
      { name: "Dell XPS 14 (2024)", basePrice: 1199, cat: "Electronics" },
      { name: "HP Spectre x360 16", basePrice: 1399, cat: "Electronics" },
      { name: "Lenovo ThinkPad X1 Carbon Gen 11", basePrice: 1249, cat: "Electronics" },
      { name: "ASUS ZenBook 14 OLED", basePrice: 799, cat: "Electronics" },
      { name: "Acer Swift Go 14", basePrice: 649, cat: "Electronics" },
      { name: "Microsoft Surface Laptop 6", basePrice: 999, cat: "Electronics" },
      { name: "Samsung Galaxy Book4 Pro", basePrice: 1099, cat: "Electronics" },
      { name: "Razer Blade 14 Gaming Laptop", basePrice: 1799, cat: "Electronics" },
      { name: "Lenovo IdeaPad Slim 5", basePrice: 549, cat: "Electronics" },
    ],
    shoe: [
      { name: "Nike Air Max 90", basePrice: 130, cat: "Shoes" },
      { name: "Adidas Ultraboost Light", basePrice: 190, cat: "Shoes" },
      { name: "New Balance 990v6", basePrice: 199, cat: "Shoes" },
      { name: "Nike Air Force 1 '07", basePrice: 110, cat: "Shoes" },
      { name: "ASICS Gel-Kayano 30", basePrice: 160, cat: "Shoes" },
      { name: "Converse Chuck Taylor All Star", basePrice: 65, cat: "Shoes" },
      { name: "Adidas Samba OG", basePrice: 100, cat: "Shoes" },
      { name: "Puma Suede Classic XXI", basePrice: 75, cat: "Shoes" },
      { name: "Hoka Clifton 9", basePrice: 145, cat: "Shoes" },
      { name: "Brooks Ghost 15", basePrice: 140, cat: "Shoes" },
      { name: "Reebok Club C 85", basePrice: 75, cat: "Shoes" },
      { name: "Nike Dunk Low", basePrice: 110, cat: "Shoes" },
    ],
    sneaker: "shoe",
    running: "shoe",
    dress: [
      { name: "A-Line Midi Wrap Dress", basePrice: 59, cat: "Clothing" },
      { name: "Floral Print Maxi Dress", basePrice: 78, cat: "Clothing" },
      { name: "Satin Slip Cocktail Dress", basePrice: 89, cat: "Clothing" },
      { name: "Casual T-Shirt Dress", basePrice: 35, cat: "Clothing" },
      { name: "Linen Blend Summer Dress", basePrice: 65, cat: "Clothing" },
      { name: "Knit Sweater Dress", basePrice: 55, cat: "Clothing" },
      { name: "Bodycon Mini Dress", basePrice: 45, cat: "Clothing" },
      { name: "Embroidered Boho Dress", basePrice: 72, cat: "Clothing" },
      { name: "Pleated Shirt Dress", basePrice: 68, cat: "Clothing" },
      { name: "Velvet Evening Gown", basePrice: 120, cat: "Clothing" },
    ],
    jacket: [
      { name: "North Face Nuptse 700 Down Jacket", basePrice: 299, cat: "Clothing" },
      { name: "Patagonia Nano Puff", basePrice: 199, cat: "Clothing" },
      { name: "Levi's Trucker Denim Jacket", basePrice: 89, cat: "Clothing" },
      { name: "Columbia Bugaboo II Fleece Interchange", basePrice: 160, cat: "Clothing" },
      { name: "Carhartt WIP Michigan Chore Coat", basePrice: 175, cat: "Clothing" },
      { name: "Nike Windrunner", basePrice: 110, cat: "Clothing" },
      { name: "Arc'teryx Atom LT Hoody", basePrice: 259, cat: "Clothing" },
      { name: "Uniqlo Ultra Light Down Jacket", basePrice: 69, cat: "Clothing" },
      { name: "Barbour Classic Bedale Wax Jacket", basePrice: 450, cat: "Clothing" },
      { name: "REI Co-op 650 Down Jacket 2.0", basePrice: 119, cat: "Clothing" },
    ],
    "air fryer": [
      { name: "Ninja Air Fryer Max XL", basePrice: 99, cat: "Kitchen" },
      { name: "Cosori Pro II Air Fryer 5.8Qt", basePrice: 89, cat: "Kitchen" },
      { name: "Instant Vortex Plus 6-in-1", basePrice: 109, cat: "Kitchen" },
      { name: "Philips Premium Airfryer XXL", basePrice: 249, cat: "Kitchen" },
      { name: "CHEFMAN TurboFry Air Fryer", basePrice: 49, cat: "Kitchen" },
      { name: "Cuisinart Air Fryer Toaster Oven", basePrice: 199, cat: "Kitchen" },
      { name: "GoWISE USA 7-Quart Air Fryer", basePrice: 69, cat: "Kitchen" },
      { name: "Breville Smart Oven Air Fryer Pro", basePrice: 349, cat: "Kitchen" },
      { name: "Dash Compact Air Fryer", basePrice: 39, cat: "Kitchen" },
      { name: "Ninja Foodi 6-in-1 10qt XL 2-Basket", basePrice: 179, cat: "Kitchen" },
    ],
    skincare: [
      { name: "CeraVe Moisturizing Cream 16oz", basePrice: 16, cat: "Beauty" },
      { name: "The Ordinary Niacinamide 10% + Zinc", basePrice: 6, cat: "Beauty" },
      { name: "La Roche-Posay Anthelios SPF 60", basePrice: 35, cat: "Beauty" },
      { name: "Cetaphil Gentle Skin Cleanser", basePrice: 14, cat: "Beauty" },
      { name: "Paula's Choice 2% BHA Exfoliant", basePrice: 32, cat: "Beauty" },
      { name: "Neutrogena Hydro Boost Gel-Cream", basePrice: 19, cat: "Beauty" },
      { name: "Tatcha The Dewy Skin Cream", basePrice: 69, cat: "Beauty" },
      { name: "Drunk Elephant Protini Moisturizer", basePrice: 68, cat: "Beauty" },
      { name: "Kiehl's Ultra Facial Cream", basePrice: 35, cat: "Beauty" },
      { name: "First Aid Beauty Ultra Repair Cream", basePrice: 38, cat: "Beauty" },
    ],
  };

  // Find matching templates
  let matched: Array<{ name: string; basePrice: number; cat: string }> = [];
  for (const [keyword, tpl] of Object.entries(templates)) {
    if (typeof tpl === "string") continue; // alias
    if (q.includes(keyword)) {
      matched = [...matched, ...tpl];
    }
  }
  // Check aliases
  for (const [keyword, alias] of Object.entries(templates)) {
    if (typeof alias === "string" && q.includes(keyword) && typeof templates[alias] !== "string") {
      matched = [...matched, ...(templates[alias] as Array<{ name: string; basePrice: number; cat: string }>)];
    }
  }

  // Generic fallback — create products from the query itself
  if (matched.length === 0) {
    const cats = ["Electronics", "Home", "Kitchen", "Clothing", "Beauty", "Sports"];
    const adjectives = ["Premium", "Professional", "Classic", "Modern", "Ultra", "Essential", "Deluxe", "Elite", "Pro", "Smart"];
    const titleQuery = query.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    for (let i = 0; i < 15; i++) {
      const adj = adjectives[i % adjectives.length];
      matched.push({
        name: `${adj} ${titleQuery} ${i > 7 ? "- Edition " + (i - 7) : ""}`.trim(),
        basePrice: Math.round(20 + Math.random() * 280),
        cat: guessCategory(query) || cats[i % cats.length],
      });
    }
  }

  // Generate multi-retailer entries with price variation
  for (const tpl of matched) {
    const numRetailers = 2 + Math.floor(Math.random() * 3); // 2-4 retailers
    const shuffled = [...retailers].sort(() => Math.random() - 0.5).slice(0, numRetailers);
    for (const retailer of shuffled) {
      const variance = 0.85 + Math.random() * 0.3; // 85% to 115% of base price
      const price = Math.round(tpl.basePrice * variance * 100) / 100;
      const hasDiscount = Math.random() > 0.6;
      products.push({
        name: tpl.name,
        price,
        originalPrice: hasDiscount ? Math.round(price * (1.15 + Math.random() * 0.25) * 100) / 100 : undefined,
        image: `https://placehold.co/400x400/2A9D8F/ffffff?text=${encodeURIComponent(tpl.name.slice(0, 20))}`,
        retailer,
        url: `https://www.${retailer.toLowerCase().replace(/[^a-z]/g, "")}.com/search?q=${encodeURIComponent(tpl.name)}`,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        reviewCount: Math.floor(50 + Math.random() * 5000),
        category: tpl.cat,
        brand: tpl.name.split(" ")[0],
        isFallback: true, // Mark as example data
        lastVerified: undefined, // No verification for example data
      });
    }
  }

  return products;
}

// ─── Cached Search: Search across all retailers ──────────────────────────
export async function cachedSearch(query: string): Promise<Product[]> {
  const results = await Promise.allSettled([
    searchAmazon(query),
    searchTarget(query),
    searchBestBuy(query),
    searchMacys(query),
    searchGoogleShopping(query),
  ]);

  const products: Product[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      products.push(...result.value);
    }
  }

  // If no products found from scrapers, return fallback products
  if (products.length === 0) {
    return generateFallbackProducts(query);
  }

  // Add lastVerified timestamp to real scraped products
  const now = new Date().toISOString();
  return products.map(p => ({ ...p, lastVerified: now }));
}
