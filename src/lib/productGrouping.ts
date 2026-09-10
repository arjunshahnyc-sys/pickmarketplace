import { Product } from './types';
import { classifySeller } from './retailerTrust';

/**
 * Normalize product name for comparison
 * - Lowercase
 * - Remove special characters
 * - Split into words
 */
function normalizeProductName(name: string): string[] {
  return name
    .toLowerCase()
    // "50 ml", "1.89 oz", "2-pack" become one size token ("50ml", "189oz",
    // "2pack") so a size survives the short-word filter below and reads as
    // a size everywhere (see UNIT_TOKEN).
    .replace(
      /(\d+)(?:[.,](\d+))?\s*-?\s*(oz|ml|fl|lb|lbs|kg|mg|g|l|mm|cm|m|in|inch|inches|ft|gb|tb|mb|w|kw|v|mah|hz|khz|ghz|ct|pk|pcs|pc|pack|count|piece|pieces)\b/g,
      (_m, whole: string, frac: string | undefined, unit: string) => `${whole}${frac ?? ''}${unit}`
    )
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2); // Remove short words like "oz", "ml"
}

/**
 * Calculate Jaccard similarity between two product names
 * Returns a value between 0 and 1, where 1 means identical
 */
function calculateSimilarity(name1: string, name2: string): number {
  const words1 = new Set(normalizeProductName(name1));
  const words2 = new Set(normalizeProductName(name2));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/** Name overlap at or above this is "the same item"; below it, a different product. */
const SAME_ITEM_SIMILARITY = 0.6;

/**
 * Stable identity for a listing across the copies the display pipeline
 * makes of it (sorting, landed-cost enrichment). Ids are unique per feed;
 * the fallback covers hand-built products in tests and category pages.
 */
function productKey(product: Product): string {
  return product.id ?? `${product.retailer}|${product.name}|${product.url}`;
}

// ─── Name vocabulary ────────────────────────────────────────────────────
//
// Live searches on 2026-09-05 showed the engine labelling the searched item
// itself as its "cheaper twin": an $84 eBay "Apple AirPods Pro 3rd
// Generation Wireless ANC Earbuds" against "Apple AirPods Pro 3", a toddler
// size against the kids' size, a lid pack against the machine. Every one of
// those names differs from the searched item only by words that describe
// the LISTING (size, colour, condition, marketplace filler) or name an
// ACCESSORY, not a different product. The sets below make that distinction
// explicit. They are deliberately plain English lists: a word belongs here
// only when it never distinguishes one product from another.

// Words that overlap in almost any two product names and say nothing about
// the product itself, so they are excluded from the "key spec match" chips.
const GENERIC_NAME_WORDS = new Set([
  'the', 'and', 'for', 'with', 'pro', 'new', 'set', 'pack', 'black', 'white',
]);

// Listing descriptors: a name that differs from another only by these is
// the same item in another size, colour, count or condition.
const VARIANT_WORDS = new Set([
  // size and fit
  'xxs', 'small', 'medium', 'large', 'xxl', 'xxxl', 'size', 'sizes', 'petite',
  'tall', 'regular', 'plus', 'wide', 'narrow', 'inch', 'inches', 'ounce', 'ounces',
  // gender (same price tier; age groups are TIER_WORDS, below)
  'men', 'mens', 'man', 'women', 'womens', 'woman', 'ladies', 'unisex', 'adult',
  'adults',
  // colour and finish
  'black', 'white', 'red', 'blue', 'green', 'pink', 'gray', 'grey', 'navy',
  'beige', 'brown', 'purple', 'orange', 'yellow', 'gold', 'golden', 'silver',
  'rose', 'tan', 'olive', 'charcoal', 'ivory', 'teal', 'coral', 'lavender',
  'lilac', 'sage', 'burgundy', 'maroon', 'khaki', 'nude', 'multi', 'multicolor',
  'color', 'colour', 'heather', 'neutral', 'matte', 'glossy', 'gloss',
  'metallic', 'chrome', 'midnight', 'sand', 'stone', 'slate', 'taupe', 'blush',
  'fuchsia', 'magenta', 'violet', 'indigo', 'turquoise', 'aqua', 'bronze',
  'copper', 'pearl', 'mint',
  // quantity
  'pack', 'pcs', 'piece', 'pieces', 'count', 'bundle', 'lot', 'pair', 'pairs',
  'qty', 'single', 'double', 'twin',
  // condition
  'refurbished', 'refurb', 'renewed', 'used', 'preowned', 'pre', 'owned', 'open',
  'box', 'certified', 'excellent', 'good', 'acceptable', 'condition', 'sealed',
  'brand', 'nib', 'nwt', 'bnib',
  // marketplace filler
  'the', 'and', 'for', 'with', 'new', 'genuine', 'authentic', 'original',
  'official', 'oem', 'free', 'shipping', 'ships', 'fast', 'ship', 'read', 'desc',
  'description', 'usa', 'seller', 'warranty', 'sale', 'deal', 'hot', 'edition',
  // category nouns every listing in a shoe search carries, and Nike's
  // "Retro" suffix: "Nike Dunk Low Retro" and "Nike Dunk Low Sneakers" are
  // one shoe
  'shoes', 'shoe', 'sneakers', 'sneaker', 'footwear', 'trainers', 'retro',
]);

// Age groups are priced as different products (a toddler Dunk Low costs
// half an adult one), so a name carrying a tier word the other name lacks
// is neither the same item nor a cheaper twin of it.
const TIER_WORDS = new Set([
  'kids', 'kid', 'boys', 'boy', 'girls', 'girl', 'toddler', 'toddlers', 'infant',
  'infants', 'baby', 'youth', 'junior', 'juniors', 'preschool', 'grade', 'school',
  'big', 'little', 'child', 'children', 'teen', 'teens',
]);

// A listing in one of these conditions is never a "cheaper twin": it is the
// searched item, worn.
const CONDITION_WORDS = new Set([
  'refurbished', 'refurb', 'renewed', 'used', 'preowned', 'owned', 'open',
  'certified',
]);

// Things sold FOR a product. A name carrying one of these that the searched
// item's name lacks is an accessory, never the item and never its twin.
const ACCESSORY_WORDS = new Set([
  'case', 'cases', 'cover', 'covers', 'skin', 'skins', 'protector', 'protectors',
  'pad', 'pads', 'cushion', 'cushions', 'tip', 'tips', 'eartips', 'cable',
  'cables', 'cord', 'charger', 'chargers', 'adapter', 'adaptor', 'strap', 'straps',
  'band', 'bands', 'filter', 'filters', 'replacement', 'replacements', 'lid',
  'lids', 'pint', 'pints', 'straw', 'straws', 'bag', 'bags', 'pouch', 'sleeve',
  'holder', 'stand', 'mount', 'dock', 'carry', 'carryall', 'caddy', 'refill',
  'refills', 'cartridge', 'cartridges', 'parts', 'accessory', 'accessories',
  'attachment', 'attachments', 'hook', 'clip', 'clips', 'keychain', 'sticker',
  'stickers', 'decal', 'wrap', 'film', 'tempered', 'insert', 'inserts', 'liner',
  'liners', 'insole', 'insoles', 'laces', 'brush', 'brushes', 'tool', 'tools',
]);

/** Size and spec tokens like "40oz", "16gb", "1080p": never a model number. */
const UNIT_TOKEN = /^\d+(oz|ml|fl|lb|lbs|kg|mg|g|l|mm|cm|m|in|inch|inches|ft|gb|tb|mb|w|kw|v|mah|hz|khz|ghz|ct|pk|pcs|pc|pack|count|piece|pieces|k|p|x|mp|hr|hrs|min|s|st|nd|rd|th)$/;

/**
 * The words that name the product itself: everything left after listing
 * descriptors are removed. "Apple Airpods Pro 3 White Wireless Bluetooth
 * In-ear Earbuds W/charging" -> apple, airpods, pro, wireless, bluetooth,
 * ear, earbuds, charging.
 */
function coreWords(name: string): Set<string> {
  return new Set(
    normalizeProductName(name).filter(
      word => !VARIANT_WORDS.has(word) && !TIER_WORDS.has(word) && !UNIT_TOKEN.test(word)
    )
  );
}

function tierWords(name: string): Set<string> {
  return new Set(normalizeProductName(name).filter(word => TIER_WORDS.has(word)));
}

/** Same age group: both names carry the same tier words (usually none). */
function sameTier(a: string, b: string): boolean {
  const ta = tierWords(a);
  const tb = tierWords(b);
  return ta.size === tb.size && [...ta].every(word => tb.has(word));
}

/**
 * Model designations: tokens mixing letters and digits ("1000xm5", "nc301",
 * "a3065"). Two names whose model tokens exist but share none are different
 * products however much else they share: the XM4 is not the XM5.
 */
function modelTokens(name: string): Set<string> {
  return new Set(
    normalizeProductName(name).filter(
      word => /[a-z]/.test(word) && /\d/.test(word) && !UNIT_TOKEN.test(word)
    )
  );
}

function modelsCompatible(a: string, b: string): boolean {
  const ma = modelTokens(a);
  const mb = modelTokens(b);
  if (ma.size === 0 || mb.size === 0) return true;
  return [...ma].some(token => mb.has(token));
}

/** The size tokens a listing claims ("50ml", "2pack"), for price sanity. */
function sizeTokens(name: string): Set<string> {
  return new Set(normalizeProductName(name).filter(word => UNIT_TOKEN.test(word)));
}

/**
 * The listings a cluster's price statistics may compare: those of the size
 * most of the cluster claims (often no size at all), when that size holds
 * at least half the cluster. A 50 ml tube is then neither the lowest price
 * of the 16 oz jar nor a suspicious price for it. A cluster with no usual
 * size (four listings, four sizes) compares all of its listings.
 */
function usualSizeListings(group: Product[]): Product[] {
  const bySize = new Map<string, Product[]>();
  for (const p of group) {
    const key = [...sizeTokens(p.name)].sort().join(' ');
    bySize.set(key, [...(bySize.get(key) ?? []), p]);
  }
  let best: Product[] = [];
  for (const members of bySize.values()) if (members.length > best.length) best = members;
  return best.length * 2 >= group.length ? best : group;
}

function accessoryWords(name: string): Set<string> {
  return new Set(normalizeProductName(name).filter(word => ACCESSORY_WORDS.has(word)));
}

/** True when `name` names an accessory the reference name does not. */
function isAccessoryOf(name: string, reference: string): boolean {
  const refAccessories = accessoryWords(reference);
  return [...accessoryWords(name)].some(word => !refAccessories.has(word));
}

function hasConditionWord(name: string): boolean {
  return normalizeProductName(name).some(word => CONDITION_WORDS.has(word));
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  return [...a].every(word => b.has(word));
}

/**
 * Same item under another listing name: one name's core words contain the
 * other's ("Apple AirPods Pro 3" inside "Apple Airpods Pro 3 White Wireless
 * Bluetooth In-ear Earbuds"), the model numbers agree, and neither is an
 * accessory of the other. The shorter core needs at least two words, so a
 * bare brand name ("Stanley") cannot swallow every product of that brand.
 */
function isSameItemByContainment(a: string, b: string): boolean {
  const ca = coreWords(a);
  const cb = coreWords(b);
  if (Math.min(ca.size, cb.size) < 2) return false;
  if (!isSubset(ca, cb) && !isSubset(cb, ca)) return false;
  if (!sameTier(a, b)) return false;
  if (!modelsCompatible(a, b)) return false;
  if (isAccessoryOf(a, b) || isAccessoryOf(b, a)) return false;
  return true;
}

/** The name minus its first word, which is nearly always the brand. */
function withoutLeadingWord(name: string): string {
  return name.trim().split(/\s+/).slice(1).join(' ');
}

function isSameItem(a: string, b: string): boolean {
  if (calculateSimilarity(a, b) >= SAME_ITEM_SIMILARITY) {
    return sameTier(a, b) && modelsCompatible(a, b);
  }
  return isSameItemByContainment(a, b);
}

/**
 * Group products by similarity
 * Products with 60%+ word overlap, or one name contained in the other, are
 * the same product.
 *
 * Grouping is seeded: each group's first product is the one every later
 * member is compared against, so the caller must pass products in
 * relevance order. That way the seed of each cluster is its most relevant
 * listing (a clean canonical name), never whichever odd variant happens to
 * be cheapest under the current sort.
 */
function groupProducts(products: Product[]): Product[][] {
  const groups: Product[][] = [];
  const processed = new Set<number>();

  products.forEach((product, index) => {
    if (processed.has(index)) return;

    const group = [product];
    processed.add(index);

    // Find similar products. Same-name listings in different currencies are
    // different offers from different markets: their prices cannot share
    // savings math, so they never share a group. (US-only results all carry
    // one currency, leaving legacy behavior untouched.)
    for (let i = index + 1; i < products.length; i++) {
      if (processed.has(i)) continue;
      if ((products[i].currency ?? 'USD') !== (product.currency ?? 'USD')) continue;

      if (isSameItem(product.name, products[i].name)) {
        group.push(products[i]);
        processed.add(i);
      }
    }

    groups.push(group);
  });

  return groups;
}

export interface EnhancedProduct extends Product {
  isLowestInGroup?: boolean;
  groupSavingsAmount?: number;
  groupSavingsPercent?: number;
  groupSize?: number;
  groupId?: string;
  /**
   * 'same': one of several listings of the same item (name overlap >= 60%
   * or one name contained in the other);
   * 'similar': a different product that is a credible alternative to the
   * searched item: related name, well reviewed, much cheaper than the
   * item's typical price, and sold by a verified store. A listing that is
   * also one of several listings of its own item keeps its group fields,
   * but 'similar' wins the label.
   */
  matchType?: 'same' | 'similar';
  /** For matchType 'similar': what makes it comparable to the searched item. */
  similarTo?: {
    name: string;
    savingsPercent: number;
    /** Meaningful name words shared with the searched item ("wireless", "40oz"). */
    sharedSpecs: string[];
  };
  /**
   * Set when this listing, from a seller Pick has not verified, is priced
   * far below what verified stores charge for the same item (under 60% of
   * their median). Such a price is the signature of a counterfeit or a
   * bait listing, so the listing never carries a savings or twin chip and
   * the page can rank it last. `referencePrice` is the verified median.
   */
  priceFlag?: { kind: 'far-below-verified'; referencePrice: number };
}

/**
 * The reference every "similar pick" claim is measured against: the
 * searched item, represented by its same-item cluster rather than by any
 * single listing.
 */
export interface AnchorReference {
  /** Name of the cluster's most relevant listing (the "Alternative to" text). */
  name: string;
  /**
   * Typical price of the searched item: what verified stores charge for it
   * when the cluster has a usable verified price (see verifiedReference),
   * otherwise the median across the whole cluster. The same statistic the
   * "Same item" chip saves against.
   */
  price: number;
  /** Which listings the price came from. */
  priceBasis: 'verified' | 'all';
  currency: string;
  /** Rating and review count of the cluster's best-reviewed listing. */
  rating: number;
  reviewCount: number;
  /** How many listings the cluster holds. */
  listingCount: number;
}

/**
 * How much the grouping math trusts a listing's seller:
 *   verified     on Pick's reviewed retailer list
 *   marketplace  a marketplace platform, an independent seller on one, or a
 *                flagged merchant: prices there describe that seller's
 *                offer, not the item
 *   unknown      everything else
 */
export type SellerClass = 'verified' | 'marketplace' | 'unknown';

export interface GroupingOptions {
  /**
   * The search text. The anchor is the cluster whose name covers the most
   * of it, so "nike dunk low" anchors on a Dunk Low, not on whichever
   * well-reviewed accessory the feed listed first.
   */
  query?: string;
  /**
   * Seller trust for a listing. Defaults to the trust registry; injectable
   * so the grouping math can be tested without it.
   */
  sellerClass?: (product: Product) => SellerClass;
}

/** A listing needs this many reviews before its rating counts for anything. */
const MIN_REVIEWS = 50;

/**
 * A listing from an unverified seller priced under this share of the
 * verified median for the same item is flagged (see priceFlag).
 */
const FAR_BELOW_VERIFIED = 0.6;

/**
 * The item's typical price as verified stores see it: the median of the
 * cluster's verified listings when two or more carry it. A lone verified
 * listing counts only when it sits within half to double the cluster's
 * overall median: Apple at $249 among $430 resellers is the list price;
 * a $4.19 travel size among $18 jars is a different size, not the price.
 * Undefined when the cluster has no usable verified price.
 */
function verifiedReference(group: Product[], isVerified: (p: Product) => boolean): number | undefined {
  const prices = group.filter(isVerified).map(p => p.price);
  if (prices.length >= 2) return median(prices);
  if (prices.length === 1) {
    const overall = median(group.map(p => p.price));
    if (prices[0] >= overall * 0.5 && prices[0] <= overall * 2) return prices[0];
  }
  return undefined;
}

function defaultSellerClass(product: Product): SellerClass {
  const level = classifySeller(product.retailer, {
    market: product.sourceMarket,
    url: product.url,
  }).level;
  if (level === 'verified') return 'verified';
  if (level === 'unknown') return 'unknown';
  return 'marketplace';
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Fraction of the query's core words that the name carries. */
function queryCoverage(name: string, query: string | undefined): number {
  if (!query) return 1;
  const wanted = coreWords(query);
  if (wanted.size === 0) return 1;
  const have = coreWords(name);
  return [...wanted].filter(word => have.has(word)).length / wanted.size;
}

/**
 * Choose the reference for similar-pick claims from the results in source
 * relevance order.
 *
 * Why a cluster and not results[0]: the first result is often a small size
 * or an odd variant of the searched item (a $4.19 travel size, a used
 * listing), and nothing can be "25% cheaper" than that. The cluster's
 * median price is the item's typical price, and one outlier listing cannot
 * move it. Eligible clusters have at least one well-reviewed listing
 * (without a trustworthy rating on the searched item there is nothing for
 * an alternative's reviews to be comparable to) and are not accessories or
 * used listings. Among those, the cluster whose name covers the most of
 * the query wins, earliest first on ties. No eligible cluster means no
 * similar picks.
 */
export function pickAnchor(
  relevanceOrdered: Product[],
  options: GroupingOptions = {}
): AnchorReference | undefined {
  const sellerClass = options.sellerClass ?? defaultSellerClass;
  const isVerified = (p: Product) => sellerClass(p) === 'verified';
  const groups = groupProducts(relevanceOrdered.filter(p => !p.isFallback));
  const query = options.query;

  // A cluster speaks through its first listing that is a new unit; a
  // cluster of only refurbished or used listings is not the searched item.
  const isNewUnit = (p: Product) => !hasConditionWord(p.name);
  const wellReviewed = (p: Product) => (p.rating ?? 0) > 0 && (p.reviewCount ?? 0) >= MIN_REVIEWS;

  let best: { group: Product[]; name: string; coverage: number } | undefined;
  for (const group of groups) {
    const representative = group.find(isNewUnit);
    if (!representative) continue;
    if (query && isAccessoryOf(representative.name, query)) continue;
    if (!group.some(p => isNewUnit(p) && wellReviewed(p))) continue;
    const coverage = queryCoverage(representative.name, query);
    if (!best || coverage > best.coverage) best = { group, name: representative.name, coverage };
  }
  if (!best) return undefined;

  const { group } = best;
  const bestReviewed = group
    .filter(p => isNewUnit(p) && wellReviewed(p))
    .reduce((top, p) => ((p.reviewCount ?? 0) > (top.reviewCount ?? 0) ? p : top));
  const usualSized = usualSizeListings(group);
  const reference = verifiedReference(usualSized, isVerified);
  return {
    name: best.name,
    price: reference ?? median(usualSized.map(p => p.price)),
    priceBasis: reference === undefined ? 'all' : 'verified',
    currency: group[0].currency ?? 'USD',
    rating: bestReviewed.rating as number,
    reviewCount: bestReviewed.reviewCount as number,
    listingCount: group.length,
  };
}

/**
 * A similar alternative must be a genuinely different product (not the
 * searched item under a longer or shorter name, not a size or colour of
 * it, not an accessory for it, not a used one) that still shares real name
 * overlap with the searched item, is much cheaper than its typical price,
 * carries reviews good enough to trust, and comes from a verified store:
 * Pick is recommending it, so the seller has to be one Pick stands behind.
 */
function findSimilarMatch(
  product: Product,
  anchor: AnchorReference,
  isVerified: (product: Product) => boolean
): EnhancedProduct['similarTo'] {
  // Cross-currency price ratios are meaningless; similar-pick claims only
  // compare offers priced in the anchor's currency.
  if ((product.currency ?? 'USD') !== anchor.currency) return undefined;
  if (hasConditionWord(product.name)) return undefined;
  if (!sameTier(product.name, anchor.name)) return undefined;
  if (isAccessoryOf(product.name, anchor.name)) return undefined;
  if (isSameItem(product.name, anchor.name)) return undefined;
  // Marketplace listings often drop the brand ("Airpods Pro 3 Wireless
  // In-ear Earbuds White"). Grouping keeps the brand word (a knockoff
  // "Quencher Tumbler" must not join Stanley's cluster), but for the twin
  // claim the brand is optional: such a listing is the item, not a twin.
  if (isSameItemByContainment(product.name, withoutLeadingWord(anchor.name))) return undefined;
  const similarity = calculateSimilarity(product.name, anchor.name);
  if (similarity < 0.25) return undefined;
  if (product.price > anchor.price * 0.75) return undefined;
  if (!product.rating || product.rating < 4.0) return undefined;
  if (!product.reviewCount || product.reviewCount < MIN_REVIEWS) return undefined;
  if (product.rating < anchor.rating - 0.5) return undefined;
  if (!isVerified(product)) return undefined;

  const anchorWords = new Set(normalizeProductName(anchor.name));
  const productWords = normalizeProductName(product.name).filter(
    (word, i, arr) => arr.indexOf(word) === i
  );
  // A different product has something in its name the searched item's
  // name does not ("crop", "lotion", "adventure"), and that something must
  // be more than a size, colour or condition. A name that is only a subset
  // of the anchor's words ("Apple AirPods Pro 2" against "Apple AirPods Pro
  // with MagSafe Case") is the same item under a shorter name, usually a
  // used or marketplace listing, not an alternative.
  const distinguishing = productWords.filter(
    word => !anchorWords.has(word) && !GENERIC_NAME_WORDS.has(word) && !VARIANT_WORDS.has(word)
  );
  if (distinguishing.length === 0) return undefined;

  const sharedSpecs = productWords
    .filter(word => anchorWords.has(word) && !GENERIC_NAME_WORDS.has(word))
    .slice(0, 3);

  return {
    name: anchor.name,
    savingsPercent: Math.round(((anchor.price - product.price) / anchor.price) * 100),
    sharedSpecs,
  };
}

/**
 * Enhance products with grouping information and savings data.
 *
 * `products` is the list as displayed (filtered and sorted however the user
 * chose). `relevanceOrder` is the full result set in source relevance
 * order; it decides two things the display sort must not influence: which
 * listing seeds each same-item cluster, and which cluster is the searched
 * item that similar picks are measured against (see pickAnchor). Output
 * keeps the display order.
 */
export function enhanceProductsWithGroupInfo(
  products: Product[],
  relevanceOrder: Product[] = products,
  options: GroupingOptions = {}
): EnhancedProduct[] {
  const sellerClass = options.sellerClass ?? defaultSellerClass;
  const isVerified = (p: Product) => sellerClass(p) === 'verified';
  const anchor = pickAnchor(relevanceOrder, options);

  // Group in relevance order regardless of the display sort, then write
  // the results back by display index.
  const rank = new Map<string, number>();
  relevanceOrder.forEach((p, i) => {
    const key = productKey(p);
    if (!rank.has(key)) rank.set(key, i);
  });
  const displayIndexByRelevance = products
    .map((p, i) => ({ i, rank: rank.get(productKey(p)) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map(x => x.i);
  const groups = groupProducts(displayIndexByRelevance.map(i => products[i]));
  const indexByProduct = new Map<Product, number>(products.map((p, i) => [p, i]));

  const enhanced: EnhancedProduct[] = products.map(p => ({ ...p }));

  groups.forEach((group, groupIndex) => {
    // Listings from unverified sellers priced far under what verified
    // stores charge for the same item are flagged and kept out of every
    // price statistic: a $60 "AirPods Pro" on a marketplace is not the
    // lowest price of AirPods Pro, it is a different thing.
    // Price statistics compare like with like: only listings of the
    // cluster's usual size take part ("50 ml" against the 16 oz jar is
    // priced for a different size, so it is neither flagged nor cheapest).
    const usual = new Set(usualSizeListings(group));
    const usualSized = (p: Product) => usual.has(p);
    const verifiedMedian = verifiedReference([...usual], isVerified);
    const flagged = new Set<Product>(
      verifiedMedian === undefined
        ? []
        : group.filter(
            p =>
              usualSized(p) && !isVerified(p) && p.price < verifiedMedian * FAR_BELOW_VERIFIED
          )
    );
    const priced = group.filter(p => !flagged.has(p));
    // The lowest-price chip is a recommendation, so it never lands on a
    // refurbished or used unit (not the same item at a lower price), on a
    // marketplace offer (the price describes that seller, not the item),
    // or on another size.
    const chipEligible = priced.filter(
      p => usualSized(p) && !hasConditionWord(p.name) && sellerClass(p) !== 'marketplace'
    );

    // "Save $X" compares the cheapest chip-eligible listing to the group's
    // typical price (the verified median when there is one, else the group
    // median), not its max: one bogus high listing (a $1,574 engraved
    // variant in a $45 group) must not inflate the claimed savings.
    const minPrice = chipEligible.length > 0 ? Math.min(...chipEligible.map(p => p.price)) : 0;
    const medianPrice = verifiedMedian ?? (priced.length > 0 ? median(priced.map(p => p.price)) : 0);
    const savingsAmount = medianPrice - minPrice;
    const savingsPercent = medianPrice > 0 ? (savingsAmount / medianPrice) * 100 : 0;
    // A "lowest" price far below the group's typical price ($0.01 custom
    // listings) is junk data, not a deal worth advertising.
    const lowestIsCredible = minPrice >= medianPrice * 0.2;

    // Only the first listing at the minimum price gets the lowest-price
    // chip: with ties, a chip on every tied card reads like a rendering bug.
    let lowestAssigned = false;
    group.forEach(product => {
      const index = indexByProduct.get(product) as number;
      const priceFlag: EnhancedProduct['priceFlag'] =
        flagged.has(product) && verifiedMedian !== undefined
          ? { kind: 'far-below-verified', referencePrice: verifiedMedian }
          : undefined;
      // Every listing outside the anchor's cluster is a candidate, whether
      // or not it has sibling listings of its own: a cheaper alternative
      // does not stop being one because three stores carry it.
      const similarTo =
        anchor && !priceFlag ? findSimilarMatch(product, anchor, isVerified) : undefined;

      if (group.length === 1) {
        enhanced[index] = {
          ...product,
          matchType: similarTo ? 'similar' : undefined,
          similarTo,
          priceFlag,
        };
        return;
      }

      const isLowest =
        !lowestAssigned &&
        lowestIsCredible &&
        chipEligible.includes(product) &&
        product.price === minPrice;
      if (isLowest) lowestAssigned = true;

      enhanced[index] = {
        ...product,
        isLowestInGroup: isLowest,
        groupSavingsAmount: isLowest && savingsAmount > 0 ? savingsAmount : undefined,
        groupSavingsPercent: isLowest && savingsPercent > 0 ? savingsPercent : undefined,
        groupSize: group.length,
        groupId: `group-${groupIndex}`,
        matchType: similarTo ? 'similar' : 'same',
        similarTo,
        priceFlag,
      };
    });
  });

  return enhanced;
}
