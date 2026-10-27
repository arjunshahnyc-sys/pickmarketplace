// Pick price-finding evaluation harness.
//
// Runs every query in eval/testset.json through Pick's real search
// pipeline (src/lib/searchService.ts and the homepage's ranking and
// grouping), then reports the cheapest exact listing Pick found, the twin
// it chose, and how both compare with hand-found benchmarks.
//
// Usage (from the repo root):
//   npx tsx eval/run.ts --live --yes            capture fresh responses, then score
//   npx tsx eval/run.ts --replay latest          re-score the newest capture (free, offline)
//   npx tsx eval/run.ts --replay eval/runs/<id>  re-score a specific capture
//
// Options:
//   --only id1,id2     limit to these test entries
//   --run <dir>        with --live: write into an existing run (replaces those entries' snapshots)
//   --out <dir>        with --replay: write the reports somewhere other than the run folder
//   --state XX         override the test set's US state
//   --testset <path>   default eval/testset.json
//   --delay <ms>       pause between live queries (default 1000)
//
// A live capture makes one Google Shopping request through Serper per
// query (two paid credits each, per Serper's own response), the same call
// a shopper's search makes.
// Nothing else in the app is touched: the harness imports Pick's modules
// read-only, never runs the web server, and writes only under eval/runs/.

import { config as loadEnv } from 'dotenv';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { performLiveSearch } from '../src/lib/searchService';
import { installFetchRecorder, sourceStatus, type Exchange } from './lib/recorder';
import { writeReports, type RunInfo } from './lib/report';
import {
  clearSearchCache,
  latestRun,
  replayRun,
  ROOT,
  RUNS_DIR,
  snapshotPath,
  type Snapshot,
} from './lib/runs';
import { rollUp, scoreQuery, type Scored } from './lib/score';
import { loadTestSet, type TestEntry } from './lib/testset';

