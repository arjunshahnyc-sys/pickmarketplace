// United Kingdom destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved). NOTE: the GBP 135 low-value regime is
// scheduled for abolition in October 2028; the 90-day staleness clock on
// these rows is doing real work here.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo, verified } from '../seed';

const V = '2026-08-26';
const TARIFF = 'https://www.trade-tariff.service.gov.uk/';

export const GB: DestinationRules = {
  country: 'GB',
  currency: 'GBP',
  valuationBasis: verified<'CIF' | 'FOB'>(
    'CIF',
    'https://www.gov.uk/guidance/valuing-imported-goods-using-method-1-transaction-value',
    V,
    'Method 1 transaction value: price paid plus transport, insurance, loading and handling to the UK border. Costs after arrival at the border are excluded.'
  ),
  dutyRelief: verified<ReliefPolicy>(
    { kind: 'threshold', amountMinor: 13_500, basis: 'intrinsic-goods-value' },
    'https://www.gov.uk/goods-sent-from-abroad/tax-and-duty',
    V,
    'No Customs Duty on non-excise goods worth GBP 135 or less (intrinsic value: price sold for, excluding separately-shown transport/insurance). Excise goods always dutiable; Northern Ireland differs. Scheduled for abolition October 2028.'
  ),
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIFF, 'Per-heading rates from the UK Trade Tariff; add rows for curated categories.'),
    },
  ],
  importTax: {
    label: 'Import VAT',
    rateBps: verified(
      2_000,
      'https://www.gov.uk/vat-rates',
      V,
      'UK standard VAT 20%. Reduced 5% and zero rates apply to some goods (children’s clothes, most food); 2000 bps is the standard-rate default, and estimates stay labeled as estimates.'
    ),
    baseIncludesShipping: verified(
      true,
      'https://www.gov.uk/goods-sent-from-abroad/tax-and-duty',
      V,
      'Border-collected import VAT is charged on the total package value: goods + postage/packaging/insurance + any duty. Inert under CIF valuation in the engine (shipping is already inside the customs value; never double-added); recorded for the economics.'
    ),
    threshold: verified<TaxThresholdPolicy>(
      { kind: 'threshold', amountMinor: 13_500, basis: 'intrinsic-goods-value', belowThreshold: 'merchant-collects' },
      'https://www.gov.uk/guidance/vat-and-overseas-goods-sold-directly-to-customers-in-the-uk',
      V,
      'At or under GBP 135 intrinsic value the overseas seller must charge UK VAT at the point of sale (regime operating as of 2026-08-26; scheduled abolition October 2028). Exceptions: B2B with a UK VAT number; gifts of GBP 39 or less are exempt. Binds registered sellers; the engine words this as an assumption.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Handling fee',
      flatMinor: verified(
        800,
        'https://help.royalmail.com/personal/s/article/Pay-customs-fees',
        V,
        'Royal Mail GBP 8 handling fee, charged only when Royal Mail collects customs charges before delivery (hence onlyWhenChargesDue). Parcelforce and private couriers charge their own, typically higher, clearance fees.'
      ),
      onlyWhenChargesDue: true,
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: TARIFF },
};
