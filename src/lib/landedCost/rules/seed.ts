// Helper for seeded destination rules files.
//
// POLICY (do not weaken): seed files contain NO numbers. Every value ships
// as null + 'unverified' with the primary source URL a human must check.
// The calculator refuses to compute from unverified rows, so an unfilled
// seed can never leak an invented figure to a shopper. To activate a row:
// verify it against sourceUrl, set value, set lastVerified to the date you
// checked, and flip verification to 'verified'.
//
// The loader's tests enforce the invariant mechanically: an 'unverified'
// row must have value === null, and a 'verified' row must carry a
// lastVerified date.

import type { SourcedValue } from '../types';

/** An unfilled, unverified row pointing at the source to check. */
export function todo<T>(sourceUrl: string, notes?: string): SourcedValue<T> {
  return { value: null, sourceUrl, lastVerified: null, verification: 'unverified', notes };
}
