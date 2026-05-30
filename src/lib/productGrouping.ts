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
}

/**
 * Enhance products with grouping information and savings data
 */
export function enhanceProductsWithGroupInfo(products: Product[]): EnhancedProduct[] {
  const groups = groupProducts(products);
  const enhanced: EnhancedProduct[] = [];

  groups.forEach((group, groupIndex) => {
    if (group.length === 1) {
      // Single product, no group
      enhanced.push({ ...group[0] });
      return;
    }

    // Find min and max prices in group
    const prices = group.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const savingsAmount = maxPrice - minPrice;
    const savingsPercent = maxPrice > 0 ? (savingsAmount / maxPrice) * 100 : 0;

    // Enhance each product in the group
    group.forEach(product => {
      const isLowest = product.price === minPrice;

      enhanced.push({
        ...product,
        isLowestInGroup: isLowest,
        groupSavingsAmount: isLowest && savingsAmount > 0 ? savingsAmount : undefined,
        groupSavingsPercent: isLowest && savingsPercent > 0 ? savingsPercent : undefined,
        groupSize: group.length,
        groupId: `group-${groupIndex}`
      });
    });
  });

  return enhanced;
}
