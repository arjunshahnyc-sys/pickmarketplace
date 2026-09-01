// Affiliate outbound-link tagging + the single source of truth for whether
// Pick currently earns commissions.
//
// Pick's revenue model is affiliate-only, but no affiliate network is wired
// up yet: until NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER is set, every outbound
// link is passed through unchanged and every disclosure surface (hero band,
// results disclosure, footer, cookie policy, FAQ/about/compliance copy)
// automatically says so. Setting the var flips links AND copy together, so
// the site can never claim commissions it doesn't earn, or hide ones it does.
//
// NEXT_PUBLIC_ because client components need the flag for disclosure copy;
// the wrapper prefix is public by nature (it appears in every outbound URL).
// It is a sub-network style redirect prefix (Skimlinks, Sovrn, etc.) that
// the encoded destination URL is appended to, e.g.
//   NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER="https://go.skimresources.com/?id=XXXXXXX&url="
// Per-retailer direct programs (e.g. Target via Impact) should be added here
// as explicit rules once their tracking IDs exist.

import { collapse, registrableDomain, splitSellerSuffix } from './trust/identity';
import { REGISTRY, resolveMerchant } from './trust/registry';

const LINK_WRAPPER = process.env.NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER;

/** Whether outbound links actually earn commissions in this deployment. */
export function affiliateLinksEnabled(): boolean {
  return Boolean(LINK_WRAPPER);
}

// ─── Commission exclusions ─────────────────────────────────────────────────
//
// AMAZON. The Associates Program Operating Agreement requires that any price
// shown alongside an Amazon link come from Amazon's Product Advertising API
// and be no more than 24 hours old. Pick's prices come from Serper's scrape
// of Google Shopping, so an Amazon row displays a price we are not licensed
// to display next to a tagged link. That is a termination-grade violation,
// and it applies to a sub-affiliate network's Amazon links exactly as it
// applies to a direct Associates tag.
//
// So Amazon links are never commission-tagged, whatever the wrapper is set
// to. Lifting this requires PA-API as the price source for Amazon rows, not
// a change here.
//
// Detection runs three ways and excludes if ANY of them fires, because the
// failure directions are asymmetric: wrongly excluding a merchant costs us a
// commission, wrongly including Amazon costs us the account. Fail closed.

/** Amazon's registrable domains, derived from the registry so the two can't drift. */
const AMAZON_DOMAINS: ReadonlySet<string> = new Set([
  ...REGISTRY.filter((e) => e.id.startsWith('amazon-')).flatMap((e) => [
    e.domains.canonical,
    ...(e.domains.regional ?? []),
  ]),
  // Amazon's own shorteners, which are not merchant storefronts and so are
  // not registry entries, but do resolve to Amazon.
  'amzn.to',
  'amzn.eu',
]);

/**
 * Whether a listing URL points at Amazon. Only a positive signal: most feed
 * URLs are Google intermediary links that carry no merchant domain at all
 * (see the registry's domain notes), so a `false` here means "no evidence",
 * never "not Amazon".
 */
function isAmazonUrl(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  const domain = registrableDomain(hostname);
  return domain !== null && AMAZON_DOMAINS.has(domain);
}

/**
 * Whether a feed display name is Amazon, by registry identity first and a
 * lexical prefix guard second.
 *
 * The prefix guard covers the two cases registry resolution misses: Amazon
 * third-party sellers, which arrive as "Amazon - SellerName" and collapse to
 * an unregistered key, and Amazon sub-brands that were never added to the
 * registry ("Amazon Warehouse", "Amazon Fresh"). It over-matches by design:
 * an unrelated merchant whose name starts with "amazon" (a hypothetical
 * "Amazonia Coffee") simply goes untagged, which costs a commission and
 * breaks nothing.
 */
function isAmazonMerchant(retailer: string, market?: string): boolean {
  const key = collapse(retailer);
  if (!key) return false;
  if (key.startsWith('amazon')) return true;

  if (resolveMerchant(retailer, market)?.id.startsWith('amazon-')) return true;

  // "Platform - Seller" names, where the platform half is what identifies
  // the program the click would be credited to.
  const split = splitSellerSuffix(retailer);
  if (split && resolveMerchant(split.platform, market)?.id.startsWith('amazon-')) {
    return true;
  }

  return false;
}

/** The source of an offer, as much of it as the feed gave us. */
export interface AffiliateSource {
  /** Feed display name of the seller ('Amazon', 'Walmart - ABOUTYES'). */
  retailer?: string;
  /** ISO country of the feed the offer came from ('US', 'GB'). */
  market?: string;
}

/**
 * Whether this offer is barred from commission tagging regardless of the
 * wrapper. Exported for tests and for any future surface that needs to
 * explain why a given row earns nothing.
 */
export function isCommissionExcluded(url: string, source?: AffiliateSource): boolean {
  if (source?.retailer && isAmazonMerchant(source.retailer, source.market)) return true;
  return isAmazonUrl(url);
}

/**
 * Decorate a retailer product URL so the click is commission-tracked.
 * Returns the URL unchanged when no affiliate network is configured, the URL
 * is not a plain http(s) link, or the offer is commission-excluded.
 */
export function toAffiliateUrl(url: string, source?: AffiliateSource): string {
  if (!LINK_WRAPPER) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  if (isCommissionExcluded(url, source)) return url;
  return `${LINK_WRAPPER}${encodeURIComponent(url)}`;
}

/**
 * Whether a URL that has already been through toAffiliateUrl actually
 * carries commission tracking. Per-link rather than global, so an excluded
 * Amazon row is never marked rel="sponsored" while the site-wide disclosure
 * still says (correctly) that Pick earns commissions in general.
 */
export function isAffiliateUrl(url: string): boolean {
  return Boolean(LINK_WRAPPER) && url.startsWith(LINK_WRAPPER!);
}
