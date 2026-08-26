'use client';

// Shopper destination (country + display currency) for landed-cost
// estimates. Defaults to US/USD, persists in localStorage, and is mounted
// unconditionally (it is cheap); the UI that reads it only renders behind
// LANDED_COST_ENABLED.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getDestinationRules, supportedDestinations } from '@/lib/landedCost/rules/loader';

export interface Destination {
  country: string;
  currency: string;
}

const DEFAULT_DESTINATION: Destination = { country: 'US', currency: 'USD' };
const STORAGE_KEY = 'pick-destination';

interface DestinationContextValue {
  destination: Destination;
  /** Change country; the display currency follows the destination's own. */
  setCountry: (country: string) => void;
  setCurrency: (currency: string) => void;
  countries: string[];
}

const DestinationContext = createContext<DestinationContextValue | null>(null);

function currencyFor(country: string): string {
  return getDestinationRules(country)?.currency ?? 'USD';
}

export function DestinationProvider({ children }: { children: ReactNode }) {
  const [destination, setDestination] = useState<Destination>(DEFAULT_DESTINATION);

  // Restore after mount (SSR-safe: the first client render matches the
  // server's default, then a stored choice applies).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Destination>;
      if (
        typeof parsed.country === 'string' &&
        supportedDestinations().includes(parsed.country) &&
        typeof parsed.currency === 'string'
      ) {
        // Deliberate mount-time restore: SSR must render the default (no
        // localStorage on the server), so the stored choice can only apply
        // after hydration, which is exactly a setState-in-effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDestination({ country: parsed.country, currency: parsed.currency });
      }
    } catch {
      // Storage unavailable or corrupted: keep the default silently.
    }
  }, []);

  const persist = (next: Destination) => {
    setDestination(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Best effort only.
    }
  };

  const value: DestinationContextValue = {
    destination,
    setCountry: (country) => persist({ country, currency: currencyFor(country) }),
    setCurrency: (currency) => persist({ ...destination, currency }),
    countries: supportedDestinations(),
  };

  return <DestinationContext.Provider value={value}>{children}</DestinationContext.Provider>;
}

export function useDestination(): DestinationContextValue {
  const ctx = useContext(DestinationContext);
  if (!ctx) {
    throw new Error('useDestination must be used within DestinationProvider');
  }
  return ctx;
}
