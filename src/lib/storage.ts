// Per-device search-count tracking for the free plan's daily limit.
//
// The localStorage user/session/password helpers that used to live here were
// dead code from before auth moved server-side (see src/lib/auth.ts) and
// have been removed.

export interface SearchCount {
  date: string;
  count: number;
}

const SEARCH_COUNT_KEY = 'pick_search_count';

export function getSearchCount(): SearchCount {
  if (typeof window === 'undefined') return { date: '', count: 0 };

  // Never trust stored JSON: a corrupt or hand-edited value would otherwise
  // throw here and take down every caller (search gating, /account).
  let stored: SearchCount | null = null;
  try {
    const data = localStorage.getItem(SEARCH_COUNT_KEY);
    const parsed = data ? JSON.parse(data) : null;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.date === 'string' &&
      typeof parsed.count === 'number' &&
      Number.isFinite(parsed.count)
    ) {
      stored = { date: parsed.date, count: Math.max(0, Math.floor(parsed.count)) };
    }
  } catch {
    // Fall through to a fresh count
  }

  if (!stored || stored.date !== getTodayDate()) {
    return { date: getTodayDate(), count: 0 };
  }
  return stored;
}

export function incrementSearchCount(): number {
  const searchCount = getSearchCount();
  const newCount = searchCount.count + 1;
  try {
    localStorage.setItem(
      SEARCH_COUNT_KEY,
      JSON.stringify({ date: getTodayDate(), count: newCount })
    );
  } catch {
    // Private mode / quota exceeded: counting fails open rather than crashing
  }
  return newCount;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}
