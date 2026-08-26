// Japan destination rules. SEEDED, NOT VERIFIED. See rules/seed.ts.
// JPY has a 0 minor-unit exponent; money.ts already renders it correctly.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo } from '../seed';

const CUSTOMS = 'https://www.customs.go.jp/english/summary/import.htm';
const TARIFF = 'https://www.customs.go.jp/english/tariff/index.htm';

export const JP: DestinationRules = {
  country: 'JP',
  currency: 'JPY',
  valuationBasis: todo<'CIF' | 'FOB'>(CUSTOMS, 'Japan assesses duty on a CIF basis. Confirm and encode CIF.'),
  dutyRelief: todo<ReliefPolicy>(
    CUSTOMS,
    'Japan relieves duty and consumption tax below a customs-value threshold (historically tied to a 10,000 yen dutiable value with a 0.6 valuation factor for personal imports; commercial imports differ). Verify which regime applies to marketplace purchases and encode carefully.'
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
    rateBps: todo(CUSTOMS, 'National + local consumption tax on imports.'),
    baseIncludesShipping: todo(CUSTOMS, 'Base is commonly CIF value + duty; under CIF valuation shipping is already included. Verify.'),
    threshold: todo<TaxThresholdPolicy>(CUSTOMS, 'Consumption-tax relief threshold; verify whether it matches the duty relief threshold or differs.'),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Customs clearance fee',
      flatMinor: todo(CUSTOMS, 'Japan Post clearance fees and courier brokerage schedules.'),
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: CUSTOMS },
};
