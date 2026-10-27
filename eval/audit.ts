// Phase 2 audit: where Pick loses the lowest price.
//
// Replays a captured run through Pick's current code (free, no API calls)
// and measures each failure area with examples: product matching,
// variants, bundles and multipacks, condition, total cost, freshness,
// seller trust, coverage, and twins. Nothing here needs benchmarks; every
// number compares Pick's output with its own raw feed and with the test
// set's exact-item rules. Re-run it after a fix to see the numbers move.
//
// Usage (from the repo root):
//   npx tsx eval/audit.ts                      audit the newest run
//   npx tsx eval/audit.ts --run eval/runs/<id> [--out <dir>]

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseFirstPrice } from '../src/lib/scrapers';
import { collapse, splitSellerSuffix } from '../src/lib/trust/identity';
import { knownCost, type ListingRecord, type QueryAnalysis } from './lib/analyze';
import { conditionOf, matchRule, multipackPhrase, promotionalPhrase, variantStatus } from './lib/rules';
import { latestRun, rawShoppingItems, replayRun, ROOT, type Replayed } from './lib/runs';
import { loadTestSet } from './lib/testset';

// ─── Small helpers ───────────────────────────────────────────────────────

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const money = (n: number | null | undefined) => (n === null || n === undefined ? 'n/a' : `$${n.toFixed(2)}`);
const share = (n: number, d: number) => (d === 0 ? 'n/a' : `${n} of ${d} (${Math.round((n / d) * 100)}%)`);
const short = (s: string, max = 70) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const md = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const lfl = (a: QueryAnalysis) => a.listings.filter((l) => l.likeForLike);
const describe = (l: ListingRecord) =>
  `${short(l.name, 60)} (${l.store}, ${l.trustLabel}, ${money(knownCost(l))}${l.cost.preTax === null ? ' item only' : ' item + ship'}, #${l.displayRank})`;

/** Median item price of like-for-like listings at stores Pick verifies. */
function verifiedMedian(a: QueryAnalysis): number | null {
  return median(lfl(a).filter((l) => l.trustLevel === 'verified').map((l) => l.itemPrice));
}

/** A listing name token that looks like a model number, part number, ISBN or barcode. */
function hasIdentifier(name: string): boolean {
  if (/\b97[89][\d-]{10,14}\b/.test(name) || /\b\d{12,13}\b/.test(name)) return true;
  return name
    .split(/[\s,;:()[\]|]+/)
    .map((t) => t.replace(/[^a-z0-9/-]/gi, ''))
    .some(
      (t) =>
        t.length >= 3 &&
        /[a-z]/i.test(t) &&
        /\d/.test(t) &&
        !/^\d+(?:[./-]\d+)?-?(?:oz|ml|g|qt|w|mah|hr|hrs|h|in|ft|lb|lbs|pk|pcs|ct|cup|cups|gb|tb|mm|cm|l|st|nd|rd|th|x|k|p|s|pack|piece|inch|ounce|quart|watt|hour|count|ea|pc|gen)$/i.test(t) &&
        !/^\d+in\d+$/i.test(t) &&
        !/^(?:spf|ipx?|bt|usb|v)\d/i.test(t)
    );
}

/** Units in a multipack phrase ("2 pack", "pack of 3"), or null when not a count. */
function packCount(phrase: string): number | null {
  const m =
    /(\d+)\s*-?\s*(?:pack|pk|count|ct|pcs|pieces)\b/i.exec(phrase) ??
    /(?:pack|set|lot|case|box)\s+of\s+(\d+)/i.exec(phrase) ??
    /(\d+)\s*x\s*\d/i.exec(phrase);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n >= 2 ? n : null;
}

// Major US stores by category, as collapsed store names. A listing counts
// as the store's own when its collapsed name starts with the key and it is
// not a "Store - Seller" marketplace listing.
const MAJORS: Record<string, string[]> = {
  all: ['amazon', 'walmart', 'target', 'bestbuy', 'costco', 'samsclub', 'kohls', 'macys', 'nordstrom', 'homedepot', 'lowes'],
  earbuds: ['apple', 'samsung', 'sony', 'bose', 'beats', 'google', 'bhphoto', 'newegg', 'adorama', 'microcenter', 'crutchfield'],
  headphones: ['apple', 'samsung', 'sony', 'bose', 'beats', 'bhphoto', 'newegg', 'adorama', 'microcenter', 'crutchfield'],
  skincare: ['ulta', 'sephora', 'cvs', 'walgreens', 'dermstore', 'cerave', 'larocheposay', 'theordinary', 'neutrogena', 'cetaphil', 'eltamd', 'paulaschoice', 'supergoop'],
  'dorm appliances': ['keurig', 'sharkninja', 'ninja', 'shark', 'galanz', 'dash', 'vornado', 'brita', 'nutribullet', 'levoit', 'bedbathbeyond', 'wayfair'],
  textbooks: ['chegg', 'barnesnoble', 'bkstr', 'ecampus', 'textbookscom', 'pearson', 'cengage', 'wiley', 'mitpress', 'booksamillion', 'thriftbooks', 'abebooks'],
  clothing: ['levis', 'nike', 'carhartt', 'uniqlo', 'lululemon', 'converse', 'adidas', 'patagonia', 'rei', 'dickssportinggoods', 'zappos', 'footlocker', 'jcpenney'],
};

