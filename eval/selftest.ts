// Checks for the harness's own rules. Kept out of the app's vitest suite
// (vitest only collects src/**) so the harness never touches production
// tests. Run: npx tsx eval/selftest.ts

import assert from 'node:assert/strict';
import type { ListingRecord, QueryAnalysis } from './lib/analyze';
import { redactUrl } from './lib/recorder';
import { conditionOf, matchRule, multipackPhrase, promotionalPhrase, termMatches, twinRule, variantStatus } from './lib/rules';
import { sameStore, scoreQuery } from './lib/score';
import type { TestEntry } from './lib/testset';

let passed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('digit terms ignore spacing and punctuation', () => {
  assert.ok(termMatches('Sony WH1000XM5/B Wireless', 'wh-1000xm5'));
  assert.ok(termMatches('Sony WH-1000XM5 Headphones', 'wh 1000 xm5'));
  assert.ok(termMatches('Apple AirPods Pro (3rd Generation)', 'airpods pro 3'));
  assert.ok(!termMatches('Apple AirPods Pro 2', 'airpods pro 3'));
  assert.ok(!termMatches('Sony WF-1000XM5 Earbuds', 'wh-1000xm5'));
});

check('digit terms never match inside a longer number', () => {
  assert.ok(!termMatches('Big Jar 116 oz', '16 oz'));
  assert.ok(!termMatches('Vornado 5330 Fan', '533'));
  assert.ok(termMatches('Vornado 533 Compact Air Circulator', '533'));
  assert.ok(termMatches('Levoit Core 300S Smart', 'core 300'));
});

check('decimal points survive, so 1.6 oz is not 16 oz', () => {
  assert.ok(!termMatches('CeraVe Moisturizing Cream 1.6 oz', '16 oz'));
  assert.ok(termMatches('CeraVe Moisturizing Cream 16 Oz.', '16 oz'));
  assert.ok(termMatches('CeraVe Moisturizing Cream with Pump 16.0 oz', '16 oz'));
  assert.ok(termMatches('EltaMD UV Clear SPF 46, 1.7 oz', '1.7 oz'));
  assert.ok(termMatches('Galanz 3.1 Cu. Ft. Retro Fridge', '3.1 cu ft'));
});

check('word terms match whole words only', () => {
  assert.ok(!termMatches("Women's Better Sweater Jacket", 'mens'));
  assert.ok(termMatches("Levi's Men's 501 Original Fit Jeans", 'levis'));
  assert.ok(termMatches('Beats Studio Buds+ True Wireless', 'studio buds plus'));
  assert.ok(!termMatches('Beats Studio Buds True Wireless', 'studio buds plus'));
});

check("a brand's own store can supply the brand word, never an exclusion", () => {
  const rule = { all: ['uniqlo', 'airism'], none: ['women'] };
  assert.equal(matchRule("Men's AIRism Cotton Oversized T-Shirt", rule, 'Uniqlo').matched, true);
  assert.equal(matchRule("Men's AIRism Cotton Oversized T-Shirt", rule, 'Poshmark').matched, false);
  assert.equal(matchRule('UNIQLO AIRism Tee', { all: ['airism'], none: ['uniqlo'] }, 'Target').matched, false);
});

check('rules: all groups, any alternative, no excluded term', () => {
  const rule = { all: [['airpods 4'], ['noise cancellation', 'anc']], none: ['airpods pro', 'case for'] };
  assert.equal(matchRule('Apple AirPods 4 with Active Noise Cancellation', rule).matched, true);
  assert.equal(matchRule('Apple AirPods 4 Wireless Earbuds', rule).matched, false);
  assert.equal(matchRule('Silicone Case for AirPods 4 ANC', rule).matched, false);
  assert.match(matchRule('Apple AirPods 4 Wireless Earbuds', rule).reason ?? '', /lacks/);
});

check('variants: confirmed, different, unstated', () => {
  const size = { all: ['cerave'], variant: ['16 oz', '453 g'] };
  assert.equal(variantStatus('CeraVe Moisturizing Cream 16 oz', size), 'confirmed');
  assert.equal(variantStatus('CeraVe Moisturizing Cream, 12 Ounce', size), 'different');
  assert.equal(variantStatus('CeraVe Moisturizing Cream Pump', size), 'unstated');
  const edition = { all: ['campbell'], variant: ['12th', 'twelfth'] };
  assert.equal(variantStatus('Campbell Biology (12th Edition)', edition), 'confirmed');
  assert.equal(variantStatus('Campbell Biology, 11th Edition', edition), 'different');
  assert.equal(variantStatus('Campbell Biology', edition), 'unstated');
  const gen = { all: ['bose'], variant: ['2nd gen', 'second gen'] };
  assert.equal(variantStatus('Bose QuietComfort Ultra Earbuds (1st Gen)', gen), 'different');
  assert.equal(variantStatus('Bose QuietComfort Ultra Earbuds', { all: ['bose'] }), 'not-pinned');
});

