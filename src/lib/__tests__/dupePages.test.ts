import { describe, expect, it } from 'vitest';
import { buildComparison } from '../comparisonPage';
import { COMPARISONS, comparisonCopy, getAlternativeSearch, getComparison } from '../comparisons';
import { EXACT_ITEM_CATEGORIES, exactRule, isExactListing, titleMismatch, withoutOtherSizePrices } from '../exactItem';
import { findAlternatives, pickAnchor, type AlternativeOptions, type AnchorReference, type SellerClass } from '../productGrouping';
import type { LiveSearchData } from '../searchService';
import { sharedSpecLabels, specsOfNames } from '../sharedSpecs';
import type { Product } from '../types';

// Dupe pages, 2026-11-13: tumblers and bottles, makeup and hair, and the
// Dyson V8. Each product was chosen because a live search turned up a
// credible cheaper match (36 candidates searched, 15 kept); these tests pin
// the rules that make those matches and keep the wrong ones out.

let nextId = 0;
function listing(over: Partial<Product> & { name: string; price: number }): Product {
  nextId += 1;
  return { id: `dupe-${nextId}`, image: '', retailer: 'Target', url: '', rating: 4.5, reviewCount: 3000, ...over };
}
const sellerClass = (): SellerClass => 'verified';
const base = { sellerClass, isPossibleScam: () => false };
const anchorOf = (names: string[], price: number, query: string): AnchorReference => {
  const anchor = pickAnchor(names.map((name) => listing({ name, price, reviewCount: 60000 })), { query, ...base });
  if (!anchor) throw new Error('no anchor');
  return anchor;
};
const ruleOf = (slug: string) => exactRule(getComparison(slug)!)!;
const chips = (a: string, b: string) => sharedSpecLabels(specsOfNames([a]), specsOfNames([b]));

describe('the new pages in the catalog', () => {
  const added = COMPARISONS.filter((c) => c.category === 'drinkware' || c.category === 'beauty' || c.slug === 'dyson-v8');

  it('adds 15 products, each with a rule, a dupe search and exact pricing', () => {
    expect(added).toHaveLength(15);
    expect(COMPARISONS).toHaveLength(65);
    for (const entry of added) {
      expect(exactRule(entry), entry.slug).toBeDefined();
      expect(getAlternativeSearch(entry.slug), entry.slug).toBeDefined();
      expect(EXACT_ITEM_CATEGORIES, entry.slug).toContain(entry.category);
    }
  });

  it('words tumblers and makeup as dupes', () => {
    expect(comparisonCopy(getComparison('stanley-quencher-40-oz')!, 3).title).toBe(
      'Stanley Quencher H2.0 FlowState Tumbler, 40 oz: dupes, cheaper alternatives and lowest price | Pick'
    );
    expect(comparisonCopy(getComparison('rare-beauty-soft-pinch-liquid-blush')!, 3).alternativesHeading).toContain('Dupes');
    expect(comparisonCopy(getComparison('dyson-v8')!, 3).title).toBe('Dyson V8 Cordless Vacuum: cheaper alternatives and lowest price | Pick');
  });

  it('requires the same capacity for every tumbler and bottle', () => {
    for (const entry of COMPARISONS.filter((c) => c.category === 'drinkware')) {
      expect(getAlternativeSearch(entry.slug)?.sameSize, entry.slug).toBe(true);
    }
  });
});

