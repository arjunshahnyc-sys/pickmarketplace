// A listing's condition, as far as its title and its store show it.
//
// Pick's only feed (Google Shopping via Serper) carries no condition field,
// so the evidence is what a seller writes into the title and what kind of
// store it is. A 2026-09-22 capture of 50 queries (eval/runs) found 88 of
// 776 listings of the searched items were not new units, none of them
// marked on the card: Target's refurbished earbuds ranked first, pawn and
// liquidation stores took the lowest-price marker, and Rent-A-Center's
// "$19.99" was a weekly payment. The rules:
//   - a title that says refurbished, open box or used is that;
//   - a store that sells secondhand, by auction or on consignment is
//     'resale' (a Poshmark "new with tags" listing is still a resale);
//   - a lease-to-own store's price is a payment ('lease');
//   - an e-textbook store sells a digital copy or rental ('etextbook');
//   - a marketplace listing that says nothing is 'unstated': marketplace
//     sellers list used units without saying so;
//   - anything else is 'new'. A verified store's listing that says nothing
//     is taken as new until a source with a real condition field says so.

import type { Product } from './types';
import { classifySeller, type TrustLevel } from './retailerTrust';
import { collapse, splitSellerSuffix } from './trust/identity';

export type ListingCondition =
  | 'new'
  | 'refurbished'
  | 'open-box'
  | 'used'
  | 'resale'
  | 'lease'
  | 'etextbook'
  | 'unstated';

const TITLE_CONDITIONS: ReadonlyArray<[RegExp, ListingCondition]> = [
  [/\b(?:refurbished|refurb|reconditioned|remanufactured|renewed|restored)\b/i, 'refurbished'],
  [/\bopen[\s-]?box\b/i, 'open-box'],
  [/\b(?:used|pre[\s-]?owned|preowned|pre[\s-]?loved|second[\s-]?hand|like new|gently worn|nwot)\b/i, 'used'],
];

// Stores by what they sell, as prefixes of the collapsed store name (see
// trust/identity collapse): "Poshmark" and "mercari.com" both match.
const STORE_CONDITIONS: ReadonlyArray<[ListingCondition, ReadonlyArray<string>]> = [
  ['lease', ['rentacenter', 'flexshopper', 'aarons', 'acima', 'katapult']],
  ['etextbook', ['vitalsource', 'redshelf', 'perlego', 'kortext', 'coursesmart']],
  ['refurbished', ['backmarket', 'itsworthmore']],
  [
    'resale',
    [
      'poshmark', 'mercari', 'whatnot', 'thredup', 'depop', 'grailed', 'therealreal', 'vestiaire',
      'swappa', 'decluttr', 'gazelle', 'unclaimedbaggage', 'pawnamerica', 'paymore', 'thriftbooks',
      'abebooks', 'betterworldbooks', 'alibris', 'biblio', 'halfpricebooks', 'goodwill',
      'shopgoodwill', 'wornwear', 'patagoniawornwear',
    ],
  ],
];

function storeKeys(retailer: string): string[] {
  const keys = [collapse(retailer)];
  // "Walmart - ThriftBooks": the seller after the dash is the store that ships.
  const split = splitSellerSuffix(retailer);
  if (split) keys.push(collapse(split.seller));
  return keys.filter(Boolean);
}

/**
 * The listing's condition. `level` is the seller's trust level when the
 * caller already has it; otherwise it is classified here.
 */
export function listingCondition(
  product: Pick<Product, 'name' | 'retailer' | 'sourceMarket' | 'url'>,
  level?: TrustLevel
): ListingCondition {
  for (const [pattern, condition] of TITLE_CONDITIONS) {
    if (pattern.test(product.name)) return condition;
  }
  const keys = storeKeys(product.retailer);
  for (const [condition, stores] of STORE_CONDITIONS) {
    if (keys.some((key) => stores.some((store) => key.startsWith(store)))) return condition;
  }
  const trust = level ?? classifySeller(product.retailer, { market: product.sourceMarket, url: product.url }).level;
  return trust === 'marketplace' || trust === 'marketplace-seller' ? 'unstated' : 'new';
}

/** Known not to be a new unit (an unstated marketplace listing is not known either way). */
export function isNotNew(condition: ListingCondition): boolean {
  return condition !== 'new' && condition !== 'unstated';
}

/** Title or store shows the listing is not a new unit. Needs no trust lookup. */
export function isKnownNotNew(product: Pick<Product, 'name' | 'retailer' | 'sourceMarket' | 'url'>): boolean {
  return isNotNew(listingCondition(product, 'unknown'));
}

/** The label a card shows, or null for a new unit. */
export const CONDITION_LABELS: Readonly<Record<ListingCondition, string | null>> = {
  new: null,
  refurbished: 'Refurbished',
  'open-box': 'Open box',
  used: 'Used',
  resale: 'Resale store',
  lease: 'Lease payment',
  etextbook: 'eTextbook',
  unstated: 'Condition not stated',
};
