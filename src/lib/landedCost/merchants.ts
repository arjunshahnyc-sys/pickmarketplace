// Per-merchant configuration: storefront country and incoterm.
//
// Since 2026-08-31 this is DERIVED from the merchant trust registry
// (src/lib/trust/registry.ts) — one entry there drives the trust badge, the
// badge logo, and this landed-cost config, so the three can never drift the
// way the old hand-maintained tables did (B&H and Office Depot variants were
// verified but unconfigured; QVC and CeX the reverse). To correct or add a
// merchant, edit the registry.
//
// INCOTERM SEMANTICS:
//   'DDP'     the merchant collects duties/taxes at checkout; the engine
//             shows import charges as prepaid.
//   'DAP'     charges arrive at the door; the engine adds them.
//   'unknown' the default, and the honest one: the engine shows a
//             DDP-to-DAP RANGE, never a point estimate. Adding duty on top
//             of a checkout that already collected it double-counts and
//             makes us look broken, which is why unknown never resolves to
//             a single number.
//
// Storefront countries are assumed from brand knowledge, so every derived
// row carries confidence 'estimated' — never better — and that confidence
// flows into every line the config decides.

import { collapse } from '../retailerTrust';
import { REGISTRY, type MerchantEntry } from '../trust/registry';
import type { Confidence, Incoterm } from './types';

export interface MerchantConfig {
  /** ISO 3166-1 alpha-2 of the storefront; undefined = unknown. */
  country?: string;
  incoterm: Incoterm;
  /** Trust in this row itself; flows into every line the config decides. */
  confidence: Confidence;
  notes?: string;
}

function configFor(e: MerchantEntry): MerchantConfig {
  return {
    country: e.storefrontCountry,
    incoterm: e.incoterm,
    confidence: 'estimated',
    notes:
      e.notes ??
      `${e.storefrontCountry} storefront assumed from brand; incoterm unverified. (registry: ${e.id})`,
  };
}

// The US-market table plus one table per international market, derived from
// each registry entry's markets and aliases. Registry validation guarantees
// an alias maps to exactly one entry per market.
function buildTables(): {
  us: Record<string, MerchantConfig>;
  byMarket: Record<string, Record<string, MerchantConfig>>;
} {
  const us: Record<string, MerchantConfig> = {};
  const byMarket: Record<string, Record<string, MerchantConfig>> = {};
  for (const e of REGISTRY) {
    const config = configFor(e);
    for (const market of e.markets) {
      const table =
        market === 'us' ? us : (byMarket[market.toUpperCase()] ??= {});
      for (const alias of e.aliases) {
        table[alias] = config;
      }
    }
  }
  return { us, byMarket };
}

const TABLES = buildTables();
const MERCHANTS: Record<string, MerchantConfig> = TABLES.us;
const MARKET_TABLES: Record<string, Record<string, MerchantConfig>> = TABLES.byMarket;

const UNKNOWN_MERCHANT: MerchantConfig = {
  country: undefined,
  incoterm: 'unknown',
  confidence: 'unknown',
  notes: 'Unrecognized merchant: country and duty handling are unknown.',
};

/**
 * Config for a merchant name seen in a given market's feed. The market's
 * own table wins; a miss falls through to the US table (a US brand in a
 * foreign feed usually ships from the US, and treating it as an import errs
 * toward overstating, never a wrong domestic zero); anything else is
 * unknown. No market = the legacy US-feed lookup, unchanged.
 */
export function getMerchantConfig(
  retailerName: string,
  sourceMarket?: string,
  table: Record<string, MerchantConfig> = MERCHANTS
): MerchantConfig {
  const key = collapse(retailerName);
  if (sourceMarket) {
    const marketTable = MARKET_TABLES[sourceMarket.toUpperCase()];
    const hit = marketTable?.[key];
    if (hit) return hit;
  }
  return table[key] ?? UNKNOWN_MERCHANT;
}

/** Shape a merchant for LandedCostInput. Ids are market-scoped so
 * amazon.co.uk and amazon.com never collide in ranking tiebreaks. */
export function merchantInputFor(
  retailerName: string,
  sourceMarket?: string
): {
  id: string;
  country?: string;
  incoterm: Incoterm;
  configConfidence: Confidence;
} {
  const config = getMerchantConfig(retailerName, sourceMarket);
  const market = sourceMarket?.toUpperCase() ?? 'US';
  return {
    id: market === 'US' ? collapse(retailerName) : `${market.toLowerCase()}:${collapse(retailerName)}`,
    country: config.country,
    incoterm: config.incoterm,
    configConfidence: config.confidence,
  };
}