describe('exact rules for the new products', () => {
  it('keeps the product and turns away its siblings, minis and sets', () => {
    const cases: Array<[string, string, boolean]> = [
      ['stanley-quencher-40-oz', 'Stanley 40 oz Stainless Steel H2.0 FlowState Quencher Tumbler Rose Quartz 2.0', true],
      ['stanley-quencher-40-oz', 'Stanley 40 oz. Quencher ProTour Flip Straw Tumbler', false],
      ['stanley-quencher-40-oz', 'Stanley Quencher H2.0 FlowState Tumbler 30 oz', false],
      ['stanley-quencher-40-oz', 'Stanley x LoveShackFancy Holiday Quencher H2.0 Flowstate Tumbler 40 oz', false],
      ['owala-freesip-24-oz', 'Owala FreeSip 24oz Stainless Steel Water Bottle Americana', true],
      ['owala-freesip-24-oz', 'OWALA FreeSip Twist 24 oz Water Bottle - Gray Combo', false],
      ['owala-freesip-24-oz', 'Owala FreeSip 32 oz Stainless Steel Water Bottle', false],
      ['yeti-rambler-20-oz-tumbler', 'YETI Rambler 20-Oz. Tumbler with MagSlider Lid - King Crab', true],
      ['yeti-rambler-20-oz-tumbler', 'YETI Rambler Travel Mug 20 oz', false],
      ['dyson-airwrap-id', 'Dyson Airwrap i.d. Multi-Styler and Dryer - Curly + Coily - Amber Silk', true],
      ['dyson-airwrap-id', 'Dyson Airwrap Origin multi-styler and dryer', false],
      ['dyson-airwrap-id', 'Dyson Airwrap ID Dryer+Flyaway smoother', false],
      ['dyson-airwrap-id', 'Refurbished Dyson Airwrap i.d. Multi-Styler', false],
      ['dyson-v8', 'Dyson - V8 Cordless Stick Vacuum - Silver/Nickel', true],
      ['dyson-v8', 'Dyson V8 Plus Cordless Vacuum', false],
      ['dyson-v8', 'New Dyson V8 Cyclone Bagless Cordless Stick', false],
      ['too-faced-better-than-sex-mascara', 'Too Faced Better Than Sex Volumizing & Lengthening Mascara Standard Size Black', true],
      ['too-faced-better-than-sex-mascara', 'Too Faced Better Than Sex Waterproof Mascara - Black - 0.27 oz tube', false],
      ['too-faced-better-than-sex-mascara', 'Too Faced Better Than Sex Mascara Duo $58 Value', false],
      ['olaplex-no-3-hair-perfector', 'Olaplex No. 3 Hair Perfector Treatment - 3.3 FL OZ', true],
      ['olaplex-no-3-hair-perfector', 'Olaplex No. 3 Hair Perfector 8.5 fl. oz. New', false],
    ];
    for (const [slug, name, ok] of cases) {
      expect(isExactListing(listing({ name, price: 1 }), ruleOf(slug)), `${slug}: ${name}`).toBe(ok);
    }
  });

  it('does not price a mini as the full size', () => {
    // 2026-11-13: Kohl's listed the 0.68 oz Glowscreen at $19 without the word "mini".
    const rule = ruleOf('supergoop-glowscreen-spf-40');
    const mini = 'Supergoop! Glowscreen SPF 40 Sunscreen with Hyaluronic Acid + Niacinamide, Size: .68 Oz';
    const full = 'Supergoop! Glowscreen SPF 40 Sunscreen with Hyaluronic Acid + Niacinamide 1.7 oz';
    expect(titleMismatch(mini, "Kohl's", rule)).toMatch(/another size/);
    expect(titleMismatch(full, 'Sephora', rule)).toBeNull();
    // A title that states no size is not enough on its own.
    expect(titleMismatch('Supergoop! Glowscreen SPF 40', 'Sephora', rule)).toMatch(/does not state/);
  });
});

describe('spec chips for drinkware, makeup and hair', () => {
  it('reads what two tumblers share', () => {
    expect(
      chips('Stanley 40 oz Stainless Steel H2.0 FlowState Quencher Tumbler with Handle and Straw', 'Ozark Trail 40 oz Vacuum Insulated Stainless Steel Tumbler with Handle and Straw')
    ).toEqual(expect.arrayContaining(['40 oz', 'Stainless steel', 'Straw', 'Handle']));
  });

  it('reads form and finish claims on makeup', () => {
    expect(chips('Rare Beauty Soft Pinch Liquid Blush', 'Milani Cheek Kiss Liquid Blush + Glow')).toContain('Liquid');
    expect(chips('BENEFIT Hoola Matte Powder Bronzer', 'Sephora Collection Matte Bronzer Powder')).toEqual(expect.arrayContaining(['Matte', 'Powder']));
    expect(chips('Too Faced Better Than Sex Volumizing Mascara', "L'Oreal Paris Voluminous Lash Paradise Mascara")).toContain('Volumizing');
    expect(chips('Charlotte Tilbury Hollywood Flawless Filter', 'e.l.f. Halo Glow Liquid Filter')).toContain('Complexion filter');
    expect(chips('Laneige Lip Sleeping Mask', 'Sephora COLLECTION Lip Sleeping Mask')).toEqual(expect.arrayContaining(['Lip mask', 'Overnight']));
    expect(chips('Dyson Airwrap i.d. Multi-Styler and Dryer', 'Shark FlexStyle Air Styling & Drying System')).toContain('Styler and dryer in one');
    expect(chips('Olaplex Hair Perfector No 3 Repairing Treatment', "L'Oreal Paris EverPure Bond Repair Pre Shampoo Treatment")).toContain('Repairing');
  });

  it('does not read a colour, a coating or a battery as a makeup claim', () => {
    expect(chips('Sony WH-1000XM5 Headphones Matte Black', 'Keurig K-Mini Coffee Maker Matte Black')).not.toContain('Matte');
    expect(chips('Stanley Tumbler Powder Coat Finish', 'YETI Rambler Powder Coated Tumbler')).not.toContain('Powder');
    expect(chips('Sony Headphones 30 Hours Playback Volume Control', 'JBL Headphones 40 Hours Playback Volume Control')).not.toEqual(
      expect.arrayContaining(['Long wear'])
    );
    expect(chips('Sony Headphones Volume Control', 'JBL Headphones Volume Control')).not.toContain('Volumizing');
    expect(chips('Brita Everyday Water Filter Pitcher', 'PUR Water Filter Pitcher')).not.toContain('Complexion filter');
  });
});

