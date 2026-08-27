// Japan destination rules.
// Structural rows verified 2026-08-26 (live fetches; the adversarial pass
// for JP was completed by the main session after the verifier agent hit a
// session limit; owner-approved). JPY has a 0 minor-unit exponent, so
// amountMinor here IS yen.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { dutyRate, todo, verified } from '../seed';

const V = '2026-08-26';
const TARIFF = 'https://www.customs.go.jp/english/tariff/index.htm';
const EXEMPT = 'https://www.customs.go.jp/english/c-answer_e/imtsukan/1006_e.htm';
// Current schedule edition (2026-08-08), per-chapter static pages.
const SCHEDULE = 'https://www.customs.go.jp/english/tariff/2026_08_08/data';

const jpRate = (hsPrefix: string, bps: number, line: string, chapter: string, notes?: string, label?: string) =>
  dutyRate(hsPrefix, bps, { line, sourceUrl: `${SCHEDULE}/e_${chapter}.htm`, lastVerified: V, notes, label });

// The 10,000-yen exemption excludes "leather bags, handbags, gloves, etc.,
// knitted apparel (T-shirt, sweater, etc.), ski boots, leather shoes and
// footwear with leather soles" (Japan Customs FAQ 1006). Mapped to headings
// CONSERVATIVELY WIDE: bags/leather goods 4202-4203, knitwear chapter 61,
// and ALL footwear headings 6402-6405 (ski boots span 6402/6403; leather
// soles appear across 6404/6405; our classification is heading-level, so
// subheading precision is unreachable). Over-excluding computes duty as a
// labeled estimate; under-excluding would show a confidently wrong zero.
const RELIEF_EXCLUSIONS = ['4202', '4203', '61', '6402', '6403', '6404', '6405'];

export const JP: DestinationRules = {
  country: 'JP',
  currency: 'JPY',
  valuationBasis: verified<'CIF' | 'FOB'>(
    'CIF',
    'https://www.customs.go.jp/english/c-answer_e/imtsukan/1403_e.htm',
    V,
    'Transaction value adjusted to include transport and insurance to the port of importation; Tokyo Customs confirms postage and insurance are added for postal items. Personal-use imports have a special retail-stage 60% valuation rule (not modeled; commercial marketplace purchases assumed).'
  ),
  dutyRelief: verified<ReliefPolicy>(
    {
      kind: 'threshold',
      amountMinor: 10_000,
      basis: 'customs-value',
      excludedHsPrefixes: RELIEF_EXCLUSIONS,
    },
    EXEMPT,
    V,
    'Total customs value of 10,000 yen or less is exempt from customs duty and consumption tax, EXCEPT the excluded categories (see RELIEF_EXCLUSIONS). Split shipments from the same sender at the same time are aggregated. Basis is customs value (CIF), so relief is undecidable until shipping cost is known.'
  ),
  // WTO (applied MFN) rates from the current schedule edition (2026-08-08),
  // verified 2026-08-26. Where a General rate differs, the WTO rate governs
  // for WTO-member origins.
  dutyRates: [
    jpRate('8518', 0, '8518.30.000', '85', 'Free across the entire heading.'),
    jpRate('8471', 0, '8471.30.000', '84', 'Free across the entire heading.'),
    jpRate('8528', 0, '8528.72.010', '85', 'Free across the entire heading, monitors and TVs alike.'),
    jpRate('8517', 0, '8517.13.000', '85', 'Free across the entire heading.'),
    jpRate('8525', 0, '8525.89.000', '85', 'Free across the entire heading.'),
    jpRate('9504', 0, '9504.50.000', '95', 'Consoles Free; applied MFN in the heading runs 0% to 3.2%.'),
    jpRate('6404', 800, '6404.11.000', '64', 'Sports footwear 8%; heading disperses (some lines 6.7%, leather-trim lines higher). Note: 6404 is also excluded from the 10,000-yen relief.', 'Import duty (footwear)'),
    jpRate('3304', 0, '3304.99.010', '33', 'WTO rate Free on every line (General 5.8% does not apply to WTO origins).', 'Import duty (cosmetics)'),
    jpRate('3303', 0, '3303.00.000', '33', 'WTO rate Free (General 5.3% does not apply to WTO origins).', 'Import duty (fragrance)'),
    jpRate('9102', 0, '9102.11.000', '91', 'All wrist-watch lines Free.'),
    jpRate('4202', 800, '4202.92.000', '42', 'Backpack line 8%; heading runs 2.7% to 16% by material. Note: 4202 is also excluded from the 10,000-yen relief.', 'Import duty (bags)'),
    jpRate('8516', 0, '8516.71.000', '85', 'Free across the entire heading.'),
    jpRate('9503', 0, '9503.00.000', '95', 'Single line for the heading, Free.'),
    jpRate('9506', 0, '9506.91.000', '95', 'Fitness equipment Free; only some ball lines reach 3.2%.'),
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIFF, 'Headings outside the curated set stay unknown until looked up.'),
    },
  ],
  importTax: {
    label: 'Consumption tax',
    rateBps: verified(
      1_000,
      'https://www.customs.go.jp/english/c-answer_e/imtsukan/1111_e.htm',
      V,
      'Standard 10% (7.8% national + 2.2% local); reduced 8% (6.24% + 1.76%) mainly for food. 1000 bps is the standard-rate default.'
    ),
    baseIncludesShipping: verified(
      true,
      'https://www.customs.go.jp/english/summary/tariff.htm',
      V,
      'Consumption tax base is the customs value (CIF, so shipping is already inside) plus customs duty and other excises. Inert under CIF in the engine (never double-added); recorded for the economics.'
    ),
    threshold: verified<TaxThresholdPolicy>(
      {
        kind: 'threshold',
        amountMinor: 10_000,
        basis: 'customs-value',
        belowThreshold: 'no-import-tax',
        excludedHsPrefixes: RELIEF_EXCLUSIONS,
      },
      EXEMPT,
      V,
      'One SHARED 10,000-yen threshold covers both duty and consumption tax (Customs Tariff Law Art. 14 No. 18; import excise collection law Art. 13). The FAQ does not separate whether excluded categories lose only duty relief or also tax relief; exclusions applied to both, which errs toward computing tax (a labeled estimate) rather than a wrong zero. Liquor and tobacco excises are never exempted (out of scope).'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Customs clearance fee',
      flatMinor: verified(
        200,
        'https://www.customs.go.jp/english/c-answer_e/imtsukan/1301_e.htm',
        V,
        'Japan Post handling charge, 200 yen per parcel, charged when Japan Post is entrusted with duty payment; duty-free mail is delivered without it (hence onlyWhenChargesDue). Couriers charge their own fees. Sourced from the Japan Customs FAQ; post.japanpost.jp has no English page stating the amount.'
      ),
      onlyWhenChargesDue: true,
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: 'https://www.customs.go.jp/english/summary/import.htm' },
};
