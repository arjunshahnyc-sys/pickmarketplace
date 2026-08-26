// Feature flags. Same pattern as affiliate.ts: NEXT_PUBLIC_ env vars so
// server and client code read the same value at build time, and helpers so
// call sites never string-compare env values themselves.

/**
 * Landed-cost ranking and display. OFF by default: with the flag off the
 * site renders byte-identically to the pre-landed-cost behavior pinned by
 * the characterization tests. Set NEXT_PUBLIC_LANDED_COST_ENABLED=true to
 * turn on.
 */
export function landedCostEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LANDED_COST_ENABLED === 'true';
}
