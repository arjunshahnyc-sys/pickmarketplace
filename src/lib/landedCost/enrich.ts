// Glue between scraped offers and the landed-cost core: build a
// LandedCostInput from a feed Product, compute the breakdown, and shape the
// result for ranking and display. Pure and clock-injected, so it runs the
// same on client and server and is fully testable.

import type { Product } from '../types';
import { calculateLandedCost, type CalcContext } from './calculate';
import { resolveHsCodeSync } from './classify';
import { NullFxProvider, type FxProvider } from './fx';
import { merchantInputFor } from './merchants';
import { rankByLandedCost, type RankedOffer, type RankResult } from './rank';
import { EU_MEMBERSHIP } from './rules/eu';
import { loadRulesFor } from './rules/loader';
import type { LandedCostBreakdown, LandedCostInput, LineKind } from './types';

/**
 * THE FLOAT BOUNDARY. Feed prices arrive as float dollars (scrapers parse
 * "  $15.99 " into 15.99); this is the single place a float becomes integer
 * minor units. Returns null for garbage instead of guessing.
 */
export function dollarsToMinor(price: number): number | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return null;
  const minor = Math.round(price * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

// Both live price sources are US-locked (Serper gl:'us', Target store
// 3991), so feed prices are USD by construction. When a non-USD source
// lands, currency must come from the source, not this constant.
const FEED_CURRENCY = 'USD';

export interface Destination {
  country: string;
  currency: string;
}

export function buildLandedCostInput(
  product: Product,
  destination: Destination
): LandedCostInput | null {
  const priceMinor = dollarsToMinor(product.price);
  if (priceMinor === null) return null;
  const hs = resolveHsCodeSync({
    name: product.name,
    brand: product.brand,
    categoryId: product.category,
  });
  return {
    item: {
      priceMinor,
      currency: FEED_CURRENCY,
      categoryId: product.category,
      hs: hs ?? undefined,
    },
    merchant: merchantInputFor(product.retailer),
    // Shipping is never available from the current sources; stays unknown.
    shipping: undefined,
    destination,
  };
}

/**
 * Attach a breakdown to every product. `now` feeds staleness checks only;
 * pass a stable value per render so results within one view are consistent.
 * Production uses NullFxProvider until a real FX source is wired and
 * verified: cross-currency amounts stay honestly unknown, never guessed.
 */
export function withLandedCosts(
  products: Product[],
  destination: Destination,
  now: Date,
  fx: FxProvider = new NullFxProvider()
): Product[] {
  const { rules, rulesWarnings } = loadRulesFor(destination.country, now);
  const ctx: CalcContext = { rules, eu: EU_MEMBERSHIP, fx, rulesWarnings };
  return products.map((product) => {
    const input = buildLandedCostInput(product, destination);
    if (!input) return product;
    return { ...product, landedCost: calculateLandedCost(input, ctx) };
  });
}

/** Order enriched products by landed cost (see rank.ts for the rules). */
export function orderByLandedCost(products: Product[]): {
  products: Product[];
  topSlotOfferId: string | null;
} {
  const offers: RankedOffer<Product>[] = [];
  const withoutBreakdown: Product[] = [];
  for (const product of products) {
    if (product.landedCost) {
      offers.push({
        offer: product,
        breakdown: product.landedCost,
        itemPriceMinor: dollarsToMinor(product.price) ?? 0,
        merchantId: product.retailer,
        offerId: product.id ?? product.url,
      });
    } else {
      withoutBreakdown.push(product);
    }
  }
  const result: RankResult<Product> = rankByLandedCost(offers);
  return {
    // Products we could not even build an input for sink to the end.
    products: [...result.ranked.map((r) => r.offer), ...withoutBreakdown],
    topSlotOfferId: result.topSlotOfferId,
  };
}

// ── Display summary ────────────────────────────────────────────────────────

export type TotalSummary =
  | { kind: 'unavailable'; reason: string }
  | { kind: 'range'; lowMinor: number; highMinor: number; missing: LineKind[] }
  | { kind: 'subtotal'; totalMinor: number; missing: LineKind[] }
  | { kind: 'total'; totalMinor: number };

/**
 * What a card may say about the total. THE HONESTY RULES LIVE HERE:
 *   - unknown item price (or unknown required import charges) -> the total
 *     is not a number at all, only "estimate unavailable";
 *   - unknown incoterm -> a range, never a point;
 *   - unknown optional components (shipping) -> a subtotal or range that
 *     NAMES what is missing, so a known-components sum can never read as a
 *     full total.
 */
export function summarizeTotal(b: LandedCostBreakdown): TotalSummary {
  const unknown = new Set(b.unknownComponents);
  if (unknown.has('item')) {
    return { kind: 'unavailable', reason: 'Item price could not be converted for this destination.' };
  }
  if (b.lane === 'unknown') {
    return { kind: 'unavailable', reason: 'Import charges are unknown for this seller.' };
  }
  if (b.lane === 'cross-border' && (unknown.has('duty') || unknown.has('tax'))) {
    return { kind: 'unavailable', reason: 'Import charges could not be computed for this destination.' };
  }
  if (b.totalRange) {
    return {
      kind: 'range',
      lowMinor: b.totalRange.lowMinor,
      highMinor: b.totalRange.highMinor,
      missing: b.unknownComponents,
    };
  }
  if (b.unknownComponents.length > 0) {
    return { kind: 'subtotal', totalMinor: b.totalMinor, missing: b.unknownComponents };
  }
  return { kind: 'total', totalMinor: b.totalMinor };
}
