// Saved runs: where they live, and how one query is replayed through Pick's
// pipeline from its snapshot. Shared by run.ts (scoring) and audit.ts.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performLiveSearch } from '../../src/lib/searchService';
import { analyzeQuery, type QueryAnalysis } from './analyze';
import { installFetchRecorder, type Exchange } from './recorder';
import type { TestEntry } from './testset';

export interface Snapshot {
  id: string;
  query: string;
  capturedAt: string;
  exchanges: Exchange[];
}

export const ROOT = process.cwd();
export const RUNS_DIR = join(ROOT, 'eval', 'runs');

/** Pick's in-process search cache; cleared so every query really runs. */
export function clearSearchCache(): void {
  (globalThis as { __pickSearchCache?: Map<string, unknown> }).__pickSearchCache?.clear();
}

export function latestRun(): string {
  if (!existsSync(RUNS_DIR)) throw new Error('No runs yet: capture one with --live --yes.');
  const runs = readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(RUNS_DIR, d.name, 'snapshots')))
    .map((d) => d.name)
    .sort();
  if (runs.length === 0) throw new Error('No runs yet: capture one with --live --yes.');
  return join(RUNS_DIR, runs[runs.length - 1]);
}

export function snapshotPath(runDir: string, id: string): string {
  return join(runDir, 'snapshots', `${id}.json`);
}

export interface Replayed {
  entry: TestEntry;
  snapshot: Snapshot;
  analysis: QueryAnalysis;
}

/**
 * Replay every entry that has a snapshot in `runDir` through Pick's current
 * code. Entries without a snapshot, or whose query text changed since the
 * capture, are skipped and reported.
 */
export async function replayRun(
  entries: TestEntry[],
  runDir: string,
  state: string
): Promise<{ replayed: Replayed[]; missing: string[]; changed: string[] }> {
  // The Serper client skips the call when its key is unset; on replay the
  // recorded responses stand in for the network, so any placeholder key
  // lets the recorded calls happen.
  process.env.SERPER_API_KEY ||= 'replay';

  const replayed: Replayed[] = [];
  const missing: string[] = [];
  const changed: string[] = [];
  for (const entry of entries) {
    const path = snapshotPath(runDir, entry.id);
    if (!existsSync(path)) {
      missing.push(entry.id);
      continue;
    }
    const snapshot = JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
    if (snapshot.query !== entry.query) {
      changed.push(entry.id);
      continue;
    }
    clearSearchCache();
    const restore = installFetchRecorder('replay', snapshot.exchanges);
    try {
      const data = await performLiveSearch(entry.query);
      replayed.push({ entry, snapshot, analysis: analyzeQuery(entry, data, snapshot.exchanges, snapshot.capturedAt, state) });
    } finally {
      restore();
    }
  }
  return { replayed, missing, changed };
}

/** The raw Google Shopping items a snapshot recorded (before any of Pick's filters). */
export interface RawItem {
  title: string;
  source: string;
  price: string;
  position: number;
}

export function rawShoppingItems(snapshot: Snapshot): RawItem[] {
  const items: RawItem[] = [];
  for (const ex of snapshot.exchanges) {
    if (ex.source !== 'serper' || !ex.body || typeof ex.body !== 'object') continue;
    const shopping = (ex.body as { shopping?: unknown }).shopping;
    if (!Array.isArray(shopping)) continue;
    for (const raw of shopping as Array<Record<string, unknown>>) {
      items.push({
        title: typeof raw.title === 'string' ? raw.title : '',
        source: typeof raw.source === 'string' ? raw.source : 'Google Shopping',
        price: typeof raw.price === 'string' ? raw.price : '',
        position: typeof raw.position === 'number' ? raw.position : items.length + 1,
      });
    }
  }
  return items;
}
