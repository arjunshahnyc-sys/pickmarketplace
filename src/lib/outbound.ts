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
// SERVER ONLY (node:crypto, SERPER_API_KEY). Client components read the
// finished `product.clickUrl` string and never import this module.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { isCommissionExcluded } from './affiliate';
import { collapse } from './trust/identity';
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
}

function sign(p: ClickParams, secret: string): string {
  return createHmac('sha256', secret)
    .update([p.pid, p.retailer, p.market, p.fallback].join('\n'))
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
  };
  const qs = new URLSearchParams({
    pid: p.pid,
    r: p.retailer,
    m: p.market,
    u: p.fallback,
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

  const p: ClickParams = { pid, retailer, market, fallback };
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
const LOOKUP_TIMEOUT_MS = 6000;

// Anchored on globalThis for the same reason as the rate limiter: Next
// bundles each route with its own copy of a module-level Map.
type OfferCache = Map<string, { offers: MerchantOffer[] | null; ts: number }>;
const globalStore = globalThis as unknown as { __pickOfferCache?: OfferCache };
const cache: OfferCache = (globalStore.__pickOfferCache ??= new Map());

/** Test hook. */
export function clearOfferCache(): void {
  cache.clear();
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

/**
 * The clicked seller's own product page for this product, cleaned of
 * Google attribution, or null when the lookup fails or does not list that
 * seller. Never throws; null means "use the fallback link".
 */
export async function resolveMerchantUrl(
  pid: string,
  retailer: string,
  market: string
): Promise<string | null> {
  const key = `${market.toLowerCase()}:${pid}`;
  const now = Date.now();
  let entry = cache.get(key);
  if (!entry || now - entry.ts >= (entry.offers ? TTL_OK : TTL_FAILED)) {
    entry = { offers: await fetchOffers(pid, market), ts: now };
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, entry);
  }

  const offer = entry.offers?.find((o) => sameSeller(o.source, retailer, market));
  return offer ? stripTrackingParams(offer.link) : null;
}
