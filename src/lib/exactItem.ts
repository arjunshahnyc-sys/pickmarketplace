// Which listings are exactly a catalog product, and Google's own list of
// stores selling it.
//
// Why this exists. A search for "google pixel buds pro 2" returns the Pixel
// Buds 2a, bundles, refurbished units and cases beside the real thing, and
// Pick's general grouping (productGrouping.ts) is built to be forgiving.
// On a 2026-11-12 capture the comparison pages showed, as the "lowest real
// price" of the product: the Pixel Buds 2a for the Pro 2, the Galaxy Buds3
// for the Buds3 Pro, the original Studio Buds for the Studio Buds +, a
// Keurig K-Mini Mate for the K-Mini. A page about one named product has to
// price that product.
//
// Two sources of evidence, both stricter than the grouping:
//
//   1. A title, judged by the hand-written rule each catalog product has in
//      eval/testset.json (the price eval's definition of the exact item:
//      words the title must contain, words it must not, and a pinned size,
//      edition or generation), plus checks for packs, add-ons and custom
//      runs.
//   2. Google's offer list for the product. Asking Google for the product
//      behind one search row (Serper /product) returns every store Google
//      files under that product, with each store's own title for it, its
//      price, its crossed-out price when it has one, and its product page.
//      Store titles there are much fuller than the titles in search
//      results: Best Buy's search row read "Sony Wireless Noise-Canceling
//      Headphones" while its offer read "Sony - WHCH720N Wireless Noise
//      Cancelling Headphones - Black". They also give away what a search
//      title hides: a Target row titled as the product was, in the list,
//      "Renewed Soundcore Space One".
//
// Everything here is pure; the paid lookup lives in exactOffers.ts.

import testset from '../../eval/testset.json';
import {
  conditionOf,
  matchRule,
  multipackPhrase,
  promotionalPhrase,
  variantStatus,
  type MatchRule,
} from '../../eval/lib/rules';
import type { ComparisonCategory, ComparisonEntry } from './comparisons';
import { listingCondition } from './condition';
import { getRetailerTrust } from './retailerTrust';
import type { Product } from './types';

/**
 * The categories whose pages are priced from exact-item evidence: products
 * sold as one model, where a title or a store can confirm which model it
 * is. Checked page by page on the 2026-11-12 capture. Skincare titles
 * rarely state the size, clothing prices vary by colour and cut, and
 * textbook listings mix new, used, rental and digital copies; those pages
 * stay on the general grouping until their rules are checked the same way.
 */
export const EXACT_ITEM_CATEGORIES: ReadonlyArray<ComparisonCategory> = ['earbuds', 'headphones', 'dorm appliances'];

const RULES = new Map<string, MatchRule>(
  (testset.queries as Array<{ id: string; exactItem: { match: MatchRule } }>).map((q) => [q.id, q.exactItem.match])
);

/** The exact-item rule for a catalog product, from the eval test set. */
export function exactRule(entry: ComparisonEntry): MatchRule | undefined {
  return RULES.get(entry.evalId);
}

// ─── Titles ────────────────────────────────────────────────────────────────

// A second product or an add-on named in the title. The eval's multipack
// check catches "Bundle" and "2-Pack", but not "Headphones with USB C
// charger Block", "WH-CH720N + Sony XB100 Portable Speaker", "Headphones
// Black 2 Year Product Protection" or "Headphones (Midnight Violet) with
// Audio Adapter" (all on the 2026-11-12 captures, all priced as if they
// were the product alone).
const ADD_ON =
  /\b(?:accessor(?:y|ies)|extended warranty|protection plan|applecare|charger block|charging block|power bank|gift card)\b|\bmin(?:imum)?\.?\s*(?:qty|quantity)\b|\b\d+\s*-?\s*(?:year|yr|month)\s+(?:[\w-]+\s+){0,3}(?:protection|warranty|plan|coverage)\b|\b(?:duo|trio)\b/i;
