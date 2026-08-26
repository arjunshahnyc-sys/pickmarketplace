// Japan destination rules.
// Structural rows verified 2026-08-26 (live fetches; the adversarial pass
// for JP was completed by the main session after the verifier agent hit a
// session limit; owner-approved). JPY has a 0 minor-unit exponent, so
// amountMinor here IS yen.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo, verified } from '../seed';

const V = '2026-08-26';
const TARIFF = 'https://www.customs.go.jp/english/tariff/index.htm';
const EXEMPT = 'https://www.customs.go.jp/english/c-answer_e/imtsukan/1006_e.htm';

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
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIFF, "Per-heading rates from Japan's tariff schedule; add rows for curated categories."),
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
