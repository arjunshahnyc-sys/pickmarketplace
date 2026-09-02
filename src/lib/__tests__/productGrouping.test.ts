import { describe, expect, it } from 'vitest';
import { enhanceProductsWithGroupInfo, pickAnchor, type EnhancedProduct } from '../productGrouping';
import type { Product } from '../types';
import airpodsFixture from './fixtures/similarPicks/airpods_pro_2.json';
import ceraveFixture from './fixtures/similarPicks/cerave_moisturizing_cream.json';
import lululemonFixture from './fixtures/similarPicks/lululemon_align_leggings.json';
import stanleyFixture from './fixtures/similarPicks/stanley_quencher_40oz.json';

// Similar-pick anchoring, owner-diagnosed 2026-09-01: with the anchor as
// results[0] and grouping run over the display sort, four real searches
// showed zero "Similar pick" chips. The reference is now the searched
// item's same-item cluster (median price), clusters are seeded in source
// relevance order whatever the display sort, and a listing with sibling
// listings of its own can still be a similar pick. The honesty rules on a
// pick itself (different product, 25%+ cheaper, 4.0+ from 50+ reviews,
// rating within 0.5 of the searched item) are unchanged, and one was
// added: a pick needs a name word the searched item lacks.

let nextId = 0;
function listing(over: Partial<Product> & { name: string; price: number }): Product {
  nextId += 1;
  return {
    id: `listing-${nextId}`,
    image: '',
    retailer: 'Store',
    url: `https://example.test/${nextId}`,
    currency: 'USD',
    rating: 4.5,
    reviewCount: 1000,
    ...over,
  };
}

function byName(enhanced: EnhancedProduct[], name: string): EnhancedProduct {
  const found = enhanced.find((p) => p.name === name);
  if (!found) throw new Error(`no listing named ${name}`);
  return found;
}

function similarNames(enhanced: EnhancedProduct[]): string[] {
  return enhanced.filter((p) => p.matchType === 'similar').map((p) => p.name);
}

/** The Target-first shape: a $4.19 travel size leads, full sizes follow. */
function ceraveLike(): Product[] {
  return [
    listing({ name: 'CeraVe Moisturizing Cream 1.89oz', price: 4.19, retailer: 'Target', rating: 4.7, reviewCount: 3000 }),
    listing({ name: 'CeraVe Moisturizing Cream 16oz', price: 17.97, rating: 4.8, reviewCount: 94000 }),
    listing({ name: 'CeraVe Moisturizing Cream 19oz', price: 19.49, rating: 4.8, reviewCount: 2000 }),
    listing({ name: 'CeraVe Moisturizing Cream Pump', price: 17.97, rating: 4.7, reviewCount: 17000 }),
    listing({ name: 'CeraVe Daily Moisturizing Lotion', price: 5.79, rating: 4.7, reviewCount: 26000 }),
  ];
}

/** Size variants of the searched leggings, then a cluster of crops. */
function leggingsLike(): Product[] {
  return [
    listing({ name: 'Lulu Align Leggings High-Rise Pant 28 Size 8 Black', price: 98, rating: 4.3, reviewCount: 23000 }),
    listing({ name: 'Lulu Align Leggings High-Rise Pant 28 Size 10 Pink', price: 98, rating: 4.2, reviewCount: 49000 }),
    listing({ name: 'Lulu Align Leggings High-Rise Pant 28 Size 14 Blue', price: 59, rating: 4.2, reviewCount: 18000 }),
    listing({ name: 'Lulu Align High-Rise Crop 23', price: 59, rating: 4.3, reviewCount: 9600 }),
    listing({ name: 'Lulu Align High-Rise Crop 23 Blue', price: 59, rating: 4.3, reviewCount: 6400 }),
    listing({ name: 'Lulu Align High-Rise Crop 23 Navy', price: 89, rating: 4.3, reviewCount: 6400 }),
  ];
}

