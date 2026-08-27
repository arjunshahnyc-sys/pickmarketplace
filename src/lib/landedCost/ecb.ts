// ECB daily reference rates: parsing and USD cross-rate math. Pure module,
// no network, no framework; the fetch lives in /api/fx.
//
// WHY ECB: the European Central Bank publishes daily EUR-based reference
// rates as a public XML file with no API key, no vendor contract, and
// central-bank provenance. Our feed prices are USD, so USD->X pairs are
// computed as cross rates: USD->X = (EUR->X) / (EUR->USD), exact in integer
// micros via BigInt-backed mulDivRound. Reference rates are mid-market
// snapshots (~16:00 CET business days), which is why every quote built from
// them carries an explicit spread assumption and 'estimated' confidence.

import { mulDivRound } from './money';

export interface EcbTable {
  /** ISO date the ECB published these rates for. */
  asOf: string;
  /** EUR -> currency mid rates, scaled by 1e6. */
  eurMicros: Record<string, number>;
}

/**
 * Parse the eurofxref-daily.xml format:
 *   <Cube time='2026-08-25'>
 *     <Cube currency='USD' rate='1.0834'/> ...
 * Returns null when the document does not look like the expected format,
 * so a changed or errored upstream degrades to no-rates, never wrong rates.
 */
export function parseEcbDailyXml(xml: string): EcbTable | null {
  const timeMatch = xml.match(/<Cube[^>]*\btime=['"](\d{4}-\d{2}-\d{2})['"]/);
  if (!timeMatch) return null;
  const eurMicros: Record<string, number> = {};
  const rateRe = /<Cube[^>]*\bcurrency=['"]([A-Z]{3})['"][^>]*\brate=['"]([0-9]+(?:\.[0-9]+)?)['"]/g;
  for (const m of xml.matchAll(rateRe)) {
    const micros = Math.round(parseFloat(m[2]) * 1_000_000);
    if (Number.isSafeInteger(micros) && micros > 0) {
      eurMicros[m[1]] = micros;
    }
  }
  if (Object.keys(eurMicros).length === 0) return null;
  return { asOf: timeMatch[1], eurMicros };
}

/**
 * USD -> target pairs in micros, keyed 'USD:XXX'. Targets missing from the
 * table are silently absent (the provider then honestly has no quote);
 * returns null when EUR->USD itself is missing, since nothing is computable.
 */
export function usdCrossPairsMicros(
  table: EcbTable,
  targets: string[]
): Record<string, number> | null {
  const usd = table.eurMicros['USD'];
  if (!usd) return null;
  const pairs: Record<string, number> = {};
  for (const target of targets) {
    if (target === 'USD') continue;
    // EUR->EUR is 1.0 by definition; the XML never lists it.
    const eurToTarget = target === 'EUR' ? 1_000_000 : table.eurMicros[target];
    if (!eurToTarget) continue;
    pairs[`USD:${target}`] = mulDivRound(1_000_000, eurToTarget, usd);
  }
  return pairs;
}
