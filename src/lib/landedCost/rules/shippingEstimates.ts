// Shipping-estimate rate routes: published USPS retail international rates
// from the US to each destination, weight-banded. SEEDED, NOT VERIFIED:
// every band ships as todo() until the live-verification pass fills it in
// (same lifecycle as the customs rules; see seed.ts). An unverified band
// yields NO estimate — shipping stays honestly unknown.
//
// WHY USPS RETAIL: it is the one published, verifiable, origin-US parcel
// tariff (Notice 123 price lists). Merchants ship on cheaper commercial or
// pricier express terms, which is exactly why every estimate built from
// these rows is capped at 'estimated' and states its service and assumed
// weight. Bands sit on USPS's pound steps: 1/2/3/5/10 lb.

import type { ShippingEstimateRoute, SourcedValue } from '../types';
import { todo } from './seed';
import { RULES_MAX_AGE_DAYS, walkSourcedValues } from './loader';

const NOTICE_123 = 'https://pe.usps.com/text/dmm300/Notice123.htm';

// USPS pound steps in grams (1 lb = 453.6 g, rounded up so a nominal
// "1 lb" item never falls out of its band).
const LB_1 = 454;
const LB_2 = 908;
const LB_3 = 1_361;
const LB_5 = 2_268;
const LB_10 = 4_536;

function seededRoute(destination: string, notes: string): ShippingEstimateRoute {
  const band = (maxGrams: number): { maxGrams: number; costMinor: SourcedValue<number> } => ({
    maxGrams,
    costMinor: todo(
      NOTICE_123,
      `USPS Priority Mail International retail rate, US to ${destination}, up to ${maxGrams} g (${Math.round(maxGrams / 453.6)} lb step).`
    ),
  });
  return {
    origin: 'US',
    destination,
    currency: 'USD',
    service: 'USPS Priority Mail International',
    bands: [band(LB_1), band(LB_2), band(LB_3), band(LB_5), band(LB_10)],
    meta: { sourceUrl: NOTICE_123, notes },
  };
}

const ROUTES: Record<string, ShippingEstimateRoute> = {
  'US:GB': seededRoute('GB', 'Verify the price group the UK falls in.'),
  'US:DE': seededRoute('DE', 'Verify the price group Germany falls in.'),
  'US:FR': seededRoute('FR', 'Verify the price group France falls in.'),
  'US:CA': seededRoute('CA', 'Canada has its own PMI price tier.'),
  'US:AU': seededRoute('AU', 'Verify the price group Australia falls in.'),
  'US:JP': seededRoute('JP', 'Verify the price group Japan falls in.'),
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