function isStoresOwn(store: string, key: string): boolean {
  if (splitSellerSuffix(store)) return false;
  return collapse(store).startsWith(key);
}

// ─── The audit ───────────────────────────────────────────────────────────

interface Section {
  title: string;
  lines: string[];
  data: Record<string, unknown>;
}

function matching(runs: Replayed[]): Section {
  const lines: string[] = [];
  const withAnchor = runs.filter((r) => r.analysis.anchor);
  let clusterSize = 0;
  let clusterExact = 0;
  let lflTotal = 0;
  let lflInAnchor = 0;
  const wrongAnchor: string[] = [];
  const wrongMerges: string[] = [];
  const refOff: string[] = [];
  const fragments: number[] = [];
  for (const { analysis: a } of withAnchor) {
    const rep = a.listings.find((l) => l.name === a.anchor?.name);
    if (rep && !rep.exactName) wrongAnchor.push(`${a.query}: Pick's searched item is "${short(rep.name, 60)}" (${rep.exactNameMiss})`);
    const cluster = a.listings.filter((l) => l.pick.inAnchorCluster);
    clusterSize += cluster.length;
    clusterExact += cluster.filter((l) => l.exactName).length;
    for (const l of cluster.filter((x) => !x.exactName).slice(0, 2)) {
      wrongMerges.push(`${a.query}: "${short(l.name, 60)}" (${l.store}, ${money(l.itemPrice)}; ${l.exactNameMiss})`);
    }
    const items = lfl(a);
    lflTotal += items.length;
    lflInAnchor += items.filter((l) => l.pick.inAnchorCluster).length;
    if (items.length > 0) fragments.push(new Set(items.map((l, i) => l.pick.groupId ?? `solo-${i}`)).size);
    const vm = verifiedMedian(a);
    if (a.anchor && vm) {
      const ratio = a.anchor.referencePrice / vm;
      if (ratio > 1.3 || ratio < 0.7) {
        refOff.push(`${a.query}: Pick's reference ${money(a.anchor.referencePrice)} (${a.anchor.priceBasis} basis) vs verified stores' median ${money(vm)} for the exact item`);
      }
    }
  }
  const byCategory = new Map<string, { lfl: number; withId: number }>();
  for (const { analysis: a } of runs) {
    const c = byCategory.get(a.category) ?? { lfl: 0, withId: 0 };
    for (const l of lfl(a)) {
      c.lfl += 1;
      if (hasIdentifier(l.name)) c.withId += 1;
    }
    byCategory.set(a.category, c);
  }

  lines.push(
    `- Pick settled on a searched-item cluster for ${share(withAnchor.length, runs.length)} queries; in ${wrongAnchor.length} of them the cluster's lead listing is not the exact item.`,
    `- Precision: ${share(clusterExact, clusterSize)} listings in Pick's searched-item cluster are the exact item by name. The rest are other products merged in.`,
    `- Recall: ${share(lflInAnchor, lflTotal)} like-for-like listings of the exact item made it into that cluster. The rest sit in other clusters or alone, so they never count toward the item's lowest price or its reference price.`,
    `- The exact item's like-for-like listings are spread across a median of ${median(fragments) ?? 'n/a'} separate clusters per query.`,
    `- Pick's reference price (what twins and "Save" chips are measured against) is off by more than 30% from the verified-store median for the exact item in ${refOff.length} queries.`,
    '',
    '| Category | Like-for-like listings | Title carries a model, part or ISBN number |',
    '| --- | --- | --- |',
    ...[...byCategory.entries()].map(([c, v]) => `| ${c} | ${v.lfl} | ${share(v.withId, v.lfl)} |`),
    '',
  );
  if (wrongAnchor.length) lines.push('Searched item is the wrong product:', '', ...wrongAnchor.slice(0, 8).map((s) => `- ${md(s)}`), '');
  if (wrongMerges.length) lines.push('Other products merged into the searched-item cluster (examples):', '', ...wrongMerges.slice(0, 10).map((s) => `- ${md(s)}`), '');
  if (refOff.length) lines.push('Reference price far from what verified stores charge:', '', ...refOff.slice(0, 8).map((s) => `- ${md(s)}`), '');
  return {
    title: '1. Product matching',
    lines,
    data: { withAnchor: withAnchor.length, wrongAnchor, clusterSize, clusterExact, lflTotal, lflInAnchor, medianFragments: median(fragments), refOff, identifiers: Object.fromEntries(byCategory) },
  };
}

