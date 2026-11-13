import { describe, expect, it } from 'vitest';
import { buildComparison } from '../comparisonPage';
import { COMPARISONS, getComparison } from '../comparisons';
import {
  contradictsRule,
  exactRule,
  extraItemPhrase,
  isExactListing,
  offerListCandidates,
  offerListIsExact,
  offersAsListings,
  parseDollarRange,
  parseDollars,
  parseOfferList,
  possibleCandidates,
  titleMismatch,
} from '../exactItem';
import { MAX_LOOKUPS, resolveExactItem } from '../exactOffers';
import type { LiveSearchData } from '../searchService';
import type { Product } from '../types';

// Exactly the product, 2026-11-12. The comparison pages showed a different
// model's price as the "lowest real price" on about 10 of 26 electronics
// and appliance pages, because Pick's grouping is forgiving. These tests pin
// the stricter evidence the pages use now: titles judged by each product's
// hand-written rule, and Google's offer list for the product.

let nextId = 0;
function listing(over: Partial<Product> & { name: string; price: number }): Product {
  nextId += 1;
  return {
    id: `exact-${nextId}`,
    image: '',
    retailer: 'Best Buy',
    url: 'https://www.google.com/search?ibp=oshop',
    googleProductId: `pid-${nextId}`,
    rating: 4.6,
    reviewCount: 2000,
    ...over,
  };
}

const NOW = new Date('2026-11-12T20:00:00Z');
const search = (results: Product[]): LiveSearchData => ({
  results,
  retailerSearchLinks: [],
  message: '',
  retailersFound: [],
  facets: [],
  checkedAt: NOW.toISOString(),
});

const entryOf = (slug: string) => {
  const entry = getComparison(slug);
  if (!entry) throw new Error(`no catalog entry ${slug}`);
  return entry;
};
const ruleOf = (slug: string) => {
  const rule = exactRule(entryOf(slug));
  if (!rule) throw new Error(`no rule for ${slug}`);
  return rule;
};

const PIXEL = ruleOf('google-pixel-buds-pro-2');
const BEATS = ruleOf('beats-studio-buds-plus');
const BOSE_EARBUDS = ruleOf('bose-quietcomfort-ultra-earbuds');
const XM5 = ruleOf('sony-wh-1000xm5');

describe('the catalog', () => {
  it('has an exact-item rule for every comparison page', () => {
    for (const entry of COMPARISONS) expect(exactRule(entry), entry.slug).toBeDefined();
  });
});

describe('titleMismatch: is this title the product', () => {
  it('turns away the sibling models the pages used to price', () => {
    expect(titleMismatch('Google Pixel Buds 2a', 'Best Buy', PIXEL)).toMatch(/lacks/);
    expect(titleMismatch('Google Pixel Buds Pro 2', 'Best Buy', PIXEL)).toBeNull();
    expect(titleMismatch('Beats Studio Buds True Wireless Noise Cancelling Earbuds', 'Best Buy', BEATS)).toMatch(/lacks/);
    expect(titleMismatch('Samsung Galaxy Buds3', 'Best Buy', ruleOf('samsung-galaxy-buds3-pro'))).toMatch(/lacks/);
  });

  it('reads the plus in Studio Buds + as part of the name, not as a second product', () => {
    expect(titleMismatch('Beats Studio Buds + True Wireless Noise Cancelling Earbuds', 'Walmart', BEATS)).toBeNull();
    expect(titleMismatch('Beats Studio Buds+ Wireless Earphones Black', 'Target', BEATS)).toBeNull();
  });

  it('turns away a bundle, an add-on and a second product', () => {
    expect(titleMismatch('Bundle - Sony - WH-1000XM5 Noise-Canceling Wireless Over-Ear Headphones - Blue', 'Best Buy', XM5)).toMatch(/bundle/i);
    expect(titleMismatch('Sony WH 1000XM5 Noise Canceling Wireless Over Ear Headphones Black 2 Year Product Protection', "Lowe's", XM5)).toMatch(/comes with/);
    expect(titleMismatch('Sony WH-1000XM5 Noise-Canceling Wireless Over-Ear Headphones + JBL T110 in Ear Headphones', "Lowe's", XM5)).toMatch(/comes with/);
    expect(titleMismatch('Sony WH-1000XM5 Wireless Noise Canceling Headphones', 'Best Buy', XM5)).toBeNull();
  });

  it('wants a pinned generation stated, unless it is known another way', () => {
    const unstated = 'Bose QuietComfort Ultra Earbuds';
    expect(titleMismatch(unstated, 'Bose', BOSE_EARBUDS)).toMatch(/does not state/);
    expect(titleMismatch(unstated, 'Bose', BOSE_EARBUDS, true)).toBeNull();
    expect(titleMismatch('Bose QuietComfort Ultra Earbuds (2nd Gen) - Deep Plum', 'Bose', BOSE_EARBUDS)).toBeNull();
  });
});