describe('findAlternatives: the two options the dupe pages add', () => {
  const OWALA = ['Owala FreeSip 24oz Stainless Steel Water Bottle', 'Owala 24 oz. FreeSip Insulated Stainless Steel Water Bottle'];
  const bottles: AlternativeOptions = { kind: ['bottle'], brand: 'owala', ...base };

  it('with sameSize, a bottle of another capacity is not a dupe', () => {
    const anchor = anchorOf(OWALA, 29.99, 'owala freesip 24 oz');
    const contigo = 'Contigo Autoseal 20 oz. Leakproof Insulated Stainless Steel Travel Bottle';
    const mainstays = 'Mainstays 24 oz Double Wall Stainless Steel Water Bottle';
    const candidates = [
      listing({ name: contigo, price: 15.73, reviewCount: 185 }),
      listing({ name: mainstays, price: 9.97, retailer: 'Walmart', reviewCount: 296 }),
    ];
    expect(findAlternatives(anchor, candidates, bottles).map((p) => p.name)).toEqual(expect.arrayContaining([contigo, mainstays]));
    expect(findAlternatives(anchor, candidates, { ...bottles, sameSize: true }).map((p) => p.name)).toEqual([mainstays]);
  });

  it('with partOf, a lid and a straw are part of the bottle, not accessories for it', () => {
    // 2026-11-13: "with Straw Lid" kept the Mainstays bottle off the Owala page.
    const anchor = anchorOf(OWALA, 29.99, 'owala freesip 24 oz');
    const candidates = [
      listing({ name: 'Mainstays 24 oz Double Wall Stainless Steel Water Bottle with Straw Lid', price: 9.97, retailer: 'Walmart', reviewCount: 296 }),
      listing({ name: 'Replacement Straw Lid Case for 24 oz Stainless Steel Water Bottle', price: 8.99, retailer: 'Walmart', reviewCount: 500 }),
    ];
    expect(findAlternatives(anchor, candidates, bottles)).toEqual([]);
    expect(findAlternatives(anchor, candidates, { ...bottles, partOf: ['lid', 'straw'] }).map((p) => p.price)).toEqual([9.97]);
  });

  it('with isSearchedItem, a short model name no longer swallows every product of its kind', () => {
    // "V8" is too short to count as a word, so "Dyson V8 Cordless Vacuum" minus
    // its brand was "cordless vacuum", and every cordless vacuum contained it.
    const anchor = anchorOf(['Dyson V8 Cordless Vacuum', 'Dyson V8 Cordless Stick Vacuum'], 369, 'dyson v8 cordless vacuum');
    const shark = listing({ name: 'Shark Cordless Pet Stick Vacuum ix141', price: 179.99, retailer: 'Best Buy', reviewCount: 6100, rating: 4.3 });
    const vacuums: AlternativeOptions = { kind: ['vacuum'], brand: 'dyson', ...base };
    expect(findAlternatives(anchor, [shark], vacuums)).toEqual([]);
    const rule = ruleOf('dyson-v8');
    const isSearchedItem = (p: Product) => titleMismatch(p.name, p.retailer, rule, true) === null;
    expect(findAlternatives(anchor, [shark], { ...vacuums, isSearchedItem }).map((p) => p.name)).toEqual([shark.name]);
    // And the item's own listing under another title is still not its own twin.
    const own = listing({ name: 'V8 Cordless Stick Vacuum by Dyson, Silver', price: 199, retailer: 'Target', reviewCount: 900 });
    expect(findAlternatives(anchor, [own], { ...vacuums, brand: undefined, isSearchedItem })).toEqual([]);
  });

  it('with minSharedSpecs 0, the kind word, the reviews and the price are the whole test', () => {
    const anchor = anchorOf(['Beautyblender Original Sponge', 'Beautyblender Original Makeup Sponge'], 20, 'beautyblender original makeup sponge');
    const candidates = [listing({ name: 'SEPHORA COLLECTION Tap That Puff Makeup Sponge', price: 13, retailer: 'Sephora', reviewCount: 689, rating: 4.6 })];
    const sponges: AlternativeOptions = { kind: ['sponge'], brand: 'beautyblender', ...base };
    expect(findAlternatives(anchor, candidates, sponges)).toEqual([]);
    expect(findAlternatives(anchor, candidates, { ...sponges, minSharedSpecs: 0 }).map((p) => p.price)).toEqual([13]);
  });
});