function variants(runs: Replayed[]): Section {
  const lines: string[] = [];
  const pinned = runs.filter((r) => (r.entry.exactItem.match.variant ?? []).length > 0);
  let confirmed = 0;
  let unstated = 0;
  let different = 0;
  const mixedClusters: string[] = [];
  const cheaperUnstated: string[] = [];
  const topUnstated: string[] = [];
  for (const { analysis: a } of pinned) {
    const exact = a.listings.filter((l) => l.exactName);
    confirmed += exact.filter((l) => l.variant === 'confirmed').length;
    unstated += exact.filter((l) => l.variant === 'unstated').length;
    different += exact.filter((l) => l.variant === 'different').length;
    const diffInCluster = exact.filter((l) => l.variant === 'different' && l.pick.inAnchorCluster);
    if (diffInCluster.length > 0) {
      mixedClusters.push(`${a.query}: ${diffInCluster.length} listing(s) of another size, edition or generation grouped as the searched item, e.g. "${short(diffInCluster[0].name, 60)}" at ${money(diffInCluster[0].itemPrice)}`);
    }
    const u = median(lfl(a).filter((l) => l.variant === 'unstated').map((l) => l.itemPrice));
    const c = median(lfl(a).filter((l) => l.variant === 'confirmed').map((l) => l.itemPrice));
    if (u !== null && c !== null && u < c * 0.9) {
      cheaperUnstated.push(`${a.query}: listings that do not state the size or edition cost a median ${money(u)}, those that state it ${money(c)}`);
    }
    if (a.pickTopExact?.variant === 'unstated') topUnstated.push(`${a.query}: ${describe(a.pickTopExact)}`);
  }
  // Other models or years pulled into the cluster, by the test entry's own exclusions.
  const modelMix: string[] = [];
  for (const { analysis: a } of runs) {
    for (const l of a.listings.filter((x) => x.pick.inAnchorCluster && !x.exactName)) {
      const m = /^has "(.+)"$/.exec(l.exactNameMiss ?? '');
      if (m && (/\d/.test(m[1]) || /\bgen\b|edition|pro|plus|max|mini|lite|xl|ultra/i.test(m[1]))) {
        modelMix.push(`${a.query}: "${short(l.name, 60)}" at ${money(l.itemPrice)} (${m[1]})`);
      }
    }
  }
  lines.push(
    `- ${pinned.length} entries pin a size, edition or generation. Across their exact-item listings the title states the pinned one ${confirmed} times, states a different one ${different} times, and states none ${unstated} times (${share(unstated, confirmed + unstated + different)}).`,
    `- Pick's top exact listing states no size, edition or generation in ${topUnstated.length} of those ${pinned.length} queries.`,
    `- In ${mixedClusters.length} queries Pick grouped a different stated size, edition or generation with the searched item.`,
    `- In ${cheaperUnstated.length} queries, listings that do not state the variant are at least 10% cheaper than those that do, a sign that some are a smaller size or an older edition.`,
    `- Other models or model years grouped as the searched item: ${modelMix.length} listings.`,
    '',
  );
  if (topUnstated.length) lines.push("Pick's top exact listing does not say which variant it is:", '', ...topUnstated.slice(0, 10).map((s) => `- ${md(s)}`), '');
  if (mixedClusters.length) lines.push('Different variant grouped as the searched item:', '', ...mixedClusters.slice(0, 8).map((s) => `- ${md(s)}`), '');
  if (cheaperUnstated.length) lines.push('Unstated variant priced like a different one:', '', ...cheaperUnstated.slice(0, 8).map((s) => `- ${md(s)}`), '');
  if (modelMix.length) lines.push('Other models or years in the cluster (examples):', '', ...modelMix.slice(0, 10).map((s) => `- ${md(s)}`), '');
  return {
    title: '2. Variants (size, color, storage, edition, model year)',
    lines,
    data: { pinned: pinned.length, confirmed, unstated, different, topUnstated, mixedClusters, cheaperUnstated, modelMix },
  };
}