describe('extraItemPhrase', () => {
  it.each([
    ['Soundcore by Anker Space One Active Noise Cancelling Headphones with USB C charger Block 20W', true],
    ['Sony Wireless Over-Ear Noise-Canceling Headphones WH-CH720N + Sony XB100 Portable Waterproof Bluetooth Speaker', true],
    ['Sony Wireless Over-Ear Noise-Canceling Headphones WH-CH720N with JBL T110 in Ear Headphones', true],
    ['Bose QuietComfort Ultra Earbuds 2nd Gen True Wireless Noise Canceling Earbuds, White with Accessories', true],
    ['Apple Airpods Pro 3 Wireless Earbuds, Active Noise Cancellation with AppleCare+', true],
    ['Neutrogena Hydro Boost Water Gel Refillable Jar + Refill Pod', true],
    ['Sony WH 1000XM6 Wireless Noise Canceling Headphones Silver MDR ZX110 On Ear Wired Headphones White', true],
    ['Bose - QuietComfort Ultra 2nd Gen Headphones (Midnight Violet) with Audio Adapter', true],
    ['VORNADO 533 7 3SPD Comp Fan, CR1-0116-06 - Min Qty 4', true],
    ['JLab Go Air Pop True Wireless Earbuds, in Ear Headphones, Bluetooth Earphones, Ear Buds with 32H Playtime', false],
    ['Soundcore - by Anker Liberty 4 NC Noise Canceling True Wireless Earbud Headphones', false],
    ['Jlab Go Air Pop Bluetooth Earbuds, True Wireless with Charging Case, Black', false],
    ['Apple AirPods 4 Wireless Earbuds with Active Noise Cancellation', false],
    ['Beats Studio Buds + True Wireless Noise Cancelling Earbuds', false],
    ['Sony WF-1000XM5 The Best Truly Wireless Bluetooth Noise Canceling Earbuds Headphones with Alexa Built-in', false],
  ])('%s', (name, extra) => {
    expect(extraItemPhrase(name) !== null).toBe(extra);
  });
});

