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

const UNKNOWN_MERCHANT: MerchantConfig = {
  country: undefined,
  incoterm: 'unknown',
  confidence: 'unknown',
  notes: 'Unrecognized merchant: country and duty handling are unknown.',
};

export function getMerchantConfig(
  retailerName: string,
  table: Record<string, MerchantConfig> = MERCHANTS
): MerchantConfig {
  return table[collapse(retailerName)] ?? UNKNOWN_MERCHANT;
}

/** Shape a merchant for LandedCostInput. */
export function merchantInputFor(retailerName: string): {
  id: string;
  country?: string;
  incoterm: Incoterm;
  configConfidence: Confidence;
} {
  const config = getMerchantConfig(retailerName);
  return {
    id: collapse(retailerName),
    country: config.country,
    incoterm: config.incoterm,
    configConfidence: config.confidence,
  };
}
