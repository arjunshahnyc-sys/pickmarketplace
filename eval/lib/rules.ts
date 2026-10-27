// Text rules the harness uses to judge listings. These are the harness's
// own ground truth, written per test entry, and are deliberately separate
// from Pick's matching code in src/lib/productGrouping.ts: the point is to
// measure Pick's matching against an independent definition of "the exact
// item", not to reuse it. (Store names are normalized with Pick's own
// identity helpers so a store means the same thing on both sides.)

import { collapse, splitSellerSuffix } from '../../src/lib/trust/identity';

export type MatchTerm = string | string[];

/**
 * A listing is the exact item when every entry of `all` matches (an array
 * entry means any one of its alternatives) and no entry of `none` does.
 * `variant` pins the size, edition or generation separately, because many
 * listing titles never state it (see variantStatus).
 */
export interface MatchRule {
  all?: MatchTerm[];
  variant?: string[];
  none?: string[];
}

/**
 * Lowercase words with punctuation removed. Apostrophes vanish ("Levi's" is
 * "levis"), "+" is the word "plus" ("Buds+" is "buds plus"), thousands
 * separators vanish ("1,000" is "1000"), a zero decimal vanishes ("16.0 oz"
 * is "16 oz") and any other decimal point survives as the letter d ("1.7
 * oz" is "1d7 oz"), so collapsing spaces later can never turn "1.6 oz" into
 * "16oz".
 */
export function normalizeWords(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/(\d)\.0+(?!\d)/g, '$1')
    .replace(/(\d)\.(?=\d)/g, '$1d')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const isDigit = (ch: string | undefined) => ch !== undefined && ch >= '0' && ch <= '9';

/**
 * Drop the spaces between words, except a space between two numbers: "spf
 * 46 1d7 oz" becomes "spf46 1d7oz", so "1.7 oz" is still found after the
 * 46 instead of reading as part of "461".
 */
const squash = (normalized: string) => normalized.replace(/ (?!\d)|(?<!\d) /g, '');

/**
 * Whether one term appears in a listing name. A term with a digit in it
 * (a model number or a size: "wh-1000xm5", "16 oz", "12th") matches when
 * its letters and digits appear in order with any spacing or punctuation
 * ("WH1000XM5", "WH-1000XM5/B", "16oz", "16 Oz."), but never inside a
 * longer number ("16 oz" is not in "116 oz", "533" is not in "5330"). A
 * term without digits must match whole words, so "mens" never matches
 * inside "womens".
 */
export function termMatches(name: string, term: string): boolean {
  const t = normalizeWords(term);
  if (!t) return false;
  const n = normalizeWords(name);
  if (!/\d/.test(t)) return ` ${n} `.includes(` ${t} `);
  const hay = squash(n);
  const needle = squash(t);
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + 1)) {
    const clearBefore = !isDigit(needle[0]) || !isDigit(hay[at - 1]);
    const clearAfter = !isDigit(needle[needle.length - 1]) || !isDigit(hay[at + needle.length]);
    if (clearBefore && clearAfter) return true;
  }
  return false;
}

export interface RuleVerdict {
  matched: boolean;
  /** Why it did not match, for the listings report. */
  reason?: string;
}

/**
 * The identity part of a rule: `all` and `none` (the variant is judged by
 * variantStatus). `store` may supply an `all` term, because a brand's own
 * store often leaves its name out of the title (Uniqlo lists "Men's AIRism
 * Cotton Oversized T-Shirt"); `none` terms are only ever read from the
 * title.
 */
export function matchRule(name: string, rule: MatchRule, store = ''): RuleVerdict {
  const identity = store ? `${name} ${store}` : name;
  for (const entry of rule.all ?? []) {
    const alternatives = Array.isArray(entry) ? entry : [entry];
    if (!alternatives.some((term) => termMatches(identity, term))) {
      return { matched: false, reason: `lacks ${alternatives.map((a) => `"${a}"`).join(' or ')}` };
    }
  }
  for (const term of rule.none ?? []) {
    if (termMatches(name, term)) return { matched: false, reason: `has "${term}"` };
  }
  return { matched: true };
}

