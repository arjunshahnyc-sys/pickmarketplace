import { describe, expect, it } from 'vitest';
import { buildComparison } from '../comparisonPage';
import { brandWord, COMPARISON_ALTERNATIVES, COMPARISONS, getAlternativeSearch, getComparison } from '../comparisons';
import {
  findAlternatives,
  MIN_ALTERNATIVE_PRICE_SHARE,
  pickAnchor,
  type AlternativeOptions,
  type AnchorReference,
  type SellerClass,
} from '../productGrouping';
import type { LiveSearchData } from '../searchService';
import {
  hasConflictingSpecs,
  settledSpecsOfNames,
  sharedSpecLabels,
  sharedSpecs,
  specsOfNames,
} from '../sharedSpecs';
import type { Product } from '../types';

// Cheaper twins from a wider search, 2026-11-12. A search for one named
// product returns that product, so its twin was almost never in the
// results: 34 of 50 comparison pages had none and several of the rest
// offered the wrong kind of thing. The pages now run a second, brand-free
// search and findAlternatives holds its results to an explicit bar. These
// tests pin that bar, each rule with the live result that motivated it.

let nextId = 0;
function listing(over: Partial<Product> & { name: string; price: number }): Product {
  nextId += 1;
  return {
    id: `alt-${nextId}`,
    image: '',
    retailer: 'Best Buy',
    url: '',
    rating: 4.6,
    reviewCount: 2000,
    ...over,
  };
}

const sellerClass = (p: Product): SellerClass =>
  p.retailer === 'Marketplace Seller' ? 'marketplace' : p.retailer === 'Unknown Shop' ? 'unknown' : 'verified';

const XM5 = 'Sony WH-1000XM5 Wireless Noise Canceling Over-Ear Headphones';
const HEADPHONES: AlternativeOptions = {
  kind: ['headphones', 'headphone'],
  not: ['earbuds', 'earbud', 'buds', 'speaker'],
  brand: 'sony',
  sellerClass,
  isPossibleScam: () => false,
};

/** The XM5 at $300 typical, 4.6 stars. */
function xm5Anchor(): AnchorReference {
  const anchor = pickAnchor(
    [
      listing({ name: XM5, price: 300, retailer: 'Best Buy', reviewCount: 15000 }),
      listing({ name: XM5, price: 300, retailer: 'Target', reviewCount: 15000 }),
    ],
    { query: 'sony wh-1000xm5', sellerClass, isPossibleScam: () => false }
  );
  if (!anchor) throw new Error('no anchor');
  return anchor;
}

const names = (products: Product[]) => products.map((p) => p.name);

