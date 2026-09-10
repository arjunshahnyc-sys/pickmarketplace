import { describe, expect, it } from 'vitest';
import {
  enhanceProductsWithGroupInfo,
  pickAnchor,
  type EnhancedProduct,
  type GroupingOptions,
  type SellerClass,
} from '../productGrouping';
import type { Product } from '../types';
import airpods2Fixture from './fixtures/similarPicks/airpods_pro_2.json';
import airpods3Fixture from './fixtures/similarPicks/airpods_pro_3.json';
import ceraveFixture from './fixtures/similarPicks/cerave_moisturizing_cream.json';
import dysonFixture from './fixtures/similarPicks/dyson_airwrap.json';
import lululemonFixture from './fixtures/similarPicks/lululemon_align_leggings.json';
import nikeFixture from './fixtures/similarPicks/nike_dunk_low.json';
import ninjaFixture from './fixtures/similarPicks/ninja_creami.json';
import sonyFixture from './fixtures/similarPicks/sony_wh_1000xm5.json';
import sony6Fixture from './fixtures/similarPicks/sony_wh_1000xm6.json';
import spaceOneFixture from './fixtures/similarPicks/soundcore_space_one.json';
import stanleyFixture from './fixtures/similarPicks/stanley_quencher_40oz.json';

// Similar-pick anchoring, owner-diagnosed 2026-09-01: with the anchor as
// results[0] and grouping run over the display sort, four real searches
// showed zero "Similar pick" chips. The reference is the searched item's
// same-item cluster (its typical price), clusters are seeded in source
// relevance order whatever the display sort, and a listing with sibling
// listings of its own can still be a similar pick.
//
// Live sweep 2026-09-05: the engine then labelled the searched item ITSELF
// as its cheaper twin (an $84 eBay "Apple AirPods Pro 3rd Generation
// Wireless ANC Earbuds" against "Apple AirPods Pro 3"), along with kids'
// sizes, accessories and refurbished units. Since then: a name that
// contains the searched item's name (or is contained by it) is the same
// item; size, colour, condition and marketplace-filler words never make a
// product different; age tiers, accessories and used units are never
// twins; model numbers must agree for two names to be one item; the anchor
// is the cluster that best covers the query; the reference price is what
// verified stores charge; and a pick must come from a verified store.

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

// Synthetic tests classify sellers by name so they never depend on the
// registry's contents: Target and Best Buy are verified stores, eBay and
// Poshmark are marketplaces, everything else (the default "Store") is an
// unverified seller.
const sellerClass = (p: Product): SellerClass =>
  p.retailer === 'Target' || p.retailer === 'Best Buy'
    ? 'verified'
    : p.retailer === 'eBay' || p.retailer === 'Poshmark'
      ? 'marketplace'
      : 'unknown';

function enhance(products: Product[], relevance: Product[] = products, options: GroupingOptions = {}) {
  return enhanceProductsWithGroupInfo(products, relevance, { sellerClass, ...options });
}
function anchorOf(products: Product[], options: GroupingOptions = {}) {
  return pickAnchor(products, { sellerClass, ...options });
}

function byName(enhanced: EnhancedProduct[], name: string): EnhancedProduct {
  const found = enhanced.find((p) => p.name === name);
  if (!found) throw new Error(`no listing named ${name}`);
  return found;
}

function similarNames(enhanced: EnhancedProduct[]): string[] {
  return enhanced.filter((p) => p.matchType === 'similar').map((p) => p.name);
}

function flaggedNames(enhanced: EnhancedProduct[]): string[] {
  return enhanced.filter((p) => p.priceFlag).map((p) => p.name);
}

/** The Target-first shape: a $4.19 travel size leads, full sizes follow. */
function ceraveLike(): Product[] {
  return [
    listing({ name: 'CeraVe Moisturizing Cream 1.89oz', price: 4.19, retailer: 'Target', rating: 4.7, reviewCount: 3000 }),
    listing({ name: 'CeraVe Moisturizing Cream 16oz', price: 17.97, rating: 4.8, reviewCount: 94000 }),
    listing({ name: 'CeraVe Moisturizing Cream 19oz', price: 19.49, rating: 4.8, reviewCount: 2000 }),
    listing({ name: 'CeraVe Moisturizing Cream Pump', price: 17.97, rating: 4.7, reviewCount: 17000 }),
    listing({ name: 'CeraVe Daily Moisturizing Lotion', price: 5.79, retailer: 'Target', rating: 4.7, reviewCount: 26000 }),
  ];
}

