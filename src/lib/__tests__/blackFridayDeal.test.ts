import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { confirmsListing, dealNote, dealVerdict, parseDollarPrice, parseTypicalRange } from '../blackFridayDeal';
import { buildDealCheckUrl, verifyDealCheckParams } from '../outbound';
import type { Product } from '../types';

describe('dealVerdict', () => {
  it("is a deal when the price is below Google's typical range", () => {
    expect(dealVerdict(169.99, 398, [198, 400])).toEqual({ deal: true, reason: 'below-usual', usualLow: 198, crossedOut: 398 });
    expect(dealVerdict(169.99, null, [198, 400])).toEqual({ deal: true, reason: 'below-usual', usualLow: 198 });
  });

  it('is not a deal inside the range, whatever the store crossed out', () => {
    // 2026-11-26: the Sony WH-1000XM6 at $348, crossed out from $458, usual range $296 to $460.
    expect(dealVerdict(348, 458, [296, 460]).deal).toBe(false);
    expect(dealVerdict(500, 900, [296, 460]).deal).toBe(false);
  });

  it('does not make a deal out of a cent', () => {
    expect(dealVerdict(89.99, null, [90, 130]).deal).toBe(false);
  });

  it("falls back to the store's markdown only when Google gives no range", () => {
    expect(dealVerdict(80, 100, null)).toEqual({ deal: true, reason: 'markdown', crossedOut: 100 });
    expect(dealVerdict(85, 100, null).deal).toBe(false);
    expect(dealVerdict(80, null, null).deal).toBe(false);
    expect(dealVerdict(80, 60, null).deal).toBe(false);
  });

  it('says why in the note', () => {
    expect(dealNote(dealVerdict(169.99, 398, [198, 400]))).toContain('$198');
    expect(dealNote(dealVerdict(80, 100, null))).toContain("store's claim");
    expect(dealNote({ deal: false })).toBe('');
  });
});

describe('parsing', () => {
  it('reads dollar prices and ranges as Google prints them', () => {
    expect(parseDollarPrice('$1,299.99')).toBe(1299.99);
    expect(parseDollarPrice('€20')).toBeNull();
    expect(parseTypicalRange('$88–$180')).toEqual([88, 180]);
    expect(parseTypicalRange('$88')).toBeNull();
    expect(parseTypicalRange(undefined)).toBeNull();
  });
});

describe('deal-check links', () => {
  const before = process.env.AUTH_SECRET;
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret';
  });
  afterEach(() => {
    process.env.AUTH_SECRET = before;
  });

  const product: Product = {
    name: 'Sony WH-1000XM5',
    price: 169.99,
    image: '',
    retailer: 'Best Buy',
    url: 'https://www.bestbuy.com/x',
    googleProductId: '123',
  };
  const query = (url: string) => new URL(url, 'https://pick.test').searchParams;

  it('round-trips a signed link', () => {
    const url = buildDealCheckUrl(product)!;
    expect(verifyDealCheckParams(query(url))).toEqual({
      pid: '123',
      retailer: 'Best Buy',
      market: 'US',
      price: '169.99',
      title: 'Sony WH-1000XM5',
    });
  });

  it('refuses a changed price', () => {
    const params = query(buildDealCheckUrl(product)!);
    params.set('p', '999');
    expect(verifyDealCheckParams(params)).toBeNull();
  });

  it('is not built without a product id or for another currency', () => {
    expect(buildDealCheckUrl({ ...product, googleProductId: undefined })).toBeUndefined();
    expect(buildDealCheckUrl({ ...product, currency: 'GBP' })).toBeUndefined();
  });
});

describe('confirmsListing', () => {
  const card = 'Sony - WH-1000XM5 Wireless Noise Cancelling Over-the-Ear Headphones - Black';

  it("accepts the card's store at the card's price", () => {
    expect(confirmsListing(169.99, card, 169.99, 'Sony WH-1000XM5 Wireless Noise Canceling Headphones')).toBe(true);
  });

  it('refuses a lookup that came back as another product', () => {
    // 2026-11-26: this card's lookup answered with a $57.99 Sony WH-CH520.
    expect(confirmsListing(169.99, card, 57.99, 'Sony - WH-CH520 Wireless Headphone with Microphone')).toBe(false);
    expect(confirmsListing(169.99, card, 169.99, 'Sony - WH-CH520 Wireless Headphone with Microphone')).toBe(false);
  });

  it("refuses when the store is not in the list or its price is not the card's", () => {
    expect(confirmsListing(254.99, card, null, 'Sony WH-1000XM5')).toBe(false);
    expect(confirmsListing(254.99, card, 169.99, 'Sony WH-1000XM5')).toBe(false);
  });

  it('does not need model numbers when a title has none', () => {
    expect(confirmsListing(45, 'Stanley Quencher Tumbler', 45, 'Stanley The Quencher H2.0 Tumbler 40 oz')).toBe(true);
  });
});
