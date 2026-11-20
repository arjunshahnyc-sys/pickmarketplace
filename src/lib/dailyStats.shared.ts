// Pick's own usage counters: one number per day per thing counted.
//
// WHY: the question that decides Pick's future is whether people come
// back, and Vercel's analytics on this plan cannot answer it. These
// counters can, without identifying anyone.
//
// WHAT IS STORED: a row per (day, metric) holding a count. No visitor id,
// no IP address, no user agent, no page, no search text. A count of 12
// returning visits on a day cannot be turned back into twelve people.
//
// HOW "RETURNING" IS KNOWN: the browser keeps the dates of its own first
// and latest visit in localStorage and tells Pick only "new" or
// "returning" (components/VisitBeacon.tsx). That note on the device is
// written only where audience measurement without a consent prompt is
// uncontroversial; for a visitor in the EEA, the UK or Switzerland nothing
// is written or read, and the visit is counted as "unmeasured".
//
// This file is the part with no database in it, so the browser can import
// it; dailyStats.ts adds the one function that writes.


export const STAT_METRICS = ['visit_new', 'visit_returning', 'visit_unmeasured', 'search', 'store_click'] as const;
export type StatMetric = (typeof STAT_METRICS)[number];

export function isStatMetric(value: unknown): value is StatMetric {
  return typeof value === 'string' && (STAT_METRICS as readonly string[]).includes(value);
}

/** The counter day, UTC: "2026-11-20". */
export function statsDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// EEA member states, the UK and Switzerland (ISO 3166-1 alpha-2): where
// storing anything on a visitor's device for measurement calls for consent
// Pick does not ask for. A request with no country (local development)
// counts as measurable.
const NO_DEVICE_STORAGE = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
]);

export function mayMeasureReturning(countryCode: string | null | undefined): boolean {
  if (!countryCode) return true;
  return !NO_DEVICE_STORAGE.has(countryCode.trim().toUpperCase());
}

/**
 * What the browser reports from its own note, given today's date (the
 * visitor's local calendar day):
 *   no note            -> a new visitor; start the note
 *   note, last = today -> already counted today; report nothing
 *   note, older last   -> a returning visitor; move `last` forward
 * A note that does not parse is treated as no note.
 */
export function visitFromNote(
  raw: string | null,
  today: string
): { kind: 'visit_new' | 'visit_returning' | null; note: string } {
  const fresh = JSON.stringify({ first: today, last: today });
  if (!raw) return { kind: 'visit_new', note: fresh };
  try {
    const parsed = JSON.parse(raw) as { first?: unknown; last?: unknown };
    const day = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof parsed.first !== 'string' || typeof parsed.last !== 'string' || !day.test(parsed.first) || !day.test(parsed.last)) {
      return { kind: 'visit_new', note: fresh };
    }
    if (parsed.last === today) return { kind: null, note: raw };
    return { kind: 'visit_returning', note: JSON.stringify({ first: parsed.first, last: today }) };
  } catch {
    return { kind: 'visit_new', note: fresh };
  }
}
