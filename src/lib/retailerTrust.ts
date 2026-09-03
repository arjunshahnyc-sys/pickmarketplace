// Seller-trust classification for search results.
//
// Google Shopping results carry whatever merchant name Serper reports
// (scrapers.ts uses item.source verbatim), so results can come from anyone:
// major retailers, marketplace platforms, independent marketplace sellers,
// or scam-prone storefronts. Classification is driven by the merchant trust
// registry (src/lib/trust/registry.ts) plus the flagged table
// (src/lib/trust/flagged.ts); the explanation copy lives in
// src/lib/trust/explain.ts. Levels:
//
//   verified            registered brand-direct or national-retailer entry
//   marketplace         registered platform mixing first- and third-party
//                       inventory (Amazon, eBay, Etsy, Rakuten)
//   marketplace-seller  "Platform - Seller" names: an independent seller on
//                       a registered marketplace, NOT the platform itself
//   flagged             marketplaces with documented scam/counterfeit
//                       records (see flagged.ts for the per-merchant data)
//   unknown             everything else; default deny, shown unverified
//
// Registry names must match EXACTLY (after normalization): substring
// matching would let "Pineapple Boutique" match "apple" or a marketplace
// seller like "Walmart - SaveMore Deals" inherit Walmart's badge.
// Flagged names match per-token so "AliExpress US Store" still flags,
// while short keys like "wish" can't fire inside longer words.
//
// When a listing URL carries a real merchant domain, it must match the
// entry's registered domains or the badge is withheld (lookalike guard);
// Google intermediary links carry no signal. See registry.domainSignal.
//
// classifySeller returns a structured verdict (which entry, which seller,
// which host, which flagged key) so the card can say WHY; getRetailerTrust
// is the historical adapter over it and keeps every level outcome.

import { collapse, splitSellerSuffix } from './trust/identity';
import { explainTrust, type TrustExplanation } from './trust/explain';
import { findFlagged, type FlaggedMerchant } from './trust/flagged';
import {
  domainSignal,
  listingHost,
  resolveMerchant,
  REGISTRY,
  type DomainSignal,
  type MerchantEntry,
} from './trust/registry';

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
  /** One-paragraph reason plus advice (legacy shape, derived from explanation). */
  description: string;
  explanation: TrustExplanation;
}

export interface TrustContext {
  /** Feed market the offer came from (Product.sourceMarket), e.g. 'GB'. */
  market?: string;
  /** The listing URL the card links to, for the domain lookalike guard. */
  url?: string;
}

export type UnknownCause =
  | 'domain-mismatch'
  | 'config-only'
  | 'seller-on-unregistered-platform'
  | 'no-seller-named'
  | 'no-entry';

/** Everything the classification learned, for copy that names specifics. */
export type TrustVerdict =
  | { level: 'flagged'; retailer: string; flag: FlaggedMerchant }
  | { level: 'verified'; entry: MerchantEntry; domain: DomainSignal; host: string | null }
  | { level: 'marketplace'; entry: MerchantEntry }
  | { level: 'marketplace-seller'; platform: MerchantEntry; seller: string }
  | {
      level: 'unknown';
      retailer: string;
      cause: UnknownCause;
      entry: MerchantEntry | null;
      host: string | null;
    };

// Every collapsed alias of a trust-reviewed registry entry. Kept as an
// export because the badge-logo sync test walks it: every recognized seller
// must resolve to a logo asset.
export const VERIFIED_RETAILERS: ReadonlySet<string> = new Set(
  REGISTRY.filter((e) => e.tier !== 'config-only').flatMap((e) => e.aliases)
);

const LABELS: Record<TrustLevel, string> = {
  verified: 'Verified retailer',
  marketplace: 'Marketplace',
  'marketplace-seller': 'Marketplace seller',
  unknown: 'Unverified seller',
  flagged: 'Possible scam',
};

export function classifySeller(retailer: string, context?: TrustContext): TrustVerdict {
  const flag = findFlagged(retailer);
  if (flag) return { level: 'flagged', retailer, flag };

  const host = listingHost(context?.url);
  const entry = resolveMerchant(retailer, context?.market);
  if (entry && entry.tier !== 'config-only') {
    const domain = domainSignal(context?.url, entry);
    // Lookalike guard: a real, non-intermediary URL that isn't on the
    // merchant's registered domains withholds the badge.
    if (domain === 'mismatch') {
      return { level: 'unknown', retailer, cause: 'domain-mismatch', entry, host };
    }
    if (entry.tier === 'marketplace') return { level: 'marketplace', entry };
    return { level: 'verified', entry, domain, host };
  }

  // "Platform - Seller": an independent seller on a registered marketplace.
  // Distinct from both the platform badge and plain unknown, so first-party
  // and third-party inventory can never be confused.
  const split = splitSellerSuffix(retailer);
  if (split) {
    const platform = resolveMerchant(split.platform, context?.market);
    if (platform?.allowsThirdPartySellers) {
      return { level: 'marketplace-seller', platform, seller: split.seller };
    }
    if (!entry) {
      return { level: 'unknown', retailer, cause: 'seller-on-unregistered-platform', entry: null, host };
    }
  }

  if (entry) return { level: 'unknown', retailer, cause: 'config-only', entry, host };
  if (collapse(retailer) === 'googleshopping') {
    return { level: 'unknown', retailer, cause: 'no-seller-named', entry: null, host };
  }
  return { level: 'unknown', retailer, cause: 'no-entry', entry: null, host };
}

export function getRetailerTrust(
  retailer: string,
  context?: TrustContext
): RetailerTrust {
  const verdict = classifySeller(retailer, context);
  const explanation = explainTrust(verdict);
  return {
    level: verdict.level,
    label: LABELS[verdict.level],
    description: `${explanation.reason} ${explanation.advice}`,
    explanation,
  };
}

/**
 * Whether a trust level counts as "recognized" for the results filter:
 * registered retailers and registered marketplace platforms do; independent
 * marketplace sellers, unknowns, and flagged sellers don't.
 */
export function isRecognizedSeller(level: TrustLevel): boolean {
  return level === 'verified' || level === 'marketplace';
}
