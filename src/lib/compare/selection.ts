// Compare selection rules, kept pure so they are unit-tested in node and
// shared by every surface that offers compare (the home page today, the
// category page's client island next).
//
// There is no "compare mode": every card carries a Compare checkbox, the
// bar's Compare button shows the count and opens the comparison once two
// are ticked. Picking a third replaces the OLDEST pick (the drawer's live
// region says so), because a shopper scanning down a page is almost always
// swapping the earlier choice, not the one they just made.

import type { Product } from '../types';

export const COMPARE_MAX = 2;

type Selectable = Pick<Product, 'id' | 'url' | 'name'>;

/**
 * Identity for selection. The feed id is stable per listing; the url is
 * the fallback because two listings with no direct retailer link can share
 * one Google Shopping search URL and must not toggle together.
 */
export function selectionKey(p: Pick<Product, 'id' | 'url'>): string {
  return p.id ?? p.url;
}

export function toggleSelection<T extends Selectable>(prev: T[], product: T, max = COMPARE_MAX): T[] {
  const key = selectionKey(product);
  if (prev.some((p) => selectionKey(p) === key)) {
    return prev.filter((p) => selectionKey(p) !== key);
  }
  if (prev.length >= max) {
    return [...prev.slice(prev.length - max + 1), product];
  }
  return [...prev, product];
}

export interface CompareButtonState {
  /** Always the same shape, so the sticky bar never reflows: "Compare (1/2)". */
  label: string;
  /** True once enough products are selected to open the comparison. */
  ready: boolean;
  /** Screen-reader hint for the button (what it does, or what to do first). */
  hint: string;
}

export function compareButtonState(count: number, max = COMPARE_MAX): CompareButtonState {
  const ready = count >= max;
  return {
    label: `Compare (${Math.min(count, max)}/${max})`,
    ready,
    hint: ready
      ? 'Opens a side-by-side comparison of the two selected products.'
      : 'Tick Compare on two product cards to compare them side by side.',
  };
}

// Feed names run to a hundred characters of pipes and model codes; the
// announcement needs only enough to tell the two picks apart.
const NAME_MAX = 40;
function shortName(name: string): string {
  if (name.length <= NAME_MAX) return name;
  const cut = name.slice(0, NAME_MAX);
  const atWord = cut.lastIndexOf(' ');
  return `${(atWord > NAME_MAX / 2 ? cut.slice(0, atWord) : cut).trimEnd()}…`;
}

/** The drawer's polite live-region sentence for a selection change. */
export function selectionAnnouncement<T extends Selectable>(
  prev: T[],
  next: T[],
  max = COMPARE_MAX
): string {
  if (next.length === 0) return prev.length > 0 ? 'Selection cleared.' : '';
  const prevKeys = new Set(prev.map(selectionKey));
  const nextKeys = new Set(next.map(selectionKey));
  const added = next.filter((p) => !prevKeys.has(selectionKey(p)));
  const removed = prev.filter((p) => !nextKeys.has(selectionKey(p)));
  if (added.length === 1 && removed.length === 1 && next.length >= max) {
    return `Replaced ${shortName(removed[0].name)} with ${shortName(added[0].name)}. ${max} of ${max} selected. Ready to compare.`;
  }
  const names = next.map((p) => shortName(p.name)).join(' and ');
  if (next.length >= max) return `${next.length} of ${max} selected: ${names}. Ready to compare.`;
  return `${next.length} of ${max} selected: ${names}. Tick Compare on one more card.`;
}

// ── Keeping picks across searches and page changes ─────────────────────────
// Picks live in this tab's sessionStorage, so a pick survives a new search,
// a visit to a product page and a reload, and ends with the tab. Each pick
// is stored as the card it was picked from (name, price, store, link), so
// the tray can show it while the results on screen are for something else.

export const COMPARE_STORAGE_KEY = 'pick-compare';

/** What a stored pick must have to be shown and compared again. */
function isStoredPick(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    typeof p.price === 'number' &&
    Number.isFinite(p.price) &&
    typeof p.retailer === 'string' &&
    typeof p.url === 'string' &&
    /^https?:\/\//.test(p.url)
  );
}

/** Picks read back from storage: malformed entries dropped, duplicates and overflow trimmed. */
export function parseStoredSelection(raw: string | null, max = COMPARE_MAX): Product[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const picks: Product[] = [];
    const seen = new Set<string>();
    for (const entry of parsed) {
      if (!isStoredPick(entry)) continue;
      const key = selectionKey(entry);
      if (seen.has(key)) continue;
      seen.add(key);
      picks.push(entry);
      if (picks.length >= max) break;
    }
    return picks;
  } catch {
    return [];
  }
}
