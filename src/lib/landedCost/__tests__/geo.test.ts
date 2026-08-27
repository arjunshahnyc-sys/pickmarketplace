import { describe, expect, it } from 'vitest';
import { geoDefaultDestination } from '../geo';

describe('geoDefaultDestination', () => {
  it('maps supported countries to their destination currency', () => {
    expect(geoDefaultDestination('GB')).toEqual({ country: 'GB', currency: 'GBP' });
    expect(geoDefaultDestination('JP')).toEqual({ country: 'JP', currency: 'JPY' });
    expect(geoDefaultDestination('US')).toEqual({ country: 'US', currency: 'USD' });
    expect(geoDefaultDestination(' de ')).toEqual({ country: 'DE', currency: 'EUR' });
  });

  it('returns null for unsupported or missing countries, never a wrong neighbor', () => {
    expect(geoDefaultDestination('IT')).toBeNull(); // EU but not a seeded destination
    expect(geoDefaultDestination('BR')).toBeNull();
    expect(geoDefaultDestination(null)).toBeNull();
    expect(geoDefaultDestination(undefined)).toBeNull();
    expect(geoDefaultDestination('')).toBeNull();
  });
});
