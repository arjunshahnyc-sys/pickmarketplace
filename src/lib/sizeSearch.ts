// Size search for clothes and shoes.
//
// What the data allows (probed 2026-11-17): the shopping feed has no size
// field, but adding "size XL" to the search makes Google return that size's
// own listing of each item, with that size's price (a Gap hoodie was $39.00
// in the plain search and $63.00 in XL), and the per-product lookup then
// names the size and its stock ("... True Black Size XL", "In stock
// online"). So a size search is the same one paid search with the size
// added; it is not a stock guarantee, and the results say so.
//
// This module is pure: which searches get a size picker, which sizes it
// offers, how the size joins the search, and which listings to drop because
// their title names a different size.

export type SizeKind = 'letters' | 'shoes' | 'waist';

const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
// US shoe sizes 5 to 15, halves up to 12.5 (few makers cut halves above).
const SHOE_SIZES = [
  ...Array.from({ length: 16 }, (_, i) => String(5 + i / 2)),
  '13', '14', '15',
];
// Jeans waist in inches.
const WAIST_SIZES = ['26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42', '44'];

export const SIZE_OPTIONS: Record<SizeKind, readonly string[]> = {
  letters: LETTER_SIZES,
  shoes: SHOE_SIZES,
  waist: WAIST_SIZES,
};

export const SIZE_LABELS: Record<SizeKind, string> = {
  letters: 'Size',
  shoes: 'Shoe size',
  waist: 'Waist',
};

export function isSizeKind(value: unknown): value is SizeKind {
  return value === 'letters' || value === 'shoes' || value === 'waist';
}

export function isValidSize(kind: SizeKind, size: unknown): size is string {
  return typeof size === 'string' && SIZE_OPTIONS[kind].includes(size);
}

// Shoes first: "dress shoes" is footwear, not a dress.
const SHOES = /\b(?:shoes?|sneakers?|boots?|sandals?|loafers?|heels|slippers?|cleats|trainers|flip flops|clogs|crocs|air force 1|air jordans?|jordans|dunks?|air max|new balance \d{3,4}|ultraboost|birkenstocks?|uggs?)\b/i;
const WAIST = /\bjeans?\b/i;
const LETTERS = /\b(?:hoodies?|sweatshirts?|sweaters?|crewnecks?|cardigans?|pullovers?|tees?|t-?shirts?|shirts?|polos?|blouses?|tank tops?|crop tops?|tops|jackets?|coats?|puffers?|parkas?|blazers?|vests?|fleece|dress|dresses|skirts?|rompers?|jumpsuits?|leggings|joggers|sweatpants|pants|trousers|chinos|shorts|pajamas|pjs|scrubs|swimsuits?|bikinis?|swim trunks|bras?|boxers|briefs|underwear|onesies?)\b/i;

// The shopper already typed a size; leave their search alone.
const HAS_SIZE = /\bsize\b|\b(?:xxs|xs|xl|xxl|[2-5]x|[2-5]xl|small|medium|large)\b|\b\d{2}\s?x\s?\d{2}\b|\b\d{2}w\b/i;

function kindOf(text: string): SizeKind | null {
  if (SHOES.test(text)) return 'shoes';
  if (WAIST.test(text)) return 'waist';
  if (LETTERS.test(text)) return 'letters';
  return null;
}

/** Which size picker a search gets, from its words alone. null = none. */
export function sizeKindForQuery(query: string): SizeKind | null {
  if (HAS_SIZE.test(query)) return null;
  return kindOf(query);
}

/**
 * The fallback for searches whose words do not say clothing ("lululemon
 * align", "carhartt k87"): the picker appears when most of the listings
 * that came back are one kind of clothing. Only offers the picker; a
 * remembered size is never applied on this guess.
 */
