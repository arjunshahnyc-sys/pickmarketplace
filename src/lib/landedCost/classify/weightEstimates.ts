// Typical SHIPPED weight (product + packaging) per curated category, used
// only to pick a band in the shipping-estimate rate tables. Hand-authored
// ASSUMPTIONS, owner-approved, never better than 'estimated' — and stated
// as an assumption on every breakdown that uses them.
//
// Categories with no entry get no shipping estimate at all (honest
// unknown). That is deliberate for freight-class items (TVs, monitors) and
// for ambiguous buckets where a typical weight would be a fiction.

import { normalizeCategory } from './categoryToHs';

export interface WeightEstimate {
  grams: number;
  label: string;
}

const TYPICAL_SHIPPED_WEIGHT: Record<string, WeightEstimate> = {
  headphones: { grams: 700, label: 'headphones' },
  earbuds: { grams: 250, label: 'earbuds' },
  speakers: { grams: 1_500, label: 'speaker' },
  laptops: { grams: 3_000, label: 'laptop' },
  tablets: { grams: 800, label: 'tablet' },
  phones: { grams: 500, label: 'phone' },
  smartwatches: { grams: 300, label: 'smart watch' },
  cameras: { grams: 800, label: 'camera' },
  keyboards: { grams: 900, label: 'keyboard' },
  gamingmice: { grams: 350, label: 'mouse' },
  gamingconsoles: { grams: 3_500, label: 'game console' },
  shoes: { grams: 1_500, label: 'boxed shoes' },
  skincare: { grams: 400, label: 'skincare product' },
  beauty: { grams: 400, label: 'beauty product' },
  perfume: { grams: 500, label: 'fragrance' },
  watches: { grams: 300, label: 'watch' },
  backpacks: { grams: 1_200, label: 'backpack' },
  coffeemakers: { grams: 4_000, label: 'coffee maker' },
  kitchen: { grams: 4_000, label: 'kitchen appliance' },
  toys: { grams: 900, label: 'toy' },
  sports: { grams: 2_500, label: 'fitness item' },
  // Deliberately absent: monitors, tvs (freight-class, not parcel rates),
  // and the ambiguous buckets (Electronics, Clothing, Home, Other).
};

export function typicalShippedWeight(categoryId: string | undefined): WeightEstimate | null {
  if (!categoryId) return null;
  return TYPICAL_SHIPPED_WEIGHT[normalizeCategory(categoryId)] ?? null;
}