function bundles(runs: Replayed[]): Section {
  const lines: string[] = [];
  let total = 0;
  let inCluster = 0;
  let aboveTop = 0;
  let markedLowest = 0;
  const perUnitCheaper: string[] = [];
  const perUnitHidden: string[] = [];
  const ranked: string[] = [];
  for (const { analysis: a } of runs) {
    const packs = a.listings.filter((l) => l.exactName && l.multipack);
    total += packs.length;
    inCluster += packs.filter((l) => l.pick.inAnchorCluster).length;
    const top = a.pickTopExact;
    for (const l of packs) {
      if (top && l.displayRank < top.displayRank) {
        aboveTop += 1;
        ranked.push(`${a.query}: "${short(l.name, 60)}" ${money(l.itemPrice)} at #${l.displayRank}, above the first single unit (#${top.displayRank}, ${money(top.itemPrice)})`);
      }
      if (l.pick.isLowestInGroup) markedLowest += 1;
      // Per unit is only fair against the same size: packs whose title
      // states the pinned size (or entries that pin none), against single
      // units that do the same.
      const sameSize = (x: ListingRecord) => x.variant === 'confirmed' || x.variant === 'not-pinned';
      const n = sameSize(l) ? packCount(l.multipack ?? '') : null;
      const single = median(lfl(a).filter(sameSize).map((x) => x.itemPrice));
      if (n && single) {
        const unit = l.itemPrice / n;
        const line = `${a.query}: "${short(l.name, 55)}" ${money(l.itemPrice)} for ${n} = ${money(unit)} each, vs ${money(single)} median single unit`;
        if (unit < single * 0.97) perUnitCheaper.push(line);
        else perUnitHidden.push(line);
      }
    }
  }
  lines.push(
    `- ${total} listings of the exact item are multipacks or bundles; ${inCluster} of them sit in Pick's searched-item cluster, where their pack price mixes with single-unit prices.`,
    `- ${aboveTop} multipack or bundle listings rank above the first single unit in Pick's default sort; ${markedLowest} carry Pick's lowest-price marker for their group.`,
    `- Pick computes no per-unit price anywhere. Among packs of the same stated size as the single unit, ${perUnitCheaper.length} are cheaper per unit than the median single unit: savings a shopper cannot see.`,
    '',
  );
  if (ranked.length) lines.push('Packs and bundles ranked above the single unit:', '', ...ranked.slice(0, 8).map((s) => `- ${md(s)}`), '');
  if (perUnitCheaper.length) lines.push('Cheaper per unit, shown only as a pack price:', '', ...perUnitCheaper.slice(0, 8).map((s) => `- ${md(s)}`), '');
  return { title: '3. Bundles and multipacks', lines, data: { total, inCluster, aboveTop, markedLowest, perUnitCheaper, perUnitHidden } };
}

function condition(runs: Replayed[]): Section {
  const lines: string[] = [];
  const counts: Record<string, number> = {};
  const aboveTop: string[] = [];
  const firstIsNotNew: string[] = [];
  const lowestOnNotNew: string[] = [];
  let twinsNotNew = 0;
  for (const { analysis: a } of runs) {
    const exact = a.listings.filter((l) => l.exactName);
    for (const l of exact) counts[l.condition] = (counts[l.condition] ?? 0) + 1;
    const top = a.pickTopExact;
    const notNew = exact.filter((l) => l.condition !== 'new');
    const above = notNew.filter((l) => !top || l.displayRank < top.displayRank);
    if (above.length > 0) aboveTop.push(`${a.query}: ${above.length} ranked above the first new unit, e.g. ${describe(above[0])} [${above[0].condition}]`);
    if (exact[0] && exact[0].condition !== 'new') firstIsNotNew.push(`${a.query}: ${describe(exact[0])} [${exact[0].condition}]`);
    for (const l of notNew.filter((x) => x.pick.isLowestInGroup)) lowestOnNotNew.push(`${a.query}: ${describe(l)} [${l.condition}]`);
    twinsNotNew += a.twins.filter((t) => t.condition !== 'new').length;
  }
  const exactTotal = Object.values(counts).reduce((x, y) => x + y, 0);
  lines.push(
    `- Of ${exactTotal} exact-item listings, by title and store: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
    '- Pick shows no condition on its cards. The feed has no condition field, so a shopper learns it only when a seller writes it into the title; resale, auction and lease stores are never marked.',
    `- In ${aboveTop.length} queries a used, refurbished, open-box, resale or lease listing of the item ranks above the first new unit in the default sort.`,
    `- In ${firstIsNotNew.length} queries the very first listing of the item a shopper sees is not a new unit.`,
    `- Pick's lowest-price marker lands on a non-new listing ${lowestOnNotNew.length} times (it only screens condition words in titles, not resale stores). Twins that are not new: ${twinsNotNew}.`,
    '',
  );
  if (aboveTop.length) lines.push('Not-new listings ranked above the first new unit:', '', ...aboveTop.slice(0, 10).map((s) => `- ${md(s)}`), '');
  if (lowestOnNotNew.length) lines.push('Lowest-price marker on a not-new listing:', '', ...lowestOnNotNew.slice(0, 8).map((s) => `- ${md(s)}`), '');
  return { title: '4. Condition', lines, data: { counts, aboveTop, firstIsNotNew, lowestOnNotNew, twinsNotNew } };
}

