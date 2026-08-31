// Merchant identity normalization, shared by the trust registry, the badge
// logos, and the landed-cost merchant config so the three subsystems can
// never disagree about who a merchant is.
//
// The feed gives us free-text display names (Serper's item.source verbatim),
// so identity starts from a normalized "collapse" of the name. The registry
// then maps collapsed keys to canonical merchant entries per market.

/**
 * Collapse a merchant name to a comparable key: lowercase, drop a leading
 * "the" and a trailing domain suffix, strip everything that isn't a letter
 * or digit. "Best Buy" -> "bestbuy", "Macy's" -> "macys", "IKEA.com" ->
 * "ikea", "The Home Depot" -> "homedepot".
 *
 * Japanese-script names collapse to '' (only [a-z0-9] survive); the registry
 * treats an empty key as unresolvable, never as a match.
 */
export function collapse(name: string): string {
  return name
    .toLowerCase()
    .replace(/^\s*the\s+/, '')
    .replace(/\.(com|net|org|co|us|shop|store)$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Tokens of the name with apostrophes removed: "AliExpress US Store" ->
 * ["aliexpress", "us", "store"], "Sam's Club" -> ["sams", "club"].
 */
export function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Split a marketplace-reseller display name into platform + seller.
 * Google Shopping reports third-party sellers as "Platform - Seller"
 * ("Walmart - ABOUTYES", "eBay - thrift.books"). The dash must be
 * space-separated so hyphenated brand names ("Coca-Cola Store") and
 * "Academy Sports + Outdoors" never split.
 *
 * This is only a lexical split; whether the prefix IS a marketplace platform
 * is the registry's call (allowsThirdPartySellers).
 */
export function splitSellerSuffix(
  name: string
): { platform: string; seller: string } | null {
  const match = name.match(/^(.{2,}?)\s+[-–—]\s+(.{2,})$/);
  if (!match) return null;
  return { platform: match[1], seller: match[2] };
}

// Multi-part public suffixes we actually encounter across the six feed
// markets. Not a full Public Suffix List: the registry only ever compares
// against its own curated domains, so an unlisted exotic suffix can only
// cause a false MISMATCH (fail closed), never a false match.
const MULTI_PART_TLDS = new Set([
  'co.uk',
  'org.uk',
  'me.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'ne.jp',
  'or.jp',
  'co.nz',
  'com.br',
  'com.mx',
  'co.in',
  'com.sg',
  'com.hk',
  'com.tw',
  'co.kr',
]);

/**
 * The registrable domain (eTLD+1) of a hostname: "www.ikea.co.uk" ->
 * "ikea.co.uk", "shop.example.com" -> "example.com". Null for bare TLDs,
 * IPs, or garbage. Lookalike protection depends on this being an EXACT
 * boundary: "ikea-outlet.com" and "ikea.evil.com" both produce registrable
 * domains that simply aren't "ikea.com".
 */
export function registrableDomain(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!/^[a-z0-9.-]+$/.test(host) || /^[0-9.]+$/.test(host)) return null;
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return null;
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_TLDS.has(lastTwo)) {
    if (parts.length < 3) return null;
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}
