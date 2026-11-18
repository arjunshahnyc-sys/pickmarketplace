// The price a shopper reads on a card, in THEIR currency.
//
// A store's price arrives in the store's own currency (a US store in
// dollars, an Indian store in rupees). The delivered-cost breakdown already
// converts the item price into the shopper's chosen currency at the day's
// rate (its 'item' line); this module lifts that figure onto the card so a
// shopper in India reads rupees on every card, not a mix of rupees and
// dollars (asked for 2026-11-18). The store's own price is not repeated on
// the card (owner decision 2026-11-18); the breakdown's footnote states the
// conversion rate and date.
//
// No new arithmetic about money happens here: the converted item price is
// the breakdown's own line, and every other amount on the card (crossed-out
// price, "Save" tag) is scaled by the same ratio so the card agrees with
// itself.

import { minorUnitExponent } from './landedCost/money';
import type { Product } from './types';

export interface ShopperPrice {
  /** Item price in the shopper's currency, minor units. */
  amountMinor: number;
  currency: string;
  /** True when this is a conversion, false when the store already prices in the shopper's currency. */
  converted: boolean;
  /** Any other amount in the STORE's currency, restated in the shopper's (minor units). */
  convert: (storeAmount: number) => number;
}

/**
 * The card price for this shopper, or null when there is nothing to convert
 * with (no breakdown, or the day's rate was unavailable so the item line is
 * unknown): the caller then shows the store's own price, unchanged.
 */
export function shopperPriceFor(product: Product): ShopperPrice | null {
  const breakdown = product.landedCost;
  if (!breakdown) return null;
  const storeCurrency = product.currency ?? 'USD';
  const item = breakdown.lines.find((l) => l.kind === 'item');
  if (!item || item.amountMinor === null) return null;
  if (!(product.price > 0)) return null;
  const amountMinor = item.amountMinor;
  if (breakdown.currency === storeCurrency) {
    const scale = 10 ** minorUnitExponent(storeCurrency);
    return {
      amountMinor,
      currency: storeCurrency,
      converted: false,
      convert: (storeAmount) => Math.round(storeAmount * scale),
    };
  }
  return {
    amountMinor,
    currency: breakdown.currency,
    converted: true,
    convert: (storeAmount) => Math.round((storeAmount / product.price) * amountMinor),
  };
}
