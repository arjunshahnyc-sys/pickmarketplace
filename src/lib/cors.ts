// CORS for the endpoints the browser extension calls (/api/search, /api/ask,
// /api/similar).
//
// The extension reaches these from two contexts: content scripts (the request
// carries the retailer page's origin, e.g. https://www.amazon.com) and the
// background service worker / popup (origin chrome-extension://<id>). The
// site's own pages are same-origin and need no CORS headers at all.
//
// Anything else gets no Access-Control-Allow-Origin header, so arbitrary
// websites can no longer use their visitors' browsers to read these endpoints
// or fire preflighted POSTs that burn our paid search quota.

const RETAILER_PAGE_ORIGINS = new Set([
  'https://www.amazon.com',
  'https://www.walmart.com',
  'https://www.target.com',
  'https://www.bestbuy.com',
]);

export function extensionCorsHeaders(origin: string | null): Record<string, string> {
  // Vary: Origin keeps caches from serving one origin's CORS response to another.
  const headers: Record<string, string> = { Vary: 'Origin' };

  const allowed =
    origin !== null &&
    (origin.startsWith('chrome-extension://') ||
      origin.startsWith('moz-extension://') ||
      RETAILER_PAGE_ORIGINS.has(origin));

  if (allowed) {
    headers['Access-Control-Allow-Origin'] = origin as string;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  return headers;
}
