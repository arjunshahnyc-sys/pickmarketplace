// International sources pilot (GB): market-scoped merchant identity,
// currency-aware enrichment, and the payoff scenario: a UK domestic offer
// competing against a US import for a GB shopper.

import { describe, expect, it } from 'vitest';
import { currencySymbol } from '../../formatters';
import { enhanceProductsWithGroupInfo } from '../../productGrouping';
import { getRetailerTrust } from '../../retailerTrust';
import { parseFirstPrice } from '../../scrapers';
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
    expect(getRetailerTrust('John Lewis').level).toBe('verified');
    // Registry review 2026-08-31: Amazon storefronts are the distinct
    // marketplace tier (mixed first- and third-party inventory), not the
    // plain verified badge.
    expect(getRetailerTrust('Amazon.co.uk').level).toBe('marketplace');
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

describe('all-markets rollout (probed live 2026-08-27)', () => {
  it('parses every observed feed price format', () => {
    expect(parseFirstPrice('€217.89')).toBe(217.89); // DE/FR: dot decimal with hl=en
    expect(parseFirstPrice('¥35,343')).toBe(35_343); // JP: comma thousands, no decimals
    expect(parseFirstPrice('$442.37')).toBe(442.37); // CA/AU
    expect(parseFirstPrice('£174.99')).toBe(174.99); // GB
    expect(parseFirstPrice('$15.99 - $29.99')).toBe(15.99); // ranges keep the low end
  });

  it('resolves market-scoped merchant identity per feed', () => {
    expect(getMerchantConfig('Amazon.de', 'DE').country).toBe('DE');
    expect(getMerchantConfig('Coolblue.de', 'DE').country).toBe('NL'); // Dutch chain: intra-EU
    expect(getMerchantConfig('Fnac', 'FR').country).toBe('FR');
    expect(getMerchantConfig('eBay', 'DE').country).toBe('DE');
    expect(getMerchantConfig('eBay', 'FR').country).toBe('FR');
    expect(getMerchantConfig('Walmart.ca', 'CA').country).toBe('CA');
    expect(getMerchantConfig('Best Buy', 'CA').country).toBe('CA'); // binational: .ca storefront
    expect(getMerchantConfig('Best Buy').country).toBe('US');
    expect(getMerchantConfig('BIG W', 'AU').country).toBe('AU');
    expect(getMerchantConfig('Target', 'AU').country).toBe('AU'); // different company from Target US
    expect(getMerchantConfig('Target').country).toBe('US');
  });

  it('Japanese script names collapse honestly: Amazon resolves, unknowns stay unknown', () => {
    expect(getMerchantConfig('Amazon公式サイト', 'JP').country).toBe('JP'); // collapses to 'amazon'
    expect(getMerchantConfig('セカンドストリート', 'JP').country).toBeUndefined(); // collapses to ''
    expect(getMerchantConfig('Yahoo!ショッピング - らいぶshop', 'JP').country).toBeUndefined();
  });

  it('new market majors carry the verified badge', () => {
    for (const name of ['MediaMarkt', 'Fnac', 'Walmart.ca', 'JB Hi-Fi', 'BIG W']) {
      expect(getRetailerTrust(name).level, name).toBe('verified');
    }
    // Registry review 2026-08-31: Amazon storefronts are marketplace tier.
    expect(getRetailerTrust('Amazon.de').level).toBe('marketplace');
  });

  it('DE shopper: local, intra-EU, and US import all compute and rank together', () => {
    const fx = new FixtureFxProvider(
      { 'USD:EUR': { midMicros: 900_000, asOf: '2026-08-27T00:00:00Z' } },
      { spreadBps: 0 }
    );
    const products = [
      offer({ id: 'de-amazon', name: 'Sony Kopfhörer Headphones', price: 220, retailer: 'Amazon.de', currency: 'EUR', sourceMarket: 'DE', category: 'Electronics' }),
      offer({ id: 'nl-coolblue', name: 'Sony Headphones Duo', price: 478, retailer: 'Coolblue.de', currency: 'EUR', sourceMarket: 'DE', category: 'Electronics', url: 'https://example.test/nl' }),
      offer({ id: 'us-bestbuy', name: 'Sony Wireless Headphones', price: 248, retailer: 'Best Buy', currency: 'USD', sourceMarket: 'US', category: 'Electronics', url: 'https://example.test/us' }),
    ];
    const enriched = withLandedCosts(products, { country: 'DE', currency: 'EUR' }, NOW, fx);

    const de = enriched.find((p) => p.id === 'de-amazon')!.landedCost!;
    expect(de.lane).toBe('domestic');
    expect(de.totalMinor).toBe(22_000);

    const nl = enriched.find((p) => p.id === 'nl-coolblue')!.landedCost!;
    expect(nl.lane).toBe('intra-eu'); // NL merchant, DE shopper: free movement
    expect(nl.totalMinor).toBe(47_800);

    const us = enriched.find((p) => p.id === 'us-bestbuy')!.landedCost!;
    expect(us.lane).toBe('cross-border');
    // 223.20 item + 29.57 shipping; over the EUR 150 band -> ad valorem 0%
    // headphone duty, 19% VAT on 252.77, EUR 7.50 handling.
    expect(us.totalMinor).toBe(22_320 + 2_957 + 0 + 4_803 + 750);
    expect(us.unknownComponents).toEqual([]);

    const { products: ranked } = orderByLandedCost(enriched);
    // Bucket rules (2026-08-31): the US import is the only RESOLVED total
    // (its shipping estimate completes it), so it leads; the two EU offers
    // have unknown shipping (no EU-origin routes yet) and rank as labeled
    // partials below it, by their known subtotals.
    expect(ranked.map((p) => p.id)).toEqual(['us-bestbuy', 'de-amazon', 'nl-coolblue']);
  });

  it('JP shopper: a yen-priced Amazon Japan offer computes as domestic', () => {
    const enriched = withLandedCosts(
      [offer({ id: 'jp-amazon', name: 'Sony WH-1000XM5 Wireless', price: 35_343, retailer: 'Amazon公式サイト', currency: 'JPY', sourceMarket: 'JP', category: 'Electronics' })],
      { country: 'JP', currency: 'JPY' },
      NOW,
      FX
    );
    const b = enriched[0].landedCost!;
    expect(b.lane).toBe('domestic');
    expect(b.totalMinor).toBe(35_343); // yen minor units, exponent 0
    expect(b.unknownComponents).toEqual(['shipping']);
  });
});

describe('the payoff: local offer vs US import for a GB shopper', () => {
  it('a resolved import total outranks a partial local subtotal', () => {
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
    // Bucket rules (2026-08-31): the US offer's 154.60 is a COMPLETE landed
    // total; the local 150.00 is a partial (shipping unknown) and a partial
    // may never outrank or win on a number it does not actually have.
    expect(topSlotOfferId).toBe('us-target');
    expect(ranked[0].id).toBe('us-target');
    expect(ranked[1].id).toBe('gb-currys');
  });
});
