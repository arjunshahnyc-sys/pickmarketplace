// EU membership table, used to detect the intra-EU lane (no duty, no import
// VAT between member states).
//
// Verified 2026-08-26 against the fetched europa.eu country listing: exactly
// 27 member states, matching this list one-to-one (adversarially re-checked
// the same day). An unverified table would degrade the intra-EU lane to
// 'estimated' with a warning; a verified one lets it be structural fact.

import type { EuMembership } from '../types';

export const EU_MEMBERSHIP: EuMembership = {
  members: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  ],
  sourceUrl: 'https://european-union.europa.eu/principles-countries-history/eu-countries_en',
  lastVerified: '2026-08-26',
  verification: 'verified',
};
