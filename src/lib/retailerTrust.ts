// Seller-trust classification for search results.
//
// Google Shopping results carry whatever merchant name Serper reports
// (scrapers.ts uses item.source verbatim), so results can come from anyone —
// major retailers, marketplace resellers, or scam-prone storefronts. This
// module buckets a merchant name into three tiers:
//
//   verified — major US retailers with real fulfillment and buyer protection
//   flagged  — marketplaces with documented scam/counterfeit records
//              (e.g. Temu's 2025 FTC INFORM Act penalty, Wish's counterfeit
//              history, DHgate/AliExpress replica trade, Shein's 2026 Texas
//              AG suit) — shown with a "possible scam" warning
//   unknown  — everything else; shown as an unverified seller
//
// Verified names must match EXACTLY (after normalization) — substring
// matching would let "Pineapple Boutique" match "apple" or a marketplace
// seller like "Walmart - SaveMore Deals" inherit Walmart's badge.
// Flagged names match per-token so "AliExpress US Store" still flags,
// while short keys like "wish" can't fire inside longer words.

export type TrustLevel = 'verified' | 'flagged' | 'unknown';

export interface RetailerTrust {
  level: TrustLevel;
  label: string;
  description: string;
}

// Collapse a merchant name to a comparable key: lowercase, drop a leading
// "the" and a trailing domain suffix, strip everything that isn't a letter
// or digit. "Best Buy" -> "bestbuy", "Macy's" -> "macys", "Temu.com" ->
// "temu", "The Home Depot" -> "homedepot"
// Exported: landedCost/merchants.ts keys its config on the same collapse so
// trust badges and merchant config can never disagree about identity.
export function collapse(name: string): string {
  return name
    .toLowerCase()
    .replace(/^\s*the\s+/, '')
    .replace(/\.(com|net|org|co|us|shop|store)$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

// Tokens of the name with apostrophes removed: "AliExpress US Store" ->
// ["aliexpress", "us", "store"], "Sam's Club" -> ["sams", "club"]
function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Major retailers, stored in collapsed form. Includes every store the site
// advertises checking, plus large chains with first-party fulfillment.
const VERIFIED = new Set([
  'amazon',
  'walmart',
  'target',
  'bestbuy',
  'costco',
  'ebay',
  'homedepot',
  'lowes',
  'macys',
  'nordstrom',
  'wayfair',
  'kroger',
  'kohls',
  'samsclub',
  'bhphoto',
  'bhphotovideo',
  'adorama',
  'newegg',
  'staples',
  'officedepot',
  'officedepotofficemax',
  'bhphotovideoaudio',
  'rei',
  'chewy',
  'gamestop',
  'microcenter',
  'dickssportinggoods',
  'apple',
  'nike',
  // US chains harvested from recurring live results (2026-08-27).
  'academysportsoutdoors',
  'golfgalaxy',
  'stanley1913',
  'zumiez',
  'petco',
  'petsmart',
  'ulta',
  'ultabeauty',
  'sephora',
  'bathbodyworks',
  'bathandbodyworks',
  'footlocker',
  'finishline',
  'jcpenney',
  'dillards',
  'belk',
  'crateandbarrel',
  'williamssonoma',
  'potterybarn',
  // GB majors (international pilot): first-party fulfilment chains.
  'amazoncouk',
  'currys',
  'curryspcworld',
  'argos',
  'johnlewis',
  'costcowholesaleuk',
  'ao',
  'boots',
  'screwfix',
  'very',
  // DE/FR majors.
  'amazonde',
  'otto',
  'mediamarkt',
  'saturn',
  'zalando',
  'amazonfr',
  'fnac',
  'darty',
  'boulanger',
  'coolblue',
  'coolbluede',
  // CA majors (binational brands are already listed above).
  'amazonca',
  'walmartca',
  'bestbuycanada',
  'canadiantire',
  'londondrugs',
  // AU majors.
  'amazonau',
  'amazoncomau',
  'jbhifi',
  'harveynorman',
  'thegoodguys',
  'bigw',
  'officeworks',
  'myer',
  'davidjones',
  // JP majors with stable latin collapses.
  'amazoncojp',
  'rakuten',
  'yodobashi',
  'biccamera',
]);

// Marketplaces with widespread, well-documented scam/counterfeit/quality
// complaints. Distinctive multi-part names also match collapsed substrings
// ("DHgate Official Store"); every key matches as an exact token.
const FLAGGED = [
  'temu',
  'dhgate',
  'aliexpress',
  'alibaba',
  'shein',
  'banggood',
  'joom',
  'lightinthebox',
  'fruugo',
  'desertcart',
];

// Keys distinctive enough to match anywhere in the collapsed name.
const FLAGGED_SUBSTRING = new Set([
  'dhgate',
  'aliexpress',
  'lightinthebox',
  'banggood',
  'fruugo',
  'desertcart',
]);

// Common English words that are also marketplace brands only match when they
// ARE the merchant name — "Wish" / "Wish.com" flags, "Wishlist Gifts" or
// "Best Wish Store" must not.
const FLAGGED_EXACT = new Set(['wish']);

export function getRetailerTrust(retailer: string): RetailerTrust {
  const collapsed = collapse(retailer);
  const parts = tokens(retailer);

  const isFlagged =
    FLAGGED_EXACT.has(collapsed) ||
    FLAGGED.some(
      (key) =>
        parts.includes(key) || (FLAGGED_SUBSTRING.has(key) && collapsed.includes(key))
    );
  if (isFlagged) {
    return {
      level: 'flagged',
      label: 'Possible scam',
      description:
        'This marketplace has widespread reports of scams, counterfeits, or undelivered orders. Buy with caution.',
    };
  }

  if (VERIFIED.has(collapsed)) {
    return {
      level: 'verified',
      label: 'Verified retailer',
      description: 'Sold and fulfilled by a major retailer Pick recognizes.',
    };
  }

  return {
    level: 'unknown',
    label: 'Unverified seller',
    description:
      "Pick doesn't recognize this seller. Check the store's reviews before buying.",
  };
}
