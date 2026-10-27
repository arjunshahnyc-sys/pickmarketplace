// The test set: what each query is, which listing names count as the exact
// item, the owner's hand-found benchmark, and the twins the owner accepts.
// Read from eval/testset.json and checked here, so a typo in a hand-edited
// entry fails loudly instead of scoring as "not benchmarked".

import { readFileSync } from 'node:fs';
import type { MatchRule, TwinSpec } from './rules';

export interface Benchmark {
  /** Item price plus shipping, before sales tax, in USD. */
  totalPrice: number | null;
  /** Optional parts of totalPrice; totalPrice is derived from them when it is empty. */
  itemPrice: number | null;
  shipping: number | null;
  /** Where the benchmark listing was found (store name as the site shows it). */
  store: string;
  url: string;
  /** YYYY-MM-DD */
  checkedOn: string;
  notes: string;
}

export interface TestEntry {
  id: string;
  query: string;
  category: string;
  exactItem: {
    description: string;
    match: MatchRule;
  };
  benchmark: Benchmark;
  /** null = not reviewed yet; [] = reviewed, no twin is acceptable. */
  acceptableTwins: TwinSpec[] | null;
}

export interface TestSet {
  destination: { country: 'US'; state: string };
  queries: TestEntry[];
}

function fail(where: string, message: string): never {
  throw new Error(`eval/testset.json: ${where}: ${message}`);
}

function num(where: string, value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail(where, `expected a number (or null), got ${JSON.stringify(value)}`);
  }
  return value;
}

function str(where: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') fail(where, `expected a string, got ${JSON.stringify(value)}`);
  return value;
}

function checkRule(where: string, rule: unknown): MatchRule {
  if (!rule || typeof rule !== 'object') fail(where, 'expected {"all": [...], "none": [...]}');
  const { all, none, variant } = rule as { all?: unknown; none?: unknown; variant?: unknown };
  if (variant !== undefined) {
    if (!Array.isArray(variant) || !variant.every((t) => typeof t === 'string')) {
      fail(where, '"variant" must be a list of strings');
    }
  }
  if (all !== undefined) {
    if (!Array.isArray(all)) fail(where, '"all" must be a list');
    for (const term of all) {
      const ok =
        typeof term === 'string' ||
        (Array.isArray(term) && term.length > 0 && term.every((t) => typeof t === 'string'));
      if (!ok) fail(where, `"all" entries must be strings or lists of strings, got ${JSON.stringify(term)}`);
    }
  }
  if (none !== undefined) {
    if (!Array.isArray(none) || !none.every((t) => typeof t === 'string')) {
      fail(where, '"none" must be a list of strings');
    }
  }
  return rule as MatchRule;
}

export function loadTestSet(path: string): TestSet {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    destination?: { country?: unknown; state?: unknown };
    queries?: unknown[];
  };
  const state = raw.destination?.state;
  if (raw.destination?.country !== 'US' || typeof state !== 'string' || !/^[A-Z]{2}$/.test(state)) {
    fail('destination', 'expected {"country": "US", "state": "<two-letter state code>"}');
  }
  if (!Array.isArray(raw.queries)) fail('queries', 'expected a list');

  const seen = new Set<string>();
  const queries = raw.queries.map((value, i): TestEntry => {
    const e = value as Record<string, unknown>;
    const id = str(`queries[${i}].id`, e.id);
    const where = id || `queries[${i}]`;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail(where, 'id must be lowercase letters, digits and dashes');
    if (seen.has(id)) fail(where, 'duplicate id');
    seen.add(id);

    const query = str(`${where}.query`, e.query);
    if (!query.trim()) fail(where, 'query is empty');
    const exact = e.exactItem as { description?: unknown; match?: unknown } | undefined;
    if (!exact) fail(where, 'exactItem is missing');

    const b = (e.benchmark ?? {}) as Record<string, unknown>;
    const itemPrice = num(`${where}.benchmark.itemPrice`, b.itemPrice);
    const shipping = num(`${where}.benchmark.shipping`, b.shipping);
    let totalPrice = num(`${where}.benchmark.totalPrice`, b.totalPrice);
    if (totalPrice === null && itemPrice !== null) totalPrice = itemPrice + (shipping ?? 0);

    const twins = e.acceptableTwins;
    if (twins !== null && twins !== undefined) {
      if (!Array.isArray(twins)) fail(where, 'acceptableTwins must be null or a list');
      twins.forEach((t, j) => {
        if (typeof t !== 'string') checkRule(`${where}.acceptableTwins[${j}]`, t);
      });
    }

    return {
      id,
      query,
      category: str(`${where}.category`, e.category),
      exactItem: {
        description: str(`${where}.exactItem.description`, exact.description),
        match: checkRule(`${where}.exactItem.match`, exact.match),
      },
      benchmark: {
        totalPrice,
        itemPrice,
        shipping,
        store: str(`${where}.benchmark.store`, b.store),
        url: str(`${where}.benchmark.url`, b.url),
        checkedOn: str(`${where}.benchmark.checkedOn`, b.checkedOn),
        notes: str(`${where}.benchmark.notes`, b.notes),
      },
      acceptableTwins: Array.isArray(twins) ? (twins as TwinSpec[]) : null,
    };
  });

  return { destination: { country: 'US', state }, queries };
}
