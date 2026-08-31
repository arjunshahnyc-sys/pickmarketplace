// Seller-trust classification for search results.
//
// Google Shopping results carry whatever merchant name Serper reports
// (scrapers.ts uses item.source verbatim), so results can come from anyone —
// major retailers, marketplace platforms, independent marketplace sellers,
// or scam-prone storefronts. Classification is driven by the merchant trust
// registry (src/lib/trust/registry.ts); this module adds the flagged list
// and shapes the result for the UI:
//
//   verified            registered brand-direct or national-retailer entry
//   marketplace         registered platform mixing first- and third-party
//                       inventory (Amazon, eBay, Etsy, Rakuten)
//   marketplace-seller  "Platform - Seller" names: an independent seller on
//                       a registered marketplace, NOT the platform itself
//   flagged             marketplaces with documented scam/counterfeit
//                       records (e.g. Temu's 2025 FTC INFORM Act penalty,
//                       Wish's counterfeit history, DHgate/AliExpress
//                       replica trade, Shein's 2026 Texas AG suit)
//   unknown             everything else; default deny — shown unverified
//
// Registry names must match EXACTLY (after normalization) — substring
// matching would let "Pineapple Boutique" match "apple" or a marketplace
// seller like "Walmart - SaveMore Deals" inherit Walmart's badge.
// Flagged names match per-token so "AliExpress US Store" still flags,
// while short keys like "wish" can't fire inside longer words.
//
// When a listing URL carries a real merchant domain, it must match the
// entry's registered domains or the badge is withheld (lookalike guard);
// Google intermediary links carry no signal. See registry.domainSignal.

import { collapse, tokens, splitSellerSuffix } from './trust/identity';
import { domainSignal, resolveMerchant, REGISTRY } from './trust/registry';

// Re-exported so the historical import sites (RetailerLogos, landedCost
// merchants config) keep one shared identity function.
export { collapse } from './trust/identity';

export type TrustLevel =
  | 'verified'
  | 'marketplace'
  | 'marketplace-seller'
  | 'flagged'
  | 'unknown';

export interface RetailerTrust {
  level: TrustLevel;
  label: string;
  description: string;
}

export interface TrustContext {
  /** Feed market the offer came from (Product.sourceMarket), e.g. 'GB'. */
  market?: string;
  /** The listing URL the card links to, for the domain lookalike guard. */
  url?: string;
}

// Every collapsed alias of a trust-reviewed registry entry. Kept as an
// export because the badge-logo sync test walks it: every recognized seller
// must resolve to a logo asset.
export const VERIFIED_RETAILERS: ReadonlySet<string> = new Set(
  REGISTRY.filter((e) => e.tier !== 'config-only').flatMap((e) => e.aliases)
);

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

const UNKNOWN_TRUST: RetailerTrust = {
  level: 'unknown',
  label: 'Unverified seller',
  description:
    "Pick doesn't recognize this seller. Check the store's reviews before buying.",
};

export function getRetailerTrust(
  retailer: string,
  context?: TrustContext
): RetailerTrust {
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

  const entry = resolveMerchant(retailer, context?.market);
  if (entry && entry.tier !== 'config-only') {
    // Lookalike guard: a real, non-intermediary URL that isn't on the
    // merchant's registered domains withholds the badge.
    if (domainSignal(context?.url, entry) === 'mismatch') {
      return {
        level: 'unknown',
        label: 'Unverified seller',
        description: `This listing links to a site that isn't ${entry.displayName}'s official domain. Verify the seller before buying.`,
      };
    }
    if (entry.tier === 'marketplace') {
      return {
        level: 'marketplace',
        label: 'Marketplace',
        description: `${entry.displayName} hosts listings from ${entry.displayName} itself and from independent third-party sellers. Check the specific seller at checkout.`,
      };
    }
    return {
      level: 'verified',
      label: 'Verified retailer',
      description: `${entry.displayName}'s official store, recognized by Pick. Verified describes the seller, not the product.`,
    };
  }

  // "Platform - Seller": an independent seller on a registered marketplace.
  // Distinct from both the platform badge and plain unknown, so first-party
  // and third-party inventory can never be confused.
  const split = splitSellerSuffix(retailer);
  if (split) {
    const platform = resolveMerchant(split.platform, context?.market);
    if (platform?.allowsThirdPartySellers) {
      return {
        level: 'marketplace-seller',
        label: 'Marketplace seller',
        description: `Sold by "${split.seller}", an independent seller on ${platform.displayName} — not by ${platform.displayName} itself. Check the seller's ratings before buying.`,
      };
    }
  }

  return UNKNOWN_TRUST;
}

/**
 * Whether a trust level counts as "recognized" for the results filter:
 * registered retailers and registered marketplace platforms do; independent
 * marketplace sellers, unknowns, and flagged sellers don't.
 */
export function isRecognizedSeller(level: TrustLevel): boolean {
  return level === 'verified' || level === 'marketplace';
}
