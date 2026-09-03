import { describe, expect, it } from 'vitest';
import {
  applyFacets,
  deriveFacets,
  facetCounts,
  hasFacetSelection,
  matchesFacets,
  toggleFacet,
} from '../deriveFacets';
import { productTypeFor } from '../taxonomy';
import type { Product } from '../../types';

// Names captured from a live "titleist" search on 2026-09-03 (every row
// from the Titleist store, so Store and Brand can never help here), plus
// the guessed feed fields the scrapers attach: category is "Sports" for
// anything with "ball" in it and "Other" otherwise; brand is the retailer,
// or "GE" when that substring happens to appear in the name.
const titleist = (id: string, name: string, category = 'Other', brand = 'Titleist'): Product => ({
  id,
  name,
  price: 50,
  image: '',
  retailer: 'Titleist',
  url: `https://www.titleist.com/${id}`,
  category,
  brand,
});

const TITLEIST: Product[] = [
  titleist('1', 'Titleist Pro V1 Golf Balls', 'Sports'),
  titleist('2', 'Titleist 2025 T250 Irons'),
  titleist('3', 'Titleist Tour Soft Golf Balls', 'Sports'),
  titleist('4', 'Titleist T100 Iron Set'),
  titleist('5', 'Titleist Players S4 Stand Bag'),
  titleist('6', 'Titleist 2025 T100 Irons'),
  titleist('7', 'Titleist TruFeel Golf Balls', 'Sports'),
  titleist('8', 'Titleist GTS2 Driver'),
  titleist('9', 'Titleist Pro V1x Golf Balls', 'Sports'),
  titleist('10', 'Titleist Players 4 Carbon Stand Bag'),
  titleist('11', 'Titleist LINKSLEGEND Members Stand Bag', 'Other', 'GE'),
  titleist('12', 'Titleist Pro V1 Enhanced Alignment Golf Balls', 'Sports'),
  titleist('13', 'Titleist Vokey SM11 Tour Chrome Wedge', 'Other', 'GE'),
  titleist('14', 'Titleist Hybrid 14 Stand Bag'),
  titleist('15', 'Titleist Official GT1 Driver'),
  titleist('16', 'Titleist U505 Utility Iron 2026'),
  titleist('17', 'Titleist Official T100 Black Irons Hand'),
  titleist('18', 'Titleist Pro V1 RCT Golf Balls', 'Sports'),
  titleist('19', 'Titleist Pro V1x Enhanced Alignment Golf Balls', 'Sports'),
  titleist('20', 'Titleist Carry Bag'),
];

const group = (facets: ReturnType<typeof deriveFacets>['facets'], key: string) =>
  facets.find((g) => g.key === key);

describe('taxonomy: names become shopper-facing types', () => {
  it('golf words are typed only with a golf signal in the name or query', () => {
    expect(productTypeFor('Titleist Pro V1 Golf Balls', 'titleist')).toBe('Golf Balls');
    expect(productTypeFor('GTS2 Driver', 'titleist')).toBe('Drivers');
    expect(productTypeFor('DeWalt 20V Impact Driver', 'power tools')).toBeUndefined();
    expect(productTypeFor('Cordless Iron with Steam', 'iron')).toBeUndefined();
  });

  it('specific rules beat general ones: a Hybrid 14 bag is a bag', () => {
    expect(productTypeFor('Titleist Hybrid 14 Stand Bag', 'titleist')).toBe('Stand Bags');
    expect(productTypeFor('Titleist TSR2 Hybrid', 'titleist')).toBe('Hybrids');
    expect(productTypeFor('Nike Pegasus Running Shoes', 'nike')).toBe('Running Shoes');
    expect(productTypeFor('Sony WH-1000XM5 Wireless Headphones', 'sony')).toBe('Headphones');
    expect(productTypeFor('Apple AirPods Pro 2', 'airpods')).toBe('Earbuds');
  });

  it('accepts a clean feed type but never a guessed bucket', () => {
    expect(productTypeFor('Some Gadget', 'gadget', 'Golf Balls')).toBe('Golf Balls');
    expect(productTypeFor('Some Gadget', 'gadget', 'sports')).toBeUndefined();
    expect(productTypeFor('Some Gadget', 'gadget', 'Other')).toBeUndefined();
    expect(productTypeFor('Some Gadget', 'gadget', 'Electronics')).toBeUndefined();
    expect(productTypeFor('Some Gadget', 'gadget', 'a very long category phrase here')).toBeUndefined();
  });
});

