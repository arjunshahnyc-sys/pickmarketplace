// FX rate snapshot for landed-cost estimates. The browser cannot fetch the
// ECB directly (connect-src 'self' in the CSP, deliberately), so this route
// fetches the daily reference XML server-side and serves USD-based pairs
// for the supported destination currencies.

import { NextResponse } from 'next/server';
import { allCrossPairsMicros, parseEcbDailyXml } from '@/lib/landedCost/ecb';
import { landedCostEnabled } from '@/lib/flags';

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
// The full ordered pair matrix over the supported currencies, not just
// USD->X: feed prices arrive in each market's own currency and the display
// currency is the shopper's free choice, so GBP:USD and EUR:JPY are as real
// as USD:GBP. TableFxProvider does exact-key lookups with no inversion.
const CURRENCIES = ['USD', 'GBP', 'CAD', 'AUD', 'EUR', 'JPY'];
// ECB publishes once per business day around 16:00 CET; 6 hours keeps us at
// most one refresh behind while sending the ECB a handful of requests a day.
const TTL_MS = 6 * 60 * 60 * 1000;

interface FxPayload {
  pairsMicros: Record<string, number>;
  asOf: string;
  sourceId: string;
  fetchedAt: string;
}

// globalThis for the same reason as the search cache: Next bundles each
// route with its own module copy, and a plain module-level variable would
// not survive across them.
const globalStore = globalThis as unknown as {
  __pickFxCache?: { data: FxPayload; ts: number };
};

export async function GET() {
  // Flag off: this surface does not exist.
  if (!landedCostEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const cached = globalStore.__pickFxCache;
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(ECB_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`ECB returned ${res.status}`);
    const table = parseEcbDailyXml(await res.text());
    if (!table) throw new Error('ECB response did not parse');
    const pairsMicros = allCrossPairsMicros(table, CURRENCIES);
    if (Object.keys(pairsMicros).length === 0) {
      throw new Error('ECB response did not parse');
    }

    const data: FxPayload = {
      pairsMicros,
      asOf: table.asOf,
      sourceId: 'fx:ecb',
      fetchedAt: new Date().toISOString(),
    };
    globalStore.__pickFxCache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    console.error('[fx] ECB fetch failed:', error instanceof Error ? error.message : error);
    // A previously cached snapshot may still be served past its TTL here:
    // the client-side TableFxProvider enforces the 7-day staleness cap, so
    // this can only bridge short outages, never resurrect ancient rates.
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(
      { error: 'FX rates are unavailable right now.' },
      { status: 503 }
    );
  }
}
