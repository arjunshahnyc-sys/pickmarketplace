// FX conversion for the landed-cost core.
//
// No vendor is hardcoded: the engine consumes the FxProvider interface, and
// deployments choose an implementation. Tests use FixtureFxProvider with
// pinned rates; production ships NullFxProvider (no rates -> conversions are
// honestly unknown) until a real provider is wired and its rates verified.
//
// Rates are integers: midMicros is the major-unit mid-market rate scaled by
// 1e6 (1 USD = 0.79 GBP -> midMicros 790_000). The spread a shopper actually
// pays over mid (card network / bank margin) is an explicit, stated
// assumption on the quote, never an invisible fudge: every conversion the
// engine performs surfaces "converted at <mid> + <spread> spread" in the
// breakdown's assumptions.

import { minorUnitExponent, mulDivRound, type CurrencyCode } from './money';
import type { Confidence } from './types';

export interface FxQuote {
  /** Major-unit mid rate scaled by 1e6: 1 major `from` = midMicros / 1e6 major `to`. */
  midMicros: number;
  /** When the mid rate was observed (ISO timestamp). */
  asOf: string;
  /** Spread over mid applied to shopper costs, in basis points. Stated, never hidden. */
  spreadBps: number;
  sourceId: string;
  confidence: Confidence;
}

export interface FxProvider {
  readonly id: string;
  /** null = this provider cannot quote the pair. Same-currency needs no quote. */
  getQuote(from: CurrencyCode, to: CurrencyCode): FxQuote | null;
}

export interface FxConversion {
  amountMinor: number;
  confidence: Confidence;
  sourceId: string;
  /** Present when an actual conversion happened; feeds the assumptions list. */
  assumption?: string;
}

/**
 * Convert integer minor units between currencies with differing minor-unit
 * exponents, in one exact BigInt-backed step, rounding once (half away from
 * zero, see money.ts):
 *
 *   toMinor = fromMinor * mid * (1 + spread) * 10^(expTo - expFrom)
 *
 * Returns null when the provider has no quote for the pair.
 */
export function convertMinor(
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  fx: FxProvider
): FxConversion | null {
  if (from === to) {
    return { amountMinor, confidence: 'exact', sourceId: 'fx:identity' };
  }
  const quote = fx.getQuote(from, to);
  if (!quote) return null;

  const expFrom = minorUnitExponent(from);
  const expTo = minorUnitExponent(to);
  const expDiff = expTo - expFrom;
  let numerator = quote.midMicros * (10_000 + quote.spreadBps);
  let denominator = 1_000_000 * 10_000;
  if (expDiff > 0) numerator *= 10 ** expDiff;
  if (expDiff < 0) denominator *= 10 ** -expDiff;

  const converted = mulDivRound(amountMinor, numerator, denominator);
  const spreadPct = (quote.spreadBps / 100).toFixed(2);
  return {
    amountMinor: converted,
    confidence: quote.confidence,
    sourceId: quote.sourceId,
    assumption: `Converted ${from} to ${to} at a ${quote.asOf.slice(0, 10)} mid-market rate plus a ${spreadPct}% conversion spread.`,
  };
}

/** Production default until a real provider is wired: quotes nothing, so any
 * cross-currency amount is honestly unknown rather than wrongly converted. */
export class NullFxProvider implements FxProvider {
  readonly id = 'fx:none';
  getQuote(): FxQuote | null {
    return null;
  }
}

/** Test/fixture provider with pinned rates. Keys are `${from}:${to}`. */
export class FixtureFxProvider implements FxProvider {
  readonly id = 'fx:fixture';
  private readonly table: Record<string, { midMicros: number; asOf: string }>;
  private readonly spreadBps: number;

  constructor(
    table: Record<string, { midMicros: number; asOf: string }>,
    opts: { spreadBps?: number } = {}
  ) {
    this.table = table;
    this.spreadBps = opts.spreadBps ?? 0;
  }

  getQuote(from: CurrencyCode, to: CurrencyCode): FxQuote | null {
    const row = this.table[`${from}:${to}`];
    if (!row) return null;
    return {
      midMicros: row.midMicros,
      asOf: row.asOf,
      spreadBps: this.spreadBps,
      sourceId: this.id,
      confidence: 'estimated',
    };
  }
}