// ─── Variants ─────────────────────────────────────────────────────────────
//
// Sellers often leave the size, edition or generation out of the title
// (Walmart's "CeraVe Moisturizing Cream", no size), so a variant is one of:
//   confirmed    the title states the pinned variant
//   different    the title states some other size, edition or generation
//   unstated     the title states none; the listing may or may not be it
//   not-pinned   the entry pins no variant
// Unstated listings count as the item (Pick shows them as the item and a
// shopper cannot tell either), but the report marks them so a price that
// comes from one can be checked.

export type VariantStatus = 'confirmed' | 'different' | 'unstated' | 'not-pinned';

const STATED_VARIANT: ReadonlyArray<RegExp> = [
  // sizes and capacities
  /\b\d+(?:\.\d+)?\s*-?\s*(?:fl\.?\s*oz|oz|ounces?|ml|millilit(?:er|re)s?|g|grams?|kg|lbs?|pounds?|l|lit(?:er|re)s?|cu\.?\s*ft|cubic\s+f(?:ee|oo)t|cups?|qt|quarts?)\b/i,
  // editions
  /\b\d+(?:st|nd|rd|th)\s+(?:ed\b|ed\.|edition)|\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth)\s+edition\b/i,
  // generations
  /\b\d+(?:st|nd|rd|th)\s+gen(?:eration)?\b|\bgen(?:eration)?\s*\d\b|\b(?:first|second|third)\s+gen(?:eration)?\b/i,
];

export function variantStatus(name: string, rule: MatchRule): VariantStatus {
  if (!rule.variant || rule.variant.length === 0) return 'not-pinned';
  if (rule.variant.some((term) => termMatches(name, term))) return 'confirmed';
  return STATED_VARIANT.some((pattern) => pattern.test(name)) ? 'different' : 'unstated';
}

/**
 * An acceptable twin as the owner writes it: a plain name ("Soundcore Space
 * One", every word must appear in the listing name) or a full MatchRule
 * when a name alone is ambiguous ({"all": ["space one"], "none": ["pro"]}).
 */
export type TwinSpec = string | MatchRule;

export function twinRule(spec: TwinSpec): MatchRule {
  if (typeof spec !== 'string') return spec;
  return { all: normalizeWords(spec).split(' ').filter(Boolean) };
}

export function describeTwinSpec(spec: TwinSpec): string {
  if (typeof spec === 'string') return spec;
  return JSON.stringify(spec);
}

// ─── Condition ────────────────────────────────────────────────────────────
//
// Pick's feeds carry no condition field (Serper's shopping items stop at
// title, store, link, price, image, rating and product id), so the evidence
// is the title and the kind of store:
//   - a title that says refurbished, open box or used is that;
//   - a store that sells secondhand, by auction or by consignment is
//     'resale' (a Poshmark "new with tags" listing is still a resale);
//   - a lease-to-own store's price is a payment, not a purchase price;
//   - an e-textbook store sells a digital copy or rental, not the book;
//   - everything else counts as new. A general marketplace seller (eBay)
//     can list a used unit without saying so, and the report never claims
//     more than the title and store show.

export type Condition = 'new' | 'refurbished' | 'open-box' | 'used' | 'resale' | 'lease' | 'digital';

const CONDITION_PATTERNS: ReadonlyArray<[RegExp, Condition]> = [
  [/\b(?:refurbished|refurb|reconditioned|remanufactured|renewed)\b/i, 'refurbished'],
  [/\bopen[\s-]?box\b/i, 'open-box'],
  [/\b(?:used|pre[\s-]?owned|preowned|pre[\s-]?loved|second[\s-]?hand|like new|gently worn|nwot)\b/i, 'used'],
];

/** Stores whose listings are secondhand, auctions or consignment (collapsed-name prefixes). */
const RESALE_STORES = [
  'poshmark', 'mercari', 'whatnot', 'thredup', 'depop', 'grailed', 'therealreal', 'vestiaire',
  'swappa', 'backmarket', 'decluttr', 'gazelle', 'itsworthmore', 'unclaimedbaggage', 'pawnamerica',
  'paymore', 'thriftbooks', 'abebooks', 'betterworldbooks', 'alibris', 'biblio', 'halfpricebooks',
  'goodwill', 'shopgoodwill', 'patagoniawornwear', 'wornwear',
];

