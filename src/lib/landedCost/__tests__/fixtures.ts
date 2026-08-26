// TEST FIXTURES ONLY. Every number in this file is invented for exercising
// the calculation machinery and is clearly namespaced to fake destinations
// (FB, CF) or marked as a fixture source. Nothing here may ever be imported
// by production code; real destination rules live in ../rules/destinations
// and ship unverified-and-unfilled until a human verifies them.

import { FixtureFxProvider } from '../fx';
import type {
  DestinationRules,
  EuMembership,
  LandedCostInput,
  SourcedValue,
} from '../types';
import type { CalcContext } from '../calculate';

const FIXTURE_URL = 'https://example.test/fixture';

export function sourced<T>(value: T): SourcedValue<T> {
  return {
    value,
    sourceUrl: FIXTURE_URL,
    lastVerified: '2026-01-01',
    verification: 'verified',
  };
}

export function unverified<T>(): SourcedValue<T> {
  return {
    value: null,
    sourceUrl: FIXTURE_URL,
    lastVerified: null,
    verification: 'unverified',
  };
}

/**
 * FOBLAND ('FB', USD): FOB valuation, duty relief at $100.00 intrinsic,
 * tax threshold at $50.00 intrinsic (DIFFERENT from duty relief on purpose:
 * the value band between them is the crux regression test), taxes shipping,
 * 10% duty on HS 6404*, 5% default duty, 20% "Test VAT",
 * default carrier fee $10.00 flat + 5% of advanced duty + tax.
 */
export const FOBLAND: DestinationRules = {
  country: 'FB',
  currency: 'USD',
  valuationBasis: sourced<'CIF' | 'FOB'>('FOB'),
  dutyRelief: sourced({ kind: 'threshold' as const, amountMinor: 10_000, basis: 'intrinsic-goods-value' as const }),
  dutyRates: [
    { hsPrefix: '6404', label: 'Import duty (footwear)', rateBps: sourced(1_000) },
    { hsPrefix: 'default', label: 'Import duty', rateBps: sourced(500) },
  ],
  importTax: {
    label: 'Test VAT',
    rateBps: sourced(2_000),
    baseIncludesShipping: sourced(true),
    threshold: sourced({
      kind: 'threshold' as const,
      amountMinor: 5_000,
      basis: 'intrinsic-goods-value' as const,
      belowThreshold: 'no-import-tax' as const,
    }),
  },
  carrierFees: [
    { carrier: 'default', label: 'Brokerage fee', flatMinor: sourced(1_000), pctBps: sourced(500) },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: FIXTURE_URL },
};

/**
 * CIFLAND ('CF', USD): CIF valuation, NO duty relief (verified none),
 * flat 8% duty, 15% "Test GST" with a merchant-collects low-value regime
 * under $75.00, shipping never added to the tax base (it is already inside
 * the CIF customs value), flat $12.00 brokerage.
 */
export const CIFLAND: DestinationRules = {
  country: 'CF',
  currency: 'USD',
  valuationBasis: sourced<'CIF' | 'FOB'>('CIF'),
  dutyRelief: sourced({ kind: 'none' as const }),
  dutyRates: [{ hsPrefix: 'default', label: 'Import duty', rateBps: sourced(800) }],
  importTax: {
    label: 'Test GST',
    rateBps: sourced(1_500),
    baseIncludesShipping: sourced(false),
    threshold: sourced({
      kind: 'threshold' as const,
      amountMinor: 7_500,
      basis: 'intrinsic-goods-value' as const,
      belowThreshold: 'merchant-collects' as const,
    }),
  },
  carrierFees: [
    { carrier: 'default', label: 'Brokerage fee', flatMinor: sourced(1_200) },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: FIXTURE_URL },
};

/** FOBLAND clone whose duty rate is unverified: the legal-guardrail fixture. */
export const UNVERIFIED_RATE_LAND: DestinationRules = {
  ...FOBLAND,
  country: 'UV',
  dutyRates: [{ hsPrefix: 'default', label: 'Import duty', rateBps: unverified<number>() }],
};

export const EU_FIXTURE: EuMembership = {
  members: ['DE', 'FR', 'IT', 'ES', 'NL'],
  sourceUrl: FIXTURE_URL,
  lastVerified: '2026-01-01',
  verification: 'verified',
};

export const FX_FIXTURE = new FixtureFxProvider(
  {
    'USD:GBP': { midMicros: 790_000, asOf: '2026-01-01T00:00:00Z' },
    'USD:JPY': { midMicros: 147_000_000, asOf: '2026-01-01T00:00:00Z' },
    'JPY:USD': { midMicros: 6_803, asOf: '2026-01-01T00:00:00Z' },
  },
  { spreadBps: 0 }
);

export function ctxFor(rules: DestinationRules | null, overrides: Partial<CalcContext> = {}): CalcContext {
  return { rules, eu: EU_FIXTURE, fx: FX_FIXTURE, ...overrides };
}

/** A cross-border baseline input into FOBLAND; spread tests tweak from here. */
export function baseInput(overrides?: {
  priceMinor?: number;
  incoterm?: LandedCostInput['merchant']['incoterm'];
  shipping?: LandedCostInput['shipping'] | null;
  hs?: LandedCostInput['item']['hs'];
  merchantCountry?: string | undefined;
  destCountry?: string;
  destCurrency?: string;
  itemCurrency?: string;
}): LandedCostInput {
  const o = overrides ?? {};
  return {
    item: {
      priceMinor: o.priceMinor ?? 20_000, // $200.00 by default: above both FOBLAND thresholds
      currency: o.itemCurrency ?? 'USD',
      hs: o.hs,
      categoryId: 'shoes',
    },
    merchant: {
      id: 'test-merchant',
      country: 'merchantCountry' in o ? o.merchantCountry : 'US',
      incoterm: o.incoterm ?? 'DAP',
      configConfidence: 'exact',
    },
    shipping:
      o.shipping === null
        ? undefined
        : o.shipping ?? { costMinor: 2_000, currency: 'USD', carrier: 'TestPost' },
    destination: {
      country: o.destCountry ?? 'FB',
      currency: o.destCurrency ?? 'USD',
    },
  };
}