describe("Google's offer list", () => {
  const response = {
    product: { title: 'Google Pixel Buds Pro 2' },
    offers: [
      { source: 'Best Buy', title: 'Google - Pixel Buds Pro 2 - Wireless Earbuds with Active Noise Cancellation', link: 'https://www.bestbuy.com/site/p/1', price: '$209.99', originalPrice: '$229', details: ['In stock online', 'Free delivery by Mon'] },
      { source: 'Target', title: 'Google Pixel Buds Pro 2 True Wireless Bluetooth Headphones - Porcelain', link: 'https://www.target.com/p/2', price: '$229.99', details: ['In stock online'] },
      { source: 'eBay', title: 'Google Pixel Buds Pro 2 Hazel', link: 'https://www.ebay.com/itm/3', price: '$120.00', details: ['Pre-owned', 'Free delivery'] },
      { source: 'Some Shop', title: 'Google Pixel Buds Pro 2 Bundle with Case', link: 'https://shop.example/4', price: '$199.00', details: [] },
      { source: 'No Link', title: 'Google Pixel Buds Pro 2', link: 'javascript:void(0)', price: '$1.00' },
      { source: 'No Price', title: 'Google Pixel Buds Pro 2', link: 'https://x.example/5', price: 'Call for price' },
    ],
  };

  it('parses stores, prices and crossed-out prices, and skips what it cannot read', () => {
    const list = parseOfferList(response);
    expect(list?.title).toBe('Google Pixel Buds Pro 2');
    expect(list?.offers.map((o) => o.store)).toEqual(['Best Buy', 'Target', 'eBay', 'Some Shop']);
    expect(list?.offers[0]).toMatchObject({ price: 209.99, originalPrice: 229 });
    expect(list?.offers[1].originalPrice).toBeNull();
    expect(parseOfferList({ message: 'Product not found.', statusCode: 404 })).toBeNull();
    expect(parseOfferList(null)).toBeNull();
  });

  it("reads Google's typical price range", () => {
    expect(parseDollarRange('$88\u2013$180')).toEqual([88, 180]);
    expect(parseDollarRange('$1,199-$1,299.99')).toEqual([1199, 1299.99]);
    expect(parseDollarRange('$180\u2013$88')).toBeNull();
    expect(parseDollarRange('about $90')).toBeNull();
    expect(parseOfferList({ product: { title: 'X', typicalPriceRange: '$90\u2013$130' }, offers: [] })?.typicalRange).toEqual([90, 130]);
  });

  it('reads dollar prices and nothing else', () => {
    expect(parseDollars('$1,299.99')).toBe(1299.99);
    expect(parseDollars('$229')).toBe(229);
    expect(parseDollars('€229')).toBeNull();
    expect(parseDollars('$19.99/mo')).toBeNull();
    expect(parseDollars(undefined)).toBeNull();
  });

  it('keeps new single units and drops pre-owned offers and bundles', () => {
    const list = parseOfferList(response)!;
    expect(offerListIsExact(list, PIXEL)).toBe(true);
    const offers = offersAsListings(list, PIXEL);
    expect(offers.map((o) => `${o.retailer} ${o.price}`)).toEqual(['Best Buy 209.99', 'Target 229.99']);
    expect(offers[0]).toMatchObject({ url: 'https://www.bestbuy.com/site/p/1', originalPrice: 229, currency: 'USD' });
  });

  it('refuses a list that is another product', () => {
    const other = parseOfferList({
      product: { title: 'Google Pixel Buds 2a' },
      offers: [{ source: 'Best Buy', title: 'Google Pixel Buds 2a', link: 'https://www.bestbuy.com/site/p/9', price: '$129' }],
    })!;
    expect(offerListIsExact(other, PIXEL)).toBe(false);
  });

  it('refuses a list where nothing states the pinned generation, and accepts one where a store does', () => {
    const vague = parseOfferList({
      product: { title: 'Bose QuietComfort Ultra Earbuds' },
      offers: [{ source: 'Bose', title: 'Bose QuietComfort Ultra Earbuds', link: 'https://www.bose.com/p/1', price: '$199' }],
    })!;
    expect(offerListIsExact(vague, BOSE_EARBUDS)).toBe(false);
    const stated = parseOfferList({
      product: { title: 'Bose QuietComfort Ultra Earbuds' },
      offers: [
        { source: 'Target', title: 'Bose QuietComfort Ultra Earbuds 2nd Gen - Lunar Blue', link: 'https://www.target.com/p/1', price: '$299.99' },
        { source: "Macy's", title: 'Bose QuietComfort Ultra Wireless Noise Cancelling Earbuds - Dark blue', link: 'https://www.macys.com/p/2', price: '$279' },
      ],
    })!;
    expect(offerListIsExact(stated, BOSE_EARBUDS)).toBe(true);
    // A store title that omits the generation stays: Google filed it under the product.
    expect(offersAsListings(stated, BOSE_EARBUDS).map((o) => o.retailer)).toEqual(['Target', "Macy's"]);
  });

  it('in a loosely titled list, keeps only stores whose own titles name the product', () => {
    const CH720N = ruleOf('sony-wh-ch720n');
    const loose = parseOfferList({
      product: { title: 'Sony Wireless Noise-Canceling Headphones' },
      offers: [
        { source: 'Best Buy', title: 'Sony - WHCH720N Wireless Noise Cancelling Headphones - Black', link: 'https://www.bestbuy.com/p/1', price: '$88.00', originalPrice: '$178' },
        { source: 'Office Depot', title: 'Sony WH-CH720N Wireless Noise Cancelling Headphones, WHCH720NB', link: 'https://www.officedepot.com/p/2', price: '$179.99' },
        { source: 'Target', title: 'Sony Wireless Headphones', link: 'https://www.target.com/p/3', price: '$60.00' },
      ],
    })!;
    expect(offerListIsExact(loose, CH720N)).toBe(false);
    expect(offersAsListings(loose, CH720N).map((o) => `${o.retailer} ${o.price}`)).toEqual(['Best Buy 88', 'Office Depot 179.99']);
  });

  it('contradiction is narrower than mismatch', () => {
    expect(contradictsRule('Sony Wireless Noise-Canceling Headphones', XM5)).toBe(false);
    expect(contradictsRule('Sony WH-1000XM5 Headphones Bundle', XM5)).toBe(true);
  });
});

