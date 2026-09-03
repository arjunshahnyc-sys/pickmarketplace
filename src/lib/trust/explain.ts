// Why a seller carries its trust label, in words a shopper can act on.
//
// Every trust level maps to ONE presentation (label, icon, tone) and every
// classification verdict maps to ONE explanation (headline, reason,
// advice, and for the unverified level a standing note). The card's badge
// tooltip reads the explanation; the legacy description string is derived
// from it, so copy can never drift between surfaces. Pure and DOM-free:
// tested in node, and deterministic so the prerendered category page
// hydrates cleanly (dates format with a fixed locale and UTC).
//
// Copy rules: describe the SELLER, never the product; name the specific
// merchant, seller, host or record involved; no em dashes.

import type { TrustLevel, TrustVerdict } from '../retailerTrust';

export interface TrustExplanation {
  headline: string;
  reason: string;
  advice: string;
  /**
   * Standing disclosure that travels with the label regardless of the
   * specific reason. Set for every Unverified verdict (UNVERIFIED_DISCLOSURE);
   * absent on the other levels.
   */
  note?: string;
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

// The one sentence of disclosure the amber badge must never be read
// without: unverified is "not reviewed by Pick", never a scam warning
// (that is the red label). Shown in every Unverified tooltip, under a
// results grid that contains the badge, and on the FAQ and Supported
// Retailers pages, all from this constant so the wording cannot drift.
export const UNVERIFIED_DISCLOSURE =
  'Unverified seller does not mean scam. It only means Pick has not directly verified the store. Sellers with scam reports are labeled Possible scam instead.';

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

// The specific reason for each kind of unverified; the shared headline and
// disclosure note are attached by explainTrust so no cause can omit them.
function explainUnknown(v: Extract<TrustVerdict, { level: 'unknown' }>): Omit<TrustExplanation, 'headline' | 'note'> {
  switch (v.cause) {
    case 'domain-mismatch': {
      const name = v.entry?.displayName ?? 'a recognized retailer';
      const canonical = v.entry ? ` (${v.entry.domains.canonical})` : '';
      return {
        reason: v.host
          ? `The name matches ${name}, but this listing links to ${v.host}, which is not ${name}'s official domain${canonical}.`
          : `The name matches ${name}, but this listing links to a site that is not ${name}'s official domain${canonical}.`,
        advice: 'Verify the seller before buying.',
      };
    }
    case 'config-only':
      return {
        reason: `Pick knows ${v.entry?.displayName ?? shortName(v.retailer)}'s storefront for shipping estimates but has not reviewed it as a seller.`,
        advice: REVIEWS_ADVICE,
      };
    case 'no-seller-named':
      return {
        reason: 'The price feed did not name the seller for this listing; it came through Google Shopping.',
        advice: 'Check who the seller is on the store page before buying.',
      };
    default:
      return {
        reason: `Pick has no record of ${shortName(v.retailer)}.`,
        advice: REVIEWS_ADVICE,
      };
  }
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
    case 'unknown':
      return { headline: 'Unverified seller', ...explainUnknown(v), note: UNVERIFIED_DISCLOSURE };
  }
}
