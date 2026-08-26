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

/**
 * Group products by similarity
 * Products with 60%+ word overlap are considered the same product
 */
function groupProducts(products: Product[]): Product[][] {
  const groups: Product[][] = [];
  const processed = new Set<number>();

  products.forEach((product, index) => {
    if (processed.has(index)) return;

    const group = [product];
    processed.add(index);

    // Find similar products
    for (let i = index + 1; i < products.length; i++) {
      if (processed.has(i)) continue;

      const similarity = calculateSimilarity(product.name, products[i].name);
      if (similarity >= 0.6) {
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
   * top match: related name, well reviewed, and much cheaper.
   */
  matchType?: 'same' | 'similar';
  /** For matchType 'similar': what makes it comparable to the top match. */
  similarTo?: {
    name: string;
    savingsPercent: number;
    /** Meaningful name words shared with the top match ("wireless", "40oz"). */
    sharedSpecs: string[];
  };
}

// Words that overlap in almost any two product names and say nothing about
// the product itself — excluded from the "key spec match" chips.
const GENERIC_NAME_WORDS = new Set([
  'the', 'and', 'for', 'with', 'pro', 'new', 'set', 'pack', 'black', 'white',
]);

/**
 * A similar alternative must be a genuinely different product (below the
 * same-item threshold) that still shares real name overlap with the top
 * match, is much cheaper, and carries reviews good enough to trust.
 */
function findSimilarMatch(product: Product, anchor: Product): EnhancedProduct['similarTo'] {
  const similarity = calculateSimilarity(product.name, anchor.name);
  if (similarity < 0.25 || similarity >= 0.6) return undefined;
  if (product.price > anchor.price * 0.75) return undefined;
  if (!product.rating || product.rating < 4.0) return undefined;
  if (!product.reviewCount || product.reviewCount < 50) return undefined;
  if (anchor.rating && product.rating < anchor.rating - 0.5) return undefined;

  const anchorWords = new Set(normalizeProductName(anchor.name));
  const sharedSpecs = normalizeProductName(product.name)
    .filter((word, i, arr) => arr.indexOf(word) === i)
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
 * `anchor` is the reference product that "similar alternative" labeling is
 * computed against — pass the top relevance-ordered result so the reference
 * doesn't change when the user re-sorts by price.
 */
export function enhanceProductsWithGroupInfo(
  products: Product[],
  anchor: Product | undefined = products[0]
): EnhancedProduct[] {
  const groups = groupProducts(products);
  const enhanced: EnhancedProduct[] = [];

  // The anchor's own group is the "same item" cluster for the query; other
  // products get checked as similar alternatives against the anchor.
  const anchorGroup = anchor
    ? groups.find(group => group.some(p => p.url === anchor.url))
    : undefined;

  groups.forEach((group, groupIndex) => {
    if (group.length === 1) {
      const product = group[0];
      const similarTo =
        anchor && group !== anchorGroup && product.url !== anchor.url
          ? findSimilarMatch(product, anchor)
          : undefined;
      enhanced.push({
        ...product,
        matchType: similarTo ? 'similar' : undefined,
        similarTo,
      });
      return;
    }

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

    // Enhance each product in the group. Only the first listing at the
    // minimum price gets the lowest-price chip — with ties, a chip on every
    // tied card reads like a rendering bug.
    let lowestAssigned = false;
    group.forEach(product => {
      const isLowest = !lowestAssigned && lowestIsCredible && product.price === minPrice;
      if (isLowest) lowestAssigned = true;

      enhanced.push({
        ...product,
        isLowestInGroup: isLowest,
        groupSavingsAmount: isLowest && savingsAmount > 0 ? savingsAmount : undefined,
        groupSavingsPercent: isLowest && savingsPercent > 0 ? savingsPercent : undefined,
        groupSize: group.length,
        groupId: `group-${groupIndex}`,
        matchType: 'same',
      });
    });
  });

  return enhanced;
}
