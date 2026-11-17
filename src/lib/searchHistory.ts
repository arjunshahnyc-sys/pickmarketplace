// Recent searches, kept per device in localStorage (the same place as the
// saved list and the delivery destination; there are no accounts to hang
// them on). The list never goes on a request. Newest first, no repeats,
// capped, and anyone can remove one entry or clear the lot from the search
// box.
//
// The pure functions take and return plain arrays so they can be tested
// without a browser; the store below wraps them for React.

export const SEARCH_HISTORY_KEY = 'pick-search-history';
export const SEARCH_HISTORY_LIMIT = 8;
const MAX_QUERY_LENGTH = 120;

const sameSearch = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function clean(query: unknown): string {
  if (typeof query !== 'string') return '';
  return query.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}

/** Whatever is in storage, made safe: strings only, trimmed, no repeats, capped. */
export function sanitizeHistory(raw: string | null): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: string[] = [];
  for (const item of parsed) {
    const q = clean(item);
    if (q && !out.some((seen) => sameSearch(seen, q))) out.push(q);
    if (out.length === SEARCH_HISTORY_LIMIT) break;
  }
  return out;
}

/** Puts a search at the front. Searching something again moves it up. */
export function withSearch(history: readonly string[], query: string): string[] {
  const q = clean(query);
  if (!q) return [...history];
  return [q, ...history.filter((h) => !sameSearch(h, q))].slice(0, SEARCH_HISTORY_LIMIT);
}

export function withoutSearch(history: readonly string[], query: string): string[] {
  return history.filter((h) => !sameSearch(h, query));
}

/** What the box offers while typing: past searches containing the typed text. */
export function matchingSearches(history: readonly string[], typed: string): string[] {
  const t = typed.trim().toLowerCase();
  if (!t) return [...history];
  return history.filter((h) => h.toLowerCase().includes(t) && h.toLowerCase() !== t);
}

// ---------------------------------------------------------------------------
// Browser store (useSyncExternalStore-shaped). The snapshot is cached so its
// identity only changes when the list does.
// ---------------------------------------------------------------------------

const EMPTY: string[] = [];
let snapshot: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    return sanitizeHistory(window.localStorage.getItem(SEARCH_HISTORY_KEY));
  } catch {
    // localStorage unavailable (private mode): no history, search still works
    return EMPTY;
  }
}

function write(next: string[]) {
  snapshot = next;
  try {
    if (next.length) window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Quota or private mode: the in-memory list still works for this visit
  }
  listeners.forEach((l) => l());
}

export function getSearchHistory(): string[] {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

export function getServerSearchHistory(): string[] {
  return EMPTY;
}

export function subscribeSearchHistory(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab searched or cleared: pick up its list.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== SEARCH_HISTORY_KEY) return;
    snapshot = read();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function addSearch(query: string) {
  if (typeof window === 'undefined') return;
  const current = getSearchHistory();
  const next = withSearch(current, query);
  if (next.length === current.length && next.every((q, i) => q === current[i])) return;
  write(next);
}

export function removeSearch(query: string) {
  write(withoutSearch(getSearchHistory(), query));
}

export function clearSearchHistory() {
  write([]);
}
