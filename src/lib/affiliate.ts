// Affiliate outbound-link tagging + the single source of truth for whether
// Pick currently earns commissions.
//
// Pick's revenue model is affiliate-only, but no affiliate network is wired
// up yet: until NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER is set, every outbound
// link is passed through unchanged and every disclosure surface (hero band,
// results disclosure, footer, FAQ/about/compliance copy) automatically says
// so. Setting the var flips links AND copy together, so the site can never
// claim commissions it doesn't earn, or hide ones it does.
//
// NEXT_PUBLIC_ because client components need the flag for disclosure copy;
// the wrapper prefix is public by nature (it appears in every outbound URL).
// It is a sub-network style redirect prefix (Skimlinks, Sovrn, etc.) that
// the encoded destination URL is appended to, e.g.
//   NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER="https://go.skimresources.com/?id=XXXXXXX&url="
// Per-retailer direct programs (e.g. Target via Impact) should be added here
// as explicit rules once their tracking IDs exist.

const LINK_WRAPPER = process.env.NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER;

/** Whether outbound links actually earn commissions in this deployment. */
export function affiliateLinksEnabled(): boolean {
  return Boolean(LINK_WRAPPER);
}

/**
 * Decorate a retailer product URL so the click is commission-tracked.
 * Returns the URL unchanged when no affiliate network is configured or the
 * URL is not a plain http(s) link.
 */
export function toAffiliateUrl(url: string): string {
  if (!LINK_WRAPPER) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  return `${LINK_WRAPPER}${encodeURIComponent(url)}`;
}
