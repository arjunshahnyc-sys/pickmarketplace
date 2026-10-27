// Write a scored run to disk: report.csv (one row per query), listings.csv
// (every listing Pick returned), results.json (everything, for later
// analysis), and summary.md (the metrics and what to look at first).

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { knownCost, type ListingRecord, type QueryAnalysis } from './analyze';
import type { Metrics, Scored } from './score';
import type { TestEntry } from './testset';

export interface RunInfo {
  runId: string;
  capturedAt: string;
  scoredAt: string;
  state: string;
  gitCommit: string;
  gitDirty: boolean;
  testsetPath: string;
}

// ─── CSV ─────────────────────────────────────────────────────────────────

type Cell = string | number | boolean | null | undefined;

function cell(value: Cell): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'number' ? (Number.isInteger(value) ? String(value) : value.toFixed(2)) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n';
}

const yesNo = (value: boolean | null): string => (value === null ? '' : value ? 'yes' : 'no');
const money = (value: number | null | undefined): string => (value === null || value === undefined ? '' : `$${value.toFixed(2)}`);
const pct = (value: number | null): string => (value === null ? '' : `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`);
const basisText = (l: ListingRecord | null): string | null =>
  l ? (l.cost.preTax !== null ? 'item + shipping' : 'item only, shipping unknown') : null;

const QUERY_HEADER = [
  'id', 'category', 'query', 'exact_item',
  'google_shopping_status', 'target_direct_status', 'listings',
  'exact_like_for_like', 'exact_variant_unstated', 'exact_set_aside',
  'pick_top_exact_store', 'pick_top_exact_listing', 'pick_top_exact_badge', 'pick_top_exact_variant',
  'pick_top_exact_item_price', 'pick_top_exact_shipping', 'pick_top_exact_before_tax', 'pick_top_exact_basis',
  'pick_top_exact_rank', 'pick_top_exact_url',
  'cheapest_anywhere_store', 'cheapest_anywhere_badge', 'cheapest_anywhere_cost', 'cheapest_anywhere_basis',
  'cheapest_anywhere_rank', 'cheapest_anywhere_listing',
  'pick_lowest_marked_store', 'pick_lowest_marked_item_price',
  'pick_searched_item', 'pick_reference_price', 'pick_reference_basis', 'pick_cluster_size', 'exact_in_pick_cluster',
  'twin_count', 'twin_listing', 'twin_store', 'twin_badge', 'twin_item_price', 'twin_before_tax',
  'twin_savings_claimed', 'twin_rating', 'twin_reviews', 'twin_shared_specs', 'twin_rank', 'cheapest_twin_cost',
  'benchmark_total', 'benchmark_item_price', 'benchmark_shipping', 'benchmark_store', 'benchmark_checked_on',
  'price_status', 'coverage', 'comparison_basis', 'pick_value', 'benchmark_value', 'delta', 'price_note',
  'twin_status', 'twin_matched', 'acceptable_twin_in_results', 'capture_to_benchmark_days',
];

function queryRow(entry: TestEntry, a: QueryAnalysis, s: Scored): Cell[] {
  const top = a.pickTopExact;
  const any = a.cheapestAnywhere;
  const t = a.twins[0];
  const cheapestTwin = a.twins.length > 0 ? Math.min(...a.twins.map(knownCost)) : null;
  return [
    a.id, a.category, a.query, a.exactItem,
    a.sources.googleShopping, a.sources.targetDirect, a.counts.listings,
    a.counts.likeForLike, a.counts.variantUnstated, a.counts.exactName - a.counts.likeForLike,
    top?.store, top?.name, top?.trustLabel, top?.variant,
    top?.itemPrice, top ? (top.cost.shipping === null ? 'unknown' : top.cost.shipping) : null,
    top?.cost.preTax, basisText(top), top?.displayRank, top?.url,
    any?.store, any?.trustLabel, any ? knownCost(any) : null, basisText(any), any?.displayRank, any?.name,
    a.lowestMarkedOnAnchor?.store, a.lowestMarkedOnAnchor?.itemPrice,
    a.anchor?.name, a.anchor?.referencePrice, a.anchor?.priceBasis, a.anchor?.clusterSize,
    a.counts.likeForLike > 0 ? `${a.counts.likeForLikeInAnchor} of ${a.counts.likeForLike}` : null,
    a.twins.length, t?.name, t?.store, t?.trustLabel, t?.itemPrice, t?.cost.preTax,
    t?.pick.similarTo ? `${t.pick.similarTo.savingsPercent}%` : null,
    t?.rating, t?.reviewCount, t?.pick.similarTo?.sharedSpecs.join('; '), t?.displayRank, cheapestTwin,
    entry.benchmark.totalPrice, entry.benchmark.itemPrice, entry.benchmark.shipping,
    entry.benchmark.store, entry.benchmark.checkedOn,
    s.priceStatus, s.coverage, s.basis, s.pickValue, s.benchmarkValue, pct(s.delta), s.note,
    s.twinStatus, s.twinMatchedSpec, yesNo(s.acceptableTwinInResults), s.driftDays,
  ];
}