function totalCost(runs: Replayed[]): Section {
  const lines: string[] = [];
  const resolution: Record<string, number> = {};
  const resolutionLfl: Record<string, number> = {};
  const shipping: Record<string, number> = {};
  const buried: string[] = [];
  const buriedAny: string[] = [];
  let gapSum = 0;
  for (const { analysis: a } of runs) {
    for (const l of a.listings) {
      resolution[l.cost.resolution] = (resolution[l.cost.resolution] ?? 0) + 1;
      const src = l.cost.shippingSource;
      const kind = src === null ? 'unknown' : src.startsWith('shipping-policy') ? 'store policy' : src.startsWith('shipping-estimate') ? 'USPS estimate' : 'other';
      shipping[kind] = (shipping[kind] ?? 0) + 1;
    }
    for (const l of lfl(a)) resolutionLfl[l.cost.resolution] = (resolutionLfl[l.cost.resolution] ?? 0) + 1;
    const top = a.pickTopExact;
    const vm = verifiedMedian(a);
    if (!top) continue;
    const below = lfl(a).filter((l) => l.displayRank > top.displayRank && knownCost(l) < knownCost(top) - 0.005);
    const credibleBelow = below.filter((l) => l.trustLevel === 'verified');
    if (credibleBelow.length > 0) {
      const best = credibleBelow.reduce((x, y) => (knownCost(y) < knownCost(x) ? y : x));
      gapSum += knownCost(top) - knownCost(best);
      buried.push(`${a.query}: top is ${describe(top)}; ${describe(best)} is cheaper but ranks lower (${best.cost.summary})`);
    }
    const plausible = below.filter((l) => !vm || l.itemPrice >= vm * 0.5);
    if (plausible.length > 0) buriedAny.push(a.query);
  }
  lines.push(
    `- Every listing, by what Pick can total: ${Object.entries(resolution).map(([k, v]) => `${k} ${v}`).join(', ')}. Like-for-like listings of the exact item: ${Object.entries(resolutionLfl).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
    `- Where Pick's shipping figure comes from: ${Object.entries(shipping).map(([k, v]) => `${k} ${v}`).join(', ')}. No source quotes shipping; the figure is a store's published policy or a USPS retail estimate by product type, and unknown for every store Pick has not reviewed.`,
    "- The default sort ranks complete totals first, then partial totals (a verified store with no shipping figure), then everything Pick cannot total, in search order rather than by price. Tax needs the shopper's state; without one, no US total is complete.",
    `- In ${buried.length} queries a verified store sells the exact item for less than Pick's top exact listing but ranks lower, because Pick could not total it. The gaps add up to ${money(gapSum)}.`,
    `- Counting any seller at a plausible price (at least half the verified median), a cheaper like-for-like listing ranks below Pick's top exact listing in ${buriedAny.length} queries.`,
    '- The "Same item · Save $X" chip compares item prices only, so it can disagree with the total-cost order on the same page.',
    '',
  );
  if (buried.length) lines.push('Cheaper at a verified store, ranked lower:', '', ...buried.slice(0, 10).map((s) => `- ${md(s)}`), '');
  return { title: '5. Total cost (shipping and tax)', lines, data: { resolution, resolutionLfl, shipping, buried, gapSum, buriedAny } };
}

function freshness(runs: Replayed[]): Section {
  const captured = runs.map((r) => r.snapshot.capturedAt).sort();
  return {
    title: '6. Freshness',
    lines: [
      `- This run was captured ${captured[0]} to ${captured[captured.length - 1]}. Google Shopping via Serper returns no timestamp, so the age of the price at the store is unknown to Pick.`,
      '- Pick fetches at search time and caches each query for 30 minutes (1 minute for empty results); category pages are rebuilt at most hourly on top of that cache.',
      '- Each card says "Price verified <month day>", which is the time Pick fetched Google\'s copy, not a check with the store. The results header says "Prices checked N minutes ago" from the same time.',
      '- There is no maximum age: a cached price is shown for up to 30 minutes with its age visible in the header only.',
      '',
    ],
    data: { captured: [captured[0], captured[captured.length - 1]] },
  };
}

