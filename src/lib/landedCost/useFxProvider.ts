'use client';

// Client-side FX provider for landed-cost enrichment: fetches the /api/fx
// snapshot once per mount and upgrades from NullFxProvider (everything
// honestly unavailable) to a TableFxProvider when rates arrive. Any failure
// leaves the null provider in place: cross-currency totals show "estimate
// unavailable" rather than numbers converted from nothing.

import { useEffect, useState } from 'react';
import { landedCostEnabled } from '@/lib/flags';
import { NullFxProvider, TableFxProvider, type FxProvider } from './fx';

/**
 * The spread a shopper is assumed to pay over the ECB mid rate (card
 * network / issuer conversion margin). An ASSUMPTION, not data: it is
 * stated verbatim in every breakdown's assumptions line, and tunable via
 * NEXT_PUBLIC_FX_SPREAD_BPS without a code change. Default 150 bps (1.5%).
 */
function fxSpreadBps(): number {
  const raw = Number(process.env.NEXT_PUBLIC_FX_SPREAD_BPS);
  return Number.isSafeInteger(raw) && raw >= 0 && raw <= 1_000 ? raw : 150;
}

/**
 * 'loading' until /api/fx answers: the UI shows a computing state rather
 * than a wrong "unavailable" for totals that are merely waiting on rates.
 * 'unavailable' once the fetch failed: unavailability is then the honest,
 * final answer for cross-currency conversions.
 */
export type FxStatus = 'loading' | 'ready' | 'unavailable';

export function useFxProvider(): { provider: FxProvider; status: FxStatus } {
  const [state, setState] = useState<{ provider: FxProvider; status: FxStatus }>(() => ({
    provider: new NullFxProvider(),
    status: landedCostEnabled() ? 'loading' : 'unavailable',
  }));

  useEffect(() => {
    if (!landedCostEnabled()) return;
    let cancelled = false;
    const fail = () => {
      // Keep the null provider; unavailability is the honest fallback.
      if (!cancelled) setState((s) => ({ provider: s.provider, status: 'unavailable' }));
    };
    fetch('/api/fx')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pairsMicros?: Record<string, number>; asOf?: string; sourceId?: string } | null) => {
        if (cancelled) return;
        if (!data?.pairsMicros || !data.asOf) {
          fail();
          return;
        }
        setState({
          provider: new TableFxProvider(
            {
              pairsMicros: data.pairsMicros,
              asOf: data.asOf,
              spreadBps: fxSpreadBps(),
              sourceId: data.sourceId ?? 'fx:ecb',
            },
            new Date()
          ),
          status: 'ready',
        });
      })
      .catch(fail);
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
