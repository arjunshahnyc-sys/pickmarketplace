'use client';

// Shopper destination (country + display currency + US state + optional US
// ZIP) for landed-cost estimates. Defaults to US/USD, persists in
// localStorage, and is mounted unconditionally (it is cheap); the UI that
// reads it only renders behind LANDED_COST_ENABLED.
//
// GEO DEFAULT: when the shopper has never chosen a destination, /api/geo
// (country-level plus US state, from Vercel's IP headers) seeds the picker
// so a visitor from London starts on GB totals and one from Newark starts
// on NJ sales tax. A geo default is deliberately NOT persisted: only
// explicit picker choices are stored, so travel or a VPN never locks in a
// stale location, and a stored choice always wins.
//
// SUBDIVISION: only meaningful for the US. It drives the sales-tax estimate
// and the geographic scope of stores' published shipping policies. Without
// one, US domestic totals honestly show tax as unresolved.
//
// POSTAL CODE (2026-10-23): a US ZIP the shopper types. It is resolved to
// its state in the browser (lib/landedCost/usZip.ts), and that state is
// what every estimate uses; the ZIP itself lives only in this state and in
// localStorage so the field survives a reload. It never goes on a request
// (the search API gets the country only) and never enters the landed-cost
// input (enrich.ts copies country, currency and state, nothing else). Pick
// cannot see it, and the header says so beside the field. Only ZIPs in the
// 50 states + DC are accepted: territories and military addresses are
// outside what Pick can estimate and are refused with a message rather
// than mapped to a wrong state. A hand-picked state keeps the ZIP only
// while the ZIP still describes it.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { landedCostEnabled } from '@/lib/flags';
import { getDestinationRules, supportedDestinations } from '@/lib/landedCost/rules/loader';
import { US_STATE_CODES } from '@/lib/landedCost/rules/usSalesTax';
import { normalizeZip, resolveZip } from '@/lib/landedCost/usZip';

export interface Destination {
  country: string;
  currency: string;
  /** US state code for the sales-tax estimate; undefined = not chosen. */
  subdivision?: string;
  /**
   * US ZIP the shopper typed; device-local, always consistent with
   * `subdivision`, never sent anywhere (see the POSTAL CODE note above).
   */
  postalCode?: string;
}

/** What happened to a ZIP the shopper entered; drives the field's message. */
export type PostalCodeOutcome = 'set' | 'cleared' | 'invalid' | 'unsupported';

const DEFAULT_DESTINATION: Destination = { country: 'US', currency: 'USD' };
const STORAGE_KEY = 'pick-destination';

interface DestinationContextValue {
  destination: Destination;
  /** Change country; the display currency follows the destination's own. */
  setCountry: (country: string) => void;
  setCurrency: (currency: string) => void;
  /** Change the US state ('' clears it). No-op outside the US. */
  setSubdivision: (subdivision: string) => void;
  /**
   * Set the US ZIP ('' clears it and keeps the state). A ZIP in one of the
   * 50 states or DC also sets the state ('set'); territory, military and
   * unassigned ZIPs are refused ('unsupported'), malformed input is
   * 'invalid'. Outside the US every value is 'unsupported'.
   */
  setPostalCode: (postalCode: string) => PostalCodeOutcome;
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

/** A stored or typed ZIP survives only while it resolves to `subdivision`. */
function sanitizePostalCode(
  country: string,
  subdivision: string | undefined,
  postalCode: unknown
): string | undefined {
  if (country !== 'US' || !subdivision || typeof postalCode !== 'string') return undefined;
  const zip = normalizeZip(postalCode);
  if (!zip) return undefined;
  const resolved = resolveZip(zip);
  return resolved?.kind === 'state' && resolved.code === subdivision ? zip : undefined;
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
          const subdivision = sanitizeSubdivision(parsed.country, parsed.subdivision);
          // Deliberate mount-time restore: SSR must render the default (no
          // localStorage on the server), so the stored choice can only
          // apply after hydration, which is exactly a setState-in-effect.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDestination({
            country: parsed.country,
            currency: parsed.currency,
            subdivision,
            postalCode: sanitizePostalCode(parsed.country, subdivision, parsed.postalCode),
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
        }); // state only, never persisted; geo never carries a ZIP
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
    // Leaving the US drops the state and ZIP; returning does not resurrect
    // them (the shopper re-picks, or geo seeds the state on a fresh visit).
    setCountry: (country) => persist({ country, currency: currencyFor(country) }),
    setCurrency: (currency) => persist({ ...destination, currency }),
    setSubdivision: (subdivision) => {
      const sub = sanitizeSubdivision(destination.country, subdivision);
      persist({
        ...destination,
        subdivision: sub,
        postalCode: sanitizePostalCode(destination.country, sub, destination.postalCode),
      });
    },
    setPostalCode: (input) => {
      if (destination.country !== 'US') return 'unsupported';
      if (input.trim() === '') {
        if (destination.postalCode !== undefined) {
          const cleared = { ...destination };
          delete cleared.postalCode;
          persist(cleared);
        }
        return 'cleared';
      }
      const zip = normalizeZip(input);
      if (!zip) return 'invalid';
      const resolved = resolveZip(zip);
      if (!resolved || resolved.kind !== 'state' || !US_STATE_CODES.includes(resolved.code)) {
        return 'unsupported';
      }
      persist({ ...destination, subdivision: resolved.code, postalCode: zip });
      return 'set';
    },
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
