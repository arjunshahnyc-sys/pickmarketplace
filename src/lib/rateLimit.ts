// Best-effort, in-memory rate limiting keyed by client IP.
//
// Counters live in module scope, so on serverless each warm instance enforces
// its own budget. That blunts brute force and API-quota abuse without new
// infrastructure, but it is not a hard global guarantee — a burst that lands
// on many cold instances gets a fresh budget on each. If abuse shows up in
// practice, swap the Map for a shared store (e.g. Upstash Redis) behind this
// same interface, or add Vercel WAF rules in front.

import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitRule {
  /**
   * Bucket prefix. Unique per endpoint, except where several endpoints
   * guard one shared expensive resource — then they share a name so their
   * budgets can't be stacked.
   */
  name: string;
  /** Max requests allowed per window per client IP. */
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  // Auth: strict, per-IP. Deliberately not keyed by email — a per-email
  // bucket would let an attacker lock a victim out of their own login.
  login: { name: 'login', limit: 10, windowMs: 5 * 60 * 1000 },
  signup: { name: 'signup', limit: 10, windowMs: 60 * 60 * 1000 },
  contact: { name: 'contact', limit: 5, windowMs: 15 * 60 * 1000 },
  // Anti-scraper guard, not a product limit: generous enough that no human
  // hits it, tight enough to stop bots hammering the paid Serper pipeline.
  // /api/search-live is the only route that hits that pipeline.
  search: { name: 'search', limit: 60, windowMs: 60 * 1000 },
} satisfies Record<string, RateLimitRule>;

interface Bucket {
  count: number;
  resetAt: number;
}

// Anchored on globalThis because Next bundles each route with its own copy
// of this module — a plain module-level Map would give every route (and
// every dev HMR reload) a private, ineffective bucket store.
const globalStore = globalThis as unknown as {
  __pickRateLimitBuckets?: Map<string, Bucket>;
};
const buckets = (globalStore.__pickRateLimitBuckets ??= new Map<string, Bucket>());
const MAX_BUCKETS = 10_000;

/**
 * Client IP for the current request. On Vercel, x-forwarded-for is set by the
 * platform proxy (client-supplied values are stripped), so the first entry is
 * trustworthy. Locally it may be absent — then all traffic shares one bucket,
 * which is fine for dev.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0].trim();
  if (first) return first;
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function checkRateLimit(req: NextRequest, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const key = `${rule.name}:${getClientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) pruneExpired(now);
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { ok: true };
  }

  if (bucket.count < rule.limit) {
    bucket.count += 1;
    return { ok: true };
  }

  return {
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
  // Only reachable while actively flooded from >MAX_BUCKETS distinct IPs:
  // resetting is safer than unbounded memory growth.
  if (buckets.size >= MAX_BUCKETS) buckets.clear();
}

export function rateLimitResponse(
  retryAfterSeconds: number,
  extraHeaders: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds), ...extraHeaders } }
  );
}