function trust(runs: Replayed[]): Section {
  const lines: string[] = [];
  let flagged = 0;
  const flaggedTop: string[] = [];
  const flaggedFirstByPrice: string[] = [];
  const bait: string[] = [];
  let baitFlaggedByPick = 0;
  const baitAtTop: string[] = [];
  const lowVerifiedTop: string[] = [];
  const unverified = new Map<string, number>();
  let baitTotal = 0;
  for (const { analysis: a } of runs) {
    const vm = verifiedMedian(a);
    for (const l of a.listings) {
      if (l.trustLevel === 'flagged') {
        flagged += 1;
        if (l.displayRank === 1) flaggedTop.push(`${a.query}: ${describe(l)}`);
      }
      if (l.trustLevel === 'unknown' && !splitSellerSuffix(l.store)) unverified.set(l.store, (unverified.get(l.store) ?? 0) + 1);
    }
    // "Item price: Low to High" is one click away; what leads it?
    const byPrice = [...a.listings].sort((x, y) => x.itemPrice - y.itemPrice);
    const firstExact = byPrice.find((l) => l.exactName);
    if (firstExact && firstExact.trustLevel === 'flagged') flaggedFirstByPrice.push(`${a.query}: ${describe(firstExact)}`);
    if (vm) {
      // Bait is a price only a seller Pick does not stand behind can set: a
      // verified store's own low price is a sale or another variant.
      for (const l of lfl(a).filter((x) => x.trustLevel !== 'verified' && x.itemPrice < vm * 0.5)) {
        baitTotal += 1;
        if (l.pick.priceFlagReference !== null) baitFlaggedByPick += 1;
        if (bait.length < 12) bait.push(`${a.query}: ${describe(l)} vs verified median ${money(vm)}`);
      }
      const top = a.pickTopExact;
      if (top && top.itemPrice < vm * 0.6) {
        (top.trustLevel === 'verified' ? lowVerifiedTop : baitAtTop).push(
          `${a.query}: top exact listing ${describe(top)}${top.variant === 'unstated' ? ' [size/edition not stated]' : ''} vs verified median ${money(vm)}`
        );
      }
    }
  }
  const topUnverified = [...unverified.entries()].sort((x, y) => y[1] - x[1]).slice(0, 25);
  lines.push(
    `- Possible scam listings in the results: ${flagged}. None can rank first in the default sort (Pick cannot total them, so they sink): ${flaggedTop.length} did. Under "Item price: Low to High", a Possible scam listing is the first listing of the exact item in ${flaggedFirstByPrice.length} queries.`,
    `- Bait prices: ${baitTotal} like-for-like listings from sellers Pick does not verify are priced under half of what verified stores charge. Pick flags ${baitFlaggedByPick} of them internally, but the flag is never shown; it only withholds chips. On the card they read "Unverified seller" or "Marketplace", the same as an honest listing from that kind of seller.`,
    `- In ${baitAtTop.length} queries the top exact listing, from a seller Pick does not verify, is under 60% of the verified median: the price Pick presents first is very likely not a real new unit. In ${lowVerifiedTop.length} more the top is a verified store's own price that low: a real sale, or a smaller size or older model the title does not name.`,
    '- Stores that are real but unrecognized show "Unverified seller" and cannot be totaled, which also sinks them in the default sort. Most frequent unrecognized store names in this run:',
    '',
    topUnverified.map(([s, n]) => `${s} (${n})`).join(', '),
    '',
  );
  if (baitAtTop.length) lines.push('Bait at the top of the default sort:', '', ...baitAtTop.map((s) => `- ${md(s)}`), '');
  if (lowVerifiedTop.length) lines.push("A verified store's own price far under the verified median (sale or unnamed variant):", '', ...lowVerifiedTop.map((s) => `- ${md(s)}`), '');
  if (bait.length) lines.push('Bait prices among like-for-like listings (examples):', '', ...bait.slice(0, 10).map((s) => `- ${md(s)}`), '');
  if (flaggedFirstByPrice.length) lines.push('Possible scam first under Item price: Low to High:', '', ...flaggedFirstByPrice.map((s) => `- ${md(s)}`), '');
  return { title: '7. Seller trust', lines, data: { flagged, flaggedTop, flaggedFirstByPrice, baitTotal, baitFlaggedByPick, baitAtTop, lowVerifiedTop, topUnverified } };
}

