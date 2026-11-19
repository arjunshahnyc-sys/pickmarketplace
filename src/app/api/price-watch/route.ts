import { NextRequest, NextResponse } from 'next/server';
import { getComparison } from '@/lib/comparisons';
import { loadComparison } from '@/lib/comparisonData';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import {
  alertsConfigured,
  alertsFrom,
  confirmationEmail,
  newWatchToken,
  validateWatchRequest,
} from '@/lib/priceWatch';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rateLimit';

// Price alert sign-up for one compare page (rules in lib/priceWatch.ts).
// The answer is the same whether or not the address was already signed up,
// so this route cannot be used to find out who watches what. The address
// is never logged.
const ACCEPTED = {
  success: true,
  message: 'Check your inbox and press the link to confirm. Nothing is sent until you do.',
};

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, RATE_LIMITS.priceWatch);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSeconds);

  if (!alertsConfigured()) {
    return NextResponse.json({ error: 'Price alerts are not available right now.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const checked = validateWatchRequest(body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const entry = getComparison(checked.slug);
  if (!entry) return NextResponse.json({ error: 'Unknown product.' }, { status: 404 });

  // The price to beat is the one on the page right now. No verified new
  // price on the page means there is nothing honest to watch.
  let top: { price: number; store: string; currency: string } | null = null;
  try {
    const comparison = await loadComparison(entry);
    if (comparison.item.top && comparison.item.topIsVerifiedNew) top = comparison.item.top;
  } catch {
    top = null;
  }
  if (!top) {
    return NextResponse.json(
      { error: 'Pick has no confirmed price for this product right now, so there is nothing to watch yet.' },
      { status: 409 }
    );
  }

  try {
    const existing = await prisma.priceWatch.findUnique({
      where: { email_slug: { email: checked.email, slug: entry.slug } },
    });
    // Already confirmed and active: nothing to do, and nothing to reveal.
    if (existing?.confirmedAt && !existing.unsubscribedAt) return NextResponse.json(ACCEPTED);

    const token = newWatchToken();
    const fresh = {
      token,
      baselinePrice: top.price,
      baselineStore: top.store,
      currency: top.currency,
      confirmedAt: null,
      unsubscribedAt: null,
      lastAlertPrice: null,
      lastAlertAt: null,
    };
    await prisma.priceWatch.upsert({
      where: { email_slug: { email: checked.email, slug: entry.slug } },
      create: { email: checked.email, slug: entry.slug, ...fresh },
      update: fresh,
    });

    const mail = confirmationEmail({ name: entry.name, price: top.price, store: top.store, token });
    const sent = await sendEmail({ from: alertsFrom(), to: checked.email, ...mail });
    if (!sent.ok) {
      return NextResponse.json({ error: 'The confirmation email could not be sent. Try again later.' }, { status: 502 });
    }
    return NextResponse.json(ACCEPTED);
  } catch (error) {
    console.error('[price-watch] sign-up failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ error: 'Price alerts are not available right now.' }, { status: 503 });
  }
}