const LISTING_HEADER = [
  'query_id', 'display_rank', 'relevance_rank', 'source', 'store', 'badge', 'name',
  'item_price', 'original_price', 'shipping', 'shipping_source', 'before_tax', 'pick_total', 'cost_row',
  'condition', 'multipack', 'promotional', 'exact_name', 'variant', 'like_for_like', 'set_aside_because', 'exact_name_miss',
  'chip', 'match_type', 'group_id', 'group_size', 'lowest_in_group', 'in_pick_cluster',
  'similar_to', 'similar_savings_pct', 'similar_specs', 'price_flag_reference', 'rating', 'reviews', 'url',
];

function listingRow(id: string, l: ListingRecord): Cell[] {
  return [
    id, l.displayRank, l.relevanceRank, l.source, l.store, l.trustLabel, l.name,
    l.itemPrice, l.originalPrice, l.cost.shipping, l.cost.shippingSource, l.cost.preTax, l.cost.total, l.cost.summary,
    l.condition, l.multipack, l.promotional, yesNo(l.exactName), l.exactName ? l.variant : null, yesNo(l.likeForLike), l.notLikeForLike, l.exactNameMiss,
    l.pick.chip, l.pick.matchType, l.pick.groupId, l.pick.groupSize, yesNo(l.pick.isLowestInGroup), yesNo(l.pick.inAnchorCluster),
    l.pick.similarTo?.name, l.pick.similarTo?.savingsPercent, l.pick.similarTo?.sharedSpecs.join('; '),
    l.pick.priceFlagReference, l.rating, l.reviewCount, l.url,
  ];
}

// ─── Markdown ────────────────────────────────────────────────────────────

function share(n: number, d: number): string {
  if (d === 0) return 'n/a';
  return `${n} of ${d} (${Math.round((n / d) * 100)}%)`;
}