check('twin names: every word must appear', () => {
  const spec = twinRule('Soundcore Space One');
  assert.ok(matchRule('Soundcore by Anker Space One Wireless Noise Canceling Headphones', spec).matched);
  assert.ok(!matchRule('Soundcore Space Q45', spec).matched);
  assert.ok(!matchRule('Soundcore by Anker Space One Pro', { all: ['space one'], none: ['pro'] }).matched);
});

check('condition comes from the title, then the kind of store', () => {
  assert.equal(conditionOf('Apple AirPods Pro 3 (Renewed)', 'Best Buy'), 'refurbished');
  assert.equal(conditionOf('Sony WH-1000XM5 - Open Box', 'eBay'), 'open-box');
  assert.equal(conditionOf('Pre-Owned Levi 501 jeans', 'eBay'), 'used');
  assert.equal(conditionOf('Sony WH-1000XM5 Wireless Headphones', 'Best Buy'), 'new');
  assert.equal(conditionOf('Uniqlo Airism Oversized T-shirt', 'Poshmark'), 'resale');
  assert.equal(conditionOf('Chemistry: The Central Science', 'Walmart - ThriftBooks'), 'resale');
  assert.equal(conditionOf('Chemistry: The Central Science', 'AbeBooks.com'), 'resale');
  assert.equal(conditionOf('Sony WH-1000XM5', 'Rent-A-Center'), 'lease');
  assert.equal(conditionOf('Sony WH-1000XM5', 'eBay'), 'new');
  assert.equal(conditionOf('Chemistry: The Central Science', 'VitalSource'), 'digital');
});

check('custom and promotional listings are caught', () => {
  assert.ok(promotionalPhrase('3 Custom Nutribullet Pro 900-watt Blender - Promotional in Bulk'));
  assert.ok(promotionalPhrase('Chemistry - The Central Science (Custom Edition for Temple University)'));
  assert.equal(promotionalPhrase('NutriBullet Pro 900W Personal Blender'), null);
});

check('multipacks and bundles are caught, single units are not', () => {
  assert.ok(multipackPhrase('CeraVe Moisturizing Cream 16 oz, 2 Pack'));
  assert.ok(multipackPhrase('Brita Filters, Pack of 3'));
  assert.ok(multipackPhrase('CeraVe Cream 2 x 16 oz'));
  assert.ok(multipackPhrase('Sony WH-1000XM5 Bundle with Hard Case'));
  assert.ok(multipackPhrase('CeraVe Daily Moisturizing Cream 16 oz. + Pump 12 oz'));
  assert.ok(multipackPhrase('Wireless Earbuds 2 Pcs'));
  assert.ok(multipackPhrase('Disney Dash 2pc MultiMaker Mini Waffle Maker'));
  assert.equal(multipackPhrase('NutriBullet NB9-1301K Pro 13 Pcs Onyx Black, 900W'), null);
  assert.equal(multipackPhrase('CeraVe Moisturizing Cream 16 oz (453 g)'), null);
  assert.equal(multipackPhrase('Brita Everyday 10 Cup Pitcher with 1 Filter, 1 Count'), null);
  assert.equal(multipackPhrase('Sony WH-1000XM5 Wireless Headphones'), null);
  assert.equal(multipackPhrase('Samsung 1920x1080 Monitor'), null);
});

check('store matching', () => {
  assert.ok(sameStore('Best Buy', 'bestbuy.com'));
  assert.ok(sameStore('Walmart - SellerCo', 'Walmart'));
  assert.ok(sameStore('Barnes & Noble', 'Barnes and Noble'));
  assert.ok(!sameStore('Target', 'Walmart'));
  assert.ok(!sameStore('Target', ''));
});

check('secrets never reach a snapshot URL', () => {
  const url = redactUrl('https://redsky.target.com/x?key=abc123&channel=WEB&keyword=cerave');
  assert.ok(!url.includes('abc123'));
  assert.ok(url.includes('key=REDACTED') && url.includes('keyword=cerave'));
});

// ─── Scoring ───────────────────────────────────────────────────────────

function listing(over: Partial<ListingRecord>): ListingRecord {
  return {
    displayRank: 1,
    relevanceRank: 1,
    source: 'google-shopping',
    name: 'Item',
    store: 'Best Buy',
    url: '',
    currency: 'USD',
    itemPrice: 100,
    originalPrice: null,
    rating: null,
    reviewCount: null,
    trustLevel: 'verified',
    trustLabel: 'Verified retailer',
    condition: 'new',
    multipack: null,
    productType: null,
    promotional: null,
    exactName: true,
    variant: 'not-pinned',
    likeForLike: true,
    notLikeForLike: null,
    exactNameMiss: null,
    cost: { resolution: 'resolved', summary: 'Total $108.00', shipping: 0, shippingSource: 'x', tax: 8, preTax: 100, total: 108 },
    pick: { matchType: null, groupId: null, groupSize: 1, chip: null, isLowestInGroup: false, similarTo: null, priceFlagReference: null, inAnchorCluster: true },
    ...over,
  };
}

