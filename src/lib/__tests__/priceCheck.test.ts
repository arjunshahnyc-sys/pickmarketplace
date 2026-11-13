import { describe, expect, it } from 'vitest';
import type { Comparison, ComparisonRow } from '../comparisonPage';
import { getComparison } from '../comparisons';
import { EXACT_ITEM_CATEGORIES } from '../exactItem';
import {
  getPriceCheckEvent,
  PRICE_CHECK_CATEGORIES,
  priceCheckProducts,
  priceCheckRow,
  summarize,
  typicalPosition,
} from '../priceCheck';

describe('typicalPosition', () => {
  it("places a price against Google's typical range, ends included", () => {
    expect(typicalPosition(198, [278, 348])).toBe('below');
    expect(typicalPosition(278, [278, 348])).toBe('within');
    expect(typicalPosition(300, [278, 348])).toBe('within');
    expect(typicalPosition(348, [278, 348])).toBe('within');
    expect(typicalPosition(360, [278, 348])).toBe('above');
  });

  it('does not make a verdict out of a cent', () => {
    // 2026-11-12: the Ninja air fryer at $89.99 against "$90 to $130".
    expect(typicalPosition(89.99, [90, 130])).toBe('within');
    expect(typicalPosition(199.99, [200, 280])).toBe('within');
    expect(typicalPosition(130.5, [90, 130])).toBe('within');
    expect(typicalPosition(88, [90, 130])).toBe('below');
    expect(typicalPosition(132, [90, 130])).toBe('above');
  });

  it('says nothing without a range', () => {
    expect(typicalPosition(198, null)).toBeNull();
  });
});

const row = (over: Partial<ComparisonRow> = {}): ComparisonRow => ({
  name: 'Sony - WH-1000XM5 Wireless Noise Cancelling Over-the-Ear Headphones - Black',
  store: 'Best Buy',
  url: 'https://www.bestbuy.com/site/p/1',
  image: '',
  price: 198,
  currency: 'USD',
  originalPrice: 398,
  rating: null,
  reviewCount: null,
  trustLevel: 'verified',
  trustLabel: 'Verified retailer',
  conditionLabel: null,
  shippingMinor: 0,
  shippingLabel: 'Shipping',
  preTaxMinor: 19800,
  ...over,
});

const comparison = (top: ComparisonRow | null, topIsVerifiedNew: boolean, range: [number, number] | null = [278, 348]): Comparison =>
  ({
    checkedAt: '2026-11-27T12:00:00Z',
    item: { top, topIsVerifiedNew, referencePrice: 298, googleTypicalRange: range },
  }) as unknown as Comparison;

describe('priceCheckRow', () => {
  const entry = getComparison('sony-wh-1000xm5')!;

  it("sets today's price, the crossed-out price and Google's range side by side", () => {
    // 2026-11-12: $198 at Best Buy, crossed out from $398, typical $278 to $348.
    const r = priceCheckRow(entry, comparison(row(), true));
    expect(r.today?.price).toBe(198);
    expect(r.crossedOut).toBe(398);
    expect(r.googleTypicalRange).toEqual([278, 348]);
    expect(r.position).toBe('below');
    // The "was $398" is above anything Google calls typical.
    expect(r.crossedOutAboveTypical).toBe(true);
  });

  it('does not flag a crossed-out price inside the typical range', () => {
    const r = priceCheckRow(entry, comparison(row({ price: 209.99, originalPrice: 229 }), true, [190, 230]));
    expect(r.position).toBe('within');
    expect(r.crossedOutAboveTypical).toBe(false);
  });

  it('ignores a crossed-out price that is not above the price', () => {
    expect(priceCheckRow(entry, comparison(row({ originalPrice: 198 }), true)).crossedOut).toBeNull();
    expect(priceCheckRow(entry, comparison(row({ originalPrice: null }), true)).crossedOut).toBeNull();
  });

  it('does not treat an unverified or failed result as a price', () => {
    const unverified = priceCheckRow(entry, comparison(row({ store: 'eBay', price: 90 }), false));
    expect(unverified.today).toBeNull();
    expect(unverified.position).toBeNull();
    expect(unverified.crossedOutAboveTypical).toBe(false);
    const failed = priceCheckRow(entry, null);
    expect(failed).toMatchObject({ today: null, crossedOut: null, googleTypicalRange: null, position: null });
  });

  it('has no position when Google gives no range', () => {
    const r = priceCheckRow(entry, comparison(row(), true, null));
    expect(r.today?.price).toBe(198);
    expect(r.position).toBeNull();
    expect(r.crossedOutAboveTypical).toBe(false);
  });
});

describe('the price check catalog', () => {
  it('covers exactly the categories priced from exact-item evidence', () => {
    expect([...PRICE_CHECK_CATEGORIES].sort()).toEqual([...EXACT_ITEM_CATEGORIES].sort());
    expect(priceCheckProducts()).toHaveLength(26);
    expect(priceCheckProducts().every((p) => PRICE_CHECK_CATEGORIES.includes(p.category))).toBe(true);
  });

  it('knows Black Friday 2026 and nothing made up', () => {
    expect(getPriceCheckEvent('black-friday')).toMatchObject({ name: 'Black Friday 2026', date: '2026-11-27' });
    expect(getPriceCheckEvent('prime-day')).toBeUndefined();
  });
});

describe('summarize', () => {
  it('counts confirmed prices, positions and inflated crossed-out prices', () => {
    const entry = getComparison('sony-wh-1000xm5')!;
    const rows = [
      priceCheckRow(entry, comparison(row({ price: 198, originalPrice: 398 }), true)),
      priceCheckRow(entry, comparison(row({ price: 300, originalPrice: 320 }), true)),
      priceCheckRow(entry, comparison(row({ price: 360, originalPrice: null }), true)),
      priceCheckRow(entry, comparison(row({ price: 150, originalPrice: null }), true, null)),
      priceCheckRow(entry, null),
    ];
    expect(summarize(rows)).toEqual({ confirmed: 4, ranged: 3, below: 1, within: 1, above: 1, inflatedCrossedOut: 1 });
  });
});
