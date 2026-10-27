// Plan item 2 (approved 2026-10-03): a real price on top. Built from the
// 2026-09-22 capture's failures: eBay bait on top for AirPods while Best Buy
// sold them, refurbished and resale units above new ones.

import { describe, expect, it } from 'vitest';
import type { LandedCostBreakdown } from '../landedCost/types';
import type { EnhancedProduct } from '../productGrouping';
import { orderForTrust } from '../trustOrder';

type Bucket = 'resolved' | 'partial' | 'unavailable';

function breakdown(bucket: Bucket): LandedCostBreakdown {
  return {
    lines: [],
    totalMinor: 1000,
    confidence: 'estimated',
    assumptions: [],
    warnings: [],
    unknownComponents: bucket === 'partial' ? ['shipping'] : [],
    lane: bucket === 'unavailable' ? 'unknown' : 'domestic',
    currency: 'USD',
  };
}

let n = 0;
function card(over: Partial<EnhancedProduct> & { name: string; retailer: string; price: number }, bucket?: Bucket): EnhancedProduct {
  n += 1;
  return {
    id: `card-${n}`,
    image: '',
    // A Google Shopping link carries no domain signal, so registry badges hold.
    url: `https://www.google.com/search?ibp=oshop&q=card-${n}`,
    currency: 'USD',
    ...(bucket ? { landedCost: breakdown(bucket) } : {}),
    ...over,
  };
}
const names = (list: EnhancedProduct[]) => list.map((p) => `${p.retailer} ${p.price}`);

describe('Possible scam and bait never lead', () => {
  it('Possible scam listings go last in every sort', () => {
    const list = [
      card({ name: 'AirPods Pro 3', retailer: 'Temu', price: 5 }),
      card({ name: 'Apple AirPods Pro 3', retailer: 'eBay', price: 140 }),
      card({ name: 'Apple AirPods Pro 3', retailer: 'Best Buy', price: 199.99 }),
    ];
    for (const sort of ['price-low', 'price-high', 'relevance', 'total-cost', 'biggest-sale']) {
      expect(names(orderForTrust(list, sort)).at(-1), sort).toBe('Temu 5');
    }
  });

  it('a listing flagged far below verified stores follows every unflagged listing, in every sort', () => {
    const bait = card({ name: 'Apple AirPods 4 ANC', retailer: 'eBay', price: 4.99, priceFlag: { kind: 'far-below-verified', referencePrice: 129.99 } });
    const real = card({ name: 'Apple AirPods 4 with Active Noise Cancellation', retailer: 'Best Buy', price: 129.99 });
    const other = card({ name: 'Apple AirPods 4', retailer: 'Some Shop', price: 99 });
    expect(names(orderForTrust([bait, real, other], 'price-low'))).toEqual(['Best Buy 129.99', 'Some Shop 99', 'eBay 4.99']);
  });
});

describe('new units before units that are not new', () => {
  const refurbished = () => card({ name: 'Refurbished Sony WF-1000XM5 Earbuds', retailer: 'Target', price: 139.99, groupId: 'g1' }, 'resolved');
  const fresh = () => card({ name: 'Sony WF-1000XM5 Earbuds', retailer: 'Best Buy', price: 278, groupId: 'g1' }, 'resolved');

  it('in the default and relevance orders, a refurbished unit never precedes a new one of the same item', () => {
    const between = card({ name: 'Sony WH-CH720N', retailer: 'Walmart', price: 150 }, 'resolved');
    for (const sort of ['total-cost', 'relevance']) {
      expect(names(orderForTrust([refurbished(), between, fresh()], sort)), sort).toEqual(['Best Buy 278', 'Walmart 150', 'Target 139.99']);
    }
  });

  it('item-price sorts keep strict price order (the card labels the condition)', () => {
    expect(names(orderForTrust([refurbished(), fresh()], 'price-low'))).toEqual(['Target 139.99', 'Best Buy 278']);
  });

  it('a listing Pick cannot total never jumps above a complete total to swap in', () => {
    const unverifiedNew = card({ name: 'Sony WF-1000XM5 Earbuds', retailer: 'Some Shop', price: 230, groupId: 'g1' }, 'unavailable');
    expect(names(orderForTrust([refurbished(), unverifiedNew], 'total-cost'))).toEqual(['Target 139.99', 'Some Shop 230']);
  });
});

describe('the top slot in the default order', () => {
  it("goes to a verified store's new listing of the searched item when the top listing is not one", () => {
    const list = [
      card({ name: 'Airpods Pro 3 In-ear Bluetooth Earbuds Anc', retailer: 'eBay', price: 70 }, 'resolved'),
      card({ name: 'Apple AirPods Pro 3 Case', retailer: 'Walmart', price: 12 }, 'resolved'),
      card({ name: 'Apple AirPods Pro 3', retailer: 'Best Buy', price: 199.99, inSearchedItem: true }, 'resolved'),
    ];
    expect(names(orderForTrust(list, 'total-cost'))).toEqual(['Best Buy 199.99', 'eBay 70', 'Walmart 12']);
  });

  it('a refurbished unit on top yields to a new unit of the searched item', () => {
    const list = [
      card({ name: 'Refurbished Sony WH-CH720N', retailer: 'Target', price: 49.99 }, 'resolved'),
      card({ name: 'Sony WH-CH720N Wireless Headphones', retailer: 'Adorama', price: 78, inSearchedItem: true }, 'resolved'),
    ];
    expect(names(orderForTrust(list, 'total-cost'))).toEqual(['Adorama 78', 'Target 49.99']);
  });

  it('stays put when no verified store sells the searched item new', () => {
    const list = [
      card({ name: 'Keurig K-Mini', retailer: 'eBay', price: 34, inSearchedItem: true }, 'resolved'),
      card({ name: 'Keurig K-Mini', retailer: 'Some Shop', price: 45, inSearchedItem: true }, 'unavailable'),
    ];
    expect(names(orderForTrust(list, 'total-cost'))).toEqual(['eBay 34', 'Some Shop 45']);
  });

  it('never moves a partial total above a complete one', () => {
    const list = [
      card({ name: 'Uniqlo AIRism Oversized Tee', retailer: 'eBay', price: 15 }, 'resolved'),
      card({ name: "UNIQLO Men's AIRism Cotton Oversized T-Shirt", retailer: 'Uniqlo', price: 24.9, inSearchedItem: true }, 'partial'),
    ];
    expect(names(orderForTrust(list, 'total-cost'))).toEqual(['eBay 15', 'Uniqlo 24.9']);
  });

  it("leaves a verified store's new listing on top, even of another product", () => {
    const list = [
      card({ name: 'Ninja Air Fryer Pro XL 5-Qt', retailer: 'Walmart', price: 79.97 }, 'resolved'),
      card({ name: 'Ninja Air Fryer Pro 4-in-1', retailer: 'eBay', price: 133.87, inSearchedItem: true }, 'resolved'),
    ];
    expect(names(orderForTrust(list, 'total-cost'))).toEqual(['Walmart 79.97', 'eBay 133.87']);
  });

  it('only the default order moves the top slot', () => {
    const list = [
      card({ name: 'Airpods Pro 3', retailer: 'eBay', price: 70 }, 'resolved'),
      card({ name: 'Apple AirPods Pro 3', retailer: 'Best Buy', price: 199.99, inSearchedItem: true }, 'resolved'),
    ];
    expect(names(orderForTrust(list, 'relevance'))).toEqual(['eBay 70', 'Best Buy 199.99']);
  });
});
