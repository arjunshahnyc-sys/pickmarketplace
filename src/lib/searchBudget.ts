// A spending guard for the paid search API (Serper).
//
// Every search, offer-list lookup and click lookup spends prepaid credits,
// and when the balance reached zero on 2026-11-09 search went down for
// everyone. The per-IP rate limit (lib/rateLimit.ts) stops one client; it
// does nothing about a thousand ordinary visitors arriving from one post.
// This is the limit on the total.
//
// Two rules, both read from Serper's own balance (GET /account, which costs
// nothing), so they hold across serverless instances without a database:
//
//   1. A daily cap. The first balance seen in a UTC day is remembered in
//      Next's data cache, which every instance shares; once the balance has
//      fallen SERPER_DAILY_CREDIT_CAP below it, paid calls pause until the
//      next UTC day. A top-up during the day only ever helps.
//   2. A reserve. Below SERPER_RESERVE_CREDITS paid calls pause whatever the
//      day's spend, so the balance is never run to zero by visitors.
//
// Paused means: a visitor's live search answers "paused, here are the
// stores' own search links"; comparison pages keep their last good render
// (their searches throw, as they do in an outage); an outbound click still
// redirects, without the lookup. Searches already cached keep being served.
//
// It fails open. If the balance cannot be read, nothing is paused: this
// guard must never be the reason search is down.
//
// How it is wired. Paid call sites ask `spendingPaused()`, which reads this
// instance's memory and refreshes the current balance when it is stale.
// The day's starting balance comes from the shared cache, and that read is
// only safe outside another unstable_cache scope (nested, Next bypasses the
// cache AND overwrites the entry, which would reset the day's start to
// now). So it happens in `refreshSearchBudget()`, which the entry points
// call before any paid work: the search route, the click route, and the
// pages. A call site reached without it still enforces the reserve.
//
// Server only.

import { request as httpsRequest } from 'node:https';
import { unstable_cache } from 'next/cache';

/** Credits a UTC day may spend before paid calls pause. About 2,000 visitor searches. */
export const DEFAULT_DAILY_CREDIT_CAP = 4000;
/** Balance below which paid calls pause regardless of the day's spend. */
export const DEFAULT_RESERVE_CREDITS = 1500;

const BALANCE_TTL_MS = 60 * 1000;
const DAY_START_TTL_MS = 10 * 60 * 1000;
const BALANCE_TIMEOUT_MS = 3000;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export interface BudgetLimits {
  dailyCap: number;
  reserve: number;
}

export function budgetLimits(): BudgetLimits {
  return {
    dailyCap: envNumber('SERPER_DAILY_CREDIT_CAP', DEFAULT_DAILY_CREDIT_CAP),
    reserve: envNumber('SERPER_RESERVE_CREDITS', DEFAULT_RESERVE_CREDITS),
  };
}

export type PauseReason = 'daily-cap' | 'reserve';

/**
 * The rule itself, pure. `dayStart` is null when this instance has not
 * learned the day's starting balance; only the reserve applies then.
 */
export function pauseReason(balance: number | null, dayStart: number | null, limits: BudgetLimits): PauseReason | null {
  if (balance === null) return null;
  if (balance < limits.reserve) return 'reserve';
  if (dayStart !== null && dayStart - balance >= limits.dailyCap) return 'daily-cap';
  return null;
}

/** "2026-11-13": the UTC day a spend is counted against. */
export function budgetDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

interface BudgetState {
  balance: { value: number; at: number } | null;
  dayStart: { day: string; value: number; at: number } | null;
  pending: Promise<number | null> | null;
  lastLogged: string | null;
}

// On globalThis because Next bundles each route with its own copy of this
// module (see lib/rateLimit.ts).
const globalStore = globalThis as unknown as { __pickSearchBudget?: BudgetState };
const state = (globalStore.__pickSearchBudget ??= { balance: null, dayStart: null, pending: null, lastLogged: null });

/**
 * Serper's current credit balance; null when it cannot be read. Free.
 *
 * Asked with node:https and not fetch, on purpose. Next instruments fetch:
 * an uncached fetch during the render of a page that revalidates on a
 * timer turns the page dynamic and fails the render ("Page changed from
 * static to dynamic at runtime", every comparison page, in production for
 * five minutes on 2026-11-13), and a cached one would shorten the page's
 * own revalidation window to the balance's. This read belongs to neither.
 */