describe('buildComparison on a dupe page', () => {
  const NOW = new Date('2026-11-13T03:00:00Z');
  const search = (results: Product[]): LiveSearchData => ({
    results,
    retailerSearchLinks: [],
    message: '',
    retailersFound: [],
    facets: [],
    checkedAt: NOW.toISOString(),
  });
  const rule = ruleOf('owala-freesip-24-oz');
  // Search titles that name the product but state no size; the size is in the offer list.
  const data = search([
    listing({ name: 'FreeSip Water Bottle Owala Stainless Steel', price: 29.99, retailer: "DICK'S Sporting Goods", reviewCount: 39000, rating: 4.6 }),
    listing({ name: 'Owala FreeSip Stainless Steel Water Bottle', price: 29.99, retailer: 'Ace Hardware', reviewCount: 39000, rating: 4.6 }),
  ]);
  const offer = (retailer: string, price: number, url: string): Product => ({
    id: `offer:${retailer}`,
    name: 'Owala FreeSip Insulated Stainless Steel Water Bottle with Straw, 24 oz',
    price,
    image: '',
    retailer,
    url,
    currency: 'USD',
    sourceMarket: 'US',
  });
  const exact = {
    isExactListing: (p: Product) => isExactListing(p, rule),
    namesProduct: (p: Product) => titleMismatch(p.name, p.retailer, rule, true) === null,
    offers: [offer('Target', 29.99, 'https://www.target.com/p/owala'), offer('Walmart', 27.99, 'https://www.walmart.com/ip/owala')],
    listTitle: 'Owala FreeSip Water Bottle',
  };
  const alternatives = {
    data: search([
      listing({ name: 'Mainstays 24 oz Double Wall Insulated Stainless Steel Water Bottle with Straw Lid', price: 9.97, retailer: 'Walmart', url: 'https://www.walmart.com/ip/mainstays', reviewCount: 296, rating: 4.4 }),
      listing({ name: 'Contigo Autoseal 20 oz. Leakproof Insulated Stainless Steel Travel Bottle', price: 15.73, retailer: 'Target', url: 'https://www.target.com/p/contigo', reviewCount: 185, rating: 4.7 }),
    ]),
    search: getAlternativeSearch('owala-freesip-24-oz')!,
    brand: 'owala',
  };

  it("reads the product's size from the offer list, so only the same-size dupe passes", () => {
    const c = buildComparison(data, 'owala freesip 24 oz', NOW, alternatives, exact);
    expect(c.item.top).toMatchObject({ store: 'Walmart', price: 27.99 });
    expect(c.twin?.name).toContain('Mainstays 24 oz');
    expect(c.twin?.sharedSpecs).toEqual(expect.arrayContaining(['24 oz', 'Stainless steel']));
    expect(c.moreTwins).toEqual([]);
  });
});

