import { describe, expect, it } from 'vitest';
import {
  applyRateBps,
  formatMinorUnits,
  minorUnitExponent,
  mulDivRound,
  sumMinor,
} from '../money';

describe('mulDivRound', () => {
  it('rounds half away from zero at minor-unit precision', () => {
    expect(mulDivRound(5, 1, 2)).toBe(3); // 2.5 -> 3
    expect(mulDivRound(25, 10, 100)).toBe(3); // 2.5 -> 3
    expect(mulDivRound(24, 10, 100)).toBe(2); // 2.4 -> 2
    expect(mulDivRound(26, 10, 100)).toBe(3); // 2.6 -> 3
    expect(mulDivRound(100, 1, 3)).toBe(33); // 33.33 -> 33
    expect(mulDivRound(200, 1, 3)).toBe(67); // 66.67 -> 67
  });

  it('is exact for large amounts (BigInt internally)', () => {
    // 9_000_000_000_00 minor units x rate 147_000_000/1e6 would overflow
    // float-precision if multiplied naively.
    expect(mulDivRound(900_000_000_000, 147_000_000, 1_000_000)).toBe(132_300_000_000_000);
  });

  it('rejects negative amounts, float inputs, and zero denominators', () => {
    expect(() => mulDivRound(-1, 1, 2)).toThrow();
    expect(() => mulDivRound(1.5, 1, 2)).toThrow();
    expect(() => mulDivRound(10, 1.5, 2)).toThrow();
    expect(() => mulDivRound(10, 1, 0)).toThrow();
  });
});

describe('applyRateBps', () => {
  it('applies basis points: 7.5% of $100.00', () => {
    expect(applyRateBps(10_000, 750)).toBe(750);
  });
  it('rounds the half case up: 0.125 minor units of tax', () => {
    // 25 minor x 50 bps = 0.125 -> 0
    expect(applyRateBps(25, 50)).toBe(0);
    // 300 minor x 50 bps = 1.5 -> 2
    expect(applyRateBps(300, 50)).toBe(2);
  });
});

describe('sumMinor', () => {
  it('sums integers and rejects floats', () => {
    expect(sumMinor([1, 2, 3])).toBe(6);
    expect(sumMinor([])).toBe(0);
    expect(() => sumMinor([1.5])).toThrow();
    expect(() => sumMinor([-1])).toThrow();
  });
});

describe('formatMinorUnits', () => {
  it('renders exponent-2 currencies with two decimals', () => {
    expect(formatMinorUnits(1_234, 'USD')).toBe('12.34');
    expect(formatMinorUnits(5, 'USD')).toBe('0.05');
    expect(formatMinorUnits(0, 'USD')).toBe('0.00');
    expect(formatMinorUnits(100, 'GBP')).toBe('1.00');
  });
  it('adds thousands separators, the rupee in its own lakh grouping', () => {
    expect(formatMinorUnits(123_456_789, 'USD')).toBe('1,234,567.89');
    expect(formatMinorUnits(99_999, 'USD')).toBe('999.99');
    expect(formatMinorUnits(100_000, 'GBP')).toBe('1,000.00');
    expect(formatMinorUnits(2_899_000, 'INR')).toBe('28,990.00');
    expect(formatMinorUnits(39_990_000, 'INR')).toBe('3,99,900.00');
    expect(formatMinorUnits(1_234_567_800, 'INR')).toBe('1,23,45,678.00');
    expect(formatMinorUnits(99_900, 'INR')).toBe('999.00');
    expect(formatMinorUnits(3_534_300, 'JPY')).toBe('3,534,300');
  });
  it('renders JPY with no decimals', () => {
    expect(formatMinorUnits(1_234, 'JPY')).toBe('1,234');
    expect(minorUnitExponent('JPY')).toBe(0);
  });
});