/** Size variants of the searched leggings, then a cluster of crops. */
function leggingsLike(): Product[] {
  return [
    listing({ name: 'Lulu Align Leggings High-Rise Pant 28 Size 8 Black', price: 98, rating: 4.3, reviewCount: 23000 }),
    listing({ name: 'Lulu Align Leggings High-Rise Pant 28 Size 10 Pink', price: 98, rating: 4.2, reviewCount: 49000 }),
    listing({ name: 'Lulu Align Leggings High-Rise Pant 28 Size 14 Blue', price: 59, rating: 4.2, reviewCount: 18000 }),
    listing({ name: 'Lulu Align High-Rise Crop 23', price: 59, retailer: 'Target', rating: 4.3, reviewCount: 9600 }),
    listing({ name: 'Lulu Align High-Rise Crop 23 Blue', price: 59, retailer: 'Target', rating: 4.3, reviewCount: 6400 }),
    listing({ name: 'Lulu Align High-Rise Crop 23 Navy', price: 89, retailer: 'Target', rating: 4.3, reviewCount: 6400 }),
  ];
}

describe('pickAnchor', () => {
  it("anchors on the top result's cluster at its median price, not the top listing's price", () => {
    const anchor = anchorOf(ceraveLike());
    expect(anchor).toMatchObject({
      name: 'CeraVe Moisturizing Cream 1.89oz',
      // median of 4.19, 17.97, 17.97, 19.49: the $4.19 lead listing cannot
      // drag it down, and being the lone verified listing does not make it
      // the reference either (a travel size is out of range of the cluster)
      price: 17.97,
      priceBasis: 'all',
      currency: 'USD',
      listingCount: 4,
    });
  });

  it("takes rating and review count from the cluster's best-reviewed listing", () => {
    const anchor = anchorOf(ceraveLike());
    expect(anchor?.rating).toBe(4.8);
    expect(anchor?.reviewCount).toBe(94000);
  });

  it('prices the searched item at what verified stores charge when two or more carry it', () => {
    const anchor = anchorOf([
      listing({ name: 'Apple AirPods Pro 3', price: 249, retailer: 'Target', rating: 4.7, reviewCount: 21000 }),
      listing({ name: 'Apple AirPods Pro 3', price: 249, retailer: 'Best Buy', rating: 4.7, reviewCount: 8000 }),
      listing({ name: 'Apple Airpods Pro 3 White Wireless Earbuds', price: 60, retailer: 'eBay', rating: 4.7, reviewCount: 21000 }),
      listing({ name: 'Apple Airpods Pro 3 With Anc', price: 100, retailer: 'eBay', rating: 4.7, reviewCount: 21000 }),
      listing({ name: 'Airpods Pro 3 Wireless In-ear Earbuds White', price: 95, rating: 4.7, reviewCount: 21000 }),
    ]);
    // The brandless "Airpods Pro 3 Wireless In-ear Earbuds White" stays
    // outside the cluster (grouping keeps the brand word) but see below:
    // it is never a twin either.
    expect(anchor).toMatchObject({ name: 'Apple AirPods Pro 3', price: 249, priceBasis: 'verified', listingCount: 4 });
  });

  it('a listing that drops the brand is the item, never its twin', () => {
    const enhanced = enhance([
      listing({ name: 'Apple AirPods Pro 3', price: 249, retailer: 'Target', rating: 4.7, reviewCount: 21000 }),
      listing({ name: 'Airpods Pro 3 Wireless In-ear Earbuds White', price: 95, retailer: 'Target', rating: 4.7, reviewCount: 21000 }),
    ]);
    expect(similarNames(enhanced)).toEqual([]);
  });

  it('accepts a lone verified listing as the reference when it is in range of the cluster', () => {
    const anchor = anchorOf([
      listing({ name: 'Apple AirPods Pro 3', price: 249, retailer: 'Target', rating: 4.7, reviewCount: 21000 }),
      listing({ name: 'Apple AirPods Pro 3 Wireless Earbuds', price: 430, rating: 4.7, reviewCount: 21000 }),
      listing({ name: 'Apple Airpods Pro 3 With Anc', price: 300, rating: 4.7, reviewCount: 21000 }),
    ]);
    expect(anchor).toMatchObject({ price: 249, priceBasis: 'verified' });
  });

  it('moves past a top cluster with no well-reviewed listing', () => {
    const anchor = anchorOf([
      listing({ name: 'Case for AirPods Pro 2 Silicone', price: 9.99, rating: undefined, reviewCount: undefined }),
      listing({ name: 'Apple AirPods Pro 2', price: 249, rating: 4.7, reviewCount: 33000 }),
      listing({ name: 'Apple AirPods Pro 2 USB-C', price: 199, rating: 4.7, reviewCount: 8000 }),
    ]);
    expect(anchor).toMatchObject({ name: 'Apple AirPods Pro 2', price: 249, rating: 4.7, listingCount: 2 });
  });

  it('anchors on the cluster that covers the query, never on a well-reviewed accessory', () => {
    const results = [
      listing({ name: 'Ninja Creami Pints and Lids', price: 29.99, rating: 4.8, reviewCount: 900 }),
      listing({ name: 'Ninja Creami Ice Cream Maker NC301', price: 199, rating: 4.4, reviewCount: 2700 }),
    ];
    expect(anchorOf(results, { query: 'ninja creami' })?.name).toBe('Ninja Creami Ice Cream Maker NC301');
  });

  it('never anchors on a refurbished or used cluster', () => {
    const results = [
      listing({ name: 'Refurbished Sony WH-1000XM5 Headphones', price: 189, rating: 4.9, reviewCount: 291 }),
      listing({ name: 'Sony WH-1000XM5 Wireless Headphones', price: 348, rating: 4.6, reviewCount: 17000 }),
    ];
    expect(anchorOf(results, { query: 'sony wh-1000xm5' })?.name).toBe('Sony WH-1000XM5 Wireless Headphones');
  });

  it('needs 50+ reviews, the same bar a similar pick must clear', () => {
    const thin = [
      listing({ name: 'Acme Blender Pro 1500', price: 100, rating: 5, reviewCount: 49 }),
      listing({ name: 'Acme Blender Compact 900', price: 40, retailer: 'Target', rating: 4.6, reviewCount: 12 }),
    ];
    expect(anchorOf(thin)).toBeUndefined();
    expect(similarNames(enhance(thin))).toEqual([]);
  });

  it('ignores example cards', () => {
    const anchor = anchorOf([
      listing({ name: 'Example Widget', price: 10, isFallback: true }),
      listing({ name: 'Real Widget Deluxe', price: 30 }),
    ]);
    expect(anchor?.name).toBe('Real Widget Deluxe');
  });
});

