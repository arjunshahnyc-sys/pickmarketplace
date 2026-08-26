// Integer minor-unit money for the landed-cost core.
//
// Every amount in this module and its consumers is an integer count of a
// currency's minor units (cents, pence, yen). Floats never hold money:
// rate math runs through BigInt so a 9-digit amount times a 6-decimal FX
// rate cannot lose integer precision, and rounding happens exactly once
// per derived line, with the rule named below.
//
// ROUNDING RULE (applies to every derived amount: duty, tax, fees, FX):
//   round half away from zero ("commercial rounding"), applied at minor-unit
//   precision. 0.5 minor units rounds up. This is the rule customs and tax
//   software most commonly applies per charge line; if a destination is later
//   found to mandate a different per-line rule, it becomes a field in that
//   destination's rules file, not a code branch.
//
// DISPLAY ROUNDING (per country): amounts stay in minor units end to end;
// rendering divides by 10^exponent and shows exactly `exponent` decimals.
// Every currently supported destination currency (USD, CAD, GBP, EUR, AUD,
// JPY) uses plain decimal display with no cash rounding. A currency with
// cash rounding (e.g. CHF 0.05 steps) would add a display rule in its
// destination rules file; nothing in the arithmetic changes.

/** ISO 4217 alpha code, e.g. 'USD'. */
export type CurrencyCode = string;

// Minor-unit exponents for currencies the engine touches. ISO 4217 defines
// these; 2 is the default for anything unlisted.
const MINOR_UNIT_EXPONENTS: Record<string, number> = {
  USD: 2,
  CAD: 2,
  GBP: 2,
  EUR: 2,
  AUD: 2,
  JPY: 0,
};

export function minorUnitExponent(currency: CurrencyCode): number {
  return MINOR_UNIT_EXPONENTS[currency] ?? 2;
}

/** Throws unless `n` is a safe non-negative integer. Money amounts in this
 * domain (prices, duties, fees) are never negative. */
export function assertMinorUnits(n: number, what: string): void {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`${what} must be a non-negative safe integer of minor units, got ${n}`);
  }
}

/**
 * (amount * numerator) / denominator with round-half-away-from-zero, exact
 * via BigInt. All inputs must be non-negative safe integers.
 *
 * No BigInt literals (tsconfig targets es2017); BigInt() calls are fine.
 */
export function mulDivRound(amount: number, numerator: number, denominator: number): number {
  assertMinorUnits(amount, 'amount');
  if (!Number.isSafeInteger(numerator) || numerator < 0) {
    throw new Error(`numerator must be a non-negative safe integer, got ${numerator}`);
  }
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error(`denominator must be a positive safe integer, got ${denominator}`);
  }
  const product = BigInt(amount) * BigInt(numerator);
  const den = BigInt(denominator);
  // Adding floor(den/2) before truncating division rounds half away from
  // zero for non-negative values, for even and odd denominators alike.
  const result = (product + den / BigInt(2)) / den;
  const asNumber = Number(result);
  if (!Number.isSafeInteger(asNumber)) {
    throw new Error(`mulDivRound overflowed safe integer range: ${result.toString()}`);
  }
  return asNumber;
}

/** Apply a rate expressed in basis points (1 bps = 0.01%). 750 bps = 7.5%. */
export function applyRateBps(amountMinor: number, rateBps: number): number {
  return mulDivRound(amountMinor, rateBps, 10_000);
}

/** Sum that rejects non-integers loudly instead of silently drifting. */
export function sumMinor(amounts: number[]): number {
  let total = 0;
  for (const a of amounts) {
    assertMinorUnits(a, 'summand');
    total += a;
    if (!Number.isSafeInteger(total)) {
      throw new Error('sumMinor overflowed safe integer range');
    }
  }
  return total;
}

/**
 * Format minor units for display: divide by 10^exponent, always showing
 * `exponent` decimals ("1234" USD -> "12.34"; "1234" JPY -> "1234").
 * Pure string arithmetic; the amount never passes through a float.
 */
export function formatMinorUnits(amountMinor: number, currency: CurrencyCode): string {
  assertMinorUnits(amountMinor, 'amountMinor');
  const exp = minorUnitExponent(currency);
  if (exp === 0) return String(amountMinor);
  const s = String(amountMinor).padStart(exp + 1, '0');
  return `${s.slice(0, -exp)}.${s.slice(-exp)}`;
}
