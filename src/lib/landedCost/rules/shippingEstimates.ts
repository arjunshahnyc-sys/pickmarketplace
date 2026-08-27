// Shipping-estimate rate routes: published USPS retail international rates
// from the US to each destination, weight-banded. Verified 2026-08-27
// against the live Notice 123 (effective July 12, 2026): every price cell,
// weight row, and country-to-price-group assignment re-fetched and matched
// verbatim; owner-approved (Customs Rules Worksheet, round 3).
//
// BENCHMARK (owner decision S1): blended by band. First-Class Package
// International Service retail for the 1/2/3/4 lb bands (it tracks what
// merchants actually charge far closer than PMI), Priority Mail
// International retail for 5 lb and 10 lb (FCPIS ceiling is 4 lb). Known
// caveat: the IMM's FCPIS contents-value limit is not modeled, so a light
// but expensive item may be estimated on a service it technically exceeds.
// Merchants ship on cheaper commercial or pricier express terms too, which
// is why every estimate is capped at 'estimated' and states its service
// and assumed weight.

import type { ShippingEstimateRoute, SourcedValue } from '../types';
import { verified } from './seed';
import { RULES_MAX_AGE_DAYS, walkSourcedValues } from './loader';

const NOTICE_123 = 'https://pe.usps.com/text/dmm300/Notice123.htm';
const V = '2026-08-27';

const SERVICE =
  'USPS retail (First-Class Package International up to 4 lb, Priority Mail International above)';

// USPS pound steps in grams (1 lb = 453.6 g, rounded up so a nominal
// "1 lb" item never falls out of its band).
const STEPS: Array<{ maxGrams: number; label: string }> = [
  { maxGrams: 454, label: 'FCPIS retail, weight not over 16 oz' },
  { maxGrams: 908, label: 'FCPIS retail, weight not over 32 oz' },
  { maxGrams: 1_361, label: 'FCPIS retail, weight not over 48 oz' },
  { maxGrams: 1_814, label: 'FCPIS retail, weight not over 64 oz' },
  { maxGrams: 2_268, label: 'PMI retail, weight not over 5 lb' },
  { maxGrams: 4_536, label: 'PMI retail, weight not over 10 lb' },
];

function route(
  destination: string,
  priceGroup: number,
  // [FCPIS 1lb, 2lb, 3lb, 4lb, PMI 5lb, PMI 10lb] in US cents.
  cents: [number, number, number, number, number, number]
): ShippingEstimateRoute {
  const bands = STEPS.map((step, i): { maxGrams: number; costMinor: SourcedValue<number> } => ({
    maxGrams: step.maxGrams,
    costMinor: verified(
      cents[i],
      NOTICE_123,
      V,
      `${step.label}, price group ${priceGroup}. Notice 123 effective 2026-07-12.`
    ),
  }));
  return {
    origin: 'US',
    destination,
    currency: 'USD',
    service: SERVICE,
    bands,
    meta: {
      sourceUrl: NOTICE_123,
      notes: `US to ${destination}: USPS price group ${priceGroup} for both FCPIS and PMI (Country Price Groups table, verified 2026-08-27).`,
    },
  };
}

const ROUTES: Record<string, ShippingEstimateRoute> = {
  'US:GB': route('GB', 20, [3_195, 3_570, 4_925, 6_425, 9_445, 11_840]),
  'US:DE': route('DE', 16, [2_995, 3_285, 4_860, 6_625, 9_985, 12_715]),
  'US:FR': route('FR', 15, [2_940, 3_285, 4_775, 6_505, 8_835, 11_350]),
  'US:CA': route('CA', 1, [2_600, 2_905, 3_850, 4_760, 5_905, 8_625]),
  'US:AU': route('AU', 12, [4_125, 4_605, 6_525, 7_910, 10_665, 16_615]),
  'US:JP': route('JP', 17, [3_395, 3_790, 5_645, 7_190, 8_360, 11_155]),
};

export function getShippingEstimateRoute(
  origin: string,
  destination: string,
  table: Record<string, ShippingEstimateRoute> = ROUTES
): ShippingEstimateRoute | null {
  return table[`${origin}:${destination}`] ?? null;
}

/** Staleness warnings for verified bands, same policy as the rules loader. */
export function collectShippingWarnings(route: ShippingEstimateRoute, now: Date): string[] {
  const warnings: string[] = [];
  for (const { path, row } of walkSourcedValues(route)) {
    if (row.verification !== 'verified' || !row.lastVerified) continue;
    const ageDays = Math.floor((now.getTime() - new Date(row.lastVerified).getTime()) / 86_400_000);
    if (ageDays > RULES_MAX_AGE_DAYS) {
      warnings.push(
        `Shipping estimate ${route.origin}:${route.destination}.${path} was last verified ${ageDays} days ago (max ${RULES_MAX_AGE_DAYS}); re-verify against ${row.sourceUrl}.`
      );
    }
  }
  return warnings;
}
