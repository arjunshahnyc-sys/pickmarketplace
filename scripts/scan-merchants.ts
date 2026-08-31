// Scan live listing data for merchant names that aren't in the trust
// registry, so registry candidates can be reviewed in bulk.
//
// Usage:
//   npx tsx scripts/scan-merchants.ts --queries scripts/scan-queries.txt \
//     [--markets us,gb] [--out scan-report.json] --yes
//   npx tsx scripts/scan-merchants.ts --from-json payload.json [payload2.json ...]
//
// --queries runs each query through the live Serper Google Shopping client
// (the same code path production search uses) for each market. EVERY
// query x market pair costs one Serper credit, so the script prints the
// cost and refuses to run without --yes.
//
// --from-json instead aggregates saved raw Serper /shopping payloads (the
// {"shopping": [...]} shape) at zero credit cost.
//
// Output: every distinct (market, merchant) not resolving to a registry
// entry, sorted by listing count descending, with example raw names — the
// review queue for registry additions. Also written as JSON with --out.

import { config as loadEnv } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';

loadEnv({ path: '.env.local' });

// Imported AFTER dotenv so SERPER_API_KEY is present at module init.
import {
  FEED_MARKETS,
  searchGoogleShoppingAPI,
  type FeedMarket,
} from '../src/lib/scrapers';
import { collapse } from '../src/lib/trust/identity';
import { resolveMerchant } from '../src/lib/trust/registry';
import { getRetailerTrust } from '../src/lib/retailerTrust';

interface Row {
  market: string;
  key: string;
  count: number;
  names: Set<string>;
}

function parseArgs(argv: string[]) {
  const args = {
    queries: '' as string,
    markets: ['us'] as FeedMarket[],
    fromJson: [] as string[],
    out: '' as string,
    yes: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--queries') args.queries = argv[++i];
    else if (a === '--markets')
      args.markets = argv[++i].split(',').map((m) => m.trim().toLowerCase()) as FeedMarket[];
    else if (a === '--from-json') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) args.fromJson.push(argv[++i]);
    } else if (a === '--out') args.out = argv[++i];
    else if (a === '--yes') args.yes = true;
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

function tally(
  rows: Map<string, Row>,
  market: string,
  rawName: string
) {
  const key = collapse(rawName) || '(non-latin name)';
  const id = `${market}:${key}`;
  const row = rows.get(id) ?? { market, key, count: 0, names: new Set<string>() };
  row.count += 1;
  row.names.add(rawName);
  rows.set(id, row);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = new Map<string, Row>();

  if (args.fromJson.length > 0) {
    for (const file of args.fromJson) {
      const payload = JSON.parse(readFileSync(file, 'utf8'));
      const items: Array<{ source?: string }> = payload.shopping ?? [];
      const market = String(payload.searchParameters?.gl ?? 'us').toLowerCase();
      for (const item of items) {
        if (item.source) tally(rows, market, item.source);
      }
      console.log(`${file}: ${items.length} items (${market} market)`);
    }
  } else if (args.queries) {
    const queries = readFileSync(args.queries, 'utf8')
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q && !q.startsWith('#'));
    for (const m of args.markets) {
      if (!(m in FEED_MARKETS)) {
        console.error(`Unknown market "${m}" (valid: ${Object.keys(FEED_MARKETS).join(', ')})`);
        process.exit(2);
      }
    }
    const cost = queries.length * args.markets.length;
    console.log(
      `${queries.length} queries x ${args.markets.length} market(s) = ${cost} Serper credits.`
    );
    if (!args.yes) {
      console.error('Refusing to spend credits without --yes.');
      process.exit(1);
    }
    for (const market of args.markets) {
      for (const query of queries) {
        const result = await searchGoogleShoppingAPI(query, market);
        if (result.sourceError) {
          console.error(`  [${market}] "${query}": ${result.sourceError}`);
          continue;
        }
        for (const p of result.products) tally(rows, market, p.retailer);
        console.log(`  [${market}] "${query}": ${result.products.length} listings`);
      }
    }
  } else {
    console.error('Provide --queries <file> or --from-json <file...>. See the header comment.');
    process.exit(2);
  }

  const unregistered = [...rows.values()]
    .filter((r) => !resolveMerchant([...r.names][0], r.market))
    .sort((a, b) => b.count - a.count);
  const registered = rows.size - unregistered.length;

  console.log(
    `\n${rows.size} distinct (market, merchant) pairs seen; ${registered} already resolve to the registry.`
  );
  console.log(`\n=== ${unregistered.length} unregistered merchants (by listing count) ===`);
  console.log('(marketplace-seller rows are independent sellers on a registered platform —');
  console.log(' they already get the distinct badge and should NOT become registry entries)');
  for (const r of unregistered) {
    const names = [...r.names].slice(0, 3).join(' | ');
    const level = getRetailerTrust([...r.names][0], { market: r.market }).level;
    const tag = level === 'unknown' ? '' : `  <${level}>`;
    console.log(`${String(r.count).padStart(5)}  [${r.market}]  ${r.key.padEnd(30)}  ${names}${tag}`);
  }

  if (args.out) {
    writeFileSync(
      args.out,
      JSON.stringify(
        unregistered.map((r) => ({
          market: r.market,
          key: r.key,
          count: r.count,
          trustLevel: getRetailerTrust([...r.names][0], { market: r.market }).level,
          exampleNames: [...r.names],
        })),
        null,
        2
      )
    );
    console.log(`\nWritten to ${args.out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