describe('findAlternatives: what counts as a twin', () => {
  const JBL = 'JBL Tune 770NC Wireless Noise Cancelling Over-Ear Headphones';

  it('finds another brand\'s product of the same kind that shares specs, with its savings and chips', () => {
    const [twin] = findAlternatives(xm5Anchor(), [listing({ name: JBL, price: 150 })], HEADPHONES);
    expect(twin.name).toBe(JBL);
    expect(twin.matchType).toBe('similar');
    expect(twin.similarTo).toEqual({
      name: XM5,
      savingsPercent: 50,
      sharedSpecs: ['Over ear', 'Active noise canceling', 'Wireless'],
    });
  });

  it.each([
    ['the same brand (sibling models and sizes were every wrong twin in the capture)', { name: 'Sony WH-CH730N Over-Ear Wireless Noise-Canceling Headphones', price: 130 }],
    ['another kind of product', { name: 'JBL Flip 6 Wireless Noise Cancelling Portable Unit', price: 130 }],
    ['a kind the page rules out (earbuds against headphones)', { name: 'JBL Wireless Noise Cancelling Headphones Earbuds', price: 130 }],
    ['an accessory', { name: 'JBL Wireless Noise Cancelling Headphones Case', price: 130 }],
    ['a refurbished unit', { name: `${JBL} (Refurbished)`, price: 130 }],
    ['a marketplace seller', { name: JBL, price: 130, retailer: 'Marketplace Seller' }],
    ['an unverified store', { name: JBL, price: 130, retailer: 'Unknown Shop' }],
    ['a rating under 4', { name: JBL, price: 130, rating: 3.9 }],
    ['a rating more than half a star below the item', { name: JBL, price: 130, rating: 4.0 }],
    ['fewer than 50 reviews', { name: JBL, price: 130, reviewCount: 49 }],
    ['no rating at all', { name: JBL, price: 130, rating: undefined, reviewCount: undefined }],
    ['less than 25% cheaper', { name: JBL, price: 226 }],
    ['an unbranded name that opens with a description', { name: 'Active Noise Cancelling Headphones Over Ear Wireless Bluetooth 5.4', price: 100 }],
    ['a product that states a different form factor', { name: 'Skullcandy Icon ANC On-Ear Wireless Headphones', price: 130 }],
    ['a product sharing no stated spec', { name: 'JBL Studio Monitor Headphones', price: 130 }],
  ])('rejects %s', (_why, over) => {
    expect(findAlternatives(xm5Anchor(), [listing(over as Partial<Product> & { name: string; price: number })], HEADPHONES)).toEqual([]);
  });

  it('rejects a product far below the item\'s class of price', () => {
    const floor = 300 * MIN_ALTERNATIVE_PRICE_SHARE;
    expect(findAlternatives(xm5Anchor(), [listing({ name: JBL, price: floor - 1 })], HEADPHONES)).toEqual([]);
    expect(findAlternatives(xm5Anchor(), [listing({ name: JBL, price: floor })], HEADPHONES)).toHaveLength(1);
  });

  it('never offers the searched item itself, under any listing name', () => {
    const candidates = [
      listing({ name: XM5, price: 150 }),
      listing({ name: 'WH-1000XM5 Wireless Noise Canceling Over-Ear Headphones Black', price: 150 }),
    ];
    expect(findAlternatives(xm5Anchor(), candidates, { ...HEADPHONES, brand: undefined })).toEqual([]);
  });

  it('does not stand a women\'s item in for a men\'s one', () => {
    const anchor = pickAnchor(
      [
        listing({ name: "Nike Men's Club Fleece Pullover Hoodie", price: 60, retailer: 'Target' }),
        listing({ name: "Nike Men's Club Fleece Pullover Hoodie", price: 60 }),
      ],
      { query: 'nike club fleece hoodie', sellerClass, isPossibleScam: () => false }
    ) as AnchorReference;
    const hoodies: AlternativeOptions = { kind: ['hoodie'], brand: 'nike', sellerClass, isPossibleScam: () => false };
    const candidates = [
      listing({ name: "Old Navy Women's Fleece Pullover Hoodie", price: 30 }),
      listing({ name: "Champion Men's Powerblend Fleece Pullover Hoodie", price: 30 }),
      listing({ name: 'Hanes EcoSmart Fleece Pullover Hoodie', price: 25 }),
    ];
    expect(names(findAlternatives(anchor, candidates, hoodies)).sort()).toEqual([
      "Champion Men's Powerblend Fleece Pullover Hoodie",
      'Hanes EcoSmart Fleece Pullover Hoodie',
    ]);
  });

  it('does not count a shared package size as a shared spec', () => {
    const anchor = pickAnchor(
      [
        listing({ name: 'CeraVe Hydrating Facial Cleanser 16 oz', price: 16, retailer: 'Target' }),
        listing({ name: 'CeraVe Hydrating Facial Cleanser 16 oz', price: 16 }),
      ],
      { query: 'cerave hydrating facial cleanser', sellerClass, isPossibleScam: () => false }
    ) as AnchorReference;
    const cleansers: AlternativeOptions = { kind: ['cleanser'], brand: 'cerave', sellerClass, isPossibleScam: () => false };
    expect(findAlternatives(anchor, [listing({ name: 'Equate Daily Facial Cleanser 16 oz', price: 8 })], cleansers)).toEqual([]);
  });
});

