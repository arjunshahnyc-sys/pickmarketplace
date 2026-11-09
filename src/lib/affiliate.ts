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
//
// BEST BUY, WALMART, TARGET (added 2026-11-09). Their affiliate terms reach
// Pick even through a sub-affiliate network: Best Buy's Publisher Agreement
// (s.7) bars showing individual prices without written permission and binds
// sub-affiliates; Walmart and Target allow prices only from their own data.
// Pick's prices for them come from Google Shopping, same problem as Amazon.
// Their links stay untagged until each grants permission or Pick has a
// licensed price source for them; lift a retailer by deleting its rule.
//
// Target Australia is an unrelated company (registry id target-au) and is
// deliberately not covered: Target is matched by registry identity and
// domain only, never by name prefix.

interface ExclusionRule {
  /** Registry ids this rule covers. */
  matchesId: (id: string) => boolean;
  /** Collapsed-name prefixes that identify the merchant without the registry. */
  namePrefixes: readonly string[];
  /** Registrable domains that are the merchant but not registry storefronts. */
  extraDomains: readonly string[];
}

const EXCLUSION_RULES: readonly ExclusionRule[] = [
  // Amazon's own shorteners resolve to Amazon but are not registry entries.
  { matchesId: (id) => id.startsWith('amazon-'), namePrefixes: ['amazon'], extraDomains: ['amzn.to', 'amzn.eu'] },
  { matchesId: (id) => id.startsWith('bestbuy-'), namePrefixes: ['bestbuy'], extraDomains: [] },
  { matchesId: (id) => id.startsWith('walmart-'), namePrefixes: ['walmart'], extraDomains: [] },
  { matchesId: (id) => id === 'target-us', namePrefixes: [], extraDomains: [] },
];

const isExcludedId = (id: string | undefined): boolean =>
  id !== undefined && EXCLUSION_RULES.some((r) => r.matchesId(id));

/** Excluded merchants' registrable domains, derived from the registry so the two can't drift. */
const EXCLUDED_DOMAINS: ReadonlySet<string> = new Set([
  ...REGISTRY.filter((e) => isExcludedId(e.id)).flatMap((e) => [
    e.domains.canonical,
    ...(e.domains.regional ?? []),
  ]),
  ...EXCLUSION_RULES.flatMap((r) => r.extraDomains),
]);

/**
 * Whether a listing URL points at an excluded merchant. Only a positive
 * signal: most feed URLs are Google intermediary links that carry no merchant
 * domain at all (see the registry's domain notes), so a `false` here means
 * "no evidence", never "not excluded".
 */
function isExcludedUrl(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  const domain = registrableDomain(hostname);
  return domain !== null && EXCLUDED_DOMAINS.has(domain);
}

/**
 * Whether a feed display name is an excluded merchant, by a lexical prefix
 * guard and by registry identity.
 *
 * The prefix guard covers the cases registry resolution misses: third-party
 * sellers, which arrive as "Amazon - SellerName" and collapse to an
 * unregistered key, and sub-brands that were never added to the registry
 * ("Amazon Warehouse", "Walmart Business"). It over-matches by design: an
 * unrelated merchant whose name starts with "amazon" (a hypothetical
 * "Amazonia Coffee") simply goes untagged, which costs a commission and
 * breaks nothing.
 */
function isExcludedMerchant(retailer: string, market?: string): boolean {
  const key = collapse(retailer);
  if (!key) return false;
  if (EXCLUSION_RULES.some((r) => r.namePrefixes.some((p) => key.startsWith(p)))) return true;

  if (isExcludedId(resolveMerchant(retailer, market)?.id)) return true;

  // "Platform - Seller" names, where the platform half is what identifies
  // the program the click would be credited to.
  const split = splitSellerSuffix(retailer);
  if (split && isExcludedId(resolveMerchant(split.platform, market)?.id)) return true;

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
  if (source?.retailer && isExcludedMerchant(source.retailer, source.market)) return true;
  return isExcludedUrl(url);
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
 * row is never marked rel="sponsored" while the site-wide disclosure
 * still says (correctly) that Pick earns commissions in general.
 */
export function isAffiliateUrl(url: string): boolean {
  return Boolean(LINK_WRAPPER) && url.startsWith(LINK_WRAPPER!);
}
