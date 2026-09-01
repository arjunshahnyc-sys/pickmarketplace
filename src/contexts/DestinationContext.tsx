'use client';

// Shopper destination (country + display currency + US state) for
// landed-cost estimates. Defaults to US/USD, persists in localStorage, and
// is mounted unconditionally (it is cheap); the UI that reads it only
// renders behind LANDED_COST_ENABLED.
//
// GEO DEFAULT: when the shopper has never chosen a destination, /api/geo
// (country-level plus US state, from Vercel's IP headers) seeds the picker
// so a visitor from London starts on GB totals and one from Newark starts
// on NJ sales tax. A geo default is deliberately NOT persisted: only
// explicit picker choices are stored, so travel or a VPN never locks in a
// stale location, and a stored choice always wins.
//
// SUBDIVISION: only meaningful for the US (drives the sales-tax estimate).
// Without one, US domestic totals honestly show tax as unresolved.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { landedCostEnabled } from '@/lib/flags';
import { getDestinationRules, supportedDestinations } from '@/lib/landedCost/rules/loader';
import { US_STATE_CODES } from '@/lib/landedCost/rules/usSalesTax';

export interface Destination {
  country: string;
  currency: string;
  /** US state code for the sales-tax estimate; undefined = not chosen. */
  subdivision?: string;
}

const DEFAULT_DESTINATION: Destination = { country: 'US', currency: 'USD' };
const STORAGE_KEY = 'pick-destination';

interface DestinationContextValue {
  destination: Destination;
  /** Change country; the display currency follows the destination's own. */
  setCountry: (country: string) => void;
  setCurrency: (currency: string) => void;
  /** Change the US state ('' clears it). No-op outside the US. */
  setSubdivision: (subdivision: string) => void;
  countries: string[];
  /** Valid subdivision codes for the current country ([] outside the US). */
  subdivisions: string[];
}

const DestinationContext = createContext<DestinationContextValue | null>(null);

function currencyFor(country: string): string {
  return getDestinationRules(country)?.currency ?? 'USD';
}

function sanitizeSubdivision(country: string, subdivision: unknown): string | undefined {
  return country === 'US' &&
    typeof subdivision === 'string' &&
    US_STATE_CODES.includes(subdivision)
    ? subdivision
    : undefined;
}

export function DestinationProvider({ children }: { children: ReactNode }) {
  const [destination, setDestination] = useState<Destination>(DEFAULT_DESTINATION);

  // Restore after mount (SSR-safe: the first client render matches the
  // server's default, then a stored choice applies). With no stored choice,
  // fall back to the geo default.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Destination>;
        if (
          typeof parsed.country === 'string' &&
          supportedDestinations().includes(parsed.country) &&
          typeof parsed.currency === 'string'
        ) {
          // Deliberate mount-time restore: SSR must render the default (no
          // localStorage on the server), so the stored choice can only
          // apply after hydration, which is exactly a setState-in-effect.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDestination({
            country: parsed.country,
            currency: parsed.currency,
            subdivision: sanitizeSubdivision(parsed.country, parsed.subdivision),
          });
          return;
        }
      }
    } catch {
      // Storage unavailable or corrupted: keep the default silently.
    }
    if (!landedCostEnabled()) return;
    let cancelled = false;
    fetch('/api/geo')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { destination?: Destination | null } | null) => {
        if (cancelled || !data?.destination) return;
        if (!supportedDestinations().includes(data.destination.country)) return;
        setDestination({
          country: data.destination.country,
          currency: data.destination.currency,
          subdivision: sanitizeSubdivision(
            data.destination.country,
            data.destination.subdivision
          ),
        }); // state only, never persisted
      })
      .catch(() => {
        // Geo unavailable: the US default stands.
      });
    return () => {
      cancelled = true;
    };
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
    // Leaving the US drops the state; returning does not resurrect it (the
    // shopper re-picks, or geo seeds it on a fresh visit).
    setCountry: (country) => persist({ country, currency: currencyFor(country) }),
    setCurrency: (currency) => persist({ ...destination, currency }),
    setSubdivision: (subdivision) =>
      persist({
        ...destination,
        subdivision: sanitizeSubdivision(destination.country, subdivision),
      }),
    countries: supportedDestinations(),
    subdivisions: destination.country === 'US' ? US_STATE_CODES : [],
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