describe('pickAnchor', () => {
  it("anchors on the top result's cluster at its median price, not the top listing's price", () => {
    const anchor = pickAnchor(ceraveLike());
    expect(anchor).toMatchObject({
      name: 'CeraVe Moisturizing Cream 1.89oz',
      price: 17.97, // median of 4.19, 17.97, 17.97, 19.49; the $4.19 lead listing cannot drag it down
      currency: 'USD',
      listingCount: 4,
    });
  });

  it("takes rating and review count from the cluster's best-reviewed listing", () => {
    const anchor = pickAnchor(ceraveLike());
    expect(anchor?.rating).toBe(4.8);
    expect(anchor?.reviewCount).toBe(94000);
  });

  it('moves past a top cluster with no well-reviewed listing', () => {
    const anchor = pickAnchor([
      listing({ name: 'Case for AirPods Pro 2 Silicone', price: 9.99, rating: undefined, reviewCount: undefined }),
      listing({ name: 'Apple AirPods Pro 2', price: 249, rating: 4.7, reviewCount: 33000 }),
      listing({ name: 'Apple AirPods Pro 2 USB-C', price: 199, rating: 4.7, reviewCount: 8000 }),
    ]);
    expect(anchor).toMatchObject({ name: 'Apple AirPods Pro 2', price: 249, rating: 4.7, listingCount: 2 });
  });

  it('needs 50+ reviews, the same bar a similar pick must clear', () => {
    const thin = [
      listing({ name: 'Acme Blender Pro 1500', price: 100, rating: 5, reviewCount: 49 }),
      listing({ name: 'Acme Blender Compact 900', price: 40, rating: 4.6, reviewCount: 12 }),
    ];
    expect(pickAnchor(thin)).toBeUndefined();
    expect(similarNames(enhanceProductsWithGroupInfo(thin))).toEqual([]);
  });

  it('ignores example cards', () => {
    const anchor = pickAnchor([
      listing({ name: 'Example Widget', price: 10, isFallback: true }),
      listing({ name: 'Real Widget Deluxe', price: 30 }),
    ]);
    expect(anchor?.name).toBe('Real Widget Deluxe');
  });
});

describe('similar picks', () => {
  it('measures savings against the cluster median, so a small-size lead listing no longer blocks every pick', () => {
    const enhanced = enhanceProductsWithGroupInfo(ceraveLike());
    const lotion = byName(enhanced, 'CeraVe Daily Moisturizing Lotion');
    expect(lotion.matchType).toBe('similar');
    expect(lotion.similarTo).toEqual({
      name: 'CeraVe Moisturizing Cream 1.89oz',
      savingsPercent: 68, // vs $17.97; vs the $4.19 lead listing it would not even qualify
      sharedSpecs: ['cerave', 'moisturizing'],
    });
    expect(similarNames(enhanced)).toEqual(['CeraVe Daily Moisturizing Lotion']);
  });

  it('labels a listing that has sibling listings of its own, and keeps its group fields', () => {
    const enhanced = enhanceProductsWithGroupInfo(leggingsLike());
    expect(similarNames(enhanced)).toEqual(['Lulu Align High-Rise Crop 23', 'Lulu Align High-Rise Crop 23 Blue']);

    const crop = byName(enhanced, 'Lulu Align High-Rise Crop 23');
    expect(crop.similarTo?.savingsPercent).toBe(40); // $59 vs the $98 median
    expect(crop.groupSize).toBe(3);
    expect(crop.isLowestInGroup).toBe(true);
    expect(crop.groupId).toBe(byName(enhanced, 'Lulu Align High-Rise Crop 23 Navy').groupId);

    // The $89 crop is the same item as the $59 crops but not cheap enough
    // to be a pick: it stays a plain sibling listing.
    expect(byName(enhanced, 'Lulu Align High-Rise Crop 23 Navy').matchType).toBe('same');
  });

  it("never labels a listing in the searched item's own cluster, however cheap", () => {
    const enhanced = enhanceProductsWithGroupInfo(leggingsLike());
    const cheapVariant = byName(enhanced, 'Lulu Align Leggings High-Rise Pant 28 Size 14 Blue');
    expect(cheapVariant.matchType).toBe('same');
    expect(cheapVariant.isLowestInGroup).toBe(true);
    expect(cheapVariant.groupSavingsAmount).toBe(39);
  });

  it('rejects a shorter name for the same item and keeps a real alternative', () => {
    const enhanced = enhanceProductsWithGroupInfo([
      listing({ name: 'Apple AirPods Pro with MagSafe Case', price: 249.99, rating: 4.4, reviewCount: 33000 }),
      listing({ name: 'Apple AirPods Pro 2', price: 75, retailer: 'Poshmark', rating: 4.7, reviewCount: 7900 }),
      listing({ name: 'Beats Fit Pro Wireless Earbuds with Apple H1', price: 99, rating: 4.5, reviewCount: 5000 }),
    ]);
    expect(byName(enhanced, 'Apple AirPods Pro 2').matchType).toBeUndefined();
    expect(byName(enhanced, 'Beats Fit Pro Wireless Earbuds with Apple H1').similarTo).toEqual({
      name: 'Apple AirPods Pro with MagSafe Case',
      savingsPercent: 60,
      sharedSpecs: ['apple'],
    });
  });

  it('keeps the honesty rules on the pick itself', () => {
    const anchorListing = listing({ name: 'Acme Blender Pro 1500', price: 100, rating: 4.6, reviewCount: 2000 });
    const cases: Array<[string, Product]> = [
      ['not cheap enough', listing({ name: 'Acme Blender Compact 900', price: 76, rating: 4.6, reviewCount: 500 })],
      ['rated under 4.0', listing({ name: 'Acme Blender Compact 900', price: 40, rating: 3.9, reviewCount: 500 })],
      ['under 50 reviews', listing({ name: 'Acme Blender Compact 900', price: 40, rating: 4.9, reviewCount: 49 })],
      ['rated 0.5+ below the searched item', listing({ name: 'Acme Blender Compact 900', price: 40, rating: 4.0, reviewCount: 500 })],
      ['too little name overlap', listing({ name: 'Zeta Mixer Compact 900', price: 40, rating: 4.6, reviewCount: 500 })],
      ['priced in another currency', listing({ name: 'Acme Blender Compact 900', price: 40, currency: 'GBP', rating: 4.6, reviewCount: 500 })],
    ];
    for (const [why, candidate] of cases) {
      const enhanced = enhanceProductsWithGroupInfo([anchorListing, candidate]);
      expect(enhanced[1].matchType, why).toBeUndefined();
    }
    const ok = enhanceProductsWithGroupInfo([
      anchorListing,
      listing({ name: 'Acme Blender Compact 900', price: 75, rating: 4.1, reviewCount: 50 }),
    ]);
    expect(ok[1].matchType).toBe('similar');
  });
});

