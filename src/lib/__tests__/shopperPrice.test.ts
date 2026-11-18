import { describe, expect, it } from 'vitest';
import { shopperPriceFor } from '../shopperPrice';
import type { Product } from '../types';
import type { LandedCostBreakdown } from '../landedCost/types';

function offer(over: Partial<Product>, itemMinor: number | null, currency: string): Product {
  const landedCost = {
    lines: [{ kind: 'item', label: 'Item price', amountMinor: itemMinor, confidence: 'estimated', basis: '' }],
    currency,
  } as unknown as LandedCostBreakdown;
  return { id: 'x', name: 'Thing', price: 18, retailer: 'Store', url: 'https://example.test', landedCost, ...over } as Product;
}

describe('shopperPriceFor', () => {
  it('restates a dollar price in rupees from the breakdown item line', () => {
    const s = shopperPriceFor(offer({ price: 18, currency: 'USD' }, 168_201, 'INR'))!;
    expect(s).toMatchObject({ amountMinor: 168_201, currency: 'INR', converted: true });
    // A crossed-out $36 scales by the same ratio, so the card agrees with itself.
    expect(s.convert(36)).toBe(336_402);
  });

  it('yen have no minor unit: the item line is whole yen', () => {
    const s = shopperPriceFor(offer({ price: 229.99, currency: 'USD' }, 33_808, 'JPY'))!;
    expect(s.amountMinor).toBe(33_808);
    expect(s.convert(229.99)).toBe(33_808);
  });

  it('a store already in the shopper currency is not marked converted', () => {
    const s = shopperPriceFor(offer({ price: 28_990, currency: 'INR' }, 2_899_000, 'INR'))!;
    expect(s.converted).toBe(false);
    expect(s.convert(30_000)).toBe(3_000_000);
  });

  it('no breakdown, or no rate for the item line: nothing to show, keep the store price', () => {
    expect(shopperPriceFor({ ...offer({}, 1, 'INR'), landedCost: undefined })).toBeNull();
    expect(shopperPriceFor(offer({ currency: 'USD' }, null, 'INR'))).toBeNull();
  });
});
