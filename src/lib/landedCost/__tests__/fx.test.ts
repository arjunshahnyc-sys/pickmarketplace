import { describe, expect, it } from 'vitest';
import { convertMinor, FixtureFxProvider, NullFxProvider } from '../fx';
import { FX_FIXTURE } from './fixtures';

describe('convertMinor', () => {
  it('same currency is identity, exact, and needs no quote', () => {
    const r = convertMinor(12_345, 'USD', 'USD', new NullFxProvider());
    expect(r).toEqual({ amountMinor: 12_345, confidence: 'exact', sourceId: 'fx:identity' });
  });

  it('converts between exponent-2 currencies at mid with no spread', () => {
    // $100.00 at 1 USD = 0.79 GBP -> 79.00 GBP
    const r = convertMinor(10_000, 'USD', 'GBP', FX_FIXTURE);
    expect(r?.amountMinor).toBe(7_900);
    expect(r?.confidence).toBe('estimated');
  });

  it('applies a stated spread on top of mid', () => {
    const withSpread = new FixtureFxProvider(
      { 'USD:GBP': { midMicros: 790_000, asOf: '2026-01-01T00:00:00Z' } },
      { spreadBps: 150 }
    );
    // 10_000 x 0.79 x 1.015 = 8018.5 -> 8019 (half away from zero)
    const r = convertMinor(10_000, 'USD', 'GBP', withSpread);
    expect(r?.amountMinor).toBe(8_019);
    expect(r?.assumption).toContain('1.50% conversion spread');
  });

  it('handles minor-unit exponent differences (USD cents to JPY yen)', () => {
    // $100.00 at 1 USD = 147 JPY -> 14700 yen... in minor units: 1470? No:
    // JPY minor unit IS the yen, so $100.00 (10_000 cents) -> 14_700 yen.
    const r = convertMinor(10_000, 'USD', 'JPY', FX_FIXTURE);
    expect(r?.amountMinor).toBe(14_700);
  });

  it('handles the reverse exponent difference (JPY yen to USD cents)', () => {
    // 14_700 yen at 1 JPY = 0.006803 USD -> $100.00 -> 10_000 cents.
    const r = convertMinor(14_700, 'JPY', 'USD', FX_FIXTURE);
    expect(r?.amountMinor).toBe(10_000);
  });

  it('returns null when the provider has no quote', () => {
    expect(convertMinor(100, 'USD', 'AUD', FX_FIXTURE)).toBeNull();
    expect(convertMinor(100, 'USD', 'GBP', new NullFxProvider())).toBeNull();
  });
});
