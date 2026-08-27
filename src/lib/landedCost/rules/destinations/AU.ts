// Australia destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved).

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { dutyRate, todo, verified } from '../seed';

const V = '2026-08-26';
const ABF_GST = 'https://www.abf.gov.au/importing-exporting-and-manufacturing/importing/cost-of-importing-goods/gst-and-other-taxes';
const SCHED3 = 'https://www.abf.gov.au/importing-exporting-and-manufacturing/tariff-classification/current-tariff/schedule-3';

const auRate = (hsPrefix: string, bps: number, line: string, chapter: string, notes?: string, label?: string) =>
  dutyRate(hsPrefix, bps, { line, sourceUrl: `${SCHED3}/${chapter}`, lastVerified: V, notes, label });

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
  // Working Tariff (Schedule 3) general rates, verified 2026-08-26.
  // Australia's consumer tariff is flat: everything here is 0% or 5%.
  dutyRates: [
    auRate('8518', 0, '8518.30.10', 'section-xvi/chapter-85', 'Every consumer-relevant line Free.'),
    auRate('8471', 0, '8471.30.00', 'section-xvi/chapter-84', 'All lines Free.'),
    auRate('8528', 0, '8528.72.00', 'section-xvi/chapter-85', 'All lines Free, monitors and TVs alike (no split needed here).'),
    auRate('8517', 0, '8517.13.00', 'section-xvi/chapter-85', 'All lines currently Free.'),
    auRate('8525', 0, '8525.89.00', 'section-xvi/chapter-85', 'All camera lines Free.'),
    auRate('9504', 0, '9504.50.10', 'section-xx/chapter-95', 'Consoles Free; heading runs 0% to 5%.'),
    auRate('6404', 500, '6404.11.90', 'section-xii/chapter-64', 'Sports footwear 5%; ski/snowboard boots are the Free exception.', 'Import duty (footwear)'),
    auRate('3304', 500, '3304.99.00', 'section-vi/chapter-33', 'Every line 5%.', 'Import duty (cosmetics)'),
    auRate('3303', 500, '3303.00.00', 'section-vi/chapter-33', 'Single line, 5%.', 'Import duty (fragrance)'),
    auRate('9102', 0, '9102.11.00', 'section-xviii/chapter-91', 'All wrist-watch lines Free.'),
    auRate('4202', 500, '4202.92.90', 'section-viii/chapter-42', 'Backpack line 5%; heading runs 0% to 5%.', 'Import duty (bags)'),
    auRate('8516', 0, '8516.71.00', 'section-xvi/chapter-85', 'Coffee makers Free; heading runs 0% to 5%.'),
    auRate('9503', 0, '9503.00.70', 'section-xx/chapter-95', 'Toys Free; heading runs 0% to 5%.'),
    auRate('9506', 500, '9506.91.00', 'section-xx/chapter-95', 'Fitness equipment 5%; heading runs 0% to 5%.', 'Import duty (sports equipment)'),
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(SCHED3, 'Headings outside the curated set stay unknown until looked up.'),
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
