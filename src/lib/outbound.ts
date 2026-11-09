// Click-time resolution of a result's real merchant product page.
//
// The shopping feed (Serper /shopping) never returns a merchant URL: every
// `link` is a google.com product page, or missing. No affiliate network can
// monetize a click that lands on Google, and a Google page is a worse
// landing for the shopper than the store's own product page.
//
// Serper's product lookup (POST /product with the feed row's productId)
// does return each merchant's own product URL, at 2 credits per lookup.
// Resolving all ~30 rows of every search would multiply the search bill, so
// the lookup runs only when a shopper clicks: result links point at
// /api/out, which resolves, caches, and redirects.
//
// The lookup misses often (4 of 7 live clicks resolved on 2026-11-09): a
// local-store listing's product lists other sellers but not the clicked
// one, and some product ids are simply not found. On a miss, a second
// chance runs: a web search restricted to the seller's own domain (1
// credit), accepted only when the result is clearly the same product.
//
// SERVER ONLY (node:crypto, SERPER_API_KEY). Client components read the
// finished `product.clickUrl` string and never import this module.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { isCommissionExcluded } from './affiliate';
import { collapse, registrableDomain, splitSellerSuffix } from './trust/identity';
import { resolveMerchant } from './trust/registry';
import type { Product } from './types';

// ─── Signed click URLs ─────────────────────────────────────────────────────
//
// /api/out redirects to a URL carried in its query string and spends paid
// credits on a product id carried there too. Both are signed, so the route
// only ever redirects to a fallback Pick issued (no open redirect) and only
// ever looks up a product Pick showed (no credit-burning with made-up ids).

export interface ClickParams {
  /** Google Shopping product id from the feed row. */
  pid: string;
  /** Feed display name of the seller. */
  retailer: string;
  /** ISO country of the feed the offer came from. */
  market: string;
  /** Where to send the shopper when resolution fails: the pre-existing link. */
  fallback: string;
  /**
   * Listing title, for the second-chance site search. Optional so links
   * issued before it existed (cached searches, ISR pages) still verify.
   */
  title?: string;
}

function sign(p: ClickParams, secret: string): string {
  return createHmac('sha256', secret)
    // The title joins the signed payload only when present, so a link
    // issued without one keeps the signature it was issued with.
    .update([p.pid, p.retailer, p.market, p.fallback, ...(p.title ? [p.title] : [])].join('\n'))
    .digest('base64url')
    .slice(0, 22); // 132 bits, plenty for a redirect guard
}

/**
 * The /api/out link for a product, or undefined when the product should
 * keep its plain link:
 *  - no product id (nothing to look up),
 *  - no AUTH_SECRET (cannot sign; feature off rather than unsigned),
 *  - a commission-excluded merchant (Amazon, Best Buy, Walmart, Target).
 *    Their clicks can never earn, so they keep the free Pick-built retailer
 *    link and cost no lookup credits.
 *
 * `product.url` must be the raw link, before affiliate wrapping.
 */
export function buildClickUrl(product: Product): string | undefined {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !product.googleProductId) return undefined;
  if (!/^https?:\/\//i.test(product.url)) return undefined;

  const market = product.sourceMarket ?? 'US';
  if (isCommissionExcluded(product.url, { retailer: product.retailer, market })) return undefined;

  const p: ClickParams = {
    pid: product.googleProductId,
    retailer: product.retailer,
    market,
    fallback: product.url,
    title: product.name || undefined,
  };
  const qs = new URLSearchParams({
    pid: p.pid,
    r: p.retailer,
    m: p.market,
    u: p.fallback,
    ...(p.title ? { t: p.title } : {}),
    s: sign(p, secret),
  });
  return `/api/out?${qs.toString()}`;
}

