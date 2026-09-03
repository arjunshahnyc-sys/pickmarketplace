// Which chips a product card overlays on its image, and in what order.
//
// Every overlay chip lives in ONE anchored stack at the image box's
// top-left corner (ProductCard.tsx), so two chips can never collide and
// nothing floats over the middle of the product photo. Top-right belongs
// to the Save button, bottom-right to the Compare toggle, bottom-left
// stays empty. The stack order is fixed: the savings chip (the bigger
// news) first, then the discount or EXAMPLE tag.
//
// Pure and DOM-free so the gating rules are unit-tested in the node
// environment; the card only maps the result to markup.

import type { EnhancedProduct } from './productGrouping';

export type SavingsChip =
  | { kind: 'same-item'; amount: number; currency?: string }
  | { kind: 'similar'; percent: number };

export type TagChip = { kind: 'discount'; percent: number } | { kind: 'example' };

export interface CardOverlays {
  /** Same-item or similar-pick chip; at most one per card. */
  savings: SavingsChip | null;
  /** Percent-off tag for a sale price, or the EXAMPLE tag on fallback cards. */
  tag: TagChip | null;
}

export type OverlayInput = Pick<
  EnhancedProduct,
  | 'price'
  | 'originalPrice'
  | 'currency'
  | 'isFallback'
  | 'isLowestInGroup'
  | 'groupSavingsAmount'
  | 'matchType'
  | 'similarTo'
>;

/** Percent off the original price, 0 when there is no real markdown. */
export function discountPercent(price: number, originalPrice?: number): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function overlaysFor(p: OverlayInput): CardOverlays {
  // Example cards never advertise savings; they are not live offers.
  if (p.isFallback) {
    return { savings: null, tag: { kind: 'example' } };
  }

  const percent = discountPercent(p.price, p.originalPrice);
  const tag: TagChip | null = percent > 0 ? { kind: 'discount', percent } : null;

  // A listing that is also a similar pick shows that chip instead of the
  // same-item chip: the alternative is the bigger news, and "from $X" on
  // the price row still marks it as its item's cheapest.
  let savings: SavingsChip | null = null;
  if (p.matchType === 'similar') {
    savings = p.similarTo ? { kind: 'similar', percent: p.similarTo.savingsPercent } : null;
  } else if (p.isLowestInGroup && p.groupSavingsAmount && p.groupSavingsAmount > 0) {
    savings = { kind: 'same-item', amount: p.groupSavingsAmount, currency: p.currency };
  }

  return { savings, tag };
}