function coverage(runs: Replayed[]): Section {
  const lines: string[] = [];
  const dropped: Record<string, number> = { 'invalid price': 0, 'same title as another store': 0, 'relevance filter': 0 };
  const droppedLfl: Record<string, number> = { 'invalid price': 0, 'same title as another store': 0, 'relevance filter': 0 };
  const lostLowest: string[] = [];
  const relevanceLost: string[] = [];
  const depth: number[] = [];
  const kept: number[] = [];
  let rawTotal = 0;
  let targetOk = 0;
  const presence = new Map<string, { raw: number; kept: number; queries: number }>();
  for (const r of runs) {
    const a = r.analysis;
    const entry = r.entry;
    const raw = rawShoppingItems(r.snapshot);
    rawTotal += raw.length;
    depth.push(raw.length);
    kept.push(a.listings.length);
    if (a.sources.targetDirect.startsWith('ok')) targetOk += 1;
    const keptKeys = new Set(a.listings.map((l) => `${l.store.toLowerCase()}|${l.name.toLowerCase()}`));
    const keptNames = new Set(a.listings.map((l) => l.name.toLowerCase().trim()));
    const cheapestKept = Math.min(...lfl(a).map((l) => l.itemPrice), Infinity);
    for (const item of raw) {
      if (keptKeys.has(`${item.source.toLowerCase()}|${item.title.toLowerCase()}`)) continue;
      const price = parseFirstPrice(item.price);
      const reason = price <= 0 || price > 10_000 ? 'invalid price' : keptNames.has(item.title.toLowerCase().trim()) ? 'same title as another store' : 'relevance filter';
      dropped[reason] += 1;
      const rule = entry.exactItem.match;
      const isLfl =
        matchRule(item.title, rule, item.source).matched &&
        variantStatus(item.title, rule) !== 'different' &&
        conditionOf(item.title, item.source) === 'new' &&
        !multipackPhrase(item.title) &&
        !promotionalPhrase(item.title);
      if (isLfl) {
        droppedLfl[reason] += 1;
        if (reason === 'relevance filter') relevanceLost.push(`${a.query}: ${item.source} "${short(item.title, 60)}" ${money(price)}`);
        if (price > 0 && price < cheapestKept) {
          lostLowest.push(`${a.query}: ${item.source} "${short(item.title, 55)}" ${money(price)} dropped (${reason}); cheapest like-for-like Pick kept: ${Number.isFinite(cheapestKept) ? money(cheapestKept) : 'none'}`);
        }
      }
    }
    const keys = [...MAJORS.all, ...(MAJORS[a.category] ?? [])];
    for (const key of keys) {
      const p = presence.get(`${a.category}|${key}`) ?? { raw: 0, kept: 0, queries: 0 };
      p.queries += 1;
      if (raw.some((i) => isStoresOwn(i.source, key))) p.raw += 1;
      if (a.listings.some((l) => isStoresOwn(l.store, key))) p.kept += 1;
      presence.set(`${a.category}|${key}`, p);
    }
  }
  const categories = Array.from(new Set(runs.map((r) => r.analysis.category)));
  lines.push(
    `- Google Shopping returned ${rawTotal} listings for ${runs.length} queries (a median of ${median(depth)} per query, at most ${Math.max(...depth)}: one results page). Pick kept ${kept.reduce((x, y) => x + y, 0)}.`,
    `- Dropped before ranking: ${Object.entries(dropped).map(([k, v]) => `${k} ${v}`).join(', ')}. Like-for-like listings of the exact item among them: ${Object.entries(droppedLfl).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
    `- Pick removes a listing whose title matches one already kept, even when it comes from a different store at a different price. In ${lostLowest.length} queries a dropped like-for-like offer was cheaper than every like-for-like listing Pick kept.`,
    `- Target's own feed answered ${targetOk} of ${runs.length} queries (blocked by a bot challenge); Target appears only through Google Shopping. Amazon appears in none: it does not list in Google Shopping.`,
    '',
    'First-party presence of major stores (queries where the store itself, not a marketplace seller, appears in Pick\'s results):',
    '',
  );
  for (const category of categories) {
    const row = [...MAJORS.all, ...(MAJORS[category] ?? [])]
      .map((key) => {
        const p = presence.get(`${category}|${key}`);
        return p ? `${key} ${p.kept}/${p.queries}` : '';
      })
      .filter(Boolean)
      .join(', ');
    lines.push(`- ${category}: ${row}`);
  }
  lines.push('');
  if (lostLowest.length) lines.push('Cheaper exact offers dropped before ranking:', '', ...lostLowest.slice(0, 10).map((s) => `- ${md(s)}`), '');
  if (relevanceLost.length) {
    lines.push(
      "Exact-item listings the relevance filter dropped (at least half of the query's words must appear in the title, with no synonyms, so a longer query or a title that abbreviates loses real listings):",
      '',
      ...relevanceLost.slice(0, 10).map((s) => `- ${md(s)}`),
      ''
    );
  }
  return {
    title: '8. Coverage',
    lines,
    data: { rawTotal, depth, dropped, droppedLfl, lostLowest, relevanceLost, targetOk, presence: Object.fromEntries(presence) },
  };
}

