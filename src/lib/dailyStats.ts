// The writing half of Pick's usage counters. Everything about what is
// counted and why is in dailyStats.shared.ts. SERVER ONLY.

import { prisma } from './prisma';
import { statsDay, type StatMetric } from './dailyStats.shared';

export * from './dailyStats.shared';

/** Adds one to today's count for a metric. Never throws: a counter must not break a page. */
export async function bumpStat(metric: StatMetric, now: Date = new Date()): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const day = statsDay(now);
    await prisma.dailyStat.upsert({
      where: { day_metric: { day, metric } },
      create: { day, metric, count: 1 },
      update: { count: { increment: 1 } },
    });
  } catch (error) {
    console.error('[stats] count failed:', error instanceof Error ? error.name : 'unknown error');
  }
}
