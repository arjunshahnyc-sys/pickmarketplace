import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The spending guard, 2026-11-13. Search went down on 2026-11-09 when the
// prepaid balance reached zero; nothing limited the total a day could spend.

// The day's starting balance lives in Next's data cache; here a plain map.
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => {
    const held = new Map<string, R>();
    return async (...args: A): Promise<R> => {
      const key = JSON.stringify(args);
      if (!held.has(key)) held.set(key, await fn(...args));
      return held.get(key) as R;
    };
  },
}));

import {
  budgetDay,
  budgetLimits,
  DEFAULT_DAILY_CREDIT_CAP,
  DEFAULT_RESERVE_CREDITS,
  pauseReason,
  refreshSearchBudget,
  resetSearchBudget,
  spendingPaused,
} from '../searchBudget';
import { performLiveSearch } from '../searchService';

const LIMITS = { dailyCap: 4000, reserve: 1500 };

describe('pauseReason', () => {
  it('allows spending inside the cap and above the reserve', () => {
    expect(pauseReason(40000, 42000, LIMITS)).toBeNull();
  });

  it('pauses once the day has spent the cap', () => {
    expect(pauseReason(38001, 42000, LIMITS)).toBeNull();
    expect(pauseReason(38000, 42000, LIMITS)).toBe('daily-cap');
  });

  it('pauses below the reserve whatever the day spent', () => {
    expect(pauseReason(1499, 1600, LIMITS)).toBe('reserve');
    expect(pauseReason(1499, null, LIMITS)).toBe('reserve');
  });

  it('a top-up during the day never pauses', () => {
    expect(pauseReason(90000, 42000, LIMITS)).toBeNull();
  });

  it('fails open when the balance is unknown, and applies only the reserve without a day start', () => {
    expect(pauseReason(null, 42000, LIMITS)).toBeNull();
    expect(pauseReason(5000, null, LIMITS)).toBeNull();
  });
});

describe('limits and the day', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('counts a spend against the UTC day', () => {
    expect(budgetDay(new Date('2026-11-13T23:59:59Z'))).toBe('2026-11-13');
    expect(budgetDay(new Date('2026-11-14T00:00:00Z'))).toBe('2026-11-14');
  });

  it('reads the limits from the environment, ignoring nonsense', () => {
    expect(budgetLimits()).toEqual({ dailyCap: DEFAULT_DAILY_CREDIT_CAP, reserve: DEFAULT_RESERVE_CREDITS });
    vi.stubEnv('SERPER_DAILY_CREDIT_CAP', '250');
    vi.stubEnv('SERPER_RESERVE_CREDITS', 'lots');
    expect(budgetLimits()).toEqual({ dailyCap: 250, reserve: DEFAULT_RESERVE_CREDITS });
  });
});

describe('the guard against the live balance', () => {
  let balance: number | null;
  let paidCalls: number;
  const NOON = new Date('2026-11-13T12:00:00Z');

  beforeEach(() => {
    resetSearchBudget();
    balance = 46000;
    paidCalls = 0;
    vi.stubEnv('SERPER_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).endsWith('/account')) {
          if (balance === null) throw new Error('network');
          return new Response(JSON.stringify({ balance, rateLimit: 50 }), { status: 200 });
        }
        paidCalls += 1;
        return new Response(JSON.stringify({ shopping: [] }), { status: 200 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('pauses when the balance has fallen the cap below the day start, and resumes the next day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOON);
    await refreshSearchBudget(NOON);
    expect(await spendingPaused(NOON)).toBeNull();

    // Two minutes on, the day has spent 4,000 credits.
    const later = new Date(NOON.getTime() + 2 * 60 * 1000);
    vi.setSystemTime(later);
    balance = 42000;
    expect(await spendingPaused(later)).toBe('daily-cap');

    // The next UTC day starts from the balance it finds.
    const tomorrow = new Date('2026-11-14T00:05:00Z');
    vi.setSystemTime(tomorrow);
    await refreshSearchBudget(tomorrow);
    expect(await spendingPaused(tomorrow)).toBeNull();
  });

  it('pauses below the reserve even where the day start was never loaded', async () => {
    balance = 900;
    expect(await spendingPaused(NOON)).toBe('reserve');
  });

  it('never pauses because the balance could not be read', async () => {
    balance = null;
    await refreshSearchBudget(NOON);
    expect(await spendingPaused(NOON)).toBeNull();
  });

  it('a paused live search spends nothing and says why', async () => {
    balance = 900;
    const data = await performLiveSearch('budget guard test query one');
    expect(paidCalls).toBe(0);
    expect(data.budgetPaused).toBe(true);
    expect(data.allSourcesFailed).toBe(true);
    expect(data.results).toEqual([]);
    expect(data.retailerSearchLinks.length).toBeGreaterThan(0);
  });

  it('an allowed live search runs', async () => {
    const data = await performLiveSearch('budget guard test query two');
    expect(paidCalls).toBe(1);
    expect(data.budgetPaused).toBeUndefined();
  });
});
