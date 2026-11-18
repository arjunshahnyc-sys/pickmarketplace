// ZIP-level combined sales tax rates, for the delivered-cost tax line.
//
// THE DATA: public/salestax/us.json, built by
// scripts/build-us-zip-sales-tax.mjs from the Streamlined Sales Tax rate
// and boundary files that member states publish and certify themselves.
// Per ZIP it holds the combined rate (state + county + city + special
// districts) on the most address ranges in that ZIP, plus the lowest and
// highest. Nothing in it is an average or an estimate of Pick's.
//
// COVERAGE: the states with a current file (19 as of 2026-11-18: AR, GA,
// IA, KS, MN, NC, ND, NE, NV, OH, OK, SD, TN, UT, VT, WA, WI, WV, WY).
// Anywhere else, lookups return null and the tax line stays on the state
// base rate with its "local taxes not included" note.
//
// PRIVACY POSTURE (same as usZip.ts): the ZIP is looked up HERE, in the
// browser. The file is one static download covering every state, so the
// request for it says nothing about where the shopper is; only the rate
// that comes out of the lookup enters the calculation.

import type { LocalSalesTaxRate } from './types';

interface StateTable {
  asOf: string;
  rateFile: string;
  boundaryFile: string;
  stateRate: number;
  /** zip -> [most common, lowest, highest] in deci-basis-points. */
  zips: Record<string, [number, number, number]>;
}

export interface UsLocalSalesTaxTable {
  sourceUrl: string;
  states: Record<string, StateTable>;
}

export const US_LOCAL_SALES_TAX_URL = '/salestax/us.json';

/** The ZIP's published combined rate, or null when the state or ZIP is not in the table. */
export function lookupLocalSalesTax(
  table: UsLocalSalesTaxTable | null | undefined,
  state: string | undefined,
  zip: string | undefined
): LocalSalesTaxRate | null {
  if (!table || !state || !zip) return null;
  const stateTable = table.states[state];
  const row = stateTable?.zips[zip];
  if (!stateTable || !Array.isArray(row) || row.length !== 3) return null;
  const [deciBps, minDeciBps, maxDeciBps] = row;
  const sane = [deciBps, minDeciBps, maxDeciBps].every(
    // No US combined rate comes near 20%; a figure outside this is a
    // corrupt row, not a tax rate.
    (r) => Number.isInteger(r) && r >= 0 && r <= 20_000
  );
  if (!sane || minDeciBps > deciBps || deciBps > maxDeciBps) return null;
  return { deciBps, minDeciBps, maxDeciBps, asOf: stateTable.asOf, sourceUrl: table.sourceUrl };
}

let pending: Promise<UsLocalSalesTaxTable | null> | null = null;

/**
 * The table, fetched once per page load and only when a shopper has
 * entered a ZIP. A failed download resolves to null (the tax line falls
 * back to the state base rate) and is retried on the next call.
 */
export function loadUsLocalSalesTax(): Promise<UsLocalSalesTaxTable | null> {
  if (!pending) {
    pending = fetch(US_LOCAL_SALES_TAX_URL)
      .then((res) => (res.ok ? (res.json() as Promise<UsLocalSalesTaxTable>) : null))
      .then((table) => (table && typeof table.states === 'object' ? table : null))
      .catch(() => null)
      .then((table) => {
        if (!table) pending = null;
        return table;
      });
  }
  return pending;
}