describe('which rows to ask Google about', () => {
  it('asks about rows that name the product, the cheapest verified new unit first', () => {
    const rows = [
      listing({ name: 'Google Pixel Buds 2a', price: 129 }),
      listing({ name: 'Google Pixel Buds Pro 2 - Hazel', price: 150, retailer: 'Swappa' }),
      listing({ name: 'Google Pixel Buds Pro 2 Porcelain', price: 229, retailer: 'Some Shop' }),
      listing({ name: 'Google Pixel Buds Pro 2', price: 229.99, retailer: 'Target' }),
      listing({ name: 'Google Pixel Buds Pro 2', price: 209.99 }),
      listing({ name: 'Refurbished Google Pixel Buds Pro 2', price: 120, retailer: 'Target' }),
      listing({ name: 'Google Pixel Buds Pro 2', price: 199, googleProductId: undefined, retailer: 'Walmart' }),
    ];
    // Not the 2a, not the resale store, not the refurbished unit, not the row without an id.
    expect(offerListCandidates(rows, PIXEL).map((p) => `${p.retailer} ${p.price}`)).toEqual([
      'Best Buy 209.99',
      'Target 229.99',
      'Some Shop 229',
    ]);
  });

  it('lets a row that omits the pinned generation lead to a list that may state it', () => {
    const rows = [listing({ name: 'Bose QuietComfort Ultra Earbuds', price: 199, retailer: 'Best Buy' })];
    expect(offerListCandidates(rows, BOSE_EARBUDS)).toHaveLength(1);
  });

  it('offers vaguely titled verified rows as possibles, never contradicting ones', () => {
    const CH720N = ruleOf('sony-wh-ch720n');
    const rows = [
      listing({ name: 'Sony Wireless Noise-Canceling Headphones', price: 88 }),
      listing({ name: 'Sony Wireless Noise-Canceling Headphones Bundle', price: 70 }),
      listing({ name: 'Sony Wireless Noise-Canceling Headphones', price: 60, retailer: 'Some Shop' }),
      listing({ name: 'Sony WH-CH720N Wireless Noise Canceling Over-Ear Headphones', price: 183.34, retailer: 'Target' }),
    ];
    expect(possibleCandidates(rows, CH720N, () => true).map((p) => `${p.retailer} ${p.price}`)).toEqual(['Best Buy 88']);
    expect(possibleCandidates(rows, CH720N, () => false)).toEqual([]);
  });
});

