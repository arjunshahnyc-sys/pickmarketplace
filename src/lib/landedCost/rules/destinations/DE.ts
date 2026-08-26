// Germany destination rules. SEEDED, NOT VERIFIED. See rules/seed.ts.
// Intra-EU purchases never reach these rules (the intra-eu lane zeroes
// import charges); these apply to goods entering the EU via Germany.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo } from '../seed';

const TARIC = 'https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp';
const ZOLL = 'https://www.zoll.de/EN/Private-individuals/Postal_consignments_internet_order/postal_consignments_internet_order_node.html';

export const DE: DestinationRules = {
  country: 'DE',
  currency: 'EUR',
  valuationBasis: todo<'CIF' | 'FOB'>(ZOLL, 'EU customs value is CIF-style (goods + transport + insurance to the EU border). Confirm and encode CIF.'),
  dutyRelief: todo<ReliefPolicy>(
    ZOLL,
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
    rateBps: todo(ZOLL, 'German standard VAT rate; reduced rates for some goods.'),
    baseIncludesShipping: todo(ZOLL, 'EU import VAT base is customs value + duty + transport costs to destination; under CIF valuation shipping is already included, so this flag likely stays false. Verify.'),
    threshold: todo<TaxThresholdPolicy>(
      ZOLL,
      'IOSS: merchants can collect VAT at checkout for low-value consignments (encode belowThreshold: "merchant-collects" with the verified ceiling). Verify the regime and amount.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Customs handling fee',
      flatMinor: todo(ZOLL, 'Deutsche Post/DHL Auslagepauschale and courier brokerage schedules.'),
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: TARIC },
};
