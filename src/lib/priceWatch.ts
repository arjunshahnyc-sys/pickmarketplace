// Price drop alerts for the compare pages: the rules and the words.
// Pure (no database, no network) so every decision here is unit-tested.
//
// THE PROMISE: a shopper leaves an email on a compare page; Pick emails
// them when the price on that page falls. Nothing else is ever sent to
// that address.
//
// WHAT "THE PRICE" IS: the page's own top price, and only when it is a
// verified store's new unit. A marketplace or unverified listing dipping
// below everyone else is the kind of price Pick already warns shoppers
// about; it must not be the reason for an email.
//
// WHAT COUNTS AS A DROP: at least 2% and at least $1 below the price the
// shopper last heard about (the sign-up price, then each alert's price).
// Search prices wobble by cents from one read to the next; a threshold
// keeps that noise out of people's inboxes, and measuring from the last
// alert means the same drop is never announced twice.
//
// CONFIRMATION: the first and only email to an unconfirmed address asks
// them to confirm. Without it anyone could sign a stranger up.

import { randomBytes } from 'node:crypto';

export const SITE_ORIGIN = 'https://pickmarketplace.app';
export const DROP_MIN_FRACTION = 0.02;
export const DROP_MIN_AMOUNT = 1;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

/**
 * Alerts exist only where Pick can really send them: an email key AND a
 * sender address on a verified domain. Resend's shared sender delivers
 * only to the account owner, so without ALERTS_FROM_EMAIL the sign-up box
 * is not shown at all rather than collecting addresses it cannot write to.
 */
export function alertsConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.RESEND_API_KEY && env.ALERTS_FROM_EMAIL && env.DATABASE_URL);
}

export function alertsFrom(env: Record<string, string | undefined> = process.env): string {
  return env.ALERTS_FROM_EMAIL ?? '';
}

export type WatchRequest = { ok: true; email: string; slug: string } | { ok: false; error: string };

/** Validates and normalizes an untrusted sign-up body. */
export function validateWatchRequest(body: unknown): WatchRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.email !== 'string' || typeof b.slug !== 'string') {
    return { ok: false, error: 'Enter your email address.' };
  }
  const email = b.email.trim().toLowerCase();
  const slug = b.slug.trim();
  if (!EMAIL_RE.test(email) || email.length > EMAIL_MAX) {
    return { ok: false, error: 'That does not look like an email address.' };
  }
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return { ok: false, error: 'Unknown product.' };
  return { ok: true, email, slug };
}

/** The secret in a confirm or unsubscribe link: 32 random bytes, URL-safe. */
export function newWatchToken(): string {
  return randomBytes(32).toString('base64url');
}

export function isWatchToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{40,50}$/.test(value);
}

/** Is `current` enough below `reference` to be worth an email? */
export function isPriceDrop(reference: number, current: number): boolean {
  if (!(reference > 0) || !(current > 0)) return false;
  const needed = Math.max(DROP_MIN_AMOUNT, reference * DROP_MIN_FRACTION);
  // Compare in cents so float error never decides it.
  return Math.round((reference - current) * 100) >= Math.round(needed * 100);
}

export interface WatchState {
  baselinePrice: number;
  lastAlertPrice: number | null;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
}

export interface PriceReading {
  price: number;
  store: string;
  /** The page's top price is a verified store's new unit. */
  verifiedNew: boolean;
}

/** Should this watch get an alert for this reading? */
export function shouldAlert(watch: WatchState, reading: PriceReading | null): boolean {
  if (!reading || !reading.verifiedNew) return false;
  if (!watch.confirmedAt || watch.unsubscribedAt) return false;
  return isPriceDrop(watch.lastAlertPrice ?? watch.baselinePrice, reading.price);
}

const usd = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const confirmUrl = (token: string) => `${SITE_ORIGIN}/api/price-watch/confirm?token=${token}`;
export const unsubscribeUrl = (token: string) => `${SITE_ORIGIN}/api/price-watch/unsubscribe?token=${token}`;
export const compareUrl = (slug: string) => `${SITE_ORIGIN}/compare/${slug}`;

export function confirmationEmail(args: { name: string; price: number; store: string; token: string }) {
  return {
    subject: `Confirm your price alert for the ${args.name}`,
    text: [
      `You asked Pick Marketplace to email you when the ${args.name} drops in price.`,
      `Today it is ${usd(args.price)} at ${args.store}.`,
      '',
      'Confirm the alert:',
      confirmUrl(args.token),
      '',
      'If this was not you, ignore this email. Nothing else will be sent to this address.',
    ].join('\n'),
  };
}

export function alertEmail(args: {
  name: string;
  slug: string;
  price: number;
  store: string;
  previousPrice: number;
  /** "when you signed up" or "at the last alert". */
  previousWhen: string;
  checked: string;
  token: string;
}) {
  const saved = args.previousPrice - args.price;
  return {
    subject: `The ${args.name} dropped to ${usd(args.price)}`,
    text: [
      `The ${args.name} is now ${usd(args.price)} at ${args.store}.`,
      `It was ${usd(args.previousPrice)} ${args.previousWhen}, so it is ${usd(saved)} lower.`,
      '',
      'See the price and where to buy it:',
      compareUrl(args.slug),
      '',
      `Pick read this price on ${args.checked}. Prices change, so check it at the store before you buy.`,
      '',
      'Stop these alerts:',
      unsubscribeUrl(args.token),
    ].join('\n'),
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl(args.token)}>` },
  };
}
