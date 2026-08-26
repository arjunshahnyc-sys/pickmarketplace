// Helpers for destination rules files.
//
// ROW LIFECYCLE (do not shortcut it): a row is born as todo() - value null,
// unverified, pointing at the primary source to check. It becomes verified()
// only after a human-approved verification pass: the value was read off a
// live fetch of an official source, quoted, adversarially re-checked, and
// signed off by the owner. The calculator refuses to compute from todo()
// rows, so an unfilled seed can never leak an invented figure to a shopper.
//
// The first verification pass ran 2026-08-26 (live fetches + adversarial
// re-fetch of every citation; worksheet artifact "Customs Rules Worksheet").
// The loader warns when a verified row's lastVerified is older than 90 days.
//
// The loader's tests enforce the invariants mechanically: an 'unverified'
// row must have value === null, and a 'verified' row must carry a
// lastVerified date.

import type { SourcedValue } from '../types';

/** An unfilled, unverified row pointing at the source to check. */
export function todo<T>(sourceUrl: string, notes?: string): SourcedValue<T> {
  return { value: null, sourceUrl, lastVerified: null, verification: 'unverified', notes };
}

/** A human-verified row. lastVerified is the date the source was checked. */
export function verified<T>(
  value: T,
  sourceUrl: string,
  lastVerified: string,
  notes?: string
): SourcedValue<T> {
  return { value, sourceUrl, lastVerified, verification: 'verified', notes };
}