describe('same item under another name', () => {
  const anchorListing = () =>
    listing({ name: 'Apple AirPods Pro 3', price: 249, retailer: 'Target', rating: 4.7, reviewCount: 21000 });

  it('a longer listing name of the searched item is the same item, never its cheaper twin (the 2026-09-05 bug)', () => {
    const enhanced = enhance([
      anchorListing(),
      listing({ name: 'Apple AirPods Pro 3rd Generation Wireless ANC Earbuds', price: 84, retailer: 'Target', rating: 4.7, reviewCount: 21000 }),
      listing({ name: 'Apple Airpods Pro 3 White Wireless Bluetooth In-ear Earbuds W/charging', price: 100, retailer: 'Target', rating: 4.7, reviewCount: 21000 }),
    ]);
    expect(similarNames(enhanced)).toEqual([]);
    expect(enhanced.every((p) => p.matchType === 'same' && p.groupSize === 3)).toBe(true);
  });

  it('size, colour and pack variants are the same item', () => {
    const enhanced = enhance([
      listing({ name: 'Stanley Quencher H2.0 Flowstate Tumbler 40oz', price: 45, retailer: 'Target', rating: 4.4, reviewCount: 49000 }),
      listing({ name: 'Stanley Quencher H2.0 Flowstate Tumbler 30oz Rose Quartz', price: 30, retailer: 'Target', rating: 4.4, reviewCount: 49000 }),
      listing({ name: 'Stanley Quencher Flowstate Tumbler 2-Pack', price: 80, retailer: 'Target', rating: 4.4, reviewCount: 49000 }),
    ]);
    expect(similarNames(enhanced)).toEqual([]);
    expect(new Set(enhanced.map((p) => p.groupId)).size).toBe(1);
  });

  it('a different model number is a different product', () => {
    const enhanced = enhance([
      listing({ name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones', price: 348, retailer: 'Target', rating: 4.6, reviewCount: 17000 }),
      listing({ name: 'Sony WH-1000XM4 Wireless Noise Canceling Headphones', price: 248, retailer: 'Target', rating: 4.7, reviewCount: 60000 }),
    ]);
    expect(byName(enhanced, 'Sony WH-1000XM4 Wireless Noise Canceling Headphones').matchType).toBe('similar');
    expect(byName(enhanced, 'Sony WH-1000XM4 Wireless Noise Canceling Headphones').groupSize).toBeUndefined();
  });

  it("age tiers are priced as different products: kids' shoes never join the adult cluster", () => {
    const enhanced = enhance(
      [
        listing({ name: "Nike Men's Dunk Low Retro", price: 120, retailer: 'Target', rating: 4.6, reviewCount: 18000 }),
        listing({ name: "Nike Kids' Dunk Low", price: 75, retailer: 'Target', rating: 4.6, reviewCount: 3700 }),
        listing({ name: 'Nike Dunk Low Toddler', price: 50, retailer: 'Target', rating: 4.7, reviewCount: 3500 }),
        listing({ name: "Nike Women's Dunk Low Sneakers White Black", price: 86, retailer: 'Target', rating: 4.5, reviewCount: 1800 }),
      ],
      undefined,
      { query: 'nike dunk low' }
    );
    // Women's is the same shoe; kids' and toddler are neither the same item nor a twin.
    expect(byName(enhanced, "Nike Women's Dunk Low Sneakers White Black").groupId).toBe(
      byName(enhanced, "Nike Men's Dunk Low Retro").groupId
    );
    expect(byName(enhanced, "Nike Kids' Dunk Low").groupId).toBeUndefined();
    expect(similarNames(enhanced)).toEqual([]);
  });
});

describe('similar picks', () => {
  it('measures savings against the cluster median, so a small-size lead listing no longer blocks every pick', () => {
    const enhanced = enhance(ceraveLike());
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
    const enhanced = enhance(leggingsLike());
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
    const enhanced = enhance(leggingsLike());
    const cheapVariant = byName(enhanced, 'Lulu Align Leggings High-Rise Pant 28 Size 14 Blue');
    expect(cheapVariant.matchType).toBe('same');
    expect(cheapVariant.isLowestInGroup).toBe(true);
    expect(cheapVariant.groupSavingsAmount).toBe(39);
  });

  it('rejects a shorter name for the same item and keeps a real alternative', () => {
    const enhanced = enhance([
      listing({ name: 'Apple AirPods Pro with MagSafe Case', price: 249.99, rating: 4.4, reviewCount: 33000 }),
      listing({ name: 'Apple AirPods Pro 2', price: 75, retailer: 'Target', rating: 4.7, reviewCount: 7900 }),
      listing({ name: 'Beats Fit Pro Wireless Earbuds with Apple H1', price: 99, retailer: 'Target', rating: 4.5, reviewCount: 5000 }),
    ]);
    expect(byName(enhanced, 'Apple AirPods Pro 2').matchType).not.toBe('similar');
    expect(byName(enhanced, 'Beats Fit Pro Wireless Earbuds with Apple H1').similarTo).toEqual({
      name: 'Apple AirPods Pro with MagSafe Case',
      savingsPercent: 60,
      sharedSpecs: ['apple'],
    });
  });

  it('never picks an accessory, a used unit, or another age tier', () => {
    const anchorListing = listing({ name: 'Ninja Creami Ice Cream Maker NC301', price: 199, retailer: 'Target', rating: 4.4, reviewCount: 2700 });
    const cases: Array<[string, Product]> = [
      ['an accessory', listing({ name: 'Ninja Creami Deluxe Pints and Lids', price: 29.99, retailer: 'Target', rating: 4.8, reviewCount: 900 })],
      ['a refurbished unit', listing({ name: 'Ninja Creami Deluxe NC501 Frozen Treat Maker Refurbished', price: 99, retailer: 'Target', rating: 4.5, reviewCount: 300 })],
      ['an open-box unit', listing({ name: 'Ninja Creami Deluxe NC501 Open Box', price: 99, retailer: 'Target', rating: 4.5, reviewCount: 300 })],
      ['a kids version', listing({ name: 'Ninja Creami Kids Frozen Treat Maker', price: 49, retailer: 'Target', rating: 4.5, reviewCount: 300 })],
    ];
    for (const [why, candidate] of cases) {
      const enhanced = enhance([anchorListing, candidate], undefined, { query: 'ninja creami' });
      expect(byName(enhanced, candidate.name).matchType, why).not.toBe('similar');
    }
  });

  it('keeps the honesty rules on the pick itself', () => {
    const anchorListing = listing({ name: 'Acme Blender Pro 1500', price: 100, rating: 4.6, reviewCount: 2000 });
    const cases: Array<[string, Product]> = [
      ['not cheap enough', listing({ name: 'Acme Blender Compact 900', price: 76, retailer: 'Target', rating: 4.6, reviewCount: 500 })],
      ['rated under 4.0', listing({ name: 'Acme Blender Compact 900', price: 40, retailer: 'Target', rating: 3.9, reviewCount: 500 })],
      ['under 50 reviews', listing({ name: 'Acme Blender Compact 900', price: 40, retailer: 'Target', rating: 4.9, reviewCount: 49 })],
      ['rated 0.5+ below the searched item', listing({ name: 'Acme Blender Compact 900', price: 40, retailer: 'Target', rating: 4.0, reviewCount: 500 })],
      ['too little name overlap', listing({ name: 'Zeta Mixer Compact 900', price: 40, retailer: 'Target', rating: 4.6, reviewCount: 500 })],
      ['priced in another currency', listing({ name: 'Acme Blender Compact 900', price: 40, retailer: 'Target', currency: 'GBP', rating: 4.6, reviewCount: 500 })],
      ['sold by an unverified store', listing({ name: 'Acme Blender Compact 900', price: 40, rating: 4.6, reviewCount: 500 })],
      ['sold on a marketplace', listing({ name: 'Acme Blender Compact 900', price: 40, retailer: 'eBay', rating: 4.6, reviewCount: 500 })],
    ];
    for (const [why, candidate] of cases) {
      const enhanced = enhance([anchorListing, candidate]);
      expect(enhanced[1].matchType, why).toBeUndefined();
    }
    const ok = enhance([
      anchorListing,
      listing({ name: 'Acme Blender Compact 900', price: 75, retailer: 'Target', rating: 4.1, reviewCount: 50 }),
    ]);
    expect(ok[1].matchType).toBe('similar');
  });
});

describe('price flags and the lowest-price chip', () => {
  const airpods = () => [
    listing({ name: 'Apple AirPods Pro 3', price: 249, retailer: 'Target', rating: 4.7, reviewCount: 21000 }),
    listing({ name: 'Apple AirPods Pro 3', price: 249, retailer: 'Best Buy', rating: 4.7, reviewCount: 8000 }),
    listing({ name: 'Apple Airpods Pro 3 White Wireless Earbuds', price: 60, retailer: 'eBay', rating: 4.7, reviewCount: 21000 }),
    listing({ name: 'Airpods Pro 3', price: 34.49, rating: 4.7, reviewCount: 21000 }),
    listing({ name: 'Apple AirPods Pro 3 Wireless Earbuds, Active Noise Cancellation', price: 199, rating: 4.7, reviewCount: 21000 }),
    listing({ name: 'Refurbished Apple AirPods Pro 3 USB-C Excellent', price: 155, rating: 4.7, reviewCount: 21000 }),
  ];

  it('flags unverified listings priced far below what verified stores charge, and keeps them out of every chip', () => {
    const enhanced = enhance(airpods());
    expect(flaggedNames(enhanced)).toEqual(['Apple Airpods Pro 3 White Wireless Earbuds', 'Airpods Pro 3']);
    expect(byName(enhanced, 'Airpods Pro 3').priceFlag).toEqual({ kind: 'far-below-verified', referencePrice: 249 });
    expect(enhanced.filter((p) => p.priceFlag).every((p) => !p.isLowestInGroup && p.matchType !== 'similar')).toBe(true);
  });

  it('the lowest-price chip skips refurbished units and lands on the cheapest credible listing', () => {
    const enhanced = enhance(airpods());
    const lowest = enhanced.filter((p) => p.isLowestInGroup);
    expect(lowest.map((p) => p.name)).toEqual(['Apple AirPods Pro 3 Wireless Earbuds, Active Noise Cancellation']);
    expect(lowest[0].groupSavingsAmount).toBe(50); // vs the $249 verified price, not a median dragged down by $34 listings
  });

  it('the lowest-price chip never lands on a marketplace offer', () => {
    const enhanced = enhance([
      listing({ name: 'Dyson Airwrap Multi-Styler', price: 500, retailer: 'Target', rating: 4.7, reviewCount: 76000 }),
      listing({ name: 'Dyson Airwrap Multi-Styler Complete', price: 400, retailer: 'eBay', rating: 4.7, reviewCount: 76000 }),
      listing({ name: 'Dyson Airwrap Multi-Styler Complete Long', price: 450, retailer: 'Best Buy', rating: 4.7, reviewCount: 76000 }),
    ]);
    expect(enhanced.filter((p) => p.isLowestInGroup).map((p) => p.name)).toEqual(['Dyson Airwrap Multi-Styler Complete Long']);
  });

  it('another size is neither flagged nor the lowest price of the usual size', () => {
    const enhanced = enhance([
      listing({ name: 'CeraVe Moisturizing Cream', price: 17.99, retailer: 'Target', rating: 4.8, reviewCount: 94000 }),
      listing({ name: 'CeraVe Moisturizing Cream', price: 17.97, retailer: 'Best Buy', rating: 4.8, reviewCount: 94000 }),
      listing({ name: 'CeraVe Moisturizing Cream', price: 16.5, rating: 4.8, reviewCount: 94000 }),
      listing({ name: 'CeraVe Moisturizing Cream, 50 ml', price: 7, rating: 4.8, reviewCount: 94000 }),
    ]);
    expect(flaggedNames(enhanced)).toEqual([]);
    expect(enhanced.filter((p) => p.isLowestInGroup).map((p) => p.price)).toEqual([16.5]);
  });

  it('flags nothing without a verified reference', () => {
    const enhanced = enhance([
      listing({ name: 'Apple AirPods Pro 3', price: 249, rating: 4.7, reviewCount: 21000 }),
      listing({ name: 'Apple Airpods Pro 3 White Wireless Earbuds', price: 60, retailer: 'eBay', rating: 4.7, reviewCount: 21000 }),
    ]);
    expect(flaggedNames(enhanced)).toEqual([]);
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
        priceFlag: p.priceFlag,
      }));
  }

  it('groups and labels the same way under any display sort, and keeps the display order', () => {
    const results = leggingsLike();
    const reference = summarize(enhance(results, results));
    const cheapestFirst = [...results].sort((a, b) => a.price - b.price);
    const priciestFirst = [...results].sort((a, b) => b.price - a.price);
    for (const display of [cheapestFirst, priciestFirst]) {
      const enhanced = enhance(display, results);
      expect(enhanced.map((p) => p.name)).toEqual(display.map((p) => p.name));
      expect(summarize(enhanced)).toEqual(reference);
    }
  });

  it('survives the display pipeline copying every product object', () => {
    const results = leggingsLike();
    const copies = results.map((p) => ({ ...p, landedCost: undefined }));
    expect(summarize(enhance(copies, results))).toEqual(summarize(enhance(results, results)));
  });

  it('still measures against the searched item when a filter hides its listings', () => {
    const results = leggingsLike();
    const visible = results.filter((p) => !p.name.includes('Pant 28'));
    const enhanced = enhance(visible, results);
    const crop = byName(enhanced, 'Lulu Align High-Rise Crop 23');
    expect(crop.matchType).toBe('similar');
    expect(crop.similarTo?.name).toBe('Lulu Align Leggings High-Rise Pant 28 Size 8 Black');
    // Group fields only ever describe listings the shopper can see.
    expect(enhanced.every((p) => p.groupSize === 3)).toBe(true);
  });

  it('defaults to the display list as the relevance order (server-rendered category pages)', () => {
    const results = leggingsLike();
    expect(enhance(results)).toEqual(enhance(results, results));
  });
});

