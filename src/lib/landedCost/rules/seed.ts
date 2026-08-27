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

import type { DutyRateRule, SourcedValue } from '../types';

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

/** A verified per-heading duty rate row. `line` is the exact tariff line the
 * rate was read from; dispersion within the heading goes in `notes`. */
export function dutyRate(
  hsPrefix: string,
  rateBps: number,
  opts: {
    line: string;
    sourceUrl: string;
    lastVerified: string;
    label?: string;
    notes?: string;
  }
): DutyRateRule {
  return {
    hsPrefix,
    label: opts.label ?? 'Import duty',
    rateBps: verified(
      rateBps,
      opts.sourceUrl,
      opts.lastVerified,
      `Tariff line ${opts.line}.${opts.notes ? ` ${opts.notes}` : ''}`
    ),
  };
}