describe('display order and filters', () => {
  function summarize(enhanced: EnhancedProduct[]) {
    return [...enhanced]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        name: p.name,
        matchType: p.matchType,
        groupSize: p.groupSize,
        isLowestInGroup: p.isLowestInGroup,
        groupSavingsAmount: p.groupSavingsAmount,
        savingsPercent: p.similarTo?.savingsPercent,
      }));
  }

  it('groups and labels the same way under any display sort, and keeps the display order', () => {
    const results = leggingsLike();
    const reference = summarize(enhanceProductsWithGroupInfo(results, results));
    const cheapestFirst = [...results].sort((a, b) => a.price - b.price);
    const priciestFirst = [...results].sort((a, b) => b.price - a.price);
    for (const display of [cheapestFirst, priciestFirst]) {
      const enhanced = enhanceProductsWithGroupInfo(display, results);
      expect(enhanced.map((p) => p.name)).toEqual(display.map((p) => p.name));
      expect(summarize(enhanced)).toEqual(reference);
    }
  });

  it('survives the display pipeline copying every product object', () => {
    const results = leggingsLike();
    const copies = results.map((p) => ({ ...p, landedCost: undefined }));
    expect(summarize(enhanceProductsWithGroupInfo(copies, results))).toEqual(
      summarize(enhanceProductsWithGroupInfo(results, results))
    );
  });

  it('still measures against the searched item when a filter hides its listings', () => {
    const results = leggingsLike();
    const visible = results.filter((p) => !p.name.includes('Pant 28'));
    const enhanced = enhanceProductsWithGroupInfo(visible, results);
    const crop = byName(enhanced, 'Lulu Align High-Rise Crop 23');
    expect(crop.matchType).toBe('similar');
    expect(crop.similarTo?.name).toBe('Lulu Align Leggings High-Rise Pant 28 Size 8 Black');
    // Group fields only ever describe listings the shopper can see.
    expect(enhanced.every((p) => p.groupSize === 3)).toBe(true);
  });

  it('defaults to the display list as the relevance order (server-rendered category pages)', () => {
    const results = leggingsLike();
    expect(enhanceProductsWithGroupInfo(results)).toEqual(enhanceProductsWithGroupInfo(results, results));
  });
});

