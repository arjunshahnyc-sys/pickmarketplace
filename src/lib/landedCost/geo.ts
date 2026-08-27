// Country-level geolocation default for the destination picker. Pure logic;
// the header read lives in /api/geo.
//
// PRIVACY POSTURE: country only, derived by Vercel from the request IP
// (x-vercel-ip-country). Nothing is stored server-side, the client persists
// only EXPLICIT picker choices, and the shopper can change the default at
// any time. Disclosed on the compliance page's landed-cost section.

import { getDestinationRules } from './rules/loader';

export interface GeoDestination {
  country: string;
  currency: string;
}

/**
 * The destination to default to for a visitor from `countryCode`, or null
 * when the code is missing or not a supported destination (an unsupported
 * country gets the regular US default rather than a wrong neighbor).
 */
export function geoDefaultDestination(
  countryCode: string | null | undefined
): GeoDestination | null {
  if (!countryCode) return null;
  const country = countryCode.trim().toUpperCase();
  const rules = getDestinationRules(country);
  if (!rules) return null;
  return { country, currency: rules.currency };
}