function twins(runs: Replayed[]): Section {
  const lines: string[] = [];
  const shown = runs.filter((r) => r.analysis.twins.length > 0);
  const otherType: string[] = [];
  const notCheaper: string[] = [];
  const sameBrand: string[] = [];
  let noAnchor = 0;
  let emptyPool = 0;
  for (const { analysis: a } of runs) {
    const rep = a.listings.find((l) => l.name === a.anchor?.name);
    const t = a.twins[0];
    if (t) {
      if (rep?.productType && t.productType && rep.productType !== t.productType) {
        otherType.push(`${a.query}: twin "${short(t.name, 55)}" is ${t.productType}; the searched item is ${rep.productType}`);
      }
      const top = a.pickTopExact;
      if (top && knownCost(t) >= knownCost(top)) {
        notCheaper.push(`${a.query}: twin ${describe(t)} vs Pick's top exact listing ${money(knownCost(top))}`);
      }
      const brand = (s: string) => s.trim().split(/\s+/)[0]?.toLowerCase();
      if (rep && brand(rep.name) === brand(t.name)) sameBrand.push(a.query);
    } else if (!a.anchor) {
      noAnchor += 1;
    } else {
      // Listings that clear the price, rating, review and store gates at all.
      const ref = a.anchor.referencePrice;
      const pool = a.listings.filter(
        (l) => !l.exactName && l.trustLevel === 'verified' && l.itemPrice <= ref * 0.75 && (l.rating ?? 0) >= 4 && (l.reviewCount ?? 0) >= 50
      );
      if (pool.length === 0) emptyPool += 1;
    }
  }
  const noTwin = runs.length - shown.length;
  lines.push(
    `- Pick showed a twin for ${share(shown.length, runs.length)} queries.`,
    `- Of the ${noTwin} with none: ${noAnchor} had no searched-item cluster at all, and in ${emptyPool} more no listing in the results was both cheap enough (75% of the reference) and well reviewed (4.0+, 50+ reviews) at a verified store. Twins can only come from the same search, and a search for one product returns mostly that product and its brand.`,
    `- Twins that are a different kind of product by Pick's own taxonomy: ${otherType.length}. Twins that cost as much as or more than Pick's own top price for the exact item: ${notCheaper.length}. Twins from the same brand as the searched item: ${sameBrand.length} of ${shown.length}.`,
    '- No spec is required of a twin: the spec chips are display only. The gates are name overlap (25% of words), price, rating, reviews and a verified store.',
    '',
  );
  if (otherType.length) lines.push('Twin is a different kind of product:', '', ...otherType.map((s) => `- ${md(s)}`), '');
  if (notCheaper.length) lines.push("Twin is not cheaper than Pick's own price for the exact item:", '', ...notCheaper.map((s) => `- ${md(s)}`), '');
  return { title: '9. Twins', lines, data: { shown: shown.length, noAnchor, emptyPool, otherType, notCheaper, sameBrand } };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const arg = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const runArg = arg('--run');
  const runDir = !runArg || runArg === 'latest' ? latestRun() : resolve(ROOT, runArg);
  const outDir = arg('--out') ? resolve(ROOT, arg('--out') as string) : runDir;
  const testset = loadTestSet(join(ROOT, 'eval', 'testset.json'));
  const { replayed, missing } = await replayRun(testset.queries, runDir, testset.destination.state);
  if (missing.length) console.warn(`  ${missing.length} test entries have no snapshot in this run and were skipped.`);

  const sections = [matching, variants, bundles, condition, totalCost, freshness, trust, coverage, twins].map((f) => f(replayed));
  const title = `# Where Pick loses the lowest price: audit of run ${relative(join(ROOT, 'eval', 'runs'), runDir)}`;
  const mdOut = [
    title,
    '',
    `${replayed.length} queries, replayed through the code at this checkout. Exact item, like-for-like and condition follow the harness rules in eval/README.md. No benchmarks are needed for these numbers.`,
    '',
    ...sections.flatMap((s) => [`## ${s.title}`, '', ...s.lines]),
  ].join('\n');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'audit.md'), mdOut);
  writeFileSync(join(outDir, 'audit.json'), JSON.stringify(Object.fromEntries(sections.map((s) => [s.title, s.data])), null, 2));
  console.log(`Audit of ${replayed.length} queries -> ${relative(ROOT, outDir)}/audit.md, audit.json`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