describe('findAlternatives: which twin comes first', () => {
  it('leads with the most-reviewed product among close spec matches, not the longest title', () => {
    const candidates = [
      // Shares 4 specs, 247 reviews.
      listing({ name: 'Anker Q20i Hybrid Noise Cancelling Over-Ear Wireless Headphones Foldable', price: 80, reviewCount: 247 }),
      // Shares 3 specs, 7,600 reviews: within one of the best, so reviews decide.
      listing({ name: 'JLab JBuds Lux Noise Cancelling Over-Ear Wireless Headphones', price: 100, reviewCount: 7600 }),
      // Shares 1 spec: behind both, whatever its reviews.
      listing({ name: 'Skullcandy Crusher Wireless Headphones', price: 150, reviewCount: 90000 }),
    ];
    const anchor = pickAnchor(
      [
        listing({ name: `${XM5} Foldable`, price: 300, reviewCount: 15000 }),
        listing({ name: `${XM5} Foldable`, price: 300, retailer: 'Target', reviewCount: 15000 }),
      ],
      { query: 'sony wh-1000xm5', sellerClass, isPossibleScam: () => false }
    ) as AnchorReference;
    expect(names(findAlternatives(anchor, candidates, HEADPHONES)).map((n) => n.split(' ')[0])).toEqual([
      'JLab',
      'Anker',
      'Skullcandy',
    ]);
  });

  it('shows one listing per product: its cheapest from a verified store', () => {
    const name = 'JBL Tune 770NC Wireless Noise Cancelling Over-Ear Headphones';
    const twins = findAlternatives(
      xm5Anchor(),
      [
        listing({ name, price: 150, retailer: 'Best Buy' }),
        listing({ name, price: 140, retailer: 'Target' }),
        listing({ name, price: 90, retailer: 'Marketplace Seller' }),
      ],
      HEADPHONES
    );
    expect(twins).toHaveLength(1);
    expect(twins[0]).toMatchObject({ price: 140, retailer: 'Target' });
  });
});

