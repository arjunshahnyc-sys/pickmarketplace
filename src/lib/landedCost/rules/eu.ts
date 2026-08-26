// EU membership table, used to detect the intra-EU lane (no duty, no import
// VAT between member states).
//
// Marked 'unverified' until a human confirms it against the source: while
// membership changes far more slowly than tariff rates, the same rule
// applies to all reference data in this feature. The calculator treats an
// unverified membership table as structural (lane confidence degrades to
// 'estimated' with a warning) rather than monetary (which would be refused
// outright), because a wrong member costs an estimate label, not a wrong
// number presented confidently.

import type { EuMembership } from '../types';

export const EU_MEMBERSHIP: EuMembership = {
  members: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  ],
  sourceUrl: 'https://european-union.europa.eu/principles-countries-history/eu-countries_en',
  lastVerified: null,
  verification: 'unverified',
};
