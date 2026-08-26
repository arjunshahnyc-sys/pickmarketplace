// France destination rules. SEEDED, NOT VERIFIED. See rules/seed.ts.
// Intra-EU purchases never reach these rules; they apply to goods entering
// the EU via France.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo } from '../seed';

const TARIC = 'https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp';
const DOUANE = 'https://www.douane.gouv.fr/fiche/receiving-parcel-abroad';

export const FR: DestinationRules = {
  country: 'FR',
  currency: 'EUR',
  valuationBasis: todo<'CIF' | 'FOB'>(DOUANE, 'EU customs value is CIF-style. Confirm and encode CIF.'),
  dutyRelief: todo<ReliefPolicy>(
    DOUANE,
    'Owner note 2026-08-26: the EU EUR 150 duty relief threshold was abolished 1 Jul 2026. If confirmed, encode { kind: "none" }.'
  ),
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIC, 'Per-heading rates from TARIC; add rows for curated categories.'),
    },
  ],
  importTax: {
    label: 'Import VAT',
    rateBps: todo(DOUANE, 'French standard VAT rate; reduced rates for some goods.'),
    baseIncludesShipping: todo(DOUANE, 'Likely false under CIF valuation (already included). Verify.'),
    threshold: todo<TaxThresholdPolicy>(DOUANE, 'IOSS merchant-collects regime; verify ceiling and encode belowThreshold accordingly.'),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Customs handling fee',
      flatMinor: todo(DOUANE, 'La Poste/Chronopost presentation fees and courier brokerage schedules.'),
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: TARIC },
};