export function sizeKindForResults(query: string, titles: readonly string[]): SizeKind | null {
  if (HAS_SIZE.test(query) || titles.length < 4) return null;
  const counts: Record<SizeKind, number> = { letters: 0, shoes: 0, waist: 0 };
  for (const title of titles) {
    const kind = kindOf(title);
    if (kind) counts[kind] += 1;
  }
  const [kind, count] = (Object.entries(counts) as Array<[SizeKind, number]>).sort((a, b) => b[1] - a[1])[0];
  return count / titles.length >= 0.6 ? kind : null;
}

/** The search actually sent to the price source for a size. */
export function withSize(query: string, size: string): string {
  return `${query.trim()} size ${size}`;
}

const LETTER_ALIASES: Record<string, string> = {
  'x-small': 'XS', xsmall: 'XS', 'extra small': 'XS',
  small: 'S', sm: 'S',
  medium: 'M', med: 'M', md: 'M',
  large: 'L', lg: 'L',
  'x-large': 'XL', xlarge: 'XL', 'extra large': 'XL', '1x': 'XL', '1xl': 'XL',
  'xx-large': 'XXL', xxlarge: 'XXL', '2x': 'XXL', '2xl': 'XXL',
};

/**
 * The size a listing's title commits to, if it names one after the word
 * "size" ("... Size L", "Size 10.5", "Plus Size 2X") or as waist x length
 * ("32x30"). null when the title names none, which is most listings.
 */
export function sizeNamedInTitle(title: string, kind: SizeKind): string | null {
  const text = title.toLowerCase();
  if (kind === 'letters') {
    // After the word "size", or as the last thing in the title after a
    // comma or dash ("Essential Oversized Hoodie - Stone, XS").
    // Stores also spell it out at the end ("... - Flint Blue - Large").
    const m =
      text.match(/\bsize[:\s]+(extra small|extra large|[a-z0-9-]+)/) ??
      text.match(/[,\-–|/]\s*(x{0,3}s|m|x{0,3}l|[2-5]xl?|x-small|small|medium|large|x-large|xx-large)\s*$/);
    if (!m) return null;
    const token = m[1];
    const upper = token.toUpperCase();
    if ((LETTER_SIZES as readonly string[]).includes(upper)) return upper;
    if (LETTER_ALIASES[token]) return LETTER_ALIASES[token];
    // A size the picker does not offer ("XXXL", "3X", a kids' "12"): still
    // a size, and not the one asked for.
    return /\d/.test(token) || /^x+[sl]$/.test(token) ? upper : null;
  }
  if (kind === 'waist') {
    const pair = text.match(/\b(\d{2})\s?x\s?\d{2}\b/);
    if (pair) return pair[1];
  }
  const m = text.match(/\bsize[:\s]+(\d{1,2}(?:\.5)?)\b/);
  return m ? m[1] : null;
}

/** True when the title names a size and it is not the one asked for. */
export function namesAnotherSize(title: string, kind: SizeKind, size: string): boolean {
  const named = sizeNamedInTitle(title, kind);
  return named !== null && named !== size;
}

// ---------------------------------------------------------------------------
// The shopper's sizes, remembered on this device (localStorage, like the
// saved list). One per kind, so a hoodie search and a sneaker search each
// get the right one.
// ---------------------------------------------------------------------------

export const SIZE_STORAGE_KEY = 'pick-sizes';

export function sanitizeStoredSizes(raw: string | null): Partial<Record<SizeKind, string>> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Partial<Record<SizeKind, string>> = {};
    for (const [kind, size] of Object.entries(parsed)) {
      if (isSizeKind(kind) && isValidSize(kind, size)) out[kind] = size;
    }
    return out;
  } catch {
    return {};
  }
}

export function getStoredSize(kind: SizeKind): string | null {
  try {
    return sanitizeStoredSizes(window.localStorage.getItem(SIZE_STORAGE_KEY))[kind] ?? null;
  } catch {
    return null;
  }
}

