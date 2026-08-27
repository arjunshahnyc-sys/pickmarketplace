// United Kingdom destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved). NOTE: the GBP 135 low-value regime is
// scheduled for abolition in October 2028; the 90-day staleness clock on
// these rows is doing real work here.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { dutyRate, todo, verified } from '../seed';

const V = '2026-08-26';
const TARIFF = 'https://www.trade-tariff.service.gov.uk/';

const gbRate = (hsPrefix: string, bps: number, line: string, notes?: string, label?: string) =>
  dutyRate(hsPrefix, bps, {
    line,
    sourceUrl: `https://www.trade-tariff.service.gov.uk/api/v2/headings/${hsPrefix.slice(0, 4)}`,
    lastVerified: V,
    notes,
    label,
  });

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
  // UK Global Tariff MFN ("third country duty", ERGA OMNES) rates, verified
  // 2026-08-26 from the trade-tariff.service.gov.uk JSON API (the data
  // behind the heading pages, which 403 automated HTML fetches). Watches
  // (9102) are deliberately absent: the UK charges GBP 0.20 per item
  // (specific, not ad valorem), inexpressible here and economically
  // near-zero; above-threshold watches stay honestly unknown.
  dutyRates: [
    gbRate('8518', 0, '8518300090', 'Free across the entire heading (headphones, speakers).'),
    gbRate('8471', 0, '8471300000', 'Free across the entire heading (laptops, keyboards, input units).'),
    gbRate('852852', 0, '8528521000', 'ADP-connectable monitors Free; see 852872 for TVs.', 'Import duty (monitors)'),
    gbRate('852872', 1_400, '8528724000', 'All colour TV lines 14%; monitors Free (see 852852).', 'Import duty (televisions)'),
    gbRate('8517', 0, '8517130000', 'Free across the entire heading (smartphones, telephones).'),
    gbRate('8525', 0, '8525890000', 'Free across the entire heading (digital cameras).'),
    gbRate('9504', 0, '9504500000', 'Consoles Free; heading 0% except playing cards 2%.'),
    gbRate('6404', 1_600, '6404110000', 'Every line in the heading is 16%.', 'Import duty (footwear)'),
    gbRate('3304', 0, '3304990000', 'Free across the entire heading (skincare, makeup).'),
    gbRate('3303', 0, '3303009000', 'Both perfume/toilet-water lines Free.'),
    gbRate('4202', 200, '4202929190', 'Textile-outer backpack line 2%; heading disperses to 8% for plastic-sheeting surfaces.', 'Import duty (bags)'),
    gbRate('8516', 200, '8516710000', 'Coffee makers 2%; heading runs 2% to 4%.'),
    gbRate('9503', 400, '9503003500', 'Plastic construction toys 4%; heading runs 0% to 4% by material.', 'Import duty (toys)'),
    gbRate('9506', 200, '9506919000', 'General fitness equipment 2%; heading runs 0% to 4%.', 'Import duty (sports equipment)'),
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIFF, 'Headings outside the curated set stay unknown until looked up.'),
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
