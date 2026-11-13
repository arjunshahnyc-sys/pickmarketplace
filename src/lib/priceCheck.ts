// The price check behind /price-check/[event]: for each product, three
// numbers side by side, so a shopper can judge a sale sticker for
// themselves.
//
//   - the lowest price Pick could confirm today: a new unit of exactly the
//     product at a store Pick verifies (the comparison page's own figure,
//     comparisonPage.ts with exact-item evidence);
//   - that store's crossed-out price, if it shows one;
//   - the range Google says the product typically sells for.
//
// The only thing computed from them is where the first sits against the
// third, and whether the second sits above it.
//
// What this deliberately is not: a comparison of today's price with an
// earlier date. That was built first (2026-11-12) and dropped the same day.
// Two runs twenty minutes apart disagreed on 6 of 20 products, none of them
// a real price change: one run found Best Buy's $88 listing of the Sony
// WH-CH720N and the next found only Target's at $183.34, which a dated
// comparison reported as "108% higher". Each number Pick shows is a real
// offer; which offers a given search surfaces is not stable enough to call
// the difference between two days a price move.
//
// Pure; the page does the paid work.

import type { Comparison, ComparisonRow } from './comparisonPage';
import { COMPARISONS, type ComparisonCategory, type ComparisonEntry } from './comparisons';
import { EXACT_ITEM_CATEGORIES } from './exactItem';

export interface PriceCheckEvent {
  slug: string;
  /** "Black Friday 2026". */
  name: string;
  /** The day of the event, ISO date. */
  date: string;
}

export const PRICE_CHECK_EVENTS: PriceCheckEvent[] = [{ slug: 'black-friday', name: 'Black Friday 2026', date: '2026-11-27' }];

export function getPriceCheckEvent(slug: string): PriceCheckEvent | undefined {
  return PRICE_CHECK_EVENTS.find((e) => e.slug === slug);
}

/**
 * The categories a price check covers, in page order: the ones priced from
 * exact-item evidence (see EXACT_ITEM_CATEGORIES for why not the others).
 */
export const PRICE_CHECK_CATEGORIES: ReadonlyArray<ComparisonCategory> = (
  ['headphones', 'earbuds', 'dorm appliances'] as const
).filter((c) => EXACT_ITEM_CATEGORIES.includes(c));

export function priceCheckProducts(): ComparisonEntry[] {
  return PRICE_CHECK_CATEGORIES.flatMap((category) => COMPARISONS.filter((c) => c.category === category));
}

/** Where a price sits against Google's typical range for the product. */
export type TypicalPosition = 'below' | 'within' | 'above';

/**
 * A price within this share of an end of the range is at that end, not
 * past it: $89.99 against "$90 to $130" is the bottom of the range, and
 * calling it "below" would be a verdict made of one cent.
 */
export const RANGE_TOLERANCE = 0.01;

export function typicalPosition(price: number, range: [number, number] | null): TypicalPosition | null {
  if (!range) return null;
  if (price < range[0] * (1 - RANGE_TOLERANCE)) return 'below';
  return price > range[1] * (1 + RANGE_TOLERANCE) ? 'above' : 'within';
}

/** One product's line on the page. */
export interface PriceCheckRow {
  entry: ComparisonEntry;
  /** Today's lowest confirmed price: a verified store's new unit of exactly the product. */
  today: ComparisonRow | null;
  /** The store's own crossed-out price, when it shows one above today's. */
  crossedOut: number | null;
  /** Google's typical price range for the product, when it gives one. */
  googleTypicalRange: [number, number] | null;
  /** Where today's price sits against that range; null without both. */
  position: TypicalPosition | null;
  /**
   * The crossed-out price is above the top of Google's typical range: the
   * discount is measured from a price the product does not usually sell at.
   */
  crossedOutAboveTypical: boolean;
}

/**
 * A row from the product's comparison (null when its search failed). A top
 * listing that is not a verified store's new unit is not a confirmed price.
 */
export function priceCheckRow(entry: ComparisonEntry, comparison: Comparison | null): PriceCheckRow {
  const today = comparison && comparison.item.topIsVerifiedNew ? comparison.item.top : null;
  const googleTypicalRange = comparison?.item.googleTypicalRange ?? null;
  const crossedOut = today && today.originalPrice !== null && today.originalPrice > today.price ? today.originalPrice : null;
  return {
    entry,
    today,
    crossedOut,
    googleTypicalRange,
    position: today ? typicalPosition(today.price, googleTypicalRange) : null,
    crossedOutAboveTypical: crossedOut !== null && typicalPosition(crossedOut, googleTypicalRange) === 'above',
  };
}

export interface PriceCheckSummary {
  /** Products with a confirmed price today. */
  confirmed: number;
  /** Of those, the ones Google gives a typical range for. */
  ranged: number;
  below: number;
  within: number;
  above: number;
  /** Products whose store's crossed-out price is above Google's typical range. */
  inflatedCrossedOut: number;
}

export function summarize(rows: PriceCheckRow[]): PriceCheckSummary {
  const count = (position: TypicalPosition) => rows.filter((r) => r.position === position).length;
  const below = count('below');
  const within = count('within');
  const above = count('above');
  return {
    confirmed: rows.filter((r) => r.today).length,
    ranged: below + within + above,
    below,
    within,
    above,
    inflatedCrossedOut: rows.filter((r) => r.crossedOutAboveTypical).length,
  };
}
