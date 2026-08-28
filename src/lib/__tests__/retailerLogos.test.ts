import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { VERIFIED_RETAILERS } from '../retailerTrust';
import { getRetailerLogo } from '@/components/RetailerLogos';

// The product requirement is "every verified seller shows a logo, everyone
// else shows text". These tests fail the build the moment a retailer is
// added to VERIFIED without a badge logo, or a logo entry points at an
// asset that isn't in public/logos.
describe('retailer badge logos', () => {
  const logoFiles = new Set(readdirSync(join(process.cwd(), 'public', 'logos')));

  it('every verified retailer resolves to a logo', () => {
    const missing = [...VERIFIED_RETAILERS].filter((key) => !getRetailerLogo(key));
    expect(missing).toEqual([]);
  });

  it('every resolved logo points at an existing asset', () => {
    const broken = [...VERIFIED_RETAILERS]
      .map((key) => getRetailerLogo(key))
      .filter((logo): logo is NonNullable<typeof logo> => Boolean(logo))
      .filter((logo) => !logoFiles.has(logo.src.replace('/logos/', '')))
      .map((logo) => logo.src);
    expect([...new Set(broken)]).toEqual([]);
  });

  it('unverified merchants get no logo (text badge stays)', () => {
    expect(getRetailerLogo('Whatnot')).toBeUndefined();
    expect(getRetailerLogo('Walmart - ABOUTYES')).toBeUndefined();
    expect(getRetailerLogo('Google Shopping')).toBeUndefined();
  });

  it('name variants collapse to the same asset', () => {
    expect(getRetailerLogo('The Home Depot')?.src).toBe('/logos/homedepot.svg');
    expect(getRetailerLogo('amazon.co.uk')?.src).toBe('/logos/amazon.svg');
    expect(getRetailerLogo('Ulta Beauty')?.src).toBe('/logos/ulta.svg');
    expect(getRetailerLogo('B&H Photo Video Audio')?.src).toBe('/logos/bhphoto.svg');
  });
});
