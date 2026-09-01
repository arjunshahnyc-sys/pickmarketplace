// Geolocation default for the destination picker. Pure logic; the header
// read lives in /api/geo.
//
// PRIVACY POSTURE: country plus, for US visitors, the state-level region,
// both derived by Vercel from the request IP (x-vercel-ip-country,
// x-vercel-ip-country-region). Nothing is stored server-side, the client
// persists only EXPLICIT picker choices, and the shopper can change the
// default at any time. Disclosed on the compliance page's landed-cost
// section. The state feeds only the sales-tax estimate; without it the tax
// line stays honestly unknown until the shopper picks a state.

import { getDestinationRules } from './rules/loader';
import { US_STATE_CODES } from './rules/usSalesTax';

export interface GeoDestination {
  country: string;
  currency: string;
  /** US state code when the visitor is in the US and the region resolves. */
  subdivision?: string;
}

/**
 * The destination to default to for a visitor from `countryCode`, or null
 * when the code is missing or not a supported destination (an unsupported
 * country gets the regular US default rather than a wrong neighbor).
 */
export function geoDefaultDestination(
  countryCode: string | null | undefined,
  regionCode?: string | null
): GeoDestination | null {
  if (!countryCode) return null;
  const country = countryCode.trim().toUpperCase();
  const rules = getDestinationRules(country);
  if (!rules) return null;
  const destination: GeoDestination = { country, currency: rules.currency };
  if (country === 'US' && regionCode) {
    const region = regionCode.trim().toUpperCase();
    if (US_STATE_CODES.includes(region)) destination.subdivision = region;
  }
  return destination;
}
