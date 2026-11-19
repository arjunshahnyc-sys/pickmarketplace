import { describe, expect, it } from 'vitest';
import {
  alertEmail,
  alertsConfigured,
  confirmationEmail,
  isPriceDrop,
  isWatchToken,
  newWatchToken,
  shouldAlert,
  validateWatchRequest,
  type WatchState,
} from '../priceWatch';

const confirmed: WatchState = {
  baselinePrice: 100,
  lastAlertPrice: null,
  confirmedAt: new Date('2026-11-18'),
  unsubscribedAt: null,
};
const reading = (price: number, verifiedNew = true) => ({ price, store: 'Best Buy', verifiedNew });

describe('alertsConfigured', () => {
  it('needs the email key, a sender on a verified domain, and the database', () => {
    expect(alertsConfigured({ RESEND_API_KEY: 'k', ALERTS_FROM_EMAIL: 'a@pickmarketplace.app', DATABASE_URL: 'x' })).toBe(true);
    expect(alertsConfigured({ RESEND_API_KEY: 'k', DATABASE_URL: 'x' })).toBe(false);
    expect(alertsConfigured({ ALERTS_FROM_EMAIL: 'a@b.c', DATABASE_URL: 'x' })).toBe(false);
    expect(alertsConfigured({})).toBe(false);
  });
});

describe('validateWatchRequest', () => {
  it('normalizes a good request', () => {
    expect(validateWatchRequest({ email: '  Sam@Example.COM ', slug: 'sony-wh-1000xm5' })).toEqual({
      ok: true,
      email: 'sam@example.com',
      slug: 'sony-wh-1000xm5',
    });
  });

  it('refuses a bad address, a bad slug, and the wrong shape', () => {
    expect(validateWatchRequest({ email: 'not-an-email', slug: 'x' }).ok).toBe(false);
    expect(validateWatchRequest({ email: 'a@b.co', slug: '../etc' }).ok).toBe(false);
    expect(validateWatchRequest({ email: 'a@b.co' }).ok).toBe(false);
    expect(validateWatchRequest(null).ok).toBe(false);
    expect(validateWatchRequest({ email: `${'a'.repeat(250)}@b.co`, slug: 'x' }).ok).toBe(false);
  });
});

describe('tokens', () => {
  it('are long, URL-safe and different every time', () => {
    const a = newWatchToken();
    const b = newWatchToken();
    expect(a).not.toBe(b);
    expect(isWatchToken(a)).toBe(true);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('anything else is not a token', () => {
    expect(isWatchToken('short')).toBe(false);
    expect(isWatchToken(null)).toBe(false);
    expect(isWatchToken("' OR 1=1 --".padEnd(43, 'x'))).toBe(false);
  });
});

describe('isPriceDrop: at least 2% and at least $1', () => {
  it('a real drop counts', () => {
    expect(isPriceDrop(100, 98)).toBe(true); // exactly 2%
    expect(isPriceDrop(459.99, 399.99)).toBe(true);
  });

  it('cents of wobble do not', () => {
    expect(isPriceDrop(100, 98.01)).toBe(false);
    expect(isPriceDrop(100, 99.5)).toBe(false);
    expect(isPriceDrop(100, 100)).toBe(false);
    expect(isPriceDrop(100, 120)).toBe(false);
  });

  it('on a cheap item 2% is not enough: it must also be $1', () => {
    expect(isPriceDrop(10, 9.5)).toBe(false); // 5%, but 50 cents
    expect(isPriceDrop(10, 9)).toBe(true);
    expect(isPriceDrop(30, 29)).toBe(true); // $1, and above 2%
  });

  it('nonsense prices never count', () => {
    expect(isPriceDrop(0, 0)).toBe(false);
    expect(isPriceDrop(100, 0)).toBe(false);
    expect(isPriceDrop(NaN, 50)).toBe(false);
  });
});

describe('shouldAlert', () => {
  it('a confirmed watch hears about a drop from a verified store', () => {
    expect(shouldAlert(confirmed, reading(90))).toBe(true);
  });

  it('never before the shopper confirmed, and never after they stopped', () => {
    expect(shouldAlert({ ...confirmed, confirmedAt: null }, reading(50))).toBe(false);
    expect(shouldAlert({ ...confirmed, unsubscribedAt: new Date() }, reading(50))).toBe(false);
  });

  it('a low price from an unverified or marketplace listing is not a reason to email', () => {
    expect(shouldAlert(confirmed, reading(40, false))).toBe(false);
  });

  it('no reading (search down, no price on the page): no alert', () => {
    expect(shouldAlert(confirmed, null)).toBe(false);
  });

  it('the same drop is announced once: the next alert must beat the last one', () => {
    const afterAlert = { ...confirmed, lastAlertPrice: 90 };
    expect(shouldAlert(afterAlert, reading(90))).toBe(false);
    expect(shouldAlert(afterAlert, reading(89.5))).toBe(false);
    expect(shouldAlert(afterAlert, reading(85))).toBe(true);
    // Back up and down again to the same price: still nothing new.
    expect(shouldAlert(afterAlert, reading(95))).toBe(false);
  });
});

describe('the emails', () => {
  const token = 'a'.repeat(43);

  it('confirmation names the product and price and carries only the confirm link', () => {
    const mail = confirmationEmail({ name: 'Sony WH-1000XM5', price: 248, store: 'Best Buy', token });
    expect(mail.subject).toBe('Confirm your price alert for the Sony WH-1000XM5');
    expect(mail.text).toContain('$248.00 at Best Buy');
    expect(mail.text).toContain(`https://pickmarketplace.app/api/price-watch/confirm?token=${token}`);
    expect(mail.text).toContain('Nothing else will be sent to this address');
  });

  it('alert states the new price, the old one, the saving, the page, and how to stop', () => {
    const mail = alertEmail({
      name: 'Sony WH-1000XM5',
      slug: 'sony-wh-1000xm5',
      price: 1199.5,
      store: 'Best Buy',
      previousPrice: 1299.5,
      previousWhen: 'when you signed up',
      checked: 'Nov 27, 2026',
      token,
    });
    expect(mail.subject).toBe('The Sony WH-1000XM5 dropped to $1,199.50');
    expect(mail.text).toContain('It was $1,299.50 when you signed up, so it is $100.00 lower.');
    expect(mail.text).toContain('https://pickmarketplace.app/compare/sony-wh-1000xm5');
    expect(mail.text).toContain(`https://pickmarketplace.app/api/price-watch/unsubscribe?token=${token}`);
    expect(mail.headers['List-Unsubscribe']).toContain('/unsubscribe?token=');
    expect(mail.text).toContain('check it at the store before you buy');
  });

  it('no em dashes or emojis in anything a shopper is sent', () => {
    const all =
      confirmationEmail({ name: 'X', price: 1, store: 'S', token }).text +
      alertEmail({ name: 'X', slug: 'x', price: 1, store: 'S', previousPrice: 2, previousWhen: 'at the last alert', checked: 'd', token }).text;
    expect(all).not.toMatch(/[—\u{1F300}-\u{1FAFF}]/u);
  });
});
