// United States destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved; see the Customs Rules Worksheet artifact).
// Per-HS duty rates remain unfilled pending HTSUS lookups.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo, verified } from '../seed';

const V = '2026-08-26';
const HTSUS = 'https://hts.usitc.gov/';

export const US: DestinationRules = {
  country: 'US',
  currency: 'USD',
  valuationBasis: verified<'CIF' | 'FOB'>(
    'FOB',
    'https://www.ecfr.gov/current/title-19/chapter-I/part-152/subpart-E/section-152.102',
    V,
    '19 CFR 152.102(f): transaction value is exclusive of transportation, insurance, and related services incident to the international shipment. Foreign inland freight to the place of export can be included in some fact patterns.'
  ),
  dutyRelief: verified<ReliefPolicy>(
    { kind: 'none' },
    'https://www.federalregister.gov/documents/2026/06/24/2026-12670/indefinite-suspension-of-the-de-minimis-exemption-for-merchandise-arriving-through-all-modes-other',
    V,
    'The $800 Section 321 de minimis is suspended for all origins: EO 14324 effective 2025-08-29; CBP interim final rule made it indefinite for non-postal modes effective 2026-06-24, with companion postal rule 2026-12669 effective 2026-07-24; statutory repeal takes effect 2027-07-01. Bona fide gifts and traveler personal articles keep their separate exemptions (not modeled).'
  ),
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(
        HTSUS,
        'No single default exists; rates are per HS heading and, for some origins, origin-specific (e.g. China surcharges: encode COMBINED rates in originCountry rows). Add per-heading rows from HTSUS for the curated categories.'
      ),
    },
  ],
  importTax: {
    label: 'Import tax',
    rateBps: verified(
      0,
      'https://www.help.cbp.gov/s/article/Article-1225?language=en_US',
      V,
      'The US levies no federal VAT/GST on imports: CBP enumerates only duty, commodity-specific excise (alcohol/tobacco, out of scope), and user fees. State sales/use tax is outside customs and stated as an assumption for domestic purchases.'
    ),
    baseIncludesShipping: verified(
      false,
      'https://www.help.cbp.gov/s/article/Article-1225?language=en_US',
      V,
      'Vacuous at a 0% rate; false matches the FOB pattern (ad valorem MPF is computed on merchandise value excluding freight and insurance).'
    ),
    threshold: verified<TaxThresholdPolicy>(
      { kind: 'none' },
      'https://www.help.cbp.gov/s/article/Article-1225?language=en_US',
      V,
      'Vacuous: no federal import tax exists, so there is no tax threshold. Distinct from the (suspended) duty de minimis.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Customs processing fee',
      flatMinor: verified(
        739,
        'https://www.cbp.gov/trade/basic-import-export/user-fee-table',
        V,
        'CBP dutiable mail fee, $7.39 per dutiable package (FY2026; adjusts annually). Courier/ACE informal-entry MPF tiers are $2.69/$8.06/$12.09; private-courier brokerage fees are separate and commercial. Postal figure chosen as the per-package default per owner decision 2026-08-26.'
      ),
      onlyWhenChargesDue: true,
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: {
    sourceUrl: 'https://www.cbp.gov/trade/basic-import-export/internet-purchases',
    notes: 'Primary sources: eCFR 19 CFR 152 (valuation), Federal Register (de minimis), CBP (fees), HTSUS via USITC (duty rates by heading and origin, still unfilled).',
  },
};
