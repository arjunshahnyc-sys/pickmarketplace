// Glue between scraped offers and the landed-cost core: build a
// LandedCostInput from a feed Product, compute the breakdown, and shape the
// result for ranking and display. Pure and clock-injected, so it runs the
// same on client and server and is fully testable.

import type { Product } from '../types';
import type { MerchantShippingPolicy } from '../trust/registry';
import { minorUnitExponent } from './money';
import { calculateLandedCost, type CalcContext } from './calculate';
import { resolveHsCodeSync } from './classify';
import { fineCategoryFor } from './classify/fineCategory';
import { typicalShippedWeight } from './classify/weightEstimates';
import { NullFxProvider, type FxProvider } from './fx';
import { getShippingPolicy, merchantInputFor } from './merchants';
import { rankByLandedCost, type RankedOffer, type RankResult } from './rank';
import { EU_MEMBERSHIP } from './rules/eu';
import { loadRulesFor, RULES_MAX_AGE_DAYS } from './rules/loader';
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
  /** Subdivision (US state) for domestic sales tax; undefined = not chosen. */
  subdivision?: string;
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
  // Domestic estimation is allowed too (the US:US route exists); lanes
  // without an encoded route simply stay unknown.
  if (!merchantCountry) return undefined;
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

/**
 * THE SHIPPING SOURCE HIERARCHY. Every tier is grounded in someone's
 * published number; there is deliberately no default tier at the bottom.
 *   Tier 1 - a real per-offer quote: does not exist today (probed live
 *     2026-08-31: the feed carries no delivery field). When a source ever
 *     quotes shipping, it enters here as confidence 'exact'.
 *   Tier 2 - the merchant's own PUBLISHED shipping policy, from the trust
 *     registry (free-over threshold honored against this item's price, or
 *     a published flat standard rate). US domestic only for now by owner
 *     decision 2026-09-01. Confidence 'estimated' (policies carry
 *     conditions and exclusions), provenance = the policy page.
 *   Tier 3 - carrier-published retail rate tables (USPS) by weight class.
 *   No tier resolves -> undefined -> the shipping line is honestly unknown.
 */
export function resolveShipping(args: {
  categoryId: string | undefined;
  merchantCountry: string | undefined;
  destinationCountry: string;
  itemPriceMinor: number;
  itemCurrency: string;
  policy?: MerchantShippingPolicy;
  now: Date;
}): LandedCostInput['shipping'] | undefined {
  const { policy } = args;
  const domesticUs =
    args.merchantCountry === 'US' && args.destinationCountry === 'US';
  if (policy && domesticUs && policy.currency === args.itemCurrency) {
    const host = policy.policyUrl.replace(/^https:\/\/(www\.)?/, '').split('/')[0];
    const staleWarning = policyStaleness(policy, args.now);
    const conditions = policy.conditions
      ? ` Free-shipping conditions: ${policy.conditions}`
      : '';
    const fromPolicy = (
      costMinor: number,
      rule: string,
      basis: string
    ): LandedCostInput['shipping'] => ({
      costMinor,
      currency: policy.currency,
      confidence: 'estimated',
      sourceId: `shipping-policy:${host}:${rule}`,
      basis,
      assumption: `Shipping follows ${host}'s published standard-shipping policy, assuming a single-item order; oversized items and remote addresses can differ.${conditions}`,
      warning: staleWarning,
    });
    const alwaysFree = policy.alwaysFree;
    if (alwaysFree?.verification === 'verified' && alwaysFree.value === true) {
      return fromPolicy(0, 'always-free', `Free standard shipping per ${host}'s published policy`);
    }
    const freeOver = policy.freeOverMinor;
    if (
      freeOver?.verification === 'verified' &&
      freeOver.value !== null &&
      args.itemPriceMinor >= freeOver.value
    ) {
      return fromPolicy(
        0,
        'free-over',
        `Free standard shipping on orders of ${(freeOver.value / 100).toFixed(2)} ${policy.currency} or more, per ${host}'s published policy`
      );
    }
    const flat = policy.flatBelowMinor;
    if (flat?.verification === 'verified' && flat.value !== null) {
      return fromPolicy(
        flat.value,
        'flat',
        `Standard shipping ${(flat.value / 100).toFixed(2)} ${policy.currency}, per ${host}'s published policy`
      );
    }
    // The policy has no verified rule that covers this order value (e.g.
    // below a free-over threshold with an unpublished base rate): fall
    // through to the carrier benchmark rather than inventing a number.
  }
  return estimateShipping(args.categoryId, args.merchantCountry, args.destinationCountry);
}

function policyStaleness(policy: MerchantShippingPolicy, now: Date): string | undefined {
  const dates = [policy.freeOverMinor, policy.flatBelowMinor, policy.alwaysFree]
    .map((sv) => sv?.lastVerified)
    .filter((d): d is string => Boolean(d));
  if (dates.length === 0) return undefined;
  const oldest = dates.sort()[0];
  const ageDays = Math.floor((now.getTime() - new Date(oldest).getTime()) / 86_400_000);
  if (ageDays > RULES_MAX_AGE_DAYS) {
    return `The merchant's shipping policy was last verified ${ageDays} days ago (max ${RULES_MAX_AGE_DAYS}); re-verify against ${policy.policyUrl}.`;
  }
  return undefined;
}

