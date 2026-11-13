// What a comparison page's share image says: the preview a phone or a feed
// shows when someone pastes the link. Pure; the route (app/compare/[slug]/
// opengraph-image.tsx) draws it and components/ShareCard.tsx lays it out.
//
// The image states prices, which the page's title deliberately does not
// (see comparisonCopy): a platform may keep a preview for weeks. So every
// image carries the date its prices were checked, and a stale preview is
// still a true statement about that day.

import { formatCheckedDate, type Comparison } from './comparisonPage';
import type { ComparisonCategory, ComparisonEntry } from './comparisons';
import { currencySymbol, formatPrice } from './formatters';

export interface ShareImageContent {
  /** The product, as the page names it. */
  name: string;
  /** "Nov 13, 2026"; null when there is nothing dated to show. */
  checked: string | null;
  /** The lowest confirmed price and its store; null when Pick confirmed none. */
  price: { amount: string; store: string } | null;
  /** The cheaper match the page leads with; null when none passed the bar. */
  dupe: { name: string; amount: string; store: string; savingsPercent: number } | null;
  /** What the page calls a cheaper match for this kind of product. */
  dupeWord: 'dupe' | 'alternative';
}

/** "$45" for a round amount, "$17.44" otherwise: big type has no room for ".00". */
export function compactPrice(amount: number, currency = 'USD'): string {
  const symbol = currencySymbol(currency);
  return Number.isInteger(amount) ? `${symbol}${amount.toLocaleString('en-US')}` : `${symbol}${formatPrice(amount, currency)}`;
}

const DUPE_WORD_CATEGORIES: ReadonlySet<ComparisonCategory> = new Set<ComparisonCategory>(['skincare', 'clothing', 'drinkware', 'beauty']);

/** Longest dupe name the card shows in full. */
export const MAX_DUPE_NAME = 58;

/**
 * A listing title as a short product name: store boilerplate after a pipe
 * goes ("e.l.f. Halo Glow Liquid Filter 8 Rich | Foundation | CVS"), and a
 * long title is cut at a word with an ellipsis.
 */
export function shortName(title: string, max = MAX_DUPE_NAME): string {
  const head = title.split(' | ')[0].trim();
  if (head.length <= max) return head;
  const cut = head.slice(0, max + 1);
  const at = cut.lastIndexOf(' ');
  return `${cut.slice(0, at > max * 0.6 ? at : max).replace(/[\s,;:&+-]+$/, '')}…`;
}

/**
 * The card's content for one page. With no comparison (its searches
 * failed) the card names the product and promises nothing.
 */
export function shareImageContent(entry: ComparisonEntry, comparison: Comparison | null): ShareImageContent {
  const top = comparison && comparison.item.topIsVerifiedNew ? comparison.item.top : null;
  const twin = top ? (comparison?.twin ?? null) : null;
  return {
    name: entry.name,
    checked: comparison && top ? formatCheckedDate(comparison.checkedAt) : null,
    price: top ? { amount: compactPrice(top.price, top.currency), store: top.store } : null,
    dupe: twin
      ? {
          name: shortName(twin.name),
          amount: compactPrice(twin.price, twin.currency),
          store: twin.store,
          savingsPercent: twin.savingsPercent,
        }
      : null,
    dupeWord: DUPE_WORD_CATEGORIES.has(entry.category) ? 'dupe' : 'alternative',
  };
}

// ─── The card's typeface ───────────────────────────────────────────────────

export interface ShareFont {
  name: string;
  data: ArrayBuffer;
  weight: 500 | 700 | 900;
  style: 'normal';
}

// Google Fonts answers an old browser's request with TrueType, the format
// the image renderer reads fastest (it cannot read woff2 at all).
const TTF_USER_AGENT =
  'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1';

async function fetchFont(weight: ShareFont['weight']): Promise<ShareFont | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=DM+Sans:wght@${weight}`, {
      headers: { 'User-Agent': TTF_USER_AGENT },
    }).then((r) => (r.ok ? r.text() : ''));
    const url = /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const response = await fetch(url);
    if (!response.ok) return null;
    return { name: 'DM Sans', data: await response.arrayBuffer(), weight, style: 'normal' };
  } catch {
    return null;
  }
}

const fontCache = new Map<number, Promise<ShareFont | null>>();

/**
 * DM Sans, the site's heading face, in the weights asked for. A weight that
 * cannot be fetched is left out and the renderer falls back to its built-in
 * face, so a share image is plainer but never missing.
 */
export async function shareFonts(weights: ReadonlyArray<ShareFont['weight']>): Promise<ShareFont[]> {
  const loaded = await Promise.all(
    weights.map((weight) => {
      let pending = fontCache.get(weight);
      if (!pending) {
        pending = fetchFont(weight).then((font) => {
          // A failure is not remembered: the next image tries again.
          if (!font) fontCache.delete(weight);
          return font;
        });
        fontCache.set(weight, pending);
      }
      return pending;
    })
  );
  return loaded.filter((font): font is ShareFont => font !== null);
}