describe('same-item groups (unchanged math)', () => {
  it('saves against the median and marks only the first listing at the minimum', () => {
    const enhanced = enhanceProductsWithGroupInfo([
      listing({ name: 'Brand Kettle Steel 1.7L', price: 60 }),
      listing({ name: 'Brand Kettle Steel 1.7L', price: 40 }),
      listing({ name: 'Brand Kettle Steel 1.7L', price: 40 }),
      listing({ name: 'Brand Kettle Steel 1.7L', price: 50 }),
    ]);
    expect(enhanced.map((p) => p.isLowestInGroup)).toEqual([false, true, false, false]);
    expect(enhanced[1].groupSavingsAmount).toBe(10); // median 50 (upper median of 40, 40, 50, 60) minus 40
    expect(enhanced[1].groupSavingsPercent).toBe(20);
    expect(enhanced.every((p) => p.matchType === 'same' && p.groupSize === 4)).toBe(true);
  });

  it('advertises no lowest price when the minimum is junk', () => {
    const enhanced = enhanceProductsWithGroupInfo([
      listing({ name: 'Brand Kettle Steel 1.7L', price: 50 }),
      listing({ name: 'Brand Kettle Steel 1.7L', price: 0.01 }),
      listing({ name: 'Brand Kettle Steel 1.7L', price: 45 }),
    ]);
    expect(enhanced.some((p) => p.isLowestInGroup)).toBe(false);
  });

  it('leaves a lone listing that is not a pick unlabeled', () => {
    const enhanced = enhanceProductsWithGroupInfo([
      listing({ name: 'Brand Kettle Steel 1.7L', price: 50 }),
      listing({ name: 'Other Toaster Two Slice', price: 20 }),
    ]);
    expect(enhanced[1]).toEqual(expect.objectContaining({ matchType: undefined, similarTo: undefined }));
    expect(enhanced[1].groupSize).toBeUndefined();
  });
});

// The four searches from the 2026-09-01 diagnosis, captured from
// /api/search-live on 2026-09-02 (US destination; the direct Target feed
// was returning 403 that day, so every listing came via Google Shopping).
// Trimmed to the fields grouping reads. These pin what real result sets
// produce; a change here is a product decision, not a refactor.
describe('captured live searches', () => {
  type Fixture = { query: string; results: Array<Partial<Product> & { name: string; price: number }> };
  function load(fixture: Fixture): Product[] {
    return fixture.results.map((r) => ({ image: '', retailer: 'Store', url: '', ...r }) as Product);
  }
  const expected: Array<{ fixture: Fixture; anchor: { name: string; price: number }; picks: string[] }> = [
    {
      fixture: stanleyFixture,
      anchor: { name: 'Stanley H2.0 Flowstate Quencher Tumbler', price: 50 },
      picks: [
        'Stanley Dining Stanley Holiday Quencher H2.0 Flowstate Tumbler 40oz',
        'Stanley Dining Stanley X Calia Quencher H2.0 Tumbler',
        'Stanley Adventure Quencher Travel Tumbler',
      ],
    },
    {
      fixture: airpodsFixture,
      anchor: { name: 'Apple AirPods Pro with MagSafe Case', price: 150 },
      // Known limit of name matching: this eBay listing is really the same
      // earbuds. The shorter-name rule already drops the Poshmark "Apple
      // AirPods Pro 2" that used to pass; the model-number listing keeps
      // enough extra words to read as a different product.
      picks: ['Apple AirPods Pro 2 White In Ear Headphones Mqd83ch/A MW0227M/A'],
    },
    {
      fixture: lululemonFixture,
      anchor: { name: 'lululemon Align Leggings | Women\'s High-Rise Pant 28" | Size 8 | Black,Neutral', price: 89 },
      picks: [
        "lululemon Align Leggings Women's High-Rise Pant with Pockets 25",
        "lululemon Women's Align High-Rise Crop 23",
        "Women's lululemon Align High-Rise Ribbed Crop 23",
        'lululemon Capri Leggings | Align High-Rise Crop 23" - Size 12 - | Blue',
      ],
    },
    {
      fixture: ceraveFixture,
      anchor: { name: 'CeraVe Moisturizing Cream', price: 17.97 },
      picks: ['CeraVe Daily Moisturizing Lotion', 'CeraVe Diabetics Dry Skin Relief Moisturizing Cream'],
    },
  ];

  for (const { fixture, anchor, picks } of expected) {
    it(`"${fixture.query}": anchors on ${anchor.name} at $${anchor.price} and finds ${picks.length} picks`, () => {
      const results = load(fixture);
      expect(pickAnchor(results)).toMatchObject(anchor);
      expect(similarNames(enhanceProductsWithGroupInfo(results, results))).toEqual(picks);
      // The same picks under the price sort the landing page defaults to.
      const cheapestFirst = [...results].sort((a, b) => a.price - b.price);
      expect(similarNames(enhanceProductsWithGroupInfo(cheapestFirst, results)).sort()).toEqual([...picks].sort());
    });
  }
});
