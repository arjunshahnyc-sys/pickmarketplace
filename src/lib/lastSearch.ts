// The last search's results, kept for this tab (sessionStorage) so coming
// back from a product page (/item) shows the same results at once, at the
// same scroll position, without paying for the search again. Fresh for as
// long as the server would have served its own cached copy.

import type { SizeKind } from './sizeSearch';

const KEY = 'pick-last-search';
const SCROLL_KEY = 'pick-last-search-scroll';
export const LAST_SEARCH_TTL_MS = 30 * 60 * 1000;

export interface LastSearch {
  /** q, size and destination together: what makes two searches the same. */
  key: string;
  q: string;
  kind: SizeKind | null;
  size: string | null;
  ts: number;
  /** The /api/search-live response, as received. */
  data: unknown;
}

export function lastSearchKey(q: string, kind: SizeKind | null, size: string | null, dest: string): string {
  return [q.toLowerCase().trim(), kind && size ? `${kind}:${size}` : '', dest].join('|');
}

/** Exported for tests: whether a stored value is a usable, fresh snapshot. */
export function parseLastSearch(raw: string | null, now: number): LastSearch | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<LastSearch> | null;
    if (!v || typeof v.key !== 'string' || typeof v.q !== 'string' || typeof v.ts !== 'number') return null;
    if (now - v.ts >= LAST_SEARCH_TTL_MS || now < v.ts) return null;
    if (!v.data || typeof v.data !== 'object') return null;
    return { key: v.key, q: v.q, kind: v.kind ?? null, size: v.size ?? null, ts: v.ts, data: v.data };
  } catch {
    return null;
  }
}

export function readLastSearch(): LastSearch | null {
  try {
    return parseLastSearch(window.sessionStorage.getItem(KEY), Date.now());
  } catch {
    return null;
  }
}

export function saveLastSearch(search: Omit<LastSearch, 'ts'>) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...search, ts: Date.now() }));
  } catch {
    // Storage full or blocked: coming back just runs the search again
  }
}

export function saveScroll(y: number) {
  try {
    window.sessionStorage.setItem(SCROLL_KEY, String(Math.round(y)));
  } catch {
    // Not worth failing over
  }
}

export function readScroll(): number {
  try {
    const y = Number(window.sessionStorage.getItem(SCROLL_KEY));
    return Number.isFinite(y) && y > 0 ? y : 0;
  } catch {
    return 0;
  }
}

// The automatic size checks that ran for a size search (the first few
// cards, see page.tsx), kept with it so coming back from a product page
// does not pay for them again.

const VERDICTS_KEY = 'pick-last-search-size-checks';

export function saveSizeVerdicts(key: string, verdicts: Record<string, unknown>) {
  try {
    window.sessionStorage.setItem(VERDICTS_KEY, JSON.stringify({ key, verdicts }));
  } catch {
    // Coming back just checks again
  }
}

export function readSizeVerdicts<T>(key: string): Record<string, T> | null {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(VERDICTS_KEY) ?? 'null') as { key?: unknown; verdicts?: unknown } | null;
    if (!v || v.key !== key || !v.verdicts || typeof v.verdicts !== 'object') return null;
    return v.verdicts as Record<string, T>;
  } catch {
    return null;
  }
}