/** Lease-to-own stores: the listed price is a periodic payment. */
const LEASE_STORES = ['rentacenter', 'flexshopper', 'aarons', 'acima', 'katapult'];

/** E-textbook stores: the listing is a digital copy or rental, even when the title does not say so. */
const DIGITAL_STORES = ['vitalsource', 'redshelf', 'perlego', 'kortext', 'coursesmart'];

const storeKeys = (store: string): string[] => {
  const keys = [collapse(store)];
  // "Walmart - ThriftBooks": the seller after the dash is the store that ships.
  const split = splitSellerSuffix(store);
  if (split) keys.push(collapse(split.seller));
  return keys;
};

export function conditionOf(name: string, store = ''): Condition {
  for (const [pattern, condition] of CONDITION_PATTERNS) {
    if (pattern.test(name)) return condition;
  }
  const keys = storeKeys(store);
  if (keys.some((k) => LEASE_STORES.some((s) => k.startsWith(s)))) return 'lease';
  if (keys.some((k) => DIGITAL_STORES.some((s) => k.startsWith(s)))) return 'digital';
  if (keys.some((k) => RESALE_STORES.some((s) => k.startsWith(s)))) return 'resale';
  return 'new';
}

// ─── Custom and promotional listings ─────────────────────────────────────
//
// A logo-printed blender sold in minimum quantities by a promotional-goods
// house, a hand-painted pair of AirPods, or a university's custom edition
// of a textbook is not the retail item, whatever its name says.

const PROMOTIONAL = /\b(?:custom(?:ized|izable)?|personali[sz]ed|engraved|monogram(?:med)?|promotional|imprinted|imprint|branded|corporate gifts?|your logo|pad print|in bulk|bulk)\b/i;

export function promotionalPhrase(name: string): string | null {
  const m = PROMOTIONAL.exec(name);
  return m ? m[0] : null;
}

// ─── Multipacks and bundles ───────────────────────────────────────────────
//
// A listing of two units, or of the item plus something else, is not the
// price of one unit of the item. Returns the phrase that gave it away, or
// null for a single unit.

const COUNTED_PACK = /\b(\d+)\s*-?\s*(?:pack|pk|count|ct)\b/i;
// "13-piece" is what one blender set contains; "2 pcs" of earbuds is two.
const COUNTED_PIECES = /\b([2-3])\s*-?\s*(?:pc|pcs|pieces)\b/i;
const PACK_OF = /\b(?:pack|set|lot|case|box)\s+of\s+(\d+)\b/i;
const TIMES_SIZE = /\b(\d+)\s*x\s*\d/i;
const NAMED_PACK = /\b(?:twin|value|combo|family|multi|double|triple)[\s-]?pack\b|\bbundle[sd]?\b|\b(?:gift|starter|travel|trial)\s+(?:set|kit)\b/i;
const SIZE_FIGURE = /\b\d+(?:\.\d+)?\s*-?\s*(?:fl\.?\s*oz|oz|ounces?|ml|g|grams?|lbs?)\b/gi;

/** Two sizes joined by "+", "&" or "and": "16 oz. + Pump 12 oz" is two items. */
function twoSizesJoined(name: string): string | null {
  const sizes = Array.from(name.matchAll(SIZE_FIGURE));
  for (let i = 0; i + 1 < sizes.length; i++) {
    const end = (sizes[i].index ?? 0) + sizes[i][0].length;
    const between = name.slice(end, sizes[i + 1].index);
    if (/\+|&|\band\b/i.test(between)) return `${sizes[i][0]} + ${sizes[i + 1][0]}`;
  }
  return null;
}

export function multipackPhrase(name: string): string | null {
  const counted = COUNTED_PACK.exec(name);
  if (counted && Number(counted[1]) >= 2) return counted[0];
  const pieces = COUNTED_PIECES.exec(name);
  if (pieces) return pieces[0];
  const packOf = PACK_OF.exec(name);
  if (packOf && Number(packOf[1]) >= 2) return packOf[0];
  const times = TIMES_SIZE.exec(name);
  if (times && Number(times[1]) >= 2 && Number(times[1]) <= 12) return times[0];
  const named = NAMED_PACK.exec(name);
  if (named) return named[0];
  return twoSizesJoined(name);
}
