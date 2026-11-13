import { describe, expect, it } from 'vitest';
import type { Comparison, ComparisonRow, ComparisonTwin } from '../comparisonPage';
import { getComparison } from '../comparisons';
import { compactPrice, MAX_DUPE_NAME, shareImageContent, shortName } from '../shareImage';

// Share images, 2026-11-13: the preview a phone or a feed shows for a
// comparison page link. These pin what the card may say.

const row = (over: Partial<ComparisonRow> = {}): ComparisonRow => ({
  name: 'Stanley 40 oz Stainless Steel H2.0 FlowState Quencher Tumbler',
  store: 'Target',
  url: 'https://www.target.com/p/1',
  image: '',
  price: 45,
  currency: 'USD',
  originalPrice: null,
  rating: null,
  reviewCount: null,
  trustLevel: 'verified',
  trustLabel: 'Verified retailer',
  conditionLabel: null,
  shippingMinor: 0,
  shippingLabel: 'Shipping',
  preTaxMinor: 4500,
  ...over,
});
const twin = (over: Partial<ComparisonTwin> = {}): ComparisonTwin => ({
  ...row({ name: 'Ozark Trail 40 oz Vacuum Insulated Stainless Steel Tumbler', store: 'Walmart', price: 17.44 }),
  savingsPercent: 61,
  sharedSpecs: ['40 oz', 'Stainless steel'],
  ...over,
});
const comparison = (top: ComparisonRow | null, topIsVerifiedNew: boolean, t: ComparisonTwin | null): Comparison =>
  ({ checkedAt: '2026-11-13T15:00:00Z', item: { top, topIsVerifiedNew }, twin: t }) as unknown as Comparison;

const stanley = getComparison('stanley-quencher-40-oz')!;
const dysonV8 = getComparison('dyson-v8')!;

describe('compactPrice', () => {
  it('drops the cents from a round price and keeps them otherwise', () => {
    expect(compactPrice(45)).toBe('$45');
    expect(compactPrice(17.44)).toBe('$17.44');
    expect(compactPrice(1299)).toBe('$1,299');
    expect(compactPrice(519.99)).toBe('$519.99');
  });
});

describe('shortName', () => {
  it('drops store boilerplate after a pipe', () => {
    expect(shortName('e.l.f. Halo Glow Liquid Filter 8 Rich | Foundation | CVS')).toBe('e.l.f. Halo Glow Liquid Filter 8 Rich');
  });

  it('cuts a long title at a word, with an ellipsis', () => {
    const long = "L'Oreal Paris EverPure Sulfate Free Bond Repair Pre Shampoo Treatment for Damaged Hair, 5.1 fl oz";
    const short = shortName(long);
    expect(short.length).toBeLessThanOrEqual(MAX_DUPE_NAME + 1);
    expect(short.endsWith('…')).toBe(true);
    expect(long.startsWith(short.slice(0, -1))).toBe(true);
    expect(short.slice(0, -1)).not.toMatch(/[\s,]$/);
  });

  it('leaves a short title alone', () => {
    expect(shortName('Shark FlexStyle Air Styling & Drying System')).toBe('Shark FlexStyle Air Styling & Drying System');
  });
});

describe('shareImageContent', () => {
  it('shows the lowest confirmed price, the dupe and the date they were checked', () => {
    const c = shareImageContent(stanley, comparison(row(), true, twin()));
    expect(c).toEqual({
      name: 'Stanley Quencher H2.0 FlowState Tumbler, 40 oz',
      checked: 'Nov 13, 2026',
      price: { amount: '$45', store: 'Target' },
      dupe: { name: 'Ozark Trail 40 oz Vacuum Insulated Stainless Steel Tumbler', amount: '$17.44', store: 'Walmart', savingsPercent: 61 },
      dupeWord: 'dupe',
    });
  });

  it('calls it an alternative for electronics and appliances', () => {
    expect(shareImageContent(dysonV8, comparison(row({ price: 369, store: 'Best Buy' }), true, null)).dupeWord).toBe('alternative');
  });

  it('shows the price alone when no cheaper match passed the bar', () => {
    const c = shareImageContent(stanley, comparison(row(), true, null));
    expect(c.price).toEqual({ amount: '$45', store: 'Target' });
    expect(c.dupe).toBeNull();
  });

  it('states no price, no dupe and no date when nothing is confirmed', () => {
    // A marketplace listing on top is not a confirmed price, and a dupe's
    // saving means nothing without one.
    const unconfirmed = shareImageContent(stanley, comparison(row({ store: 'eBay', price: 20 }), false, twin()));
    expect(unconfirmed).toMatchObject({ price: null, dupe: null, checked: null });
    // The searches failed: the card names the product and promises nothing.
    expect(shareImageContent(stanley, null)).toMatchObject({ name: stanley.name, price: null, dupe: null, checked: null });
  });
});