describe('same-item groups (unchanged math)', () => {
  it('saves against the median and marks only the first listing at the minimum', () => {
    const enhanced = enhance([
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
    const enhanced = enhance([
      listing({ name: 'Brand Kettle Steel 1.7L', price: 50 }),
      listing({ name: 'Brand Kettle Steel 1.7L', price: 0.01 }),
      listing({ name: 'Brand Kettle Steel 1.7L', price: 45 }),
    ]);
    expect(enhanced.some((p) => p.isLowestInGroup)).toBe(false);
  });

  it('leaves a lone listing that is not a pick unlabeled', () => {
    const enhanced = enhance([
      listing({ name: 'Brand Kettle Steel 1.7L', price: 50 }),
      listing({ name: 'Other Toaster Two Slice', price: 20 }),
    ]);
    expect(enhanced[1]).toEqual(expect.objectContaining({ matchType: undefined, similarTo: undefined }));
    expect(enhanced[1].groupSize).toBeUndefined();
  });
});

// Spec chips, added 2026-09-10 for the landing page pair: "What they
// share" reads specs from both items' listing names (sharedSpecs.ts)
// instead of echoing name words, and the tokenizer reads "Cancelling",
// "Canceling", "Cancellation" and "ANC" as one word and "Bluetooth" as
// "wireless", so listings that spell a feature differently still cluster.
describe('shared spec chips', () => {
  it('clusters listings that spell the same feature differently', () => {
    const enhanced = enhance([
      listing({ name: 'Sony WH-1000XM6 Wireless Noise Canceling Headphones', price: 458, retailer: 'Target' }),
      listing({ name: 'Sony WH-1000XM6 Wireless Noise Cancelling Headphones', price: 459.99, retailer: 'Best Buy' }),
      listing({ name: 'Sony WH-1000XM6 Bluetooth ANC Headphones', price: 449 }),
      listing({ name: 'Sony WH-1000XM6 Headphones with Noise Cancellation', price: 455 }),
    ]);
    expect(enhanced.every((p) => p.groupSize === 4)).toBe(true);
  });

  it('chips are the specs both items state across their listings, in one vocabulary', () => {
    const enhanced = enhance(
      [
        listing({ name: 'Sony WH-1000XM6 Wireless Noise Canceling Headphones', price: 458, retailer: 'Target' }),
        listing({ name: 'Sony WH-1000XM6 Wireless Noise Cancelling Over-Ear Headphones Premium Bluetooth LDAC Audio, 30-Hour Battery', price: 458, retailer: 'Best Buy' }),
        listing({ name: 'Anker Soundcore Space One Wireless Noise Cancelling Headphones', price: 99.99, retailer: 'Target' }),
        listing({ name: 'Anker Soundcore Space One Over-Ear Bluetooth Headphones with Adaptive Noise Cancelling, LDAC Hi-Res Audio and 40H of ANC Playtime', price: 79.99, retailer: 'Target' }),
      ],
      undefined,
      { query: 'sony wh-1000xm6' }
    );
    // LDAC and the 30-hour figure come from the second Sony listing, over-ear
    // from the second Space One listing: an item's specs are its cluster's.
    // Hi-Res is Anker's alone and 40 hours becomes the shared floor of 30.
    expect(byName(enhanced, 'Anker Soundcore Space One Wireless Noise Cancelling Headphones').similarTo).toEqual({
      name: 'Sony WH-1000XM6 Wireless Noise Canceling Headphones',
      savingsPercent: 78,
      sharedSpecs: ['Over ear', 'Active noise canceling', 'LDAC audio', 'Bluetooth', '30+ hr battery'],
    });
  });

  it('falls back to shared name words when the names state no spec in common', () => {
    const enhanced = enhance(ceraveLike());
    expect(byName(enhanced, 'CeraVe Daily Moisturizing Lotion').similarTo?.sharedSpecs).toEqual(['cerave', 'moisturizing']);
  });
});

// Real result sets captured from /api/search-live: four on 2026-09-02 (the
// direct Target feed was returning 403 that day) and five on 2026-09-06,
// the searches the 2026-09-05 live sweep showed misbehaving. Trimmed to the
// fields grouping and seller trust read. These run against the real trust
// registry and pin what real result sets produce; a change here is a
// product decision, not a refactor.
describe('captured live searches', () => {
  type Fixture = { query: string; results: Array<Partial<Product> & { name: string; price: number }> };
  function load(fixture: Fixture): Product[] {
    // The 2026-09-02 captures carry placeholder URLs; a real URL on an
    // unrelated host would (rightly) withhold every verified badge.
    return fixture.results.map(
      (r) => ({ image: '', retailer: 'Store', ...r, url: /example\.test/.test(r.url ?? '') ? '' : (r.url ?? '') }) as Product
    );
  }
  const expected: Array<{
    fixture: Fixture;
    anchor: { name: string; price: number; priceBasis: 'verified' | 'all' };
    picks: string[];
    flagged: string[];
  }> = [
    {
      fixture: stanleyFixture,
      anchor: { name: 'Stanley H2.0 Flowstate Quencher Tumbler', price: 37.5, priceBasis: 'verified' },
      // Every Stanley in the set is a Quencher variant or an accessory.
      picks: [],
      flagged: ['Custom Stanley Quencher H2 O FlowState Tumbler 40oz'],
    },
    {
      fixture: airpods2Fixture,
      anchor: { name: 'Apple AirPods Pro 2', price: 80, priceBasis: 'all' },
      // The model-number listing that used to pass is the same earbuds.
      picks: [],
      flagged: ['Refurbished AirPods Pro 2 with MagSafe Charging Case'],
    },
    {
      fixture: airpods3Fixture,
      // The 2026-09-05 bug: an $84 eBay listing of these earbuds was the
      // "60% less" twin. Apple's price is the reference now, the $34 and
      // $100 "AirPods Pro 3" are flagged, and nothing is a twin.
      anchor: { name: 'Apple AirPods Pro 3', price: 249.99, priceBasis: 'verified' },
      picks: [],
      flagged: [
        'Apple AirPods Pro 3, Wireless Active Noise Cancelling Earbuds with Heart Rate Sensing Feature - White',
        'Airpods Pro 3',
        'Apple AirPods Pro 3 Authentic w/ Noise Cancellation - Verified Serial Number',
      ],
    },
    {
      fixture: ceraveFixture,
      anchor: { name: 'CeraVe Moisturizing Cream', price: 17.99, priceBasis: 'verified' },
      picks: ['CeraVe Daily Moisturizing Lotion'],
      flagged: ['CeraVe Moisturizing Cream, Rich Texture'],
    },
    {
      fixture: dysonFixture,
      // Was "Dyson Airwrap Volume + Shape Styler" from eBay at 47% less.
      anchor: { name: 'Dyson Airwrap Multi-Styler Long', price: 499.99, priceBasis: 'verified' },
      picks: [],
      flagged: [
        'Dyson Airwrap styler',
        'Dyson Airwrap Complete Multi Styler And Dryer - Colors (wand Only)',
        'Dyson Airwrap Multi-Styler Complete Long',
        'Dyson Airwrap Complete Multi Styler And Dryer (wand Only) - Silver',
      ],
    },
    {
      fixture: lululemonFixture,
      anchor: {
        name: 'lululemon Align Leggings | Women\'s High-Rise Pant 28" | Size 8 | Black,Neutral',
        price: 98,
        priceBasis: 'verified',
      },
      // Crops of the same line: a different cut, not a size of the pant.
      picks: [
        "lululemon Women's Align High-Rise Crop 23",
        "Women's lululemon Align High-Rise Ribbed Crop 23",
        'lululemon Capri Leggings | Align High-Rise Crop 23" - Size 12 - | Green,pastel',
        'lululemon Capri Leggings | Align High-Rise Crop 23" - Size 12 - | Blue',
      ],
      flagged: [],
    },
    {
      fixture: nikeFixture,
      // Was "Nike Dunk Low Toddler" as the twin of the kids' Panda.
      anchor: { name: "Nike Men's Dunk Low Retro", price: 120, priceBasis: 'verified' },
      picks: [],
      flagged: [],
    },
    {
      fixture: ninjaFixture,
      // Was the Creami itself from a UK store; pints and lids led the sort.
      anchor: { name: 'Ninja CREAMi Ice Cream Maker for Gelato Mix-ins Milkshakes nc300', price: 219.97, priceBasis: 'verified' },
      picks: [],
      flagged: [
        'Ninja CREAMi Deluxe 11-in-1 Ice Cream and Frozen Treat Maker',
        'Ninja Swirl by Creami',
        'Ninja NC501 CREAMi Deluxe 11-in-1 Ice Cream & Frozen Treat Maker',
      ],
    },
    {
      fixture: sonyFixture,
      anchor: { name: 'Sony WH-1000XM5 Noise-Canceling Wireless Headphones', price: 251.99, priceBasis: 'verified' },
      picks: [],
      // A $22.99 rental listing and a used-market price.
      flagged: ['Sony WH-1000XM5 Premium Wireless Noise Canceling Headphones Black', 'Sony WH-1000XM5 - Navy Blue'],
    },
    // The two searches behind the landing page example, 2026-09-10.
    {
      fixture: sony6Fixture,
      anchor: { name: 'Sony WH-1000XM6 Wireless Noise Canceling Headphones', price: 458, priceBasis: 'verified' },
      // Google Shopping returned no other headphone for this query.
      picks: [],
      flagged: [
        'Sony WH-1000XM6 The Best Wireless Noise Canceling Headphones, HD NC Processor QN3, 12 Microphones, Adaptive NC Optimizer, Mastered by Engineers,',
      ],
    },
    {
      fixture: spaceOneFixture,
      anchor: { name: 'Anker Soundcore Space One Wireless Noise Cancelling Headphones', price: 79.99, priceBasis: 'verified' },
      picks: [],
      // A $33 unknown seller, and a $26 "Space One Pro" from another: the
      // Pro joins the Space One cluster by name overlap (a known limit of
      // the grouping, as with any "Pro" suffix), and is flagged there.
      flagged: [
        'Soundcore by Anker Space One Adaptive Active Noise Cancelling Headphones',
        'Anker Soundcore Space One Pro Wireless Headphones – Adaptive ANC, 50% Ultra-Foldable, Black',
      ],
    },
  ];

  for (const { fixture, anchor, picks, flagged } of expected) {
    it(`"${fixture.query}": anchors on ${anchor.name} at $${anchor.price}, finds ${picks.length} picks, flags ${flagged.length}`, () => {
      const results = load(fixture);
      const options = { query: fixture.query };
      expect(pickAnchor(results, options)).toMatchObject(anchor);
      const enhanced = enhanceProductsWithGroupInfo(results, results, options);
      expect(similarNames(enhanced)).toEqual(picks);
      expect(flaggedNames(enhanced)).toEqual(flagged);
      // The same picks under the price sort the landing page defaults to.
      const cheapestFirst = [...results].sort((a, b) => a.price - b.price);
      expect(similarNames(enhanceProductsWithGroupInfo(cheapestFirst, results, options)).sort()).toEqual([...picks].sort());
    });
  }

  it('the landing page pair: the Space One is a twin of the XM6, and the chips are specs', () => {
    // HERO_COMPARISON in src/app/page.tsx shows this pair at list prices
    // (Best Buy's XM6, Micro Center's Space One). Its "What they share"
    // chips are pinned here so the card never claims more than the matcher
    // produces from Pick's own listings. Multipoint is real on both but in
    // no listing name, so no chip says it.
    const results = [...load(sony6Fixture), ...load(spaceOneFixture)];
    const options = { query: 'sony wh-1000xm6' };
    const enhanced = enhanceProductsWithGroupInfo(results, results, options);
    const microCenter = enhanced.find((p) => p.retailer === 'Micro Center') as EnhancedProduct;
    expect(microCenter.similarTo).toEqual({
      name: 'Sony WH-1000XM6 Wireless Noise Canceling Headphones',
      savingsPercent: 78,
      sharedSpecs: ['Over ear', 'Active noise canceling', 'LDAC audio', 'Bluetooth', '30+ hr battery'],
    });
    expect(similarNames(enhanced)).toEqual([
      'Anker Soundcore Space One Wireless Noise Cancelling Headphones',
      'Anker Soundcore Space One Active Noise Cancelling Wireless Bluetooth Headphones - Black',
    ]);
  });
});
