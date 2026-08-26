// Canada destination rules. SEEDED, NOT VERIFIED. See rules/seed.ts.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo } from '../seed';

const CBSA = 'https://www.cbsa-asfc.gc.ca/import/postal-postale/menu-eng.html';
const TARIFF = 'https://www.cbsa-asfc.gc.ca/trade-commerce/tariff-tarif/menu-eng.html';
const CRA_GST = 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html';

export const CA: DestinationRules = {
  country: 'CA',
  currency: 'CAD',
  valuationBasis: todo<'CIF' | 'FOB'>(
    TARIFF,
    'Confirm whether duty is assessed on goods value alone (FOB-style) or goods + freight.'
  ),
  dutyRelief: todo<ReliefPolicy>(
    CBSA,
    'De minimis differs by shipment channel (postal vs courier under CUSMA) and by origin. Encode the rule for the dominant channel and note the divergence, or model the conservative case.'
  ),
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIFF, 'Per-heading rates from the Canadian Customs Tariff; add rows for curated categories.'),
    },
  ],
  importTax: {
    label: 'GST/HST',
    rateBps: todo(
      CRA_GST,
      'GST 5% federal; HST provinces differ (subdivision-dependent). Encode the federal floor first; provincial handling may need the destination.subdivision field.'
    ),
    baseIncludesShipping: todo(CRA_GST),
    threshold: todo<TaxThresholdPolicy>(CBSA, 'Tax de minimis differs from duty de minimis for courier shipments; verify both separately.'),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Brokerage fee',
      flatMinor: todo(CBSA, 'Courier brokerage schedules (Canada Post handling fee, UPS/FedEx brokerage tariffs).'),
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: CBSA },
};
