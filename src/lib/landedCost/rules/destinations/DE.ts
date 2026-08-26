// Germany destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved). Intra-EU purchases never reach these rules;
// they apply to goods entering the EU via Germany.
//
// The EU transitional regime (2026-07-01 to 2028-07-01) is encoded as a
// flat-below-threshold policy: EUR 3 per item at or under EUR 150, ad
// valorem TARIC rates above. The sunset date is inside the 90-day staleness
// window many times over, so re-verification will catch the 2028 switch.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo, verified } from '../seed';

const V = '2026-08-26';
const TARIC = 'https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp';
const ZOLL_ASSESS = 'https://www.zoll.de/EN/Private-individuals/Postal_consignments_internet_order/Shipments-from-a-non-EU-country/Duties-and-taxes/Assessment-of-taxes-and-duties/assessment-of-taxes-and-duties_node.html';

export const DE: DestinationRules = {
  country: 'DE',
  currency: 'EUR',
  valuationBasis: verified<'CIF' | 'FOB'>(
    'CIF',
    ZOLL_ASSESS,
    V,
    'EU customs value includes transport/postage (and insurance); zoll.de states full postage up to the domestic destination is counted for commercial postal imports (broader than border-CIF under UCC Art. 71).'
  ),
  dutyRelief: verified<ReliefPolicy>(
    {
      kind: 'flat-below-threshold',
      amountMinor: 15_000,
      basis: 'intrinsic-goods-value',
      flatDutyMinorPerItem: 300,
    },
    'https://taxation-customs.ec.europa.eu/news/guidance-and-legal-text-temporary-flat-fee-low-value-imports-which-will-apply-until-1-july-2028-2026-06-08_en',
    V,
    'The EUR 150 duty exemption ended 2026-07-01 (zoll.de and the European Commission both confirm); replaced by a temporary flat EUR 3 per-item duty on consignments up to EUR 150, in force until 2028-07-01, after which normal ad valorem rates resume. Threshold basis follows the intrinsic-value test the EU uses for low-value consignments.'
  ),
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIC, 'Ad valorem TARIC rates apply only ABOVE the EUR 150 flat-fee band; add per-heading rows for curated categories.'),
    },
  ],
  importTax: {
    label: 'Import VAT',
    rateBps: verified(
      1_900,
      ZOLL_ASSESS,
      V,
      'German import VAT (Einfuhrumsatzsteuer) standard rate 19%; reduced 7% for selected goods (food, books). 1900 bps is the standard-rate default.'
    ),
    baseIncludesShipping: verified(
      true,
      ZOLL_ASSESS,
      V,
      'Import VAT base is the customs value (which includes postage) plus customs duty, plus excise where applicable. Inert under CIF in the engine (never double-added); recorded for the economics.'
    ),
    threshold: verified<TaxThresholdPolicy>(
      { kind: 'threshold', amountMinor: 15_000, basis: 'intrinsic-goods-value', belowThreshold: 'merchant-collects' },
      'https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en',
      V,
      'IOSS: registered sellers/marketplaces collect VAT at checkout for consignments of intrinsic value up to EUR 150 (ceiling unchanged by the 2026 duty reform). IOSS is OPTIONAL for the seller; non-IOSS parcels are taxed at the border from EUR 0 (no low-value VAT exemption since 2021). The engine words this as an assumption.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Customs handling fee',
      flatMinor: verified(
        750,
        'https://www.dhl.de/en/privatkunden/hilfe-kundenservice/themen/international/zoll/fragen-zu-import.html',
        V,
        'Deutsche Post Auslagepauschale, EUR 7.50 incl. VAT, charged only when Deutsche Post/DHL advances import charges (hence onlyWhenChargesDue; waived for self-declaring importers and IOSS parcels). Express couriers charge their own higher fees.'
      ),
      onlyWhenChargesDue: true,
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: TARIC },
};
