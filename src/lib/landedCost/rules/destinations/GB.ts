// United Kingdom destination rules. SEEDED, NOT VERIFIED. See rules/seed.ts.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo } from '../seed';

const TARIFF = 'https://www.trade-tariff.service.gov.uk/';
const GOV_IMPORT = 'https://www.gov.uk/goods-sent-from-abroad';

export const GB: DestinationRules = {
  country: 'GB',
  currency: 'GBP',
  valuationBasis: todo<'CIF' | 'FOB'>(
    GOV_IMPORT,
    'UK import VAT is commonly assessed on goods + shipping + duty (CIF-style base). Confirm the customs valuation basis for duty separately.'
  ),
  dutyRelief: todo<ReliefPolicy>(GOV_IMPORT, 'Check the current duty de minimis for consumer imports.'),
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIFF, 'Per-heading rates from the UK Trade Tariff; add rows for curated categories.'),
    },
  ],
  importTax: {
    label: 'Import VAT',
    rateBps: todo(GOV_IMPORT, 'Standard VAT rate; reduced rates exist for some goods.'),
    baseIncludesShipping: todo(GOV_IMPORT),
    threshold: todo<TaxThresholdPolicy>(
      GOV_IMPORT,
      'The UK has a low-value regime where the MERCHANT collects VAT at checkout below a threshold (encode belowThreshold: "merchant-collects" with the verified amount). Verify the current threshold and whether it survives.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Handling fee',
      flatMinor: todo(GOV_IMPORT, 'Royal Mail / Parcelforce handling fees and courier brokerage schedules.'),
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: TARIFF },
};