describe('spec vocabulary for twins', () => {
  it.each([
    ['Insignia 3.1 Cu. Ft. Mini Fridge with Top Freezer', ['3.1 cu ft', 'Freezer compartment']],
    ['Chefman Air Fryer 5-Quart Nonstick', ['5 qt', 'Nonstick']],
    ['Keurig K Mini Single Serve K-Cup Pod Coffee Maker', ['Single serve', 'K-Cup pods']],
    ['Honeywell PowerPlus HEPA Air Purifier', ['HEPA filter']],
    ['Bissell PowerForce Helix Bagless Upright Vacuum', ['Bagless', 'Upright']],
    ["Champion Men's Powerblend Fleece Pullover Hoodie", ['Fleece', 'Pullover']],
    ["Berne Men's Heavyweight Pocket T-Shirt", ['Heavyweight', 'Pocket']],
    ['Care:Nel Niacinamide Zinc Serum', ['Niacinamide', 'Zinc']],
  ])('%s states %j', (name, labels) => {
    const claims = specsOfNames([name]);
    expect(sharedSpecLabels(claims, claims)).toEqual(labels);
  });

  it('does not read call-noise features as active noise canceling', () => {
    const anc = (name: string) => specsOfNames([name]).has('anc');
    expect(anc('Sony Wireless Noise Canceling Earbuds')).toBe(true);
    expect(anc('JLab Go Pods ANC True Wireless Earbuds')).toBe(true);
    // Live 2026-11-12: this listing put an "Active noise canceling" chip on
    // a pair of earbuds with none.
    expect(anc('Onn Mini Sticks Wireless Bluetooth Earbuds with Environmental Noise Canceling')).toBe(false);
    expect(anc('Wireless Earbuds with ENC Noise Cancelling')).toBe(false);
    expect(anc('Wireless Headset with Noise Cancelling Microphone')).toBe(false);
  });

  it('keeps one form factor per item: the one most listings state', () => {
    const claims = specsOfNames([
      'Sony WH-1000XM6 Wireless Over-Ear Headphones',
      'Sony WH-1000XM6 Over Ear Noise Canceling Headphones',
      'Sony WH-1000XM6 Headphones and In-Ear Monitor Kit',
    ]);
    expect(claims.has('over-ear')).toBe(true);
    expect(claims.has('in-ear')).toBe(false);
  });

  it('sees a conflict only when both items state different forms', () => {
    const overEar = specsOfNames(['Sony Over-Ear Wireless Headphones']);
    const onEar = specsOfNames(['Skullcandy On-Ear Wireless Headphones']);
    const unstated = specsOfNames(['Bose QuietComfort Wireless Headphones']);
    expect(hasConflictingSpecs(overEar, onEar)).toBe(true);
    expect(hasConflictingSpecs(overEar, overEar)).toBe(false);
    expect(hasConflictingSpecs(overEar, unstated)).toBe(false);
  });

  it('settles a capacity the listings disagree on, but leaves package sizes alone', () => {
    const settled = settledSpecsOfNames([
      'Ninja Air Fryer Pro 4-in-1 5 QT',
      'Ninja Air Fryer Pro 5-Quart',
      'Ninja Air Fryer Pro XL 6.5 Qt',
      'CeraVe Cream 16 oz',
      'CeraVe Cream 19 oz',
    ]);
    expect([...settled.keys()].filter((k) => k.startsWith('quart='))).toEqual(['quart=5']);
    expect([...settled.keys()].filter((k) => k.startsWith('oz=')).sort()).toEqual(['oz=16', 'oz=19']);
  });

  it('marks package sizes so callers can tell them from specs', () => {
    const a = specsOfNames(['Supergoop Unseen Sunscreen SPF 40 1.7 oz']);
    const b = specsOfNames(['Neutrogena Invisible Gel Sunscreen SPF 40 1.7 oz']);
    expect(sharedSpecs(a, b).map((s) => [s.label, s.isPackageSize])).toEqual([
      ['1.7 oz', true],
      ['SPF 40', false],
    ]);
  });
});

describe('the catalog\'s twin searches', () => {
  it('names only real pages, and every non-textbook page has one', () => {
    for (const slug of Object.keys(COMPARISON_ALTERNATIVES)) {
      expect(getComparison(slug), slug).toBeDefined();
    }
    for (const entry of COMPARISONS) {
      const search = getAlternativeSearch(entry.slug);
      if (entry.category === 'textbooks') expect(search, entry.slug).toBeUndefined();
      else expect(search, entry.slug).toBeDefined();
    }
  });

  it('never searches by the item\'s own brand, and always states a kind', () => {
    for (const entry of COMPARISONS) {
      const search = getAlternativeSearch(entry.slug);
      if (!search) continue;
      expect(search.query.toLowerCase().split(/\s+/), entry.slug).not.toContain(brandWord(entry));
      expect(search.kind.length, entry.slug).toBeGreaterThan(0);
      for (const word of [...search.kind, ...(search.not ?? [])]) {
        // Matched against normalized name words: lowercase, 3+ letters.
        expect(word, entry.slug).toMatch(/^[a-z0-9]{3,}$/);
      }
    }
  });

  it.each([
    ['sony-wh-1000xm6', 'sony'],
    ['the-ordinary-niacinamide-10-zinc-1', 'ordinary'],
    ['la-roche-posay-toleriane-double-repair', 'roche'],
    ['levis-501-original-fit-jeans', 'levi'],
    ['paulas-choice-2-bha-liquid-exfoliant', 'paula'],
    ['patagonia-better-sweater-jacket', 'patagonia'],
  ])('%s is the brand "%s"', (slug, brand) => {
    expect(brandWord(getComparison(slug)!)).toBe(brand);
  });
});

