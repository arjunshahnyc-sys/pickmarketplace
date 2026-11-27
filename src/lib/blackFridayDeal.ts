// "Black Friday deal" on a search result card.
//
// A search row carries a price and nothing else: no crossed-out price, no
// sale flag. So the mark cannot come from the search. It comes from the
// same paid product lookup the price check page uses (2 Serper credits,
// lib/outbound.ts), which gives the store's own price, the price it crossed
// out, and the range Google says the product typically sells for.
//
// The rule, in the order it is tried:
//
//   1. Google gives a typical range: the listing is a deal only when its
//      price is below that range. A price inside the range is what the
//      product usually costs, whatever the sticker says.
//   2. Google gives no range: the listing is a deal when the store itself
//      crosses out a price at least 20% above today's. That is the store's
//      claim and Pick has not checked it; the card's note says so.
//
// A lookup that is not clearly about the card (confirmsListing below) never
// makes a mark.
//
// While the Black Friday window is open (lib/season.ts) the results page
// checks its first few cards from recognized stores by itself, the way a
// size search checks sizes. Client-safe: no catalog or rule-set imports.

/**
 * How many answered lookups a search pays for on its own: 2 credits each.
 * Google has no product page for most search rows (5 of 6 on a live search,
 * 2026-11-26) and says so with a 404 that is not billed, so the page keeps
 * going down the cards until this many lookups have answered or it has
 * tried MAX_DEAL_ATTEMPTS cards.
 */
export const AUTO_DEAL_CHECKS = 6;
export const MAX_DEAL_ATTEMPTS = 18;

/** Without a typical range, the store's markdown has to be at least this share of the crossed-out price. */
export const MARKDOWN_BAR = 0.2;

/** The same one-percent tolerance the price check page uses at the ends of a range. */
const RANGE_TOLERANCE = 0.01;

export type DealReason = 'below-usual' | 'markdown';

export interface DealCheckResult {
  deal: boolean;
  /** True when the product lookup answered; absent when there was nothing to judge. */
  checked?: boolean;
  reason?: DealReason;
  /** The bottom of Google's typical range, when that is the reason. */
  usualLow?: number;
  /** The store's crossed-out price, when it shows one above the price. */
  crossedOut?: number;
}

export const NO_DEAL: DealCheckResult = { deal: false };

/** "$1,299.99" -> 1299.99; null for anything that is not a plain dollar price. */
export function parseDollarPrice(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = /^\s*\$\s?(\d{1,3}(?:,\d{3})*|\d+)(\.\d{1,2})?\s*$/.exec(value);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, '') + (m[2] ?? ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "$88–$180" -> [88, 180]; null for anything else. */
export function parseTypicalRange(value: unknown): [number, number] | null {
  if (typeof value !== 'string') return null;
  const parts = value.split(/\s*[–—-]\s*/);
  if (parts.length !== 2) return null;
  const low = parseDollarPrice(parts[0]);
  const high = parseDollarPrice(parts[1]);
  return low !== null && high !== null && low <= high ? [low, high] : null;
}

const modelTokens = (title: string) =>
  new Set((title.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => /\d/.test(t) && t.length >= 2));

/**
 * Whether a lookup is about the card it was asked for. It often is not: the
 * same product id answered "Sony WH-1000XM5" twice and "Sony WF-1000XM5
 * earbuds" the third time (2026-11-26), and another card's lookup came back
 * as a $57.99 Sony WH-CH520. So a lookup counts only when the card's own
 * store is in the offer list at the card's price (within one percent), and,
 * when both titles carry model numbers, they share one.
 */
export function confirmsListing(
  cardPrice: number,
  cardTitle: string,
  ownOfferPrice: number | null,
  lookupTitle: string
): boolean {
  if (ownOfferPrice === null || !(cardPrice > 0)) return false;
  if (Math.abs(ownOfferPrice - cardPrice) / cardPrice > RANGE_TOLERANCE) return false;
  const card = modelTokens(cardTitle);
  const looked = modelTokens(lookupTitle);
  if (card.size === 0 || looked.size === 0) return true;
  return [...card].some((t) => looked.has(t));
}

export function dealVerdict(
  price: number,
  crossedOut: number | null,
  typicalRange: [number, number] | null
): DealCheckResult {
  if (!(price > 0)) return NO_DEAL;
  const marked = crossedOut !== null && crossedOut > price ? crossedOut : null;
  if (typicalRange) {
    return price < typicalRange[0] * (1 - RANGE_TOLERANCE)
      ? { deal: true, reason: 'below-usual', usualLow: typicalRange[0], ...(marked ? { crossedOut: marked } : {}) }
      : NO_DEAL;
  }
  if (marked && (marked - price) / marked >= MARKDOWN_BAR) {
    return { deal: true, reason: 'markdown', crossedOut: marked };
  }
  return NO_DEAL;
}

const whole = (n: number) => `$${Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2)}`;

/** The sentence behind the mark, for the card's tooltip. */
export function dealNote(result: DealCheckResult): string {
  if (result.reason === 'below-usual' && result.usualLow) {
    return `Below the ${whole(result.usualLow)} and up Google says this usually sells for.`;
  }
  if (result.reason === 'markdown' && result.crossedOut) {
    return `The store crossed out ${whole(result.crossedOut)}. That is the store's claim; Google gives no usual price to check it against.`;
  }
  return '';
}