describe('resolveExactItem', () => {
  const entry = entryOf('google-pixel-buds-pro-2');
  const data = search([
    listing({ name: 'Google Pixel Buds 2a', price: 129, googleProductId: 'pid-2a' }),
    listing({ name: 'Google Pixel Buds Pro 2', price: 209.99, googleProductId: 'pid-pro2' }),
    listing({ name: 'Google Pixel Buds Pro 2 - Hazel', price: 150, retailer: 'Swappa', googleProductId: 'pid-swappa' }),
  ]);
  const pro2List = {
    product: { title: 'Google Pixel Buds Pro 2', typicalPriceRange: '$190\u2013$230' },
    offers: [
      { source: 'Best Buy', title: 'Google - Pixel Buds Pro 2 - Wireless Earbuds', link: 'https://www.bestbuy.com/site/p/1', price: '$209.99', originalPrice: '$229' },
      { source: 'Target', title: 'Google Pixel Buds Pro 2 True Wireless', link: 'https://www.target.com/p/2', price: '$229.99' },
    ],
  };
  const list2a = {
    product: { title: 'Google Pixel Buds 2a' },
    offers: [{ source: 'Best Buy', title: 'Google - Pixel Buds 2a', link: 'https://www.bestbuy.com/site/p/9', price: '$129' }],
  };

  it('asks first about the row that names the product, and takes its stores, titles and typical range', async () => {
    const asked: string[] = [];
    const exact = await resolveExactItem(entry, data, async (pid) => {
      asked.push(pid);
      return pid === 'pid-pro2' ? pro2List : pid === 'pid-2a' ? list2a : null;
    });
    expect(asked[0]).toBe('pid-pro2');
    expect(asked).not.toContain('pid-swappa');
    expect(asked.length).toBeLessThanOrEqual(MAX_LOOKUPS);
    expect(exact?.listTitle).toBe('Google Pixel Buds Pro 2');
    expect(exact?.typicalRange).toEqual([190, 230]);
    // The 2a's own list, if it was asked about at all, contributes nothing.
    expect(exact?.offers.map((o) => `${o.retailer} ${o.price}`)).toEqual(['Best Buy 209.99', 'Target 229.99']);
  });

  it('confirms nothing when every lookup fails', async () => {
    const exact = await resolveExactItem(entry, data, async () => null);
    expect(exact?.lookups).toBeLessThanOrEqual(MAX_LOOKUPS);
    expect(exact?.offers).toEqual([]);
    expect(exact?.listTitle).toBeNull();
    // The row still counts on its own title: no list said otherwise.
    expect(data.results.filter((p) => exact!.isExactListing(p)).map((p) => p.googleProductId)).toEqual(['pid-pro2', 'pid-swappa']);
  });

  it('replaces a search row with what its list says the store is selling', async () => {
    // 2026-11-12: Target's row read as the product; the list said "Renewed".
    const spaceOne = entryOf('soundcore-space-one');
    const rows = search([
      listing({ name: 'Anker Soundcore Space One Headphones Noise Cancelling', price: 54.99, retailer: 'Target', googleProductId: 'pid-target' }),
    ]);
    const exact = await resolveExactItem(spaceOne, rows, async () => ({
      product: { title: 'Anker Soundcore Space One Headphones Noise Cancelling' },
      offers: [
        { source: 'Target', title: 'Renewed Soundcore Space One Black, Active Noise Cancelling Headphones', link: 'https://www.target.com/p/renewed-soundcore', price: '$54.99' },
      ],
    }));
    expect(rows.results.filter((p) => exact!.isExactListing(p))).toEqual([]);
    expect(exact?.offers.map((o) => o.name)).toEqual(['Renewed Soundcore Space One Black, Active Noise Cancelling Headphones']);
    const page = buildComparison(rows, 'soundcore space one', NOW, undefined, exact);
    expect(page.item.top).toBeNull();
    expect(page.item.rows.map((r) => r.conditionLabel)).toEqual(['Refurbished']);
  });

  it('does not let an unconfirmed search row undercut a confirmed store', async () => {
    // 2026-11-12: Best Buy's row said $104.99; no list had Best Buy, and verified stores started at $161.99.
    const airpods = entryOf('airpods-4-anc');
    const NAME = 'Apple AirPods 4 with Active Noise Cancellation';
    const rows = search([
      listing({ name: NAME, price: 179.99, retailer: 'Target', googleProductId: 'pid-target' }),
      listing({ name: NAME, price: 104.99, retailer: 'Best Buy', googleProductId: 'pid-bestbuy' }),
      listing({ name: NAME, price: 120, retailer: 'Walmart', googleProductId: 'pid-walmart' }),
      listing({ name: NAME, price: 199, retailer: "Macy's", googleProductId: 'pid-macys' }),
    ]);
    const list = {
      product: { title: NAME },
      offers: [
        { source: 'Staples', title: 'Apple AirPods 4 with Active Noise Cancellation, USB-C', link: 'https://www.staples.com/p/1', price: '$161.99' },
        { source: 'Target', title: 'Apple AirPods 4 Wireless Earbuds with Active Noise Cancellation', link: 'https://www.target.com/p/2', price: '$179.99' },
      ],
    };
    const asked: string[] = [];
    const exact = await resolveExactItem(airpods, rows, async (pid) => {
      asked.push(pid);
      return pid === 'pid-bestbuy' ? list : null;
    });
    // Cheapest verified row first; then the next row that would undercut the confirmed $161.99.
    expect(asked.slice(0, 2)).toEqual(['pid-bestbuy', 'pid-walmart']);
    const counted = rows.results.filter((p) => exact!.isExactListing(p)).map((p) => p.retailer);
    expect(counted).toEqual(["Macy's"]);
    const page = buildComparison(rows, 'airpods 4 with active noise cancellation', NOW, undefined, exact);
    expect(page.item.top).toMatchObject({ store: 'Staples', price: 161.99 });
  });
});

