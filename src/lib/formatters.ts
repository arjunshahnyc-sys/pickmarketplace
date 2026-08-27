// ============================================================================
// SAFE FORMATTERS - Prevent crashes from undefined/null/NaN values
// ============================================================================

import { minorUnitExponent } from './landedCost/money';

/**
 * Safely formats a price value with the currency's decimal count.
 * @param price - The price value (can be number, string, undefined, null)
 * @param currency - Optional ISO code; omitted keeps the legacy 2-decimal
 *   behavior (all pre-international call sites). JPY renders 0 decimals.
 * @returns Formatted price string like "12.99" (or "0.00" if invalid)
 */
export function formatPrice(price: any, currency?: string): string {
  const decimals = currency ? minorUnitExponent(currency) : 2;
  const invalid = (0).toFixed(decimals);

  // Handle undefined, null, empty string
  if (price === undefined || price === null || price === '') {
    return invalid;
  }

  // Convert to number if string
  const num = typeof price === 'number' ? price : parseFloat(String(price));

  // Check if valid number
  if (isNaN(num) || !isFinite(num)) {
    return invalid;
  }

  return num.toFixed(decimals);
}

/**
 * Display symbol for an offer's currency. Undefined and USD both render '$'
 * (the legacy US-feed shape), so flag-off surfaces are unchanged; non-US
 * market offers (international pilot) show their own symbol.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
};

export function currencySymbol(currency?: string): string {
  if (!currency) return '$';
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

/**
 * Safely formats a rating to 1 decimal place
 * @param rating - The rating value
 * @returns Formatted rating like "4.5" or "0.0" if invalid
 */
export function formatRating(rating: any): string {
  if (rating === undefined || rating === null || rating === '') {
    return '0.0';
  }

  const num = typeof rating === 'number' ? rating : parseFloat(String(rating));

  if (isNaN(num) || !isFinite(num)) {
    return '0.0';
  }

  return num.toFixed(1);
}

/**
 * Safely formats a number to integer (no decimals)
 * @param value - The value to format
 * @returns Formatted integer like "42" or "0" if invalid
 */
export function formatInteger(value: any): string {
  if (value === undefined || value === null || value === '') {
    return '0';
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(num) || !isFinite(num)) {
    return '0';
  }

  return num.toFixed(0);
}
