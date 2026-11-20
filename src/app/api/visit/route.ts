import { after, NextRequest, NextResponse } from 'next/server';
import { bumpStat, mayMeasureReturning } from '@/lib/dailyStats';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

// The visit counter's two calls (see lib/dailyStats.ts for what is and is
// not stored, and components/VisitBeacon.tsx for the browser side).
//
// GET  tells the browser whether it may keep its own first-visit note
//      here: yes outside the EEA, the UK and Switzerland.
// POST adds one to today's count of new, returning or unmeasured visits.
//      The body is one word; nothing else about the request is kept.
const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|curl|wget|python|scrapy|httpclient/i;
const KINDS = ['visit_new', 'visit_returning', 'visit_unmeasured'] as const;

export function GET(request: NextRequest) {
  return NextResponse.json(
    { measure: mayMeasureReturning(request.headers.get('x-vercel-ip-country')) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  const done = () => new NextResponse(null, { status: 204 });
  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || BOT_UA.test(ua)) return done();
  if (!checkRateLimit(request, RATE_LIMITS.visit).ok) return done();

  let kind: unknown;
  try {
    kind = ((await request.json()) as { kind?: unknown }).kind;
  } catch {
    return done();
  }
  const metric = KINDS.find((k) => k === kind);
  if (!metric) return done();
  // A browser in a no-storage region can only ever be "unmeasured",
  // whatever it sends.
  const allowed = mayMeasureReturning(request.headers.get('x-vercel-ip-country'));
  const counted = allowed ? metric : 'visit_unmeasured';
  after(() => bumpStat(counted));
  return done();
}