describe('buildComparison with exact-item evidence', () => {
  const rule = PIXEL;
  // What the page showed on 2026-11-12: the 2a on top of the Pro 2 page.
  const data = search([
    listing({ name: 'Google Pixel Buds 2a', price: 129, retailer: 'Best Buy', reviewCount: 900 }),
    listing({ name: 'Google Pixel Buds Pro 2', price: 209.99, retailer: 'Best Buy', reviewCount: 4000 }),
    listing({ name: 'Google Pixel Buds Pro 2 - Hazel', price: 150, retailer: 'Swappa', reviewCount: 4000 }),
    listing({ name: 'Google Pixel Buds 2a Iris', price: 127.99, retailer: 'Dressinn.com', reviewCount: 900 }),
  ]);
  const offers: Product[] = [
    { id: 'offer:0', name: 'Google - Pixel Buds Pro 2 - Wireless Earbuds', price: 209.99, originalPrice: 229, image: '', retailer: 'Best Buy', url: 'https://www.bestbuy.com/site/p/1', currency: 'USD', sourceMarket: 'US' },
    { id: 'offer:1', name: 'Google Pixel Buds Pro 2 True Wireless', price: 229.99, image: '', retailer: 'Target', url: 'https://www.target.com/p/2', currency: 'USD', sourceMarket: 'US' },
    { id: 'offer:2', name: 'Pixel Buds Pro 2 Porcelain', price: 229, image: '', retailer: 'Walmart', url: 'https://www.walmart.com/ip/3', currency: 'USD', sourceMarket: 'US' },
  ];
  const exact = { isExactListing: (p: Product) => isExactListing(p, rule), offers, listTitle: 'Google Pixel Buds Pro 2' };

  it('prices the product and not the model filed next to it', () => {
    const c = buildComparison(data, 'google pixel buds pro 2', NOW, undefined, exact);
    expect(c.item.top).toMatchObject({ store: 'Best Buy', price: 209.99, originalPrice: 229 });
    expect(c.item.topIsVerifiedNew).toBe(true);
    expect(c.item.rows.map((r) => r.name).join(' | ')).not.toMatch(/2a/);
    // The store's own page, not a Google search link.
    expect(c.item.top?.url).toBe('https://www.bestbuy.com/site/p/1');
    expect(c.item.anchorName).toBe('Google Pixel Buds Pro 2');
  });

  it('gives a typical price only with three verified stores', () => {
    const three = buildComparison(data, 'google pixel buds pro 2', NOW, undefined, exact);
    expect(three.item.referencePrice).toBe(229);
    expect(three.item.priceBasis).toBe('verified');
    const two = buildComparison(data, 'google pixel buds pro 2', NOW, undefined, { ...exact, offers: offers.slice(0, 2) });
    expect(two.item.referencePrice).toBeNull();
    expect(two.item.priceBasis).toBeNull();
  });

  it('shows one row per store and condition', () => {
    const c = buildComparison(data, 'google pixel buds pro 2', NOW, undefined, exact);
    const stores = c.item.rows.map((r) => r.store);
    expect(stores.filter((s) => s === 'Best Buy')).toHaveLength(1);
    expect(stores).toContain('Swappa');
  });

  it('leaves out a listing priced far above what verified stores charge', () => {
    // 2026-11-13: moo.com at $1,566.96 sat in the Stanley Quencher table under $27 stores.
    const withAbsurd = search([
      ...data.results,
      listing({ name: 'Google Pixel Buds Pro 2 - Porcelain', price: 4800, retailer: 'moo.com' }),
      listing({ name: 'Google Pixel Buds Pro 2 Peony', price: 260, retailer: 'Some Gadget Shop' }),
    ]);
    const before = buildComparison(data, 'google pixel buds pro 2', NOW, undefined, exact);
    const c = buildComparison(withAbsurd, 'google pixel buds pro 2', NOW, undefined, exact);
    const stores = c.item.rows.map((r) => r.store);
    expect(stores).not.toContain('moo.com');
    // Dearer than the verified stores but in the range of the product: stays.
    expect(stores).toContain('Some Gadget Shop');
    expect(c.item.leftOut).toBe(before.item.leftOut + 1);
    expect(c.item.top).toMatchObject({ store: 'Best Buy', price: 209.99 });
  });

  it('shows no price when nothing is confirmed, instead of falling back to the grouping', () => {
    const none = search([listing({ name: 'Google Pixel Buds 2a', price: 129 })]);
    const c = buildComparison(none, 'google pixel buds pro 2', NOW, undefined, { ...exact, offers: [], listTitle: null });
    expect(c.item.top).toBeNull();
    expect(c.item.rows).toEqual([]);
    expect(c.twin).toBeNull();
  });

  it('puts nothing on top without a verified new unit, and still lists what it found', () => {
    const resaleOnly = search([listing({ name: 'Google Pixel Buds Pro 2 - Hazel', price: 150, retailer: 'Swappa' })]);
    const c = buildComparison(resaleOnly, 'google pixel buds pro 2', NOW, undefined, { ...exact, offers: [], listTitle: null });
    expect(c.item.top).toBeNull();
    expect(c.item.rows.map((r) => r.store)).toEqual(['Swappa']);
    expect(c.twinReferencePrice).toBeNull();
  });

  it("passes Google's typical range through", () => {
    const c = buildComparison(data, 'google pixel buds pro 2', NOW, undefined, { ...exact, typicalRange: [190, 230] });
    expect(c.item.googleTypicalRange).toEqual([190, 230]);
    expect(buildComparison(data, 'google pixel buds pro 2', NOW).item.googleTypicalRange).toBeNull();
  });

  it('leaves pages without evidence on the grouping, as before', () => {
    const c = buildComparison(data, 'google pixel buds pro 2', NOW);
    expect(c.item.top?.price).toBe(129);
  });
});
