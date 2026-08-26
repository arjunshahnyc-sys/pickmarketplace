// United States destination rules. SEEDED, NOT VERIFIED: every value is
// null/unverified until checked against the sources. See rules/seed.ts.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo } from '../seed';

const CBP = 'https://www.cbp.gov/trade/basic-import-export/internet-purchases';
const HTSUS = 'https://hts.usitc.gov/';
const VALUATION = 'https://www.cbp.gov/trade/programs-administration/trade-valuation';

export const US: DestinationRules = {
  country: 'US',
  currency: 'USD',
  valuationBasis: todo<'CIF' | 'FOB'>(
    VALUATION,
    'US customs value is transaction value, commonly excluding international freight (FOB-style). Confirm and encode FOB if correct.'
  ),
  dutyRelief: todo<ReliefPolicy>(
    CBP,
    'Owner note 2026-08-26: the $800 de minimis was suspended for ALL origins effective 29 Aug 2025; CBP made the suspension indefinite by interim final rule on 24 Jun 2026; statutory elimination is scheduled 1 Jul 2027. If confirmed, encode { kind: "none" }.'
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
    rateBps: todo(
      CBP,
      'The US has no federal VAT/GST on imports. If confirmed, encode 0 with verification. State use tax is out of scope (stated as an assumption by the calculator for domestic purchases).'
    ),
    baseIncludesShipping: todo(CBP),
    threshold: todo<TaxThresholdPolicy>(
      CBP,
      'Likely { kind: "none" } given no federal import tax; verify.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Brokerage and processing fees',
      flatMinor: todo(
        CBP,
        'Check both CBP merchandise processing fee (MPF) for informal entries and typical express-carrier brokerage schedules (FedEx/UPS/DHL published tariffs).'
      ),
      pctBps: todo(CBP, 'MPF has ad valorem components on formal entries; verify applicability to consumer parcels.'),
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: {
    sourceUrl: CBP,
    notes: 'Primary sources: CBP (de minimis, fees), HTSUS via USITC (duty rates by heading and origin).',
  },
};
