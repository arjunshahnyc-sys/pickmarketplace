// Australia destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved).

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo, verified } from '../seed';

const V = '2026-08-26';
const ABF_GST = 'https://www.abf.gov.au/importing-exporting-and-manufacturing/importing/cost-of-importing-goods/gst-and-other-taxes';

export const AU: DestinationRules = {
  country: 'AU',
  currency: 'AUD',
  valuationBasis: verified<'CIF' | 'FOB'>(
    'FOB',
    'https://www.abf.gov.au/imports/files/fact-sheets/fs-value-imported-goods.pdf',
    V,
    'Customs value excludes freight/insurance from the place of export to Australia; inland costs before the place of export are included. Corroborated by the ATO (page updated 2025-09-11).'
  ),
  dutyRelief: verified<ReliefPolicy>(
    {
      kind: 'threshold',
      amountMinor: 100_000,
      basis: 'customs-value',
      // Tobacco and alcoholic beverages are always dutiable regardless of
      // value (HS chapters 22 and 24). Not categories this marketplace
      // sells, but encoded so relief can never wrongly zero them.
      excludedHsPrefixes: ['22', '24'],
    },
    'https://www.abf.gov.au/buying-online/buying-online',
    V,
    'Goods with a customs value of AUD 1,000 or less generally attract no duty, taxes or charges at the border (GST is instead collected by the vendor at checkout, see importTax.threshold). Threshold is inclusive.'
  ),
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(
        'https://www.abf.gov.au/importing-exporting-and-manufacturing/importing/how-to-import/buying-online',
        'Per-heading rates from the Working Tariff; add rows for curated categories.'
      ),
    },
  ],
  importTax: {
    label: 'GST',
    rateBps: verified(
      1_000,
      ABF_GST,
      V,
      'GST 10% of the value of the taxable importation (VoTI). GST-free goods exist (basic food, certain medical aids); WET and LCT are out of scope.'
    ),
    baseIncludesShipping: verified(
      true,
      ABF_GST,
      V,
      'VoTI = customs value + duty + international transport and insurance (to the extent not already in the customs value) + WET. With FOB valuation the engine adds shipping to the tax base, which matches exactly.'
    ),
    threshold: verified<TaxThresholdPolicy>(
      { kind: 'threshold', amountMinor: 100_000, basis: 'customs-value', belowThreshold: 'merchant-collects' },
      'https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-for-non-resident-businesses/gst-on-low-value-imported-goods',
      V,
      'Since 2018-07-01 overseas vendors/platforms meeting GST registration requirements (AUD 75k turnover) charge 10% GST at checkout on imported goods with customs value of AUD 1,000 or less; above that, GST is collected at the border. Small non-registered sellers may not collect; the engine words this as an assumption. ATO page updated 2025-09-11.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Import processing charge',
      flatMinor: verified(
        5_000,
        'https://www.abf.gov.au/importing-exporting-and-manufacturing/importing/cost-of-importing-goods/charges/import-processing-charge',
        V,
        'ABF electronic Import Declaration (N10) charge: AUD 0 at or under AUD 1,000 (hence appliesAboveMinor), AUD 50 above 1,000 and under 10,000. The AUD 152 tier at 10,000+ and biosecurity charges (AUD 48 air / 71 sea) are not modeled; courier brokerage is separate.'
      ),
      appliesAboveMinor: 100_000,
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: 'https://www.abf.gov.au/buying-online/buying-online' },
};
