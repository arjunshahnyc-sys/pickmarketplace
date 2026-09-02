import { Product } from './types';

/**
 * Normalize product name for comparison
 * - Lowercase
 * - Remove special characters
 * - Split into words
 */
function normalizeProductName(name: string): string[] {
  return name
    .toLowerCase()
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

/**
 * Group products by similarity
 * Products with 60%+ word overlap are considered the same product
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

      const similarity = calculateSimilarity(product.name, products[i].name);
      if (similarity >= SAME_ITEM_SIMILARITY) {
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
   * 'same': one of several listings of the same item (name overlap >= 60%);
   * 'similar': a different product that is a credible alternative to the
   * searched item: related name, well reviewed, and much cheaper than the
   * item's typical price. A listing that is also one of several listings
   * of its own item keeps its group fields, but 'similar' wins the label.
   */
  matchType?: 'same' | 'similar';
  /** For matchType 'similar': what makes it comparable to the searched item. */
  similarTo?: {
    name: string;
    savingsPercent: number;
    /** Meaningful name words shared with the searched item ("wireless", "40oz"). */
    sharedSpecs: string[];
  };
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
   * Median listed price across the cluster: the typical price of the
   * searched item. The same statistic the "Same item" chip saves against.
   */
  price: number;
  currency: string;
  /** Rating and review count of the cluster's best-reviewed listing. */
  rating: number;
  reviewCount: number;
  /** How many listings the cluster holds. */
  listingCount: number;
}

/** A listing needs this many reviews before its rating counts for anything. */
const MIN_REVIEWS = 50;

/**
 * Choose the reference for similar-pick claims from the results in source
 * relevance order.
 *
 * Why a cluster and not results[0]: the first result is often a small size
 * or an odd variant of the searched item (a $4.19 travel size, a used
 * listing), and nothing can be "25% cheaper" than that. The cluster's
 * median price is the item's typical price, and one outlier listing cannot
 * move it. The cluster is the first one, in relevance order, with at least
 * one well-reviewed listing: without a trustworthy rating on the searched
 * item there is nothing for an alternative's reviews to be comparable to,
 * so no anchor means no similar picks.
 */
export function pickAnchor(relevanceOrdered: Product[]): AnchorReference | undefined {
  const groups = groupProducts(relevanceOrdered.filter(p => !p.isFallback));
  for (const group of groups) {
    const rated = group.filter(
      p => (p.rating ?? 0) > 0 && (p.reviewCount ?? 0) >= MIN_REVIEWS
    );
    if (rated.length === 0) continue;
    const bestReviewed = rated.reduce((best, p) =>
      (p.reviewCount ?? 0) > (best.reviewCount ?? 0) ? p : best
    );
    const sortedPrices = group.map(p => p.price).sort((a, b) => a - b);
    return {
      name: group[0].name,
      price: sortedPrices[Math.floor(sortedPrices.length / 2)],
      currency: group[0].currency ?? 'USD',
      rating: bestReviewed.rating as number,
      reviewCount: bestReviewed.reviewCount as number,
      listingCount: group.length,
    };
  }
  return undefined;
}

// Words that overlap in almost any two product names and say nothing about
// the product itself, so they are excluded from the "key spec match" chips.
const GENERIC_NAME_WORDS = new Set([
  'the', 'and', 'for', 'with', 'pro', 'new', 'set', 'pack', 'black', 'white',
]);

/**
 * A similar alternative must be a genuinely different product (below the
 * same-item threshold, which also rules out every listing in the anchor's
 * own cluster) that still shares real name overlap with the searched item,
 * is much cheaper than its typical price, and carries reviews good enough
 * to trust.
 */
function findSimilarMatch(product: Product, anchor: AnchorReference): EnhancedProduct['similarTo'] {
  // Cross-currency price ratios are meaningless; similar-pick claims only
  // compare offers priced in the anchor's currency.
  if ((product.currency ?? 'USD') !== anchor.currency) return undefined;
  const similarity = calculateSimilarity(product.name, anchor.name);
  if (similarity < 0.25 || similarity >= SAME_ITEM_SIMILARITY) return undefined;
  if (product.price > anchor.price * 0.75) return undefined;
  if (!product.rating || product.rating < 4.0) return undefined;
  if (!product.reviewCount || product.reviewCount < MIN_REVIEWS) return undefined;
  if (product.rating < anchor.rating - 0.5) return undefined;

  const anchorWords = new Set(normalizeProductName(anchor.name));
  const productWords = normalizeProductName(product.name).filter(
    (word, i, arr) => arr.indexOf(word) === i
  );
  // A different product has something in its name the searched item's
  // name does not ("crop", "lotion", "adventure"). A name that is only a
  // subset of the anchor's words ("Apple AirPods Pro 2" against "Apple
  // AirPods Pro with MagSafe Case") is the same item under a shorter
  // name, usually a used or marketplace listing, not an alternative.
  const distinguishing = productWords.filter(
    word => !anchorWords.has(word) && !GENERIC_NAME_WORDS.has(word)
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
  relevanceOrder: Product[] = products
): EnhancedProduct[] {
  const anchor = pickAnchor(relevanceOrder);

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
    // "Save $X" compares the cheapest listing to the group's MEDIAN price,
    // not its max: one bogus high listing (a $1,574 engraved variant in a
    // $45 group) must not inflate the claimed savings.
    const sortedPrices = group.map(p => p.price).sort((a, b) => a - b);
    const minPrice = sortedPrices[0];
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
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
      // Every listing outside the anchor's cluster is a candidate, whether
      // or not it has sibling listings of its own: a cheaper alternative
      // does not stop being one because three stores carry it.
      const similarTo = anchor ? findSimilarMatch(product, anchor) : undefined;

      if (group.length === 1) {
        enhanced[index] = {
          ...product,
          matchType: similarTo ? 'similar' : undefined,
          similarTo,
        };
        return;
      }

      const isLowest = !lowestAssigned && lowestIsCredible && product.price === minPrice;
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
      };
    });
  });

  return enhanced;
}