interface Args {
  mode: 'live' | 'replay' | null;
  replayTarget: string;
  yes: boolean;
  only: string[];
  run: string;
  out: string;
  state: string;
  testset: string;
  delayMs: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    mode: null,
    replayTarget: 'latest',
    yes: false,
    only: [],
    run: '',
    out: '',
    state: '',
    testset: join(ROOT, 'eval', 'testset.json'),
    delayMs: 1000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${a} needs a value`);
      return value;
    };
    if (a === '--live') args.mode = 'live';
    else if (a === '--replay') {
      args.mode = 'replay';
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) args.replayTarget = argv[++i];
    } else if (a === '--yes') args.yes = true;
    else if (a === '--only') args.only = next().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--run') args.run = resolve(ROOT, next());
    else if (a === '--out') args.out = resolve(ROOT, next());
    else if (a === '--state') args.state = next().toUpperCase();
    else if (a === '--testset') args.testset = resolve(ROOT, next());
    else if (a === '--delay') args.delayMs = Number(next());
    else throw new Error(`Unknown option ${a}`);
  }
  return args;
}

function usage(): string {
  return [
    'Usage:',
    '  npx tsx eval/run.ts --live --yes            capture fresh responses, then score',
    '  npx tsx eval/run.ts --replay latest          re-score the newest capture (free)',
    '  npx tsx eval/run.ts --replay eval/runs/<id>  re-score a specific capture',
    'Options: --only id1,id2  --run <dir>  --out <dir>  --state XX  --testset <path>  --delay <ms>',
  ].join('\n');
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

function git(command: string): string {
  try {
    return execSync(`git ${command}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

async function capture(entries: TestEntry[], runDir: string, delayMs: number): Promise<void> {
  mkdirSync(join(runDir, 'snapshots'), { recursive: true });
  for (const [i, entry] of entries.entries()) {
    const exchanges: Exchange[] = [];
    const capturedAt = new Date().toISOString();
    clearSearchCache();
    const restore = installFetchRecorder('record', exchanges);
    let listings = 0;
    try {
      listings = (await performLiveSearch(entry.query)).results.length;
    } catch (error) {
      console.error(`  ${entry.id}: pipeline threw: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      restore();
    }
    const snapshot: Snapshot = { id: entry.id, query: entry.query, capturedAt, exchanges };
    writeFileSync(snapshotPath(runDir, entry.id), JSON.stringify(snapshot, null, 1));
    // Google Shopping is Pick's only source since 2026-10-03; a Target
    // status is printed only if a request to it was recorded.
    const targetStatus = sourceStatus(exchanges, 'target');
    console.log(
      `[${i + 1}/${entries.length}] ${entry.id}: ${listings} listings ` +
        `(Google Shopping ${sourceStatus(exchanges, 'serper')}` +
        `${targetStatus === 'not called' ? '' : `, Target ${targetStatus}`})`
    );
    if (i < entries.length - 1) await sleep(delayMs);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mode) {
    console.log(usage());
    process.exitCode = 1;
    return;
  }
  if (!existsSync(args.testset)) throw new Error(`No test set at ${args.testset}; run from the repo root.`);
  const testset = loadTestSet(args.testset);
  const state = args.state || testset.destination.state;
  const unknown = args.only.filter((id) => !testset.queries.some((q) => q.id === id));
  if (unknown.length > 0) throw new Error(`Unknown test ids: ${unknown.join(', ')}`);
  const entries = args.only.length > 0 ? testset.queries.filter((q) => args.only.includes(q.id)) : testset.queries;

  let runDir: string;
  if (args.mode === 'live') {
    if (!args.yes) {
      console.log(
        `A live capture makes ${entries.length} Google Shopping requests through Serper (${entries.length * 2} paid credits). ` +
          `Re-run with --yes to go ahead.`
      );
      process.exitCode = 1;
      return;
    }
    loadEnv({ path: join(ROOT, '.env.local'), quiet: true });
    if (!process.env.SERPER_API_KEY) console.warn('SERPER_API_KEY is not set: Google Shopping results will be missing.');
    runDir = args.run || join(RUNS_DIR, new Date().toISOString().replace(/[:.]/g, '-'));
    console.log(`Capturing ${entries.length} queries into ${relative(ROOT, runDir)}`);
    await capture(entries, runDir, args.delayMs);
  } else {
    runDir = args.replayTarget === 'latest' ? latestRun() : resolve(ROOT, args.replayTarget);
    if (!existsSync(join(runDir, 'snapshots'))) throw new Error(`${runDir} has no snapshots/ folder.`);
  }

  // Scoring always runs from the saved snapshots, so a live run and a
  // later replay of it produce the same report by construction.
  const scoringEntries = args.mode === 'live' && args.run ? testset.queries : entries;
  const { replayed, missing, changed } = await replayRun(scoringEntries, runDir, state);
  for (const id of changed) console.warn(`  skipped ${id}: the query text changed since capture; re-capture it`);
  if (missing.length > 0) {
    const shown = missing.length <= 5 ? `: ${missing.join(', ')}` : '';
    console.warn(
      `  ${missing.length} test ${missing.length === 1 ? 'entry has' : 'entries have'} no snapshot in this run and ${missing.length === 1 ? 'was' : 'were'} skipped${shown}. ` +
        `Capture with --live --yes --run ${relative(ROOT, runDir)} --only <ids>.`
    );
  }
  const kept = replayed.map((r) => r.entry);
  const analyses = replayed.map((r) => r.analysis);
  const capturedAt = replayed.map((r) => r.snapshot.capturedAt);
  const scored: Scored[] = kept.map((entry, i) => scoreQuery(entry, analyses[i]));
  const metrics = rollUp(scored, analyses, kept);

  const sortedCaptures = [...capturedAt].sort();
  const info: RunInfo = {
    runId: relative(RUNS_DIR, runDir),
    capturedAt:
      sortedCaptures.length === 0
        ? 'n/a'
        : sortedCaptures[0].slice(0, 16) === sortedCaptures[sortedCaptures.length - 1].slice(0, 16)
          ? sortedCaptures[0]
          : `${sortedCaptures[0]} to ${sortedCaptures[sortedCaptures.length - 1]}`,
    scoredAt: new Date().toISOString(),
    state,
    gitCommit: git('rev-parse --short HEAD') || 'unknown',
    gitDirty: git('status --porcelain --untracked-files=no') !== '',
    testsetPath: relative(ROOT, args.testset),
  };
  const outDir = args.out || runDir;
  mkdirSync(outDir, { recursive: true });
  writeReports(outDir, info, kept, analyses, scored, metrics);

  const pctOf = (n: number, d: number) => (d === 0 ? 'n/a' : `${n}/${d} (${Math.round((n / d) * 100)}%)`);
  console.log('');
  console.log(`Scored ${kept.length} queries -> ${relative(ROOT, outDir)}/summary.md, report.csv, listings.csv`);
  console.log(`  Cheapest exact listing within 3% of benchmark: ${pctOf(metrics.within3pct, metrics.benchmarked)}`);
  console.log(`  Missed a cheaper listing entirely:            ${pctOf(metrics.missedEntirely, metrics.benchmarked)}`);
  console.log(`  No twin shown:                                ${pctOf(metrics.noTwin, metrics.queries)}`);
  console.log(`  Twin marked acceptable:                       ${pctOf(metrics.twinAcceptable, metrics.twinReviewed)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