function mdEscape(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function short(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function describeListing(l: ListingRecord): string {
  const cost = `${money(knownCost(l))} ${l.cost.preTax === null ? '(item only)' : '(item + ship)'}`;
  const unstated = l.variant === 'unstated' ? ', size/edition not stated' : '';
  return `${cost} at ${l.store} [${l.trustLabel}${unstated}], #${l.displayRank}`;
}

function summaryMarkdown(
  info: RunInfo,
  entries: TestEntry[],
  analyses: QueryAnalysis[],
  scored: Scored[],
  m: Metrics
): string {
  const lines: string[] = [];
  const add = (...xs: string[]) => lines.push(...xs);
  const withExact = analyses.filter((a) => a.pickTopExact);
  const withTotal = withExact.filter((a) => a.pickTopExactBasis === 'total');
  const topIsCheapest = withExact.filter((a) => a.cheapestAnywhere === a.pickTopExact);
  const topUnstated = withExact.filter((a) => a.pickTopExact?.variant === 'unstated');
  const withAnchor = analyses.filter((a) => a.anchor);
  const exactTotal = analyses.reduce((n, a) => n + a.counts.likeForLike, 0);
  const exactInAnchor = analyses.reduce((n, a) => n + a.counts.likeForLikeInAnchor, 0);
  // Captures before 2026-10-03 also recorded a request to Target's internal
  // endpoint (since removed from Pick); only those runs report on it.
  const targetCalled = analyses.some((a) => a.sources.targetDirect !== 'not called');
  const targetOk = analyses.filter((a) => a.sources.targetDirect.startsWith('ok')).length;
  const missedNoExact = scored.filter((s) => s.priceStatus === 'no-exact-listing' && s.coverage === 'missed').length;
  const googleOk = analyses.filter((a) => a.sources.googleShopping.startsWith('ok')).length;

  add(
    `# Pick price-finding evaluation: run ${info.runId}`,
    '',
    `- Captured ${info.capturedAt} (live responses from Google Shopping via Serper${targetCalled ? " and Target's feed" : ''}, saved in \`snapshots/\`)`,
    `- Scored ${info.scoredAt} against \`${info.testsetPath}\`, code at ${info.gitCommit}${info.gitDirty ? ' (with uncommitted changes)' : ''}`,
    `- Shopper: US, ${info.state}, default settings (Total cost sort, no filters). Prices are compared before sales tax.`,
    `- Benchmarks filled: ${m.benchmarked} of ${m.queries}. Acceptable-twin lists filled: ${m.twinListsFilled} of ${m.queries}.`,
    '',
    '## Headline metrics',
    '',
    '| Metric | Result | Out of |',
    '| --- | --- | --- |',
    `| Pick's cheapest exact listing is within 3% of your benchmark | ${share(m.within3pct, m.benchmarked)} | benchmarked queries |`,
    `| Pick missed a cheaper listing entirely | ${share(m.missedEntirely, m.benchmarked)} | benchmarked queries (${missedNoExact} of them with no exact listing at all) |`,
    `| Pick shows no twin | ${share(m.noTwin, m.queries)} | all queries |`,
    `| Pick's twin is one you marked acceptable | ${share(m.twinAcceptable, m.twinReviewed)} | queries with a twin and a filled twin list |`,
    '',
  );
  if (m.benchmarked > 0) {
    add(
      'Where the rest of the benchmarked queries went:',
      '',
      `- Pick's top exact listing is more than 3% over your benchmark, or there is none: ${share(m.pickHigher + m.noExactListing, m.benchmarked)}. Of these, Pick had a price as good as yours lower down (a ranking or trust problem): ${m.hadItLowerDown}; had your store's listing but did not count it as the item (a matching problem): ${m.hadItNotCounted}; had nothing close (a coverage problem): ${m.pickHigher + m.noExactListing - m.hadItLowerDown - m.hadItNotCounted}.`,
      `- Pick's top exact listing is more than 3% under your benchmark (check it is the same new item and a real offer): ${share(m.pickCheaper, m.benchmarked)}`,
      '',
    );
  } else {
    add('The two price metrics fill in once benchmarks are entered in the test set; re-score with `npx tsx eval/run.ts --replay latest` (free, no API calls).', '');
  }

  add(
    '## What Pick returned (no benchmarks needed)',
    '',
    `- Sources: Google Shopping answered ${googleOk} of ${analyses.length} queries${targetCalled ? `; Target's direct feed answered ${targetOk} of ${analyses.length}` : ''}.`,
    `- Queries where Pick returned at least one like-for-like listing of the exact item: ${share(withExact.length, analyses.length)}.`,
    `- Of those, Pick's top exact listing has a before-tax total Pick computed (item + shipping): ${share(withTotal.length, withExact.length)}. The rest show an item price only.`,
    `- Pick's top exact listing does not state the size, edition or generation: ${share(topUnstated.length, withExact.length)}.`,
    `- Pick's top exact listing is also the cheapest like-for-like listing anywhere in its results: ${share(topIsCheapest.length, withExact.length)}.`,
    `- Queries where Pick settled on a searched-item cluster (needed for any twin): ${share(withAnchor.length, analyses.length)}.`,
    `- Like-for-like exact listings that Pick grouped into that cluster: ${share(exactInAnchor, exactTotal)}.`,
    '',
    '## By category',
    '',
    '| Category | Queries | Exact item found | Top exact has item + shipping | Twin shown | Benchmarked | Within 3% |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  );
  const categories = Array.from(new Set(analyses.map((a) => a.category)));
  for (const category of categories) {
    const idx = analyses.map((a, i) => (a.category === category ? i : -1)).filter((i) => i >= 0);
    const as = idx.map((i) => analyses[i]);
    const ss = idx.map((i) => scored[i]);
    const found = as.filter((a) => a.pickTopExact).length;
    const bench = ss.filter((s) => s.priceStatus !== 'not-benchmarked').length;
    add(
      `| ${category} | ${as.length} | ${found} | ${as.filter((a) => a.pickTopExactBasis === 'total').length} of ${found} | ${as.filter((a) => a.twins.length > 0).length} | ${bench} | ${bench ? ss.filter((s) => s.priceStatus === 'within-3pct').length : 'n/a'} |`,
    );
  }

  add(
    '',
    '## Every query',
    '',
    "| Query | Pick's cheapest exact listing (as ranked) | Cheapest anywhere in results | Twin | Benchmark | Status |",
    '| --- | --- | --- | --- | --- | --- |',
  );
  analyses.forEach((a, i) => {
    const s = scored[i];
    const e = entries[i];
    const top = a.pickTopExact;
    const topText = top
      ? describeListing(top)
      : a.counts.exactName > 0
        ? `none like-for-like (${a.counts.exactName} set aside)`
        : 'none';
    const any = a.cheapestAnywhere;
    const anyText = top && any ? (any === top ? 'same' : describeListing(any)) : '';
    const t = a.twins[0];
    const twin = t ? `${short(t.name, 45)} ${money(knownCost(t))} (${a.twins.length} shown)` : 'none';
    const benchmark = e.benchmark.totalPrice === null ? '' : `${money(e.benchmark.totalPrice)} ${e.benchmark.store}`;
    const status = [
      s.priceStatus === 'not-benchmarked'
        ? ''
        : `${s.priceStatus}${s.delta === null ? '' : ` ${pct(s.delta)}`}${s.priceStatus === 'within-3pct' ? '' : `, coverage ${s.coverage}`}`,
      s.twinStatus === 'no-twin' || s.twinStatus === 'not-reviewed' ? '' : `twin ${s.twinStatus}`,
    ]
      .filter(Boolean)
      .join('; ');
    add(`| ${mdEscape(a.query)} | ${mdEscape(topText)} | ${mdEscape(anyText)} | ${mdEscape(twin)} | ${mdEscape(benchmark)} | ${mdEscape(status)} |`);
  });

  add(
    '',
    '## How to read this',
    '',
    "- **Exact item** is the test entry's own rule (`exactItem.match`), not Pick's grouping, so the report measures Pick's matching instead of trusting it. **Like-for-like** also requires a new unit per the title, one unit (no multipack or bundle), no Possible scam label, and no stated size, edition or generation other than the pinned one. A title that states none is counted and marked 'size/edition not stated'.",
    "- **Pick's cheapest exact listing (as ranked)** is the first like-for-like exact listing in Pick's default Total cost sort: the lowest price Pick actually presents for the item. That sort puts listings Pick can total first, cheapest first, and sinks sellers it cannot total.",
    "- **Cheapest anywhere in results** is the lowest like-for-like cost anywhere in Pick's results, whatever its rank. It can be a bait or junk price that Pick is right to rank low, so it is a diagnostic, not the headline.",
    "- Costs are before tax: item + shipping where Pick has a shipping figure (a store's published policy or a USPS estimate), the item price alone where it has none ('item only'). Item-only rows are compared with your item price when you entered one.",
    "- **Twin** is the first listing wearing Pick's Similar pick chip in the default sort.",
    "- **Coverage** is scored separately from the top listing. **has-price**: a like-for-like listing between half of your price and 3% over it is somewhere in Pick's results. **not-counted**: none is, but your store's listing near your price is there, set aside as not the item. **missed**: neither, which is what the missed-entirely metric counts. Prices under half your benchmark never count as having it: they are bait, auction bids or mislabeled accessories.",
    '- Prices move: a benchmark checked days after the capture compares two different moments. `capture_to_benchmark_days` in report.csv shows the gap; re-run live on the day you benchmark to remove it.',
    '',
  );
  return lines.join('\n');
}

export function writeReports(
  outDir: string,
  info: RunInfo,
  entries: TestEntry[],
  analyses: QueryAnalysis[],
  scored: Scored[],
  metrics: Metrics
): void {
  writeFileSync(join(outDir, 'report.csv'), toCsv(QUERY_HEADER, analyses.map((a, i) => queryRow(entries[i], a, scored[i]))));
  writeFileSync(
    join(outDir, 'listings.csv'),
    toCsv(LISTING_HEADER, analyses.flatMap((a) => a.listings.map((l) => listingRow(a.id, l))))
  );
  writeFileSync(
    join(outDir, 'results.json'),
    JSON.stringify({ info, metrics, queries: analyses.map((a, i) => ({ ...a, score: scored[i] })) }, null, 2)
  );
  writeFileSync(join(outDir, 'summary.md'), summaryMarkdown(info, entries, analyses, scored, metrics));
}