describe('buildComparison with a twin search', () => {
  const NOW = new Date('2026-11-12T06:00:00Z');
  const search = (results: Product[]): LiveSearchData => ({
    results,
    retailerSearchLinks: [],
    message: '',
    retailersFound: [],
    facets: [],
    checkedAt: NOW.toISOString(),
  });
  // Typical price $329 at verified stores, on sale for $198 at Best Buy.
  const item = search([
    listing({ name: XM5, price: 198, retailer: 'Best Buy', reviewCount: 15000 }),
    listing({ name: XM5, price: 329, retailer: 'Target', reviewCount: 15000 }),
    listing({ name: XM5, price: 329, retailer: 'Walmart', reviewCount: 15000 }),
  ]);
  const alternatives = {
    data: search([
      // 54% under the typical $329, but only 24% under today's $198.
      listing({ name: 'JBL Tune 770NC Wireless Noise Cancelling Over-Ear Headphones', price: 149.95, reviewCount: 5700 }),
      listing({ name: 'JLab JBuds Lux ANC Over-Ear Headphones', price: 99.99, retailer: 'Target', reviewCount: 7600 }),
    ]),
    search: { query: 'wireless noise cancelling over-ear headphones', kind: ['headphones'], not: ['earbuds'] },
    brand: 'sony',
  };

  it('measures a twin against the price on top when that is lower than the typical price', () => {
    const c = buildComparison(item, 'sony wh-1000xm5', NOW, alternatives);
    expect(c.item.referencePrice).toBe(329);
    expect(c.item.top?.price).toBe(198);
    expect(c.twinReferencePrice).toBe(198);
    expect(c.twin).toMatchObject({ name: 'JLab JBuds Lux ANC Over-Ear Headphones', price: 99.99, savingsPercent: 50 });
    expect(c.moreTwins).toEqual([]);
    expect(c.twinSearch).toBe('wireless noise cancelling over-ear headphones');
  });

  it('drops a twin that costs more delivered than the item does', () => {
    // Nordstrom ships free; Walmart charges $6.99 on a small order.
    const earbuds = 'JLab Go Air Pop True Wireless Bluetooth Earbuds';
    const cheapItem = search([
      listing({ name: earbuds, price: 14.99, retailer: 'Nordstrom' }),
      listing({ name: earbuds, price: 14.99, retailer: 'Nordstrom', id: 'second-jlab' }),
    ]);
    const twins = {
      data: search([
        // 34% less on the tag, $16.87 delivered against $14.99.
        listing({ name: 'Onn Mini Sticks Wireless Bluetooth Earbuds', price: 9.88, retailer: 'Walmart' }),
        listing({ name: 'Skullcandy Dime Wireless Bluetooth Earbuds', price: 9.88, retailer: 'Nordstrom' }),
      ]),
      search: { query: 'true wireless bluetooth earbuds', kind: ['earbuds'] },
      brand: 'jlab',
    };
    const c = buildComparison(cheapItem, 'jlab go air pop', NOW, twins);
    expect(c.item.top?.preTaxMinor).toBe(1499);
    expect([c.twin?.name, ...c.moreTwins.map((t) => t.name)]).toEqual(['Skullcandy Dime Wireless Bluetooth Earbuds']);
  });

  it('reports no twin, and still says where it looked, when nothing passes', () => {
    const none = { ...alternatives, data: search([]) };
    const c = buildComparison(item, 'sony wh-1000xm5', NOW, none);
    expect(c.twin).toBeNull();
    expect(c.twinSearch).toBe(alternatives.search.query);
  });

  it('without a twin search, looks only among the item\'s own results as before', () => {
    const c = buildComparison(item, 'sony wh-1000xm5', NOW);
    expect(c.twinSearch).toBeNull();
    expect(c.twin).toBeNull();
  });
});
