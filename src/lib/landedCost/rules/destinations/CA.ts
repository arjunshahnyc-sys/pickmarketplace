// Canada destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved). Channel decision (owner, 2026-08-26): model
// the COURIER-from-US/Mexico channel (CUSMA remission), since our merchants
// are US storefronts and mainstream e-commerce ships by courier. The postal
// and non-CUSMA variants are noted per row.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo, verified } from '../seed';

const V = '2026-08-26';
const TARIFF = 'https://www.cbsa-asfc.gc.ca/trade-commerce/tariff-tarif/menu-eng.html';

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
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIFF, 'Per-heading rates from the Canadian Customs Tariff; add rows for curated categories.'),
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
