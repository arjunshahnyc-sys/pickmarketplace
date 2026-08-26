// Australia destination rules. SEEDED, NOT VERIFIED. See rules/seed.ts.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo } from '../seed';

const ABF = 'https://www.abf.gov.au/importing-exporting-and-manufacturing/importing/how-to-import/buying-online';
const ATO_LVIG = 'https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-on-imported-goods-and-services';

export const AU: DestinationRules = {
  country: 'AU',
  currency: 'AUD',
  valuationBasis: todo<'CIF' | 'FOB'>(ABF, 'Australian customs value is commonly FOB (goods only). Confirm.'),
  dutyRelief: todo<ReliefPolicy>(ABF, 'Verify the AUD low-value duty threshold for imported goods.'),
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(ABF, 'Per-heading rates from the Working Tariff; add rows for curated categories.'),
    },
  ],
  importTax: {
    label: 'GST',
    rateBps: todo(ATO_LVIG, 'GST rate on taxable importations.'),
    baseIncludesShipping: todo(ATO_LVIG, 'GST base for imports is commonly customs value + duty + transport + insurance; under FOB valuation shipping would be ADDED here. Verify.'),
    threshold: todo<TaxThresholdPolicy>(
      ATO_LVIG,
      'Australia makes overseas MERCHANTS collect GST at checkout for low-value imported goods (encode belowThreshold: "merchant-collects" with the verified ceiling). Verify.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Import processing charge',
      flatMinor: todo(ABF, 'ABF import processing charges and courier brokerage schedules.'),
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: ABF },
};