const itemOnly = (over: Partial<ListingRecord>) =>
  listing({
    trustLevel: 'unknown',
    trustLabel: 'Unverified seller',
    cost: { resolution: 'unavailable', summary: 'Total cost unavailable', shipping: null, shippingSource: null, tax: null, preTax: null, total: null },
    ...over,
  });

function analysis(listings: ListingRecord[]): QueryAnalysis {
  const lfl = listings.filter((l) => l.likeForLike);
  return {
    id: 'x', query: 'x', category: 'c', exactItem: 'x', capturedAt: '2026-09-22T12:00:00.000Z',
    sources: { googleShopping: 'ok 200', targetDirect: 'ok 200', googleShoppingItems: 1, targetDirectItems: 1 },
    listings, anchor: null,
    counts: { listings: listings.length, exactName: listings.filter((l) => l.exactName).length, likeForLike: lfl.length, variantUnstated: 0, differentVariant: 0, notNew: 0, multipack: 0, possibleScam: 0, likeForLikeInAnchor: lfl.length },
    pickTopExact: lfl[0] ?? null, pickTopExactBasis: lfl[0] ? (lfl[0].cost.preTax === null ? 'item' : 'total') : null,
    cheapestAnywhere: null, lowestMarkedOnAnchor: null, twins: [],
  };
}

function entry(total: number | null, store = 'Walmart', itemPrice: number | null = null): TestEntry {
  return {
    id: 'x', query: 'x', category: 'c',
    exactItem: { description: '', match: {} },
    benchmark: { totalPrice: total, itemPrice, shipping: null, store, url: '', checkedOn: '2026-09-23', notes: '' },
    acceptableTwins: null,
  };
}

check('within 3% either way is a match; the boundary counts', () => {
  const a = analysis([listing({})]);
  assert.equal(scoreQuery(entry(97.09), a).priceStatus, 'within-3pct');
  assert.equal(scoreQuery(entry(103), a).priceStatus, 'within-3pct');
  assert.equal(scoreQuery(entry(null), a).priceStatus, 'not-benchmarked');
  assert.equal(scoreQuery(entry(97.09), a).driftDays, 1);
});

check("Pick's top listing far under the benchmark is flagged for review, not a win", () => {
  const a = analysis([listing({ itemPrice: 50, cost: { ...listing({}).cost, preTax: 50 } })]);
  const s = scoreQuery(entry(100), a);
  assert.equal(s.priceStatus, 'pick-cheaper');
  assert.equal(s.coverage, 'has-price');
});

check('a bait price at the top does not hide a coverage miss', () => {
  const bait = listing({ itemPrice: 15, cost: { ...listing({}).cost, preTax: 15 } });
  const s = scoreQuery(entry(100), analysis([bait]));
  assert.equal(s.priceStatus, 'pick-cheaper');
  assert.equal(s.coverage, 'missed');
});

check('a cheaper price lower in the results is a ranking miss, not a coverage miss', () => {
  const top = listing({ itemPrice: 120, cost: { ...listing({}).cost, preTax: 120 } });
  const buried = itemOnly({ displayRank: 9, itemPrice: 99, store: 'Some Shop' });
  const s = scoreQuery(entry(100), analysis([top, buried]));
  assert.equal(s.priceStatus, 'pick-higher');
  assert.equal(s.coverage, 'has-price');
  assert.match(s.note, /at #9, below its top exact listing/);
});

check('a bait price lower down does not count as having it', () => {
  const top = listing({ itemPrice: 120, cost: { ...listing({}).cost, preTax: 120 } });
  const bait = itemOnly({ displayRank: 20, itemPrice: 15 });
  assert.equal(scoreQuery(entry(100), analysis([top, bait])).coverage, 'missed');
});

check("the benchmark store's listing, set aside by the rules, is a matching miss", () => {
  const top = listing({ itemPrice: 120, cost: { ...listing({}).cost, preTax: 120 } });
  const walmartUsed = listing({ store: 'Walmart', itemPrice: 99, likeForLike: false, condition: 'used', notLikeForLike: 'used' });
  const s = scoreQuery(entry(100, 'Walmart'), analysis([top, walmartUsed]));
  assert.equal(s.coverage, 'not-counted');
  assert.match(s.note, /set aside \(used\)/);
});

check('item-only listings compare with the benchmark item price when given', () => {
  const a = analysis([itemOnly({ itemPrice: 100 })]);
  const s = scoreQuery(entry(110, 'Walmart', 100), a);
  assert.equal(s.basis, 'item');
  assert.equal(s.priceStatus, 'within-3pct');
});

check('no exact listing is its own status, and counts as missed when nothing is close', () => {
  const s = scoreQuery(entry(100), analysis([]));
  assert.equal(s.priceStatus, 'no-exact-listing');
  assert.equal(s.coverage, 'missed');
});

console.log(`eval selftest: ${passed} checks passed`);
