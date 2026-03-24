// ============================================================================
// SAFE FORMATTERS - Prevent crashes from undefined/null/NaN values
// ============================================================================

/**
 * Safely formats a price value to 2 decimal places
 * @param price - The price value (can be number, string, undefined, null)
 * @returns Formatted price string like "12.99" or "0.00" if invalid
 */
export function formatPrice(price: any): string {
  // Handle undefined, null, empty string
  if (price === undefined || price === null || price === '') {
    return '0.00';
  }

  // Convert to number if string
  const num = typeof price === 'number' ? price : parseFloat(String(price));

  // Check if valid number
  if (isNaN(num) || !isFinite(num)) {
    return '0.00';
  }

  // Format to 2 decimal places
  return num.toFixed(2);
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
