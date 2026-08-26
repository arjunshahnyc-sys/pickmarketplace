// CHARACTERIZATION TESTS: these pin the CURRENT flag-off sort behavior of
// the homepage, exactly as it shipped before landed cost existed. They are
// not aspirational; if one fails, the flag-off experience changed, which
// the landed-cost work promised never to do. Do not "fix" these to match
// new behavior without a deliberate product decision.

import { describe, expect, it } from 'vitest';
import { sortProducts } from '../../sortResults';
import type { Product } from '../../types';

function p(over: Partial<Product> & { id: string; price: number }): Product {
  return {
    name: over.id,
    image: '',
    retailer: 'Test',
    url: `https://example.test/${over.id}`,
    ...over,
  };
}

const FIXTURE: Product[] = [
  p({ id: 'a', price: 50 }),
  p({ id: 'b', price: 20, originalPrice: 40 }), // 50% off
  p({ id: 'c', price: 20 }),
  p({ id: 'd', price: 80, originalPrice: 100 }), // 20% off
  p({ id: 'e', price: 50, originalPrice: 50 }), // not a real discount
  p({ id: 'f', price: 10 }),
];

const ids = (xs: Product[]) => xs.map((x) => x.id);

describe('current homepage sort (flag-off contract)', () => {
  it('relevance keeps source order and unknown options fall through to it', () => {
    expect(ids(sortProducts(FIXTURE, 'relevance'))).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(ids(sortProducts(FIXTURE, 'anything-else'))).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('price-low ascends; ties keep source order (engine sort is stable)', () => {
    expect(ids(sortProducts(FIXTURE, 'price-low'))).toEqual(['f', 'b', 'c', 'a', 'e', 'd']);
  });

  it('price-high descends; ties keep source order', () => {
    expect(ids(sortProducts(FIXTURE, 'price-high'))).toEqual(['d', 'a', 'e', 'b', 'c', 'f']);
  });

  it('biggest-sale sorts by discount percent; non-discounts tie at zero in source order', () => {
    // b 50% > d 20% > everything else 0% (a, c, e, f in source order:
    // originalPrice equal to price does NOT count as a sale)
    expect(ids(sortProducts(FIXTURE, 'biggest-sale'))).toEqual(['b', 'd', 'a', 'c', 'e', 'f']);
  });

  it('returns a copy and leaves the input untouched', () => {
    const input = [...FIXTURE];
    const out = sortProducts(input, 'price-low');
    expect(out).not.toBe(input);
    expect(ids(input)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});