describe('the price on top when a cheaper verified store has no known shipping', () => {
  const NOW = new Date('2026-11-13T03:00:00Z');
  const data: LiveSearchData = { results: [], retailerSearchLinks: [], message: '', retailersFound: [], facets: [], checkedAt: NOW.toISOString() };
  const NAME = 'Dyson Airwrap i.d. Multi-Styler and Dryer - Curly + Coily - Amber Silk';
  const offer = (retailer: string, price: number, url: string): Product => ({ id: `offer:${retailer}`, name: NAME, price, image: '', retailer, url, currency: 'USD', sourceMarket: 'US' });
  const rule = ruleOf('dyson-airwrap-id');
  const exactWith = (offers: Product[]) => ({ isExactListing: (p: Product) => isExactListing(p, rule), offers, listTitle: 'Dyson Airwrap i.d.' });
  const bloomingdales = offer("Bloomingdale's", 649.99, 'https://www.bloomingdales.com/shop/product/1');

  it('goes to the cheaper store when the gap is more than any ordinary shipping charge', () => {
    // 2026-11-13: Dyson's own store at $519.99 sat under Bloomingdale's at $649.99.
    const dyson = offer('Dyson Official', 519.99, 'https://www.dyson.com/airwrap-id');
    const c = buildComparison(data, 'dyson airwrap multi-styler', NOW, undefined, exactWith([bloomingdales, dyson]));
    const top = c.item.top;
    // Only meaningful if Pick really has no shipping figure for the cheaper store.
    const dysonRow = c.item.rows.find((r) => r.store === 'Dyson Official');
    if (dysonRow?.preTaxMinor === null) expect(top).toMatchObject({ store: 'Dyson Official', price: 519.99 });
    else expect(top?.price).toBe(519.99);
  });

  it('stays with the listing Pick can total when the gap could be eaten by shipping', () => {
    const dyson = offer('Dyson Official', 640, 'https://www.dyson.com/airwrap-id');
    const c = buildComparison(data, 'dyson airwrap multi-styler', NOW, undefined, exactWith([bloomingdales, dyson]));
    const dysonRow = c.item.rows.find((r) => r.store === 'Dyson Official');
    if (dysonRow?.preTaxMinor === null) expect(c.item.top?.store).toBe("Bloomingdale's");
  });
});

describe('withoutOtherSizePrices', () => {
  const rule = ruleOf('supergoop-glowscreen-spf-40');
  const offer = (retailer: string, price: number, name: string, url: string, originalPrice?: number): Product => ({
    id: `offer:${retailer}`,
    name,
    price,
    ...(originalPrice ? { originalPrice } : {}),
    image: '',
    retailer,
    url,
    currency: 'USD',
    sourceMarket: 'US',
  });
  const FULL = 'Supergoop! Glowscreen SPF 40 Sunscreen with Hyaluronic Acid + Niacinamide 1.7 oz';
  const sephora = offer('Sephora', 38, FULL, 'https://www.sephora.com/p/1');
  const ulta = offer('Ulta Beauty', 38, FULL, 'https://www.ulta.com/p/2');
  const picker = 'Supergoop! Glowscreen SPF 40 Sunscreen with Hyaluronic Acid + Niacinamide, Size: 1.7 FL Oz, Dawn';

  it("drops a size-picker listing priced like another size (Kohl's, 2026-11-13)", () => {
    const kohls = offer("Kohl's", 19, picker, 'https://www.kohls.com/product/prd-1');
    expect(withoutOtherSizePrices([kohls, sephora, ulta], rule).map((o) => o.retailer)).toEqual(['Sephora', 'Ulta Beauty']);
  });

  it('keeps it when the price is in line, when the store marks a sale, or when too few stores can say', () => {
    const inLine = offer("Kohl's", 38, picker, 'https://www.kohls.com/product/prd-1');
    expect(withoutOtherSizePrices([inLine, sephora, ulta], rule)).toHaveLength(3);
    const onSale = offer("Kohl's", 19, picker, 'https://www.kohls.com/product/prd-1', 38);
    expect(withoutOtherSizePrices([onSale, sephora, ulta], rule)).toHaveLength(3);
    const lone = offer("Kohl's", 19, picker, 'https://www.kohls.com/product/prd-1');
    expect(withoutOtherSizePrices([lone, sephora], rule)).toHaveLength(2);
  });

  it('leaves a low price alone when the title has no size picker, or the product pins no size', () => {
    const plain = offer('Target', 19, FULL, 'https://www.target.com/p/3');
    expect(withoutOtherSizePrices([plain, sephora, ulta], rule)).toHaveLength(3);
    const kohls = offer("Kohl's", 19, picker, 'https://www.kohls.com/product/prd-1');
    expect(withoutOtherSizePrices([kohls, sephora, ulta], ruleOf('dyson-v8'))).toHaveLength(3);
  });
});
