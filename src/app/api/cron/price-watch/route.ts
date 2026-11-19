import { NextRequest, NextResponse } from 'next/server';
import { getComparison } from '@/lib/comparisons';
import { loadComparison } from '@/lib/comparisonData';
import { formatCheckedDate } from '@/lib/comparisonPage';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { alertEmail, alertsConfigured, alertsFrom, shouldAlert, type PriceReading } from '@/lib/priceWatch';

// The scheduled price check behind price drop alerts (vercel.json runs it
// once a day). For every compare page somebody is watching it reads the
// page's price, records it, and emails the watchers it is a real drop for
// (lib/priceWatch.ts decides).
//
// COST: it reads through loadComparison, the same 3-day data cache the
// page itself uses. A page nobody watches is never read here, and a
// watched page costs a search only when its cached data has expired, which
// a visitor to the page would have paid for anyway.
//
// Only Vercel's scheduler may call it: Vercel sends the project's
// CRON_SECRET as a bearer token, and without that secret set the route
// refuses everyone.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!alertsConfigured()) return NextResponse.json({ skipped: 'alerts are not configured' });

  const watches = await prisma.priceWatch.findMany({
    where: { confirmedAt: { not: null }, unsubscribedAt: null },
  });
  const slugs = [...new Set(watches.map((w) => w.slug))];
  let read = 0;
  let sent = 0;
  let failed = 0;

  for (const slug of slugs) {
    const entry = getComparison(slug);
    if (!entry) continue;
    let reading: (PriceReading & { currency: string; checkedAt: string }) | null = null;
    try {
      const comparison = await loadComparison(entry);
      const top = comparison.item.top;
      if (top) {
        reading = {
          price: top.price,
          store: top.store,
          currency: top.currency,
          verifiedNew: comparison.item.topIsVerifiedNew,
          checkedAt: comparison.checkedAt,
        };
      }
    } catch {
      // The search was down or returned nothing: no reading, no alert.
      reading = null;
    }
    if (!reading) continue;
    read += 1;
    await prisma.pricePoint.create({
      data: {
        slug,
        price: reading.price,
        store: reading.store,
        currency: reading.currency,
        verifiedNew: reading.verifiedNew,
      },
    });

    for (const watch of watches.filter((w) => w.slug === slug)) {
      if (!shouldAlert(watch, reading)) continue;
      const mail = alertEmail({
        name: entry.name,
        slug,
        price: reading.price,
        store: reading.store,
        previousPrice: watch.lastAlertPrice ?? watch.baselinePrice,
        previousWhen: watch.lastAlertPrice === null ? 'when you signed up' : 'at the last alert',
        checked: formatCheckedDate(reading.checkedAt),
        token: watch.token,
      });
      const result = await sendEmail({ from: alertsFrom(), to: watch.email, ...mail });
      if (!result.ok) {
        // Not recorded as sent, so the next run tries again.
        failed += 1;
        continue;
      }
      sent += 1;
      await prisma.priceWatch.update({
        where: { id: watch.id },
        data: { lastAlertPrice: reading.price, lastAlertAt: new Date() },
      });
    }
  }

  // Counts only: no addresses, no product names.
  return NextResponse.json({ watchedPages: slugs.length, read, sent, failed });
}