export function fetchBalance(): Promise<number | null> {
  const apiKey = process.env.SERPER_API_KEY;
  // No network from the test suite, whatever key it stubs; tests pass their
  // own reader to resetSearchBudget.
  if (!apiKey || process.env.NODE_ENV === 'test') return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const request = httpsRequest(
        'https://google.serper.dev/account',
        { method: 'GET', headers: { 'X-API-KEY': apiKey }, timeout: BALANCE_TIMEOUT_MS },
        (response) => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', (chunk: string) => {
            if (body.length < 10_000) body += chunk;
          });
          response.on('error', () => done(null));
          response.on('end', () => {
            if (response.statusCode !== 200) return done(null);
            try {
              const data = JSON.parse(body) as { balance?: unknown };
              done(typeof data.balance === 'number' && Number.isFinite(data.balance) ? data.balance : null);
            } catch {
              done(null);
            }
          });
        }
      );
      request.on('timeout', () => request.destroy());
      request.on('error', () => done(null));
      request.end();
    } catch {
      done(null);
    }
  });
}

let readBalance: () => Promise<number | null> = fetchBalance;

async function currentBalance(now: number): Promise<number | null> {
  if (state.balance && now - state.balance.at < BALANCE_TTL_MS) return state.balance.value;
  // One read at a time per instance, however many searches are waiting.
  state.pending ??= readBalance().finally(() => {
    state.pending = null;
  });
  const value = await state.pending;
  if (value !== null) state.balance = { value, at: Date.now() };
  // A failed read keeps the last known balance rather than forgetting it.
  return value ?? state.balance?.value ?? null;
}

// unstable_cache keys on the text of its callback, which a production build
// compiles differently in each route (see lib/comparisonData.ts). A fixed
// text keeps every route on the same entry.
function withFixedKeyText<F extends (...args: never[]) => unknown>(name: string, fn: F): F {
  Object.defineProperty(fn, 'toString', { value: () => name });
  return fn;
}

// The first balance read in a UTC day, shared by every instance. Throwing
// on a failed read keeps a null out of the cache.
const sharedDayStart = unstable_cache(
  withFixedKeyText('pick-search-budget-day-start', async (day: string): Promise<number> => {
    const balance = await readBalance();
    if (balance === null) throw new Error(`Could not read the search balance for ${day}`);
    return balance;
  }),
  ['pick-search-budget-day-start', 'v1'],
  // Entries are keyed by day, so their age never matters; a week keeps this
  // from shortening the revalidation window of any page that reads it.
  { revalidate: 7 * 24 * 60 * 60 }
);

function logOnce(reason: PauseReason | null, balance: number | null, dayStart: number | null): void {
  const label = reason ?? 'ok';
  if (state.lastLogged === label) return;
  // The first reading of a healthy budget is not news.
  if (state.lastLogged !== null || reason !== null) {
    console.error(
      reason
        ? `[search budget] paid searches PAUSED (${reason}): balance ${balance}, day started at ${dayStart ?? 'unknown'}`
        : `[search budget] paid searches resumed: balance ${balance}`
    );
  }
  state.lastLogged = label;
}

/**
 * Loads the day's starting balance from the shared cache and the current
 * balance. Call it from a route or a page before paid work, and never from
 * inside an unstable_cache callback (see the header). Never throws.
 */
export async function refreshSearchBudget(now: Date = new Date()): Promise<void> {
  try {
    const day = budgetDay(now);
    const held = state.dayStart;
    if (!held || held.day !== day || now.getTime() - held.at >= DAY_START_TTL_MS) {
      const value = await sharedDayStart(day);
      state.dayStart = { day, value, at: now.getTime() };
    }
  } catch {
    // No day start: the reserve still applies.
  }
  await currentBalance(now.getTime());
}

/**
 * Whether paid search calls are paused right now, and why. Asked at every
 * paid call site. Refreshes the current balance when stale; safe anywhere.
 */
export async function spendingPaused(now: Date = new Date()): Promise<PauseReason | null> {
  const balance = await currentBalance(now.getTime());
  const day = budgetDay(now);
  const dayStart = state.dayStart && state.dayStart.day === day ? state.dayStart.value : null;
  const reason = pauseReason(balance, dayStart, budgetLimits());
  logOnce(reason, balance, dayStart);
  return reason;
}

/** What a paused call site reports as its source error. */
export const BUDGET_PAUSED_ERROR = 'Search budget paused';

/** What a visitor is told when live search is paused. */
export const BUDGET_PAUSED_MESSAGE =
  'Live search is paused for now: Pick has reached its search limit for today. Try again later, or search the stores directly below.';

/** Test hook: forget everything, and optionally read the balance from `reader` instead of Serper. */
export function resetSearchBudget(reader: () => Promise<number | null> = fetchBalance): void {
  state.balance = null;
  state.dayStart = null;
  state.pending = null;
  state.lastLogged = null;
  readBalance = reader;
}