export function buildLandedCostInput(
  product: Product,
  destination: Destination,
  now: Date = new Date()
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
    // The sources never quote shipping; the policy tier and the carrier
    // benchmark stand in where their data allows, and shipping stays
    // unknown otherwise.
    shipping: resolveShipping({
      categoryId,
      merchantCountry: merchant.country,
      destinationCountry: destination.country,
      itemPriceMinor: priceMinor,
      itemCurrency: currency,
      policy: getShippingPolicy(product.retailer, product.sourceMarket),
      now,
    }),
    destination,
  };
}

// ── Breakdown memo ─────────────────────────────────────────────────────────
// Rules and policy tables are in-process data, but recomputing ~100
// breakdowns on every filter/sort/render toggle is wasted work. Entries are
// keyed by everything the result depends on (offer identity + price +
// merchant + market, full destination incl. subdivision, and the FX
// SNAPSHOT identity) and carry a TTL: an expired entry is recomputed, never
// served as fresh. Results built on a provider with no cacheKey (the null
// provider's loading state, test fixtures) are never cached at all.
const BREAKDOWN_TTL_MS = 6 * 60 * 60 * 1000; // aligned with the FX snapshot TTL
const BREAKDOWN_CACHE_MAX = 2000;
const breakdownCache = new Map<string, { breakdown: LandedCostBreakdown; expiresAt: number }>();

function breakdownCacheKey(
  product: Product,
  destination: Destination,
  fxKey: string
): string {
  return [
    product.id ?? product.url,
    product.price,
    product.currency ?? 'USD',
    product.retailer,
    product.sourceMarket ?? 'US',
    destination.country,
    destination.subdivision ?? '',
    destination.currency,
    fxKey,
  ].join('|');
}

/** Exported for tests only. */
export function clearBreakdownCacheForTests(): void {
  breakdownCache.clear();
}

/**
 * Attach a breakdown to every product. `now` feeds staleness checks only;
 * pass a stable value per render so results within one view are consistent.
 * Cross-currency amounts without an FX provider stay honestly unknown,
 * never guessed.
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
  const fxKey = fx.cacheKey;
  return products.map((product) => {
    const cacheKey = fxKey ? breakdownCacheKey(product, destination, fxKey) : null;
    if (cacheKey) {
      const hit = breakdownCache.get(cacheKey);
      if (hit && hit.expiresAt > now.getTime()) {
        return { ...product, landedCost: hit.breakdown };
      }
      if (hit) breakdownCache.delete(cacheKey); // expired: recompute, never serve
    }
    const input = buildLandedCostInput(product, destination, now);
    if (!input) return product;
    const breakdown = calculateLandedCost(input, ctx);
    if (cacheKey) {
      if (breakdownCache.size >= BREAKDOWN_CACHE_MAX) breakdownCache.clear();
      breakdownCache.set(cacheKey, { breakdown, expiresAt: now.getTime() + BREAKDOWN_TTL_MS });
    }
    return { ...product, landedCost: breakdown };
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

/** Why a total is unavailable; 'fx' lets the UI show a loading state while
 * rates are still on their way instead of a wrong-looking "unavailable". */
export type UnavailableCode = 'fx' | 'unknown-seller' | 'import-charges';

export type TotalSummary =
  | { kind: 'unavailable'; reason: string; code: UnavailableCode }
  | { kind: 'range'; lowMinor: number; highMinor: number; missing: LineKind[] }
  | { kind: 'subtotal'; totalMinor: number; missing: LineKind[] }
  | { kind: 'total'; totalMinor: number };

/**
 * What a card may say about the total. THE HONESTY RULES LIVE HERE:
 *   - unknown item price (or unknown required import charges) -> the total
 *     is not a number at all, only "unavailable" with the reason;
 *   - unknown incoterm -> a range, never a point;
 *   - unknown optional components (shipping, sales tax) -> a subtotal or
 *     range that NAMES what is missing, so a known-components sum can never
 *     read as a full total.
 * The kinds map one-to-one onto rank.ts totalResolution buckets (tested):
 * total/range-with-nothing-missing = resolved; subtotal/range-with-gaps =
 * partial; unavailable = unavailable.
 */
export function summarizeTotal(b: LandedCostBreakdown): TotalSummary {
  const unknown = new Set(b.unknownComponents);
  if (unknown.has('item')) {
    return {
      kind: 'unavailable',
      reason: 'Item price could not be converted for this destination.',
      code: 'fx',
    };
  }
  if (b.lane === 'unknown') {
    return {
      kind: 'unavailable',
      reason: 'Import charges are unknown for this seller.',
      code: 'unknown-seller',
    };
  }
  if (b.lane === 'cross-border' && (unknown.has('duty') || unknown.has('tax'))) {
    return {
      kind: 'unavailable',
      reason: 'Import charges could not be computed for this destination.',
      code: 'import-charges',
    };
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
