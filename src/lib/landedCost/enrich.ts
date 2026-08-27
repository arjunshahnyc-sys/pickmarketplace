// Glue between scraped offers and the landed-cost core: build a
// LandedCostInput from a feed Product, compute the breakdown, and shape the
// result for ranking and display. Pure and clock-injected, so it runs the
// same on client and server and is fully testable.

import type { Product } from '../types';
import { minorUnitExponent } from './money';
import { calculateLandedCost, type CalcContext } from './calculate';
import { resolveHsCodeSync } from './classify';
import { fineCategoryFor } from './classify/fineCategory';
import { typicalShippedWeight } from './classify/weightEstimates';
import { NullFxProvider, type FxProvider } from './fx';
import { merchantInputFor } from './merchants';
import { rankByLandedCost, type RankedOffer, type RankResult } from './rank';
import { EU_MEMBERSHIP } from './rules/eu';
import { loadRulesFor } from './rules/loader';
import { collectShippingWarnings, getShippingEstimateRoute } from './rules/shippingEstimates';
import type {
  LandedCostBreakdown,
  LandedCostInput,
  LineKind,
  ShippingEstimateRoute,
} from './types';

/**
 * THE FLOAT BOUNDARY. Feed prices arrive as float major units (scrapers
 * parse "  $15.99 " or "£174.99" into a number); this is the single place a
 * float becomes integer minor units, exponent-aware per currency. Returns
 * null for garbage instead of guessing.
 */
export function priceToMinor(price: number, currency: string): number | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return null;
  const minor = Math.round(price * 10 ** minorUnitExponent(currency));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Legacy name for the USD case; prefer priceToMinor. */
export function dollarsToMinor(price: number): number | null {
  return priceToMinor(price, 'USD');
}

export interface Destination {
  country: string;
  currency: string;
}

/**
 * Build a labeled cross-border shipping ESTIMATE when the sources have no
 * quote (they never do today): typical shipped weight for the category ->
 * weight band -> verified published retail rate for the route. Any missing
 * link (no weight entry, no route, over the last band, unverified band)
 * returns undefined and shipping stays honestly unknown.
 */
export function estimateShipping(
  categoryId: string | undefined,
  merchantCountry: string | undefined,
  destinationCountry: string,
  routeTable?: Record<string, ShippingEstimateRoute>
): LandedCostInput['shipping'] | undefined {
  if (!merchantCountry || merchantCountry === destinationCountry) return undefined;
  const weight = typicalShippedWeight(categoryId);
  if (!weight) return undefined;
  const route = routeTable
    ? getShippingEstimateRoute(merchantCountry, destinationCountry, routeTable)
    : getShippingEstimateRoute(merchantCountry, destinationCountry);
  if (!route) return undefined;
  const band = route.bands.find((b) => weight.grams <= b.maxGrams);
  if (!band) return undefined;
  const row = band.costMinor;
  if (row.value === null || row.verification !== 'verified') return undefined;
  return {
    costMinor: row.value,
    currency: route.currency,
    confidence: 'estimated',
    sourceId: `shipping-estimate:${route.origin}:${route.destination}:${band.maxGrams}g`,
    basis: `Estimated: ${route.service}, typical ${weight.label} weight ~${weight.grams} g`,
    assumption: `Shipping is estimated from ${route.service} retail rates at a typical weight for this product type; the merchant's actual shipping charge will differ.`,
  };
}

export function buildLandedCostInput(
  product: Product,
  destination: Destination
): LandedCostInput | null {
  const currency = product.currency ?? 'USD';
  const priceMinor = priceToMinor(product.price, currency);
  if (priceMinor === null) return null;
  // The feed's display category is often too coarse ('Electronics') for the
  // curated tables; re-derive a fine key from the product name for
  // classification and weight lookups.
  const categoryId = fineCategoryFor(product.name, product.category);
  const hs = resolveHsCodeSync({
    name: product.name,
    brand: product.brand,
    categoryId,
  });
  const merchant = merchantInputFor(product.retailer, product.sourceMarket);
  return {
    item: {
      priceMinor,
      currency,
      categoryId,
      hs: hs ?? undefined,
    },
    merchant,
    // The sources never quote shipping; a labeled estimate stands in where
    // the tables allow, and shipping stays unknown otherwise.
    shipping: estimateShipping(categoryId, merchant.country, destination.country),
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
  const shippingRoute = getShippingEstimateRoute('US', destination.country);
  const ctx: CalcContext = {
    rules,
    eu: EU_MEMBERSHIP,
    fx,
    rulesWarnings: [
      ...rulesWarnings,
      ...(shippingRoute ? collectShippingWarnings(shippingRoute, now) : []),
    ],
  };
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
        itemPriceMinor: priceToMinor(product.price, product.currency ?? 'USD') ?? 0,
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
