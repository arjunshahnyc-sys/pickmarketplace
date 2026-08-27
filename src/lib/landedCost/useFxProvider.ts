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

export function useFxProvider(): FxProvider {
  const [provider, setProvider] = useState<FxProvider>(() => new NullFxProvider());

  useEffect(() => {
    if (!landedCostEnabled()) return;
    let cancelled = false;
    fetch('/api/fx')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pairsMicros?: Record<string, number>; asOf?: string; sourceId?: string } | null) => {
        if (cancelled || !data?.pairsMicros || !data.asOf) return;
        setProvider(
          new TableFxProvider(
            {
              pairsMicros: data.pairsMicros,
              asOf: data.asOf,
              spreadBps: fxSpreadBps(),
              sourceId: data.sourceId ?? 'fx:ecb',
            },
            new Date()
          )
        );
      })
      .catch(() => {
        // Keep the null provider; unavailability is the honest fallback.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return provider;
}
