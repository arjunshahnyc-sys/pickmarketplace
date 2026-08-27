// Canada destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved). Channel decision (owner, 2026-08-26): model
// the COURIER-from-US/Mexico channel (CUSMA remission), since our merchants
// are US storefronts and mainstream e-commerce ships by courier. The postal
// and non-CUSMA variants are noted per row.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { dutyRate, todo, verified } from '../seed';

const V = '2026-08-26';
const TARIFF = 'https://www.cbsa-asfc.gc.ca/trade-commerce/tariff-tarif/menu-eng.html';
// T2026 chapter pages (chapter 85 is the T2026-1 revision effective 2026-08-06).
const T2026 = 'https://www.cbsa-asfc.gc.ca/trade-commerce/tariff-tarif/2026/html/00';
const T2026_1 = 'https://www.cbsa-asfc.gc.ca/trade-commerce/tariff-tarif/2026/html/01';

const caRate = (hsPrefix: string, bps: number, line: string, chapterUrl: string, notes?: string, label?: string) =>
  dutyRate(hsPrefix, bps, { line, sourceUrl: chapterUrl, lastVerified: V, notes, label });

export const CA: DestinationRules = {
  country: 'CA',
  currency: 'CAD',
  valuationBasis: verified<'CIF' | 'FOB'>(
    'FOB',
    'https://laws-lois.justice.gc.ca/eng/acts/C-52.6/section-48.html',
    V,
    'Customs Act s.48: value for duty is the transaction value; s.48(5)(b)(i) excludes transportation/insurance from the place of direct shipment to Canada. Not pure FOB-origin: inland freight in the export country up to that place IS included (s.48(5)(a)(vi)).'
  ),
  dutyRelief: verified<ReliefPolicy>(
    { kind: 'threshold', amountMinor: 15_000, basis: 'customs-value' },
    'https://www.cbsa-asfc.gc.ca/publications/dm-md/d8/d8-2-16-eng.html',
    V,
    'CAD 150 for COURIER shipments from the US or Mexico (Courier Imports Remission Order under CUSMA). Postal channel, or courier from other origins: CAD 20. Our shipping channel is unknown per offer; courier modeled per owner decision 2026-08-26.'
  ),
  // Customs Tariff T2026 MFN rates, verified 2026-08-26. Our goods have
  // unknown origin, so MFN applies (CUSMA-originating goods would be Free,
  // noted, not assumed).
  dutyRates: [
    caRate('8518', 0, '8518.30.90', `${T2026_1}/ch85-eng.html`, 'Entire heading MFN Free.'),
    caRate('8471', 0, '8471.30.00', `${T2026}/ch84-eng.html`, 'All 27 rate-bearing lines MFN Free.'),
    caRate('852852', 0, '8528.52.00', `${T2026_1}/ch85-eng.html`, 'ADP-connectable monitors Free; see 852872 for TVs.', 'Import duty (monitors)'),
    caRate('852872', 500, '8528.72.33', `${T2026_1}/ch85-eng.html`, 'Colour TVs 5%; monitors Free (see 852852).', 'Import duty (televisions)'),
    caRate('8517', 0, '8517.13.00', `${T2026_1}/ch85-eng.html`, 'All 21 rate-bearing lines MFN Free.'),
    caRate('8525', 0, '8525.89.00', `${T2026_1}/ch85-eng.html`, 'Entire heading MFN Free.'),
    caRate('9504', 0, '9504.50.00', `${T2026}/ch95-eng.html`, 'Entire heading MFN Free.'),
    caRate('6404', 1_800, '6404.11.99', `${T2026}/ch64-eng.html`, 'Consumer footwear 18%; only special-purpose lines (orthopaedic) are Free.', 'Import duty (footwear)'),
    caRate('3304', 650, '3304.99.90', `${T2026}/ch33-eng.html`, 'Every consumer line 6.5%.', 'Import duty (cosmetics)'),
    caRate('3303', 650, '3303.00.00', `${T2026}/ch33-eng.html`, 'Single line covers the heading, 6.5%.', 'Import duty (fragrance)'),
    caRate('9102', 500, '9102.11.00', `${T2026}/ch91-eng.html`, 'All wrist-watch lines 5% (Canada charges ad valorem, unlike GB/EU).', 'Import duty (watches)'),
    caRate('4202', 1_000, '4202.92.20', `${T2026}/ch42-eng.html`, 'Archetype backpack line 10%; heading runs Free to 11% (suitcases/satchels 11%).', 'Import duty (bags)'),
    caRate('8516', 900, '8516.71.10', `${T2026_1}/ch85-eng.html`, 'Coffee makers 9%; wide dispersion, many lines Free.'),
    caRate('9503', 0, '9503.00.90', `${T2026}/ch95-eng.html`, 'Dolls, construction sets, puzzles, stuffed animals: Free.'),
    caRate('9506', 0, '9506.91.00', `${T2026}/ch95-eng.html`, 'Heading almost entirely MFN Free.'),
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIFF, 'Headings outside the curated set stay unknown until looked up.'),
    },
  ],
  importTax: {
    label: 'GST',
    rateBps: verified(
      500,
      'https://laws-lois.justice.gc.ca/eng/acts/e-15/section-212.html',
      V,
      'Federal GST 5% (Excise Tax Act s.212). HST provinces add a provincial component (s.165(2)); modeling that needs destination.subdivision support. CBSA also collects provincial taxes on casual postal imports.'
    ),
    baseIncludesShipping: verified(
      false,
      'https://laws-lois.justice.gc.ca/eng/acts/e-15/section-215.html',
      V,
      'GST base is the duty-paid value: Customs Act value for duty (which excludes international freight) plus duties. The engine already adds duty to the base; shipping stays out.'
    ),
    threshold: verified<TaxThresholdPolicy>(
      { kind: 'threshold', amountMinor: 4_000, basis: 'customs-value', belowThreshold: 'no-import-tax' },
      'https://www.cbsa-asfc.gc.ca/publications/dm-md/d8/d8-2-16-eng.html',
      V,
      'CAD 40 tax remission for courier shipments from the US or Mexico; SEPARATE from the CAD 150 duty threshold (between 40 and 150: duty-free but taxed). Postal or non-CUSMA origins: CAD 20 for both.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Handling fee',
      flatMinor: verified(
        995,
        'https://www.canadapost-postescanada.ca/cpc/en/support/articles/customs-requirements/customs-duty-taxes-and-exemptions.page',
        V,
        'Canada Post CAN$9.95 per dutiable or taxable mail item; charged only when duty/tax is actually assessed (hence onlyWhenChargesDue). Courier brokerage fees are separate and commercial.'
      ),
      onlyWhenChargesDue: true,
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: 'https://www.cbsa-asfc.gc.ca/import/postal-postale/menu-eng.html' },
};
