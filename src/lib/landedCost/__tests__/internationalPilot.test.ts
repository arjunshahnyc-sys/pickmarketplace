// International sources pilot (GB): market-scoped merchant identity,
// currency-aware enrichment, and the payoff scenario: a UK domestic offer
// competing against a US import for a GB shopper.

import { describe, expect, it } from 'vitest';
import { currencySymbol } from '../../formatters';
import { enhanceProductsWithGroupInfo } from '../../productGrouping';
import { getRetailerTrust } from '../../retailerTrust';
import type { Product } from '../../types';
import { orderByLandedCost, priceToMinor, withLandedCosts } from '../enrich';
import { FixtureFxProvider } from '../fx';
import { getMerchantConfig, merchantInputFor } from '../merchants';

const NOW = new Date('2026-08-27T00:00:00Z');
const FX = new FixtureFxProvider(
  { 'USD:GBP': { midMicros: 790_000, asOf: '2026-08-27T00:00:00Z' } },
  { spreadBps: 0 }
);

function offer(over: Partial<Product> & { id: string; price: number; retailer: string }): Product {
  return { name: over.id, image: '', url: `https://example.test/${over.id}`, ...over };
}

describe('market-scoped merchant identity', () => {
  it('GB-feed storefronts resolve to GB at estimated confidence', () => {
    for (const name of ['Amazon.co.uk', 'Currys', 'Argos', 'John Lewis', 'AO.com']) {
      const config = getMerchantConfig(name, 'GB');
      expect(config.country, name).toBe('GB');
      expect(config.confidence, name).toBe('estimated');
    }
  });

  it('eBay is market-dependent: GB feed means eBay UK, US feed means eBay US', () => {
    expect(getMerchantConfig('eBay', 'GB').country).toBe('GB');
    expect(getMerchantConfig('eBay').country).toBe('US');
  });

  it('a US brand in the GB feed falls through to the US table (import, overstates safely)', () => {
    expect(getMerchantConfig('Walmart', 'GB').country).toBe('US');
  });

  it('unknown merchants stay unknown in every market', () => {
    expect(getMerchantConfig('Random Shop', 'GB').country).toBeUndefined();
  });

  it('merchant ids are market-scoped so storefronts never collide', () => {
    expect(merchantInputFor('Currys', 'GB').id).toBe('gb:currys');
    expect(merchantInputFor('Target').id).toBe('target');
  });

  it('GB majors carry the verified trust badge', () => {
    expect(getRetailerTrust('Currys').level).toBe('verified');
    expect(getRetailerTrust('Amazon.co.uk').level).toBe('verified');
    expect(getRetailerTrust('John Lewis').level).toBe('verified');
  });
});

describe('currency plumbing', () => {
  it('priceToMinor is exponent-aware', () => {
    expect(priceToMinor(174.99, 'GBP')).toBe(17_499);
    expect(priceToMinor(15.99, 'USD')).toBe(1_599);
    expect(priceToMinor(14_700, 'JPY')).toBe(14_700); // yen IS the minor unit
  });

  it('currencySymbol keeps the legacy dollar default and maps pilot currencies', () => {
    expect(currencySymbol(undefined)).toBe('$');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('XXX')).toBe('XXX ');
  });

  it('grouping never merges or price-compares offers across currencies', () => {
    const usd = offer({ id: 'Sony WH-1000XM5 Headphones', price: 199, retailer: 'Target', currency: 'USD' });
    const gbp = offer({
      id: 'Sony WH-1000XM5 Headphones',
      price: 150,
      retailer: 'Currys',
      currency: 'GBP',
      sourceMarket: 'GB',
      url: 'https://example.test/gb',
    });
    const enhanced = enhanceProductsWithGroupInfo([usd, gbp]);
    for (const e of enhanced) {
      expect(e.groupSize).toBeUndefined(); // no cross-currency "same item" group
      expect(e.matchType).not.toBe('similar'); // no cross-currency percent claims
    }
  });
});

describe('the payoff: local offer vs US import for a GB shopper', () => {
  it('both compute, both are eligible, and the cheaper landed total wins', () => {
    const products = [
      offer({
        id: 'us-target',
        name: 'Sony Wireless Headphones',
        price: 160,
        retailer: 'Target',
        currency: 'USD',
        sourceMarket: 'US',
        category: 'Electronics',
      }),
      offer({
        id: 'gb-currys',
        name: 'Sony Wireless Headphones UK',
        price: 150,
        retailer: 'Currys',
        currency: 'GBP',
        sourceMarket: 'GB',
        category: 'Electronics',
        url: 'https://example.test/gb-currys',
      }),
    ];
    const enriched = withLandedCosts(products, { country: 'GB', currency: 'GBP' }, NOW, FX);

    const gb = enriched.find((p) => p.id === 'gb-currys')!.landedCost!;
    expect(gb.lane).toBe('domestic'); // GB storefront to a GB shopper
    expect(gb.totalMinor).toBe(15_000); // £150.00 item, shipping honestly unknown
    expect(gb.unknownComponents).toEqual(['shipping']);

    const us = enriched.find((p) => p.id === 'us-target')!.landedCost!;
    expect(us.lane).toBe('cross-border');
    // $160 -> 126.40 item + 28.20 estimated FCPIS shipping; under GBP 135
    // intrinsic -> duty relieved, VAT merchant-collects, fee waived.
    expect(us.totalMinor).toBe(12_640 + 2_820);
    expect(us.unknownComponents).toEqual([]);

    const { products: ranked, topSlotOfferId } = orderByLandedCost(enriched);
    // The full US landed total (154.60) undercuts the UK local price (150.00
    // plus unknown shipping)? No: ranking uses known totals, and 150.00 wins.
    expect(topSlotOfferId).toBe('gb-currys');
    expect(ranked[0].id).toBe('gb-currys');
    expect(ranked[1].id).toBe('us-target');
  });
});