// Things that are never part of the product itself when a title joins them on.
const JOINED_OTHER =
  /(?:\bwith\b|\+|&|\band\b)\s+(?:[\w.'-]+\s+){0,5}(?:charger|speaker|stand|refill|lip balm|adapter|transmitter)\b/i;
// A second pair of headphones or earbuds: only when the title has already
// named one before the joiner. "Beats Studio Buds + True Wireless Noise
// Cancelling Earbuds" is one product whose name contains a plus sign.
const AUDIO_NOUN = /\b(?:headphones?|earbuds?|earphones)\b/i;
const JOINED_AUDIO = /(?:\bwith\b|\+|&|\band\b)\s+(?:[\w.'-]+\s+){0,5}(?:headphones?|earbuds?|earphones)\b/i;
// The same noun twice with other words between: "WH 1000XM6 Wireless Noise
// Canceling Headphones Silver MDR ZX110 On Ear Wired Headphones White" is
// two pairs with no joiner at all. Keyword-stuffed titles ("Earbuds, in Ear
// Headphones, Bluetooth Earphones") use different nouns and are left alone.
const REPEATED_AUDIO = /\b(headphones?|earbuds?)\b(?:[\s,|-]+[\w.'-]+){2,}?[\s,|-]+\1\b/i;

/** The phrase that names a second product or an add-on in the title, or null. */
export function extraItemPhrase(name: string): string | null {
  const addOn = ADD_ON.exec(name);
  if (addOn) return addOn[0];
  const other = JOINED_OTHER.exec(name);
  if (other) return other[0];
  const audio = JOINED_AUDIO.exec(name);
  if (audio && AUDIO_NOUN.test(name.slice(0, audio.index))) return audio[0];
  const repeated = REPEATED_AUDIO.exec(name);
  if (repeated) return repeated[0];
  return null;
}

/**
 * Why a title is not the exact product as one retail unit, or null when it
 * is. Judges the title alone: nothing about the store or the condition.
 *
 * Where the product pins a size, edition or generation, the title has to
 * state it. The eval counts a title that states none (and marks it), but a
 * price shown as the product's own cannot rest on "probably the 2nd Gen":
 * Bose's own store listed "QuietComfort Ultra Earbuds" at $199 beside the
 * 2nd Gen at $279 and up (2026-11-12). `variantKnown` waives that for a
 * title whose variant is established some other way (it sits in an offer
 * list where Google or a store states it).
 */
export function titleMismatch(name: string, store: string, rule: MatchRule, variantKnown = false): string | null {
  const verdict = matchRule(name, rule, store);
  if (!verdict.matched) return verdict.reason ?? 'not the item';
  const variant = variantStatus(name, rule);
  if (variant === 'different') return 'another size, edition or generation';
  if (variant === 'unstated' && !variantKnown) return 'does not state the size, edition or generation';
  const pack = multipackPhrase(name);
  if (pack) return `multipack or bundle (${pack})`;
  const extra = extraItemPhrase(name);
  if (extra) return `comes with something else (${extra})`;
  const promo = promotionalPhrase(name);
  if (promo) return `custom or promotional (${promo})`;
  return null;
}

/** A listing whose own title says it is the exact product, one unit. */
export function isExactListing(product: Product, rule: MatchRule): boolean {
  return titleMismatch(product.name, product.retailer, rule) === null;
}

/**
 * A title that says it is something else: an excluded word, another size or
 * generation, a pack, an add-on, a custom run. Unlike titleMismatch it does
 * not require the title to name the product.
 */
export function contradictsRule(name: string, rule: MatchRule): boolean {
  if (matchRule(name, { none: rule.none }).matched === false) return true;
  if (variantStatus(name, rule) === 'different') return true;
  return multipackPhrase(name) !== null || extraItemPhrase(name) !== null || promotionalPhrase(name) !== null;
}

const isVerifiedNew = (p: Product): boolean => {
  const level = getRetailerTrust(p.retailer, { market: p.sourceMarket, url: p.url }).level;
  return level === 'verified' && listingCondition(p, level) === 'new' && conditionOf(p.name, p.retailer) === 'new';
};

const looksNew = (p: Product): boolean =>
  conditionOf(p.name, p.retailer) === 'new' &&
  listingCondition(p, getRetailerTrust(p.retailer, { market: p.sourceMarket, url: p.url }).level) !== 'refurbished';

/**
 * The search rows whose offer lists are worth asking for, best first. A row
 * qualifies when its title names the product and contradicts nothing; it
 * need not state a pinned size or generation, because the list it leads to
 * may. Verified stores' new units go first, cheapest first: the cheapest
 * is the row that would otherwise sit on top of the page on the strength of
 * a search title alone. Then the other new-looking rows in search order.
 */
export function offerListCandidates(results: Product[], rule: MatchRule): Product[] {
  const named = results.filter(
    (p) => !p.isFallback && p.googleProductId && looksNew(p) && titleMismatch(p.name, p.retailer, rule, true) === null
  );
  const verified = named.filter(isVerifiedNew).sort((a, b) => a.price - b.price);
  return [...verified, ...named.filter((p) => !isVerifiedNew(p))];
}

/**
 * Verified stores' new units whose search titles neither name the product
 * nor contradict it ("Sony Wireless Noise-Canceling Headphones" on a page
 * about the WH-CH720N), cheapest first. Their offer lists may confirm them
 * store by store. `near` narrows the field to rows Pick's grouping files
 * with the product, so the lookup is not spent on an unrelated listing.
 */
export function possibleCandidates(results: Product[], rule: MatchRule, near: (p: Product) => boolean): Product[] {
  return results
    .filter(
      (p) =>
        !p.isFallback &&
        p.googleProductId &&
        isVerifiedNew(p) &&
        near(p) &&
        !contradictsRule(p.name, rule) &&
        titleMismatch(p.name, p.retailer, rule, true) !== null
    )
    .sort((a, b) => a.price - b.price);
}

// ─── Google's offer list ───────────────────────────────────────────────────

/** One store in Google's offer list for a product. */
export interface ListedOffer {
  store: string;
  /** The store's own title for the product. */
  title: string;
  /** The store's product page. */
  link: string;
  price: number;
  /** The store's crossed-out price, when it shows one above `price`. */
  originalPrice: number | null;
  /** Google's notes on the offer: stock, delivery, returns, "Pre-owned". */
  details: string[];
}

export interface OfferList {
  /** Google's title for the product the offers belong to. */
  title: string;
  /** Google's "typically $88 to $180" for the product, when it gives one. */
  typicalRange: [number, number] | null;
  offers: ListedOffer[];
}

/** "$1,299.99" -> 1299.99; anything that is not a plain US dollar price -> null. */
export function parseDollars(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const m = /^\s*\$\s?(\d{1,3}(?:,\d{3})*|\d+)(\.\d{1,2})?\s*$/.exec(value);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, '') + (m[2] ?? ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "$88–$180" -> [88, 180]; null for anything else. */
export function parseDollarRange(value: unknown): [number, number] | null {
  if (typeof value !== 'string') return null;
  const parts = value.split(/\s*[\u2013\u2014-]\s*/);
  if (parts.length !== 2) return null;
  const low = parseDollars(parts[0]);
  const high = parseDollars(parts[1]);
  return low !== null && high !== null && low <= high ? [low, high] : null;
}

/** A Serper /product response as an offer list; null when it is not one. */
export function parseOfferList(json: unknown): OfferList | null {
  const data = (json ?? {}) as { product?: { title?: unknown; typicalPriceRange?: unknown }; offers?: unknown };
  const title = typeof data.product?.title === 'string' ? data.product.title.trim() : '';
  if (!title || !Array.isArray(data.offers)) return null;
  const offers: ListedOffer[] = data.offers.flatMap((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const price = parseDollars(o.price);
    if (typeof o.source !== 'string' || !o.source.trim() || price === null) return [];
    if (typeof o.link !== 'string' || !/^https?:\/\//i.test(o.link)) return [];
    const original = parseDollars(o.originalPrice);
    return [
      {
        store: o.source.trim(),
        title: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : title,
        link: o.link,
        price,
        originalPrice: original !== null && original > price ? original : null,
        details: Array.isArray(o.details) ? o.details.filter((d): d is string => typeof d === 'string') : [],
      },
    ];
  });
  return { title, typicalRange: parseDollarRange(data.product?.typicalPriceRange), offers };
}

/**
 * Whether Google's product is the catalog product as a whole: its own
 * title passes the rule, at least one store's title does too, and a pinned
 * size or generation is stated by Google's title or a store's.
 */
export function offerListIsExact(list: OfferList, rule: MatchRule): boolean {
  const variantStated =
    variantStatus(list.title, rule) !== 'unstated' || list.offers.some((o) => variantStatus(o.title, rule) === 'confirmed');
  if (!variantStated) return false;
  if (titleMismatch(list.title, '', rule, true) !== null) return false;
  return list.offers.some((o) => titleMismatch(o.title, o.store, rule, true) === null);
}

const NOT_NEW_DETAIL = /\b(?:pre[\s-]?owned|used|refurbished|renewed|open[\s-]?box|second[\s-]?hand)\b/i;

/**
 * The offers of a list that are the product, as listings titled with the
 * store's own title and linked to the store's own page.
 *
 * In a list that is the product as a whole (offerListIsExact), an offer is
 * dropped only when its title contradicts the rule; a store title that
 * merely omits the model stays, because Google filing it under the product
 * is the evidence. In any other list (Google titled it loosely) an offer
 * is kept only when the store's own title passes the rule in full.
 * Offers Google marks pre-owned or refurbished are dropped either way; a
 * store title that says so ("Renewed ...") is labelled by condition.ts
 * like any other listing.
 */
export function offersAsListings(list: OfferList, rule: MatchRule, market = 'US'): Product[] {
  const whole = offerListIsExact(list, rule);
  return list.offers.flatMap((o, i) => {
    if (o.details.some((d) => NOT_NEW_DETAIL.test(d))) return [];
    const keep = whole ? !contradictsRule(o.title, rule) : titleMismatch(o.title, o.store, rule) === null;
    if (!keep) return [];
    return [
      {
        id: `offer:${i}:${o.store}`,
        name: o.title,
        price: o.price,
        ...(o.originalPrice !== null ? { originalPrice: o.originalPrice } : {}),
        image: '',
        retailer: o.store,
        url: o.link,
        currency: 'USD',
        sourceMarket: market,
      } as Product,
    ];
  });
}
