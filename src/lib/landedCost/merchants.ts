// Per-merchant configuration: storefront country and incoterm.
//
// THIS FILE IS THE EDITABLE CONFIG the brief calls for. To correct or add a
// merchant: add/edit its row, with a note saying how you know. Keys are
// collapsed merchant names (see retailerTrust.ts collapse()), the same
// identity the trust badges use.
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
// Today every configured merchant is a US storefront observed through
// US-locked sources, so country is 'US' with confidence 'estimated' (brand
// knowledge, not verification). International storefronts of the same
// brands (amazon.co.uk etc.) are DIFFERENT merchants and get their own rows
// when international sources land.

import { collapse } from '../retailerTrust';
import type { Confidence, Incoterm } from './types';

export interface MerchantConfig {
  /** ISO 3166-1 alpha-2 of the storefront; undefined = unknown. */
  country?: string;
  incoterm: Incoterm;
  /** Trust in this row itself; flows into every line the config decides. */
  confidence: Confidence;
  notes?: string;
}

const US_STOREFRONT: MerchantConfig = {
  country: 'US',
  incoterm: 'unknown',
  confidence: 'estimated',
  notes: 'US storefront assumed from brand; incoterm unverified.',
};

const MERCHANTS: Record<string, MerchantConfig> = {
  amazon: US_STOREFRONT,
  walmart: US_STOREFRONT,
  target: US_STOREFRONT,
  bestbuy: US_STOREFRONT,
  costco: US_STOREFRONT,
  ebay: US_STOREFRONT,
  homedepot: US_STOREFRONT,
  lowes: US_STOREFRONT,
  macys: US_STOREFRONT,
  nordstrom: US_STOREFRONT,
  wayfair: US_STOREFRONT,
  kroger: US_STOREFRONT,
  kohls: US_STOREFRONT,
  samsclub: US_STOREFRONT,
  bhphoto: US_STOREFRONT,
  bhphotovideo: US_STOREFRONT,
  adorama: US_STOREFRONT,
  newegg: US_STOREFRONT,
  staples: US_STOREFRONT,
  officedepot: US_STOREFRONT,
  rei: US_STOREFRONT,
  chewy: US_STOREFRONT,
  gamestop: US_STOREFRONT,
  microcenter: US_STOREFRONT,
  dickssportinggoods: US_STOREFRONT,
  apple: US_STOREFRONT,
  nike: US_STOREFRONT,
};

// GB-market storefronts (the international pilot). Same discipline as the
// US table: assumed from brand at 'estimated' confidence, incoterm unknown
// until verified. Names collapse via retailerTrust's collapse():
// "Amazon.co.uk" -> 'amazoncouk', "Currys PC World" -> 'curryspcworld'.
const GB_STOREFRONT: MerchantConfig = {
  country: 'GB',
  incoterm: 'unknown',
  confidence: 'estimated',
  notes: 'GB storefront assumed from brand; incoterm unverified.',
};

const GB_MERCHANTS: Record<string, MerchantConfig> = {
  amazoncouk: GB_STOREFRONT,
  // In the GB feed, "eBay" is the eBay UK marketplace; without this row it
  // would fall through to the US table and mislabel GB-local listings as
  // imports. (The reverse error is impossible: US-feed offers never consult
  // this table.)
  ebay: GB_STOREFRONT,
  currys: GB_STOREFRONT,
  curryspcworld: GB_STOREFRONT,
  argos: GB_STOREFRONT,
  johnlewis: GB_STOREFRONT,
  costcowholesaleuk: GB_STOREFRONT,
  ao: GB_STOREFRONT,
  aocom: GB_STOREFRONT,
  boots: GB_STOREFRONT,
  screwfix: GB_STOREFRONT,
  very: GB_STOREFRONT,
  cex: GB_STOREFRONT,
};

const MARKET_TABLES: Record<string, Record<string, MerchantConfig>> = {
  GB: GB_MERCHANTS,
};

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
