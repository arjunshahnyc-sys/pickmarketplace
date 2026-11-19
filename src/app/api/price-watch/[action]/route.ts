import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isWatchToken } from '@/lib/priceWatch';

// The links in alert emails: /api/price-watch/confirm?token=... and
// /api/price-watch/unsubscribe?token=... Each ends on a plain page that
// says what happened (/price-watch/<state>). The token is the only secret;
// an unknown one gets the same "link not valid" page whatever it was.
//
// Both work as a plain GET because that is what a link in an email is.
// Confirming twice and unsubscribing twice are harmless.
export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const done = (state: 'confirmed' | 'unsubscribed' | 'invalid') =>
    NextResponse.redirect(new URL(`/price-watch/${state}`, request.url), 303);

  const token = request.nextUrl.searchParams.get('token');
  if ((action !== 'confirm' && action !== 'unsubscribe') || !isWatchToken(token)) return done('invalid');

  try {
    const watch = await prisma.priceWatch.findUnique({ where: { token } });
    if (!watch) return done('invalid');
    if (action === 'confirm') {
      if (watch.unsubscribedAt) return done('unsubscribed');
      if (!watch.confirmedAt) {
        await prisma.priceWatch.update({ where: { token }, data: { confirmedAt: new Date() } });
      }
      return done('confirmed');
    }
    if (!watch.unsubscribedAt) {
      await prisma.priceWatch.update({ where: { token }, data: { unsubscribedAt: new Date() } });
    }
    return done('unsubscribed');
  } catch (error) {
    console.error('[price-watch] link failed:', error instanceof Error ? error.name : 'unknown error');
    return done('invalid');
  }
}