/** Parses and verifies an /api/out query. Null on anything missing or tampered. */
export function verifyClickParams(search: URLSearchParams): ClickParams | null {
  const secret = process.env.AUTH_SECRET;
  const pid = search.get('pid');
  const retailer = search.get('r');
  const market = search.get('m');
  const fallback = search.get('u');
  const sig = search.get('s');
  if (!secret || !pid || !retailer || !market || !fallback || !sig) return null;

  const title = search.get('t') || undefined;
  const p: ClickParams = { pid, retailer, market, fallback, ...(title ? { title } : {}) };
  const expected = Buffer.from(sign(p, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!/^https?:\/\//i.test(fallback)) return null;
  return p;
}

// ─── Merchant link cleanup ─────────────────────────────────────────────────

// Google's own click attribution, which the lookup's links carry. They
// credit Google's ad surfaces (wmlspartner=wlpa is Walmart's Google partner
// tag) and must not ride along on a link Pick sends, tagged or not.
const TRACKING_PARAMS = new Set(['srsltid', 'gclid', 'gclsrc', 'gad_source', 'gbraid', 'wbraid', 'wmlspartner']);

/** Drops Google attribution and utm_* params; everything else is preserved. */
export function stripTrackingParams(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  for (const key of [...parsed.searchParams.keys()]) {
    const k = key.toLowerCase();
    if (TRACKING_PARAMS.has(k) || k.startsWith('utm_')) parsed.searchParams.delete(key);
  }
  return parsed.toString();
}

// ─── Offer lookup ──────────────────────────────────────────────────────────

interface MerchantOffer {
  source: string;
  link: string;
}

const TTL_OK = 6 * 60 * 60 * 1000;
// Failures are cached briefly so a broken lookup (or an empty balance)
// cannot be retried on every click.
const TTL_FAILED = 10 * 60 * 1000;
const MAX_ENTRIES = 2000;
// A miss runs both calls back to back while the shopper waits on the
// redirect, so each gets a tight budget.
const LOOKUP_TIMEOUT_MS = 5000;
const SITE_SEARCH_TIMEOUT_MS = 4000;

// Anchored on globalThis for the same reason as the rate limiter: Next
// bundles each route with its own copy of a module-level Map.
type OfferCache = Map<string, { offers: MerchantOffer[] | null; ts: number }>;
/** `failed` = the search itself errored (retry soon); url null = searched, no match. */
type SiteCache = Map<string, { url: string | null; failed: boolean; ts: number }>;
const globalStore = globalThis as unknown as {
  __pickOfferCache?: OfferCache;
  __pickSiteSearchCache?: SiteCache;
};
const cache: OfferCache = (globalStore.__pickOfferCache ??= new Map());
const siteCache: SiteCache = (globalStore.__pickSiteSearchCache ??= new Map());

function remember<V>(map: Map<string, V>, key: string, value: V): void {
  if (map.size >= MAX_ENTRIES) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}

/** Test hook. */
export function clearOfferCache(): void {
  cache.clear();
  siteCache.clear();
}

async function fetchOffers(pid: string, market: string): Promise<MerchantOffer[] | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch('https://google.serper.dev/product', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: pid, gl: market.toLowerCase(), hl: 'en' }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[Serper] product lookup returned ${response.status}`);
      return null;
    }
    const data = await response.json();
    const offers: unknown[] = Array.isArray(data?.offers) ? data.offers : [];
    return offers.flatMap((o) => {
      const { source, link } = (o ?? {}) as { source?: unknown; link?: unknown };
      return typeof source === 'string' && typeof link === 'string' && /^https?:\/\//i.test(link)
        ? [{ source, link }]
        : [];
    });
  } catch (error) {
    console.error('[Serper] product lookup failed:', error instanceof Error ? error.message : String(error));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether a lookup offer is from the seller the shopper clicked. Exact
 * display-name match first, registry identity second. Deliberately strict:
 * sending a "GameStop $169" click to another store's page would show a
 * different price than the one Pick advertised.
 */
function sameSeller(offerSource: string, retailer: string, market: string): boolean {
  if (collapse(offerSource) === collapse(retailer)) return true;
  const a = resolveMerchant(offerSource, market)?.id;
  const b = resolveMerchant(retailer, market)?.id;
  return a !== undefined && a === b;
}

// ─── Second chance: search the seller's own site ───────────────────────────

/**
 * The domain to search for a seller, or null when a site search could not
 * be trusted to find THIS seller's offer:
 *  - "Platform - Seller" names: the platform's site lists the product from
 *    many sellers at many prices.
 *  - Marketplace-tier merchants (eBay, Etsy): every listing is a different
 *    seller's.
 *  - Names that are neither in the registry nor a bare domain: no domain
 *    to search.
 */
export function sellerDomain(retailer: string, market: string): string | null {
  if (splitSellerSuffix(retailer)) return null;
  const entry = resolveMerchant(retailer, market);
  if (entry) return entry.tier === 'marketplace' ? null : entry.domains.canonical;
  const bare = retailer.trim().toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(bare) ? registrableDomain(bare) : null;
}

const FILLER = new Set(['the', 'a', 'an', 'and', 'with', 'for', 'of', 'in', 'by', 'new']);
const tokens = (text: string): string[] =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((t) => t && !FILLER.has(t));
const hasDigit = (t: string) => /\d/.test(t);

/**
 * Whether a search result's title names the same product as the listing.
 * Strict on purpose: the shopper was shown one price, and a sibling variant
 * (1TB vs 512GB, Series X vs Series S) carries another.
 *  - Model numbers and capacities (any token with a digit) must be the same
 *    set on both sides.
 *  - At least three quarters of the listing's words must appear in the result.
 */
export function isSameProduct(listingName: string, resultTitle: string): boolean {
  const want = tokens(listingName);
  const got = new Set(tokens(resultTitle));
  if (want.length === 0) return false;

  const wantDigits = new Set(want.filter(hasDigit));
  const gotDigits = new Set([...got].filter(hasDigit));
  if (wantDigits.size !== gotDigits.size || [...wantDigits].some((t) => !gotDigits.has(t))) return false;

  const covered = want.filter((t) => got.has(t)).length;
  return covered / want.length >= 0.75;
}

async function searchSellerSite(
  title: string,
  domain: string,
  market: string
): Promise<{ url: string | null; failed: boolean }> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return { url: null, failed: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SITE_SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${title} site:${domain}`, gl: market.toLowerCase(), hl: 'en', num: 5 }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[Serper] site search returned ${response.status}`);
      return { url: null, failed: true };
    }
    const data = await response.json();
    const organic: unknown[] = Array.isArray(data?.organic) ? data.organic : [];
    for (const item of organic) {
      const { link, title: resultTitle } = (item ?? {}) as { link?: unknown; title?: unknown };
      if (typeof link !== 'string' || typeof resultTitle !== 'string') continue;
      let parsed: URL;
      try {
        parsed = new URL(link);
      } catch {
        continue;
      }
      if (!/^https?:$/.test(parsed.protocol)) continue;
      if (registrableDomain(parsed.hostname) !== domain) continue;
      // A homepage is not a product page.
      if (parsed.pathname.length <= 1) continue;
      if (!isSameProduct(title, resultTitle)) continue;
      return { url: stripTrackingParams(link), failed: false };
    }
    return { url: null, failed: false };
  } catch (error) {
    console.error('[Serper] site search failed:', error instanceof Error ? error.message : String(error));
    return { url: null, failed: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The clicked seller's own product page for this product, cleaned of
 * Google attribution, or null when neither the product lookup nor the
 * second-chance site search finds that seller. Never throws; null means
 * "use the fallback link".
 */
export async function resolveMerchantUrl(
  pid: string,
  retailer: string,
  market: string,
  title?: string
): Promise<string | null> {
  const key = `${market.toLowerCase()}:${pid}`;
  const now = Date.now();
  let entry = cache.get(key);
  if (!entry || now - entry.ts >= (entry.offers ? TTL_OK : TTL_FAILED)) {
    entry = { offers: await fetchOffers(pid, market), ts: now };
    remember(cache, key, entry);
  }

  const offer = entry.offers?.find((o) => sameSeller(o.source, retailer, market));
  if (offer) return stripTrackingParams(offer.link);

  if (!title) return null;
  const domain = sellerDomain(retailer, market);
  if (!domain) return null;

  const siteKey = `${key}:${domain}`;
  let site = siteCache.get(siteKey);
  if (!site || now - site.ts >= (site.failed ? TTL_FAILED : TTL_OK)) {
    site = { ...(await searchSellerSite(title, domain, market)), ts: now };
    remember(siteCache, siteKey, site);
  }
  return site.url;
}