describe('deriveFacets on a Titleist result set', () => {
  const { products, facets } = deriveFacets(TITLEIST, 'titleist');

  it('surfaces the product types a golfer would filter by, with counts', () => {
    const type = group(facets, 'type')!;
    const labels = Object.fromEntries(type.values.map((v) => [v.value, v.count]));
    expect(labels['Golf Balls']).toBe(7);
    expect(labels['Stand Bags']).toBe(4);
    expect(labels['Irons']).toBe(5);
    expect(labels['Drivers']).toBe(2);
    expect(type.values[0].value).toBe('Golf Balls');
    expect(type.values.length).toBeLessThanOrEqual(6);
  });

  it('surfaces recurring series and drops the lone code inside a kept bigram', () => {
    const line = group(facets, 'line')!;
    const values = line.values.map((v) => v.value);
    expect(values).toContain('Pro V1');
    expect(values).toContain('T100');
    expect(values).not.toContain('V1');
    expect(values).not.toContain('Titleist');
    expect(values).not.toContain('2025');
    expect(line.values.find((v) => v.value === 'Pro V1')!.count).toBe(3);
  });

  it('recurring descriptive phrases become Features, whole, never fragments', () => {
    const feature = group(facets, 'feature')!;
    const values = feature.values.map((v) => v.value);
    expect(values).toContain('Enhanced Alignment');
    expect(values).not.toContain('Stand Bag');
    expect(values).not.toContain('Golf Balls');
  });

  it('shows no Store or Brand group when they cannot narrow anything', () => {
    expect(group(facets, 'store')).toBeUndefined();
    expect(group(facets, 'brand')).toBeUndefined();
    expect(products.some((p) => p.attributes?.brand === 'GE')).toBe(false);
  });

  it('keeps order, ids and urls, and attaches attributes', () => {
    expect(products.map((p) => p.id)).toEqual(TITLEIST.map((p) => p.id));
    expect(products.map((p) => p.url)).toEqual(TITLEIST.map((p) => p.url));
    expect(products[0].attributes).toEqual({ type: 'Golf Balls', lines: ['Pro V1'] });
    expect(products[13].attributes?.type).toBe('Stand Bags');
  });

  it('no chip label exceeds the cap or contains an em dash', () => {
    for (const g of facets) {
      for (const v of g.values) {
        expect(v.label.length).toBeLessThanOrEqual(32);
        expect(v.label).not.toContain('—');
      }
    }
  });
});

