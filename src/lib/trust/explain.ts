// Why a seller carries its trust label, in words a shopper can act on.
//
// Every trust level maps to ONE presentation (label, icon, tone) and every
// classification verdict maps to ONE explanation (headline, reason,
// advice). The card's badge tooltip reads the explanation; the legacy
// description string is derived from it, so copy can never drift between
// surfaces. Pure and DOM-free: tested in node, and deterministic so the
// prerendered category page hydrates cleanly (dates format with a fixed
// locale and UTC).
//
// Copy rules: describe the SELLER, never the product; name the specific
// merchant, seller, host or record involved; no em dashes.

import type { TrustLevel, TrustVerdict } from '../retailerTrust';

export interface TrustExplanation {
  headline: string;
  reason: string;
  advice: string;
}

export interface TrustLevelMeta {
  label: string;
  icon: 'badge-check' | 'store' | 'users' | 'help-circle' | 'alert-triangle';
  className: string;
}

export const TRUST_LEVEL_META: Record<TrustLevel, TrustLevelMeta> = {
  verified: { label: 'Verified', icon: 'badge-check', className: 'bg-teal-50 text-[#1F7A6F]' },
  marketplace: { label: 'Marketplace', icon: 'store', className: 'bg-sky-50 text-sky-700' },
  'marketplace-seller': { label: 'Marketplace seller', icon: 'users', className: 'bg-amber-50 text-amber-700' },
  unknown: { label: 'Unverified seller', icon: 'help-circle', className: 'bg-amber-50 text-amber-700' },
  flagged: { label: 'Possible scam', icon: 'alert-triangle', className: 'bg-red-50 text-red-700 font-semibold' },
};

const VERIFIED_ADVICE = 'Verified describes the seller, not the product.';
const REVIEWS_ADVICE = "Check the store's reviews before buying.";

const reviewedDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function since(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : reviewedDate.format(d);
}

// Feed names are untrusted text and can run long; the sentence needs only
// enough to identify the store.
const NAME_MAX = 40;
function shortName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > NAME_MAX ? `${trimmed.slice(0, NAME_MAX).trimEnd()}…` : trimmed;
}

export function explainTrust(v: TrustVerdict): TrustExplanation {
  switch (v.level) {
    case 'verified': {
      const name = v.entry.displayName;
      const domain = v.entry.domains.canonical;
      const listed = `on Pick's reviewed list since ${since(v.entry.added.date)}`;
      const parts: string[] = [
        v.entry.tier === 'brand-direct'
          ? `${name} is the brand's own store (${domain}), ${listed}.`
          : `${name} is a national retailer (${domain}), ${listed}.`,
      ];
      if (v.entry.allowsThirdPartySellers) {
        parts.push(`Items sold by other sellers on ${name} are labeled Marketplace seller instead.`);
      }
      if (v.domain === 'match' && v.host) {
        parts.push(`This listing links to ${v.host}, its official domain.`);
      }
      return { headline: 'Verified retailer', reason: parts.join(' '), advice: VERIFIED_ADVICE };
    }
    case 'marketplace': {
      const name = v.entry.displayName;
      return {
        headline: 'Marketplace platform',
        reason: `${name} mixes its own inventory with listings from independent third-party sellers, and the price feed cannot tell them apart.`,
        advice: 'Check who the seller is at checkout.',
      };
    }
    case 'marketplace-seller': {
      const platform = v.platform.displayName;
      return {
        headline: 'Independent marketplace seller',
        reason: `Sold by "${shortName(v.seller)}", an independent seller on ${platform}, not by ${platform} itself.`,
        advice: "Check the seller's ratings before buying.",
      };
    }
    case 'flagged': {
      const evidence = v.flag.evidence.map((e) => `${since(e.date)}: ${e.summary}`);
      return {
        headline: 'Possible scam',
        reason: [`${v.flag.displayName} ${v.flag.reason}`, ...evidence].join(' '),
        advice: 'Buy with caution.',
      };
    }
    case 'unknown': {
      switch (v.cause) {
        case 'domain-mismatch': {
          const name = v.entry?.displayName ?? 'a recognized retailer';
          const canonical = v.entry ? ` (${v.entry.domains.canonical})` : '';
          return {
            headline: 'Unverified seller',
            reason: v.host
              ? `The name matches ${name}, but this listing links to ${v.host}, which is not ${name}'s official domain${canonical}.`
              : `The name matches ${name}, but this listing links to a site that is not ${name}'s official domain${canonical}.`,
            advice: 'Verify the seller before buying.',
          };
        }
        case 'config-only':
          return {
            headline: 'Unverified seller',
            reason: `Pick knows ${v.entry?.displayName ?? shortName(v.retailer)}'s storefront for shipping estimates but has not reviewed it as a seller.`,
            advice: REVIEWS_ADVICE,
          };
        case 'no-seller-named':
          return {
            headline: 'Unverified seller',
            reason: 'The price feed did not name the seller for this listing; it came through Google Shopping.',
            advice: 'Check who the seller is on the store page before buying.',
          };
        default:
          return {
            headline: 'Unverified seller',
            reason: `Pick has no record of ${shortName(v.retailer)}. Unverified means not reviewed, not a judgment on the store or the product.`,
            advice: REVIEWS_ADVICE,
          };
      }
    }
  }
}