export function setStoredSize(kind: SizeKind, size: string | null) {
  try {
    const sizes = sanitizeStoredSizes(window.localStorage.getItem(SIZE_STORAGE_KEY));
    if (size) sizes[kind] = size;
    else delete sizes[kind];
    if (Object.keys(sizes).length) window.localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(sizes));
    else window.localStorage.removeItem(SIZE_STORAGE_KEY);
  } catch {
    // Private mode: the size still applies to this search, just not the next
  }
}

// ---------------------------------------------------------------------------
// "Check size" on one card: what the paid product lookup says about one
// store and one size. A size search returns each size as its own listing,
// and the lookup gives the store's own title for it ("... True Black Size
// XL") and Google's stock note ("In stock online"). The verdict only ever
// repeats what those two say.
// ---------------------------------------------------------------------------

export type SizeCheckStatus =
  /** The store's listing names this size and Google says it is in stock. */
  | 'in-stock'
  /** Names this size, and Google says it is not in stock. */
  | 'out-of-stock'
  /** Names this size; no stock note either way. */
  | 'listed'
  /** The store's listing is for a different size. */
  | 'other-size'
  /** The store is there but its listing names no size. */
  | 'unstated'
  /** The lookup has no offer from this store, or could not be run. */
  | 'unknown';

export interface SizeCheckResult {
  status: SizeCheckStatus;
  /** The size the store's listing names, when it is a different one. */
  otherSize?: string;
  /** Other stores whose listing of this product names the size, in stock. */
  alsoAt: string[];
}

export interface CheckedOffer {
  source: string;
  title?: string;
  details?: string[];
}

function stockOf(details: readonly string[] = []): 'in' | 'out' | null {
  const text = details.join(' | ').toLowerCase();
  if (/\bout of stock\b|\bsold out\b|\bunavailable\b|\bbackorder/.test(text)) return 'out';
  if (/\bin stock\b|\blimited stock\b|\bfew left\b/.test(text)) return 'in';
  return null;
}

/**
 * `listingTitle` is the search row's own title, the fallback when the
 * lookup has nothing for the store: Google has no product page for some
 * listings (Kohl's rows came back "Product not found" on 2026-11-17) even
 * though the row's title says "Size: Large". A title can confirm the size
 * the listing is for; it never says anything about stock.
 */
export function sizeVerdict(
  offers: readonly CheckedOffer[],
  isSeller: (source: string) => boolean,
  kind: SizeKind,
  size: string,
  listingTitle = ''
): SizeCheckResult {
  const alsoAt = Array.from(
    new Set(
      offers
        .filter((o) => !isSeller(o.source) && sizeNamedInTitle(o.title ?? '', kind) === size && stockOf(o.details) === 'in')
        .map((o) => o.source)
    )
  ).slice(0, 2);

  const fromListing = sizeNamedInTitle(listingTitle, kind);
  const own = offers.filter((o) => isSeller(o.source));
  if (own.length === 0) {
    if (fromListing === size) return { status: 'listed', alsoAt };
    if (fromListing) return { status: 'other-size', otherSize: fromListing, alsoAt };
    return { status: 'unknown', alsoAt };
  }

  // The store may list several sizes; the one asked for decides.
  const match = own.find((o) => sizeNamedInTitle(o.title ?? '', kind) === size);
  if (match) {
    const stock = stockOf(match.details);
    return { status: stock === 'in' ? 'in-stock' : stock === 'out' ? 'out-of-stock' : 'listed', alsoAt };
  }
  const other = own.map((o) => sizeNamedInTitle(o.title ?? '', kind)).find((s) => s !== null);
  if (other) return { status: 'other-size', otherSize: other, alsoAt };
  // The store's offer names no size, but the search row did.
  if (fromListing === size) {
    const stock = stockOf(own[0].details);
    return { status: stock === 'in' ? 'in-stock' : stock === 'out' ? 'out-of-stock' : 'listed', alsoAt };
  }
  if (fromListing) return { status: 'other-size', otherSize: fromListing, alsoAt };
  return { status: 'unstated', alsoAt };
}