describe('deriveFacets on a mixed-store headphones set', () => {
  const mixed: Product[] = [
    { id: 'a', name: 'Sony WH-1000XM5 Wireless Headphones', price: 300, image: '', retailer: 'Best Buy', url: 'u1', brand: 'Sony', category: 'Electronics' },
    { id: 'b', name: 'Sony WH-1000XM5 Headphones Black', price: 280, image: '', retailer: 'eBay', url: 'u2', brand: 'eBay', category: 'Electronics' },
    { id: 'c', name: 'Bose QuietComfort Ultra Headphones', price: 350, image: '', retailer: 'Best Buy', url: 'u3', brand: 'Bose', category: 'Electronics' },
    { id: 'd', name: 'Apple AirPods Pro 2 Earbuds', price: 200, image: '', retailer: 'Walmart', url: 'u4', brand: 'Apple', category: 'Electronics' },
    { id: 'e', name: 'JBL Tune 510BT On-Ear Headphones', price: 40, image: '', retailer: 'Walmart', url: 'u5', brand: 'JBL', category: 'Electronics' },
  ];
  const { facets } = deriveFacets(mixed, 'headphones');

  it('offers Type, Brand and Store groups when they can narrow the set', () => {
    expect(group(facets, 'type')!.values.map((v) => v.value)).toEqual(['Headphones', 'Earbuds']);
    expect(group(facets, 'store')!.values.map((v) => v.value)).toEqual(['Best Buy', 'Walmart', 'eBay']);
    const brands = group(facets, 'brand')!.values.map((v) => v.value);
    expect(brands).toContain('Sony');
    expect(brands).toContain('Bose');
    expect(brands).not.toContain('eBay');
  });

  it('a series shared by two rows is a chip; a store-name brand is not', () => {
    expect(group(facets, 'line')?.values.map((v) => v.value) ?? []).toContain('WH-1000XM5');
  });

  it('bare numbers and two-letter caps are specs, not series', () => {
    const rows: Product[] = [
      { id: '1', name: 'Sony Bluetooth 5.4 DJ Headphones 3.5mm', price: 1, image: '', retailer: 'A', url: 'a' },
      { id: '2', name: 'JBL Bluetooth 5.4 DJ Headphones 3.5mm', price: 1, image: '', retailer: 'B', url: 'b' },
      { id: '3', name: 'Anker ANC Headphones Q20i', price: 1, image: '', retailer: 'C', url: 'c' },
      { id: '4', name: 'Anker ANC Headphones Q20i Plus', price: 1, image: '', retailer: 'D', url: 'd' },
    ];
    const values = group(deriveFacets(rows, 'headphones').facets, 'line')?.values.map((v) => v.value) ?? [];
    expect(values).not.toContain('5.4');
    expect(values).not.toContain('DJ');
    expect(values.some((v) => v.includes('ANC'))).toBe(true);
    expect(values).toContain('Q20i');
  });

  it('capitalized runs are counted whole, so "Active Noise" never appears beside "Noise Cancelling"', () => {
    const rows: Product[] = [
      { id: '1', name: 'Sony Active Noise Cancelling Headphones', price: 1, image: '', retailer: 'A', url: 'a' },
      { id: '2', name: 'Bose Active Noise Cancelling Headphones', price: 1, image: '', retailer: 'B', url: 'b' },
      { id: '3', name: 'JBL Noise Cancelling Over Ear Headphones', price: 1, image: '', retailer: 'C', url: 'c' },
      { id: '4', name: 'Anker Over Ear Headphones Wired', price: 1, image: '', retailer: 'D', url: 'd' },
    ];
    const { facets: f, products: p } = deriveFacets(rows, 'headphones');
    const values = group(f, 'feature')!.values.map((v) => v.value);
    expect(values).toContain('Active Noise Cancelling');
    expect(values).toContain('Over Ear');
    expect(values).not.toContain('Active Noise');
    expect(p[0].attributes?.features).toEqual(['Noise Cancelling', 'Active Noise Cancelling']);
    expect(values).toContain('Noise Cancelling');
    expect(applyFacets(p, { feature: ['Over Ear'] }).map((x) => x.id)).toEqual(['3', '4']);
  });
});

describe('filtering and counting', () => {
  const { products, facets } = deriveFacets(TITLEIST, 'titleist');

  it('OR within a group, AND across groups', () => {
    const balls = applyFacets(products, { type: ['Golf Balls'] });
    expect(balls).toHaveLength(7);
    const ballsOrBags = applyFacets(products, { type: ['Golf Balls', 'Stand Bags'] });
    expect(ballsOrBags).toHaveLength(11);
    const proV1Balls = applyFacets(products, { type: ['Golf Balls'], line: ['Pro V1'] });
    expect(proV1Balls.map((p) => p.id)).toEqual(['1', '12', '18']);
    expect(applyFacets(products, { type: ['Stand Bags'], line: ['Pro V1'] })).toHaveLength(0);
  });

  it('a product with no attributes never matches a type or series pick', () => {
    const bare: Product = { name: 'x', price: 1, image: '', retailer: 'Titleist', url: 'u' };
    expect(matchesFacets(bare, { type: ['Golf Balls'] })).toBe(false);
    expect(matchesFacets(bare, { store: ['Titleist'] })).toBe(true);
    expect(matchesFacets(bare, {})).toBe(true);
  });

  it('counts each chip against the other groups\' picks, not its own', () => {
    const counts = facetCounts(products, facets, { type: ['Golf Balls'] });
    expect(counts['type:Stand Bags']).toBe(4); // own group ignored
    expect(counts['line:Pro V1']).toBe(3); // 3 Pro V1 balls
    expect(counts['line:T100']).toBe(0); // irons only
  });

  it('toggle adds, removes, and drops empty groups', () => {
    let s = toggleFacet({}, 'type', 'Golf Balls');
    expect(s).toEqual({ type: ['Golf Balls'] });
    s = toggleFacet(s, 'type', 'Irons');
    expect(s.type).toEqual(['Golf Balls', 'Irons']);
    s = toggleFacet(toggleFacet(s, 'type', 'Golf Balls'), 'type', 'Irons');
    expect(s).toEqual({});
    expect(hasFacetSelection(s)).toBe(false);
    expect(hasFacetSelection({ line: ['T100'] })).toBe(true);
  });

  it('an empty result set yields no facets and no attributes', () => {
    expect(deriveFacets([], 'anything')).toEqual({ products: [], facets: [] });
  });
});
