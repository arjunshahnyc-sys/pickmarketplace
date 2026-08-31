import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { collapse, registrableDomain, splitSellerSuffix } from '../identity';
import {
  REGISTRY,
  domainSignal,
  getEntryById,
  resolveMerchant,
  validateRegistry,
} from '../registry';
import { getRetailerTrust, isRecognizedSeller, VERIFIED_RETAILERS } from '../../retailerTrust';
import { getMerchantConfig } from '../../landedCost/merchants';

describe('registry integrity', () => {
  it('validates clean', () => {
    expect(validateRegistry()).toEqual([]);
  });

  it('every trust-reviewed entry has an existing logo asset', () => {
    const missing = REGISTRY.filter(
      (e) =>
        e.tier !== 'config-only' &&
        (!e.logo || !existsSync(join(process.cwd(), 'public', e.logo)))
    ).map((e) => e.id);
    expect(missing).toEqual([]);
  });

  it('every entry records when and why it was added', () => {
    for (const e of REGISTRY) {
      expect(e.added.date, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.added.reason.length, e.id).toBeGreaterThan(10);
    }
  });
});

describe('identity helpers', () => {
  it('registrableDomain handles multi-part TLDs', () => {
    expect(registrableDomain('www.ikea.co.uk')).toBe('ikea.co.uk');
    expect(registrableDomain('www.amazon.com.au')).toBe('amazon.com.au');
    expect(registrableDomain('shopping.yahoo.co.jp')).toBe('yahoo.co.jp');
    expect(registrableDomain('www.ikea.com')).toBe('ikea.com');
    expect(registrableDomain('ikea.com')).toBe('ikea.com');
  });

  it('registrableDomain rejects garbage', () => {
    expect(registrableDomain('localhost')).toBeNull();
    expect(registrableDomain('192.168.0.1')).toBeNull();
    expect(registrableDomain('co.uk')).toBeNull();
  });

  it('splitSellerSuffix only splits on space-separated dashes', () => {
    expect(splitSellerSuffix('Walmart - ABOUTYES')).toEqual({
      platform: 'Walmart',
      seller: 'ABOUTYES',
    });
    expect(splitSellerSuffix('Coca-Cola Store')).toBeNull();
    expect(splitSellerSuffix('Academy Sports + Outdoors')).toBeNull();
  });
});

describe('canonical id normalization', () => {
  it('IKEA name variants resolve to one canonical entry', () => {
    for (const name of ['IKEA', 'Ikea US', 'ikea.com', 'IKEA.com', 'ikea']) {
      expect(resolveMerchant(name)?.id, name).toBe('ikea-us');
    }
  });

  it('legal-name variants resolve to one entry', () => {
    expect(resolveMerchant('B&H Photo Video Audio')?.id).toBe('bhphoto-us');
    expect(resolveMerchant('Office Depot OfficeMax')?.id).toBe('officedepot-us');
    expect(resolveMerchant('The Home Depot')?.id).toBe('homedepot-us');
  });

  it('empty collapses (non-latin names) never resolve', () => {
    expect(resolveMerchant('セカンドストリート', 'JP')).toBeNull();
  });
});

describe('market scoping', () => {
  it('the same name means different merchants per market', () => {
    expect(resolveMerchant('Target', 'US')?.id).toBe('target-us');
    expect(resolveMerchant('Target', 'AU')?.id).toBe('target-au');
    expect(resolveMerchant('eBay')?.id).toBe('ebay-us');
    expect(resolveMerchant('eBay', 'GB')?.id).toBe('ebay-gb');
    expect(resolveMerchant('eBay', 'FR')?.id).toBe('ebay-fr');
    expect(resolveMerchant('Amazon公式サイト', 'JP')?.id).toBe('amazon-jp');
  });

  it('a US brand in a foreign feed falls through to its US entry', () => {
    expect(resolveMerchant('Nike', 'GB')?.id).toBe('nike-us');
  });
});

describe('trust levels', () => {
  it('official first-party sites are verified (the IKEA/Ace fix)', () => {
    for (const name of ['IKEA', 'Ace Hardware', 'Dyson', 'QVC', 'Walmart', 'Target']) {
      expect(getRetailerTrust(name).level, name).toBe('verified');
    }
    expect(getRetailerTrust('CeX', { market: 'GB' }).level).toBe('verified');
  });

  it('platforms mixing first- and third-party inventory get the marketplace tier', () => {
    for (const name of ['Amazon', 'eBay', 'Etsy']) {
      expect(getRetailerTrust(name).level, name).toBe('marketplace');
    }
    expect(getRetailerTrust('Rakuten', { market: 'JP' }).level).toBe('marketplace');
    expect(getRetailerTrust('amazon.co.uk', { market: 'GB' }).level).toBe('marketplace');
  });

  it('independent marketplace sellers get their own tier, never the platform badge', () => {
    const t = getRetailerTrust('Walmart - ABOUTYES');
    expect(t.level).toBe('marketplace-seller');
    expect(t.description).toContain('ABOUTYES');
    expect(getRetailerTrust('Amazon.com - SomeStore').level).toBe('marketplace-seller');
    expect(getRetailerTrust('eBay - thrift.books').level).toBe('marketplace-seller');
  });

  it('seller suffixes on non-marketplace names stay unknown', () => {
    expect(getRetailerTrust('Bob - Discount Furniture').level).toBe('unknown');
  });

  it('lookalike names never inherit a badge (exact collapse only)', () => {
    expect(getRetailerTrust('Pineapple Boutique').level).toBe('unknown');
    expect(getRetailerTrust('Walmarts Deals').level).toBe('unknown');
    expect(getRetailerTrust('ikea-outlet').level).toBe('unknown');
  });

  it('default is deny: unknown merchants are unverified', () => {
    expect(getRetailerTrust('Random Storefront 123').level).toBe('unknown');
    expect(getRetailerTrust('Whatnot').level).toBe('unknown');
    expect(getRetailerTrust('Google Shopping').level).toBe('unknown');
  });

  it('config-only entries carry landed-cost config but no badge', () => {
    expect(getRetailerTrust('Kmart', { market: 'AU' }).level).toBe('unknown');
    expect(getMerchantConfig('Kmart', 'AU').country).toBe('AU');
  });

  it('flagged marketplaces still flag (token and substring rules unchanged)', () => {
    expect(getRetailerTrust('Temu').level).toBe('flagged');
    expect(getRetailerTrust('AliExpress US Store').level).toBe('flagged');
    expect(getRetailerTrust('DHgate Official Store').level).toBe('flagged');
    expect(getRetailerTrust('Wish').level).toBe('flagged');
    expect(getRetailerTrust('Wishlist Gifts').level).toBe('unknown');
  });

  it('the recognized-seller filter includes platforms, excludes their sellers', () => {
    expect(isRecognizedSeller(getRetailerTrust('Walmart').level)).toBe(true);
    expect(isRecognizedSeller(getRetailerTrust('Amazon').level)).toBe(true);
    expect(isRecognizedSeller(getRetailerTrust('Walmart - ABOUTYES').level)).toBe(false);
    expect(isRecognizedSeller(getRetailerTrust('Whatnot').level)).toBe(false);
    expect(isRecognizedSeller(getRetailerTrust('Temu').level)).toBe(false);
  });
});

describe('domain matching (lookalike guard)', () => {
  const ikea = getEntryById('ikea-us')!;

  it('official domains match, including regionals and www', () => {
    expect(domainSignal('https://www.ikea.com/us/en/p/x-123/', ikea)).toBe('match');
    expect(domainSignal('https://ikea.com/', ikea)).toBe('match');
    expect(domainSignal('https://www.ikea.co.uk/p/x', ikea)).toBe('match');
  });

  it('lookalikes, typosquats, and uncontrolled subdomains mismatch', () => {
    expect(domainSignal('https://ikea-outlet.com/deal', ikea)).toBe('mismatch');
    expect(domainSignal('https://ikea.evil.com/deal', ikea)).toBe('mismatch');
    expect(domainSignal('https://notikea.com/', ikea)).toBe('mismatch');
    expect(domainSignal('https://checkout.ikea.com.deals.example/', ikea)).toBe('mismatch');
    expect(domainSignal('https://secret.ikea.com/', ikea)).toBe('mismatch');
  });

  it('userinfo tricks resolve to the real host', () => {
    expect(domainSignal('https://ikea.com@evil.com/x', ikea)).toBe('mismatch');
  });

  it('google intermediary links and missing URLs carry no signal', () => {
    expect(
      domainSignal('https://www.google.com/search?ibp=oshop&q=desk', ikea)
    ).toBe('no-signal');
    expect(domainSignal(undefined, ikea)).toBe('no-signal');
    expect(domainSignal('not a url', ikea)).toBe('no-signal');
  });

  it('a mismatching URL withholds the verified badge', () => {
    const spoofed = getRetailerTrust('IKEA', { url: 'https://ikea-outlet.com/x' });
    expect(spoofed.level).toBe('unknown');
    expect(spoofed.description).toContain("official domain");
    const genuine = getRetailerTrust('IKEA', { url: 'https://www.ikea.com/us/en/p/x' });
    expect(genuine.level).toBe('verified');
    const redirect = getRetailerTrust('IKEA', {
      url: 'https://www.google.com/search?ibp=oshop',
    });
    expect(redirect.level).toBe('verified');
  });
});

describe('landed-cost config parity with the pre-registry tables', () => {
  // Snapshot of the hand-maintained merchants.ts tables this registry
  // replaced (state at commit ff7d6df). Every key must still resolve with
  // the same storefront country so lane detection cannot regress.
  const OLD_US_KEYS = [
    'amazon', 'walmart', 'target', 'bestbuy', 'costco', 'ebay', 'homedepot',
    'lowes', 'macys', 'nordstrom', 'wayfair', 'kroger', 'kohls', 'samsclub',
    'bhphoto', 'bhphotovideo', 'adorama', 'newegg', 'staples', 'officedepot',
    'rei', 'chewy', 'gamestop', 'microcenter', 'dickssportinggoods', 'apple',
    'nike', 'academysportsoutdoors', 'golfgalaxy', 'stanley1913', 'zumiez',
    'petco', 'petsmart', 'ulta', 'ultabeauty', 'sephora', 'bathbodyworks',
    'bathandbodyworks', 'footlocker', 'finishline', 'jcpenney', 'dillards',
    'belk', 'qvc', 'crateandbarrel', 'williamssonoma', 'potterybarn',
  ];
  const OLD_MARKET_KEYS: Array<[string, string, string]> = [
    // [market, key, expected country]
    ['GB', 'amazoncouk', 'GB'], ['GB', 'ebay', 'GB'], ['GB', 'currys', 'GB'],
    ['GB', 'curryspcworld', 'GB'], ['GB', 'argos', 'GB'], ['GB', 'johnlewis', 'GB'],
    ['GB', 'costcowholesaleuk', 'GB'], ['GB', 'ao', 'GB'], ['GB', 'aocom', 'GB'],
    ['GB', 'boots', 'GB'], ['GB', 'screwfix', 'GB'], ['GB', 'very', 'GB'],
    ['GB', 'cex', 'GB'],
    ['DE', 'amazonde', 'DE'], ['DE', 'otto', 'DE'], ['DE', 'mediamarkt', 'DE'],
    ['DE', 'saturn', 'DE'], ['DE', 'zalando', 'DE'], ['DE', 'cyberport', 'DE'],
    ['DE', 'kauflandde', 'DE'], ['DE', 'amazonfr', 'FR'], ['DE', 'fnac', 'FR'],
    ['DE', 'darty', 'FR'], ['DE', 'cdiscount', 'FR'], ['DE', 'boulanger', 'FR'],
    ['DE', 'laredoute', 'FR'], ['DE', 'coolbluede', 'NL'], ['DE', 'coolblue', 'NL'],
    ['DE', 'ebay', 'DE'],
    ['FR', 'ebay', 'FR'], ['FR', 'amazonfr', 'FR'], ['FR', 'coolblue', 'NL'],
    ['CA', 'amazonca', 'CA'], ['CA', 'walmartca', 'CA'], ['CA', 'walmart', 'CA'],
    ['CA', 'bestbuy', 'CA'], ['CA', 'bestbuycanada', 'CA'],
    ['CA', 'bestbuycanadamarketplace', 'CA'], ['CA', 'costco', 'CA'],
    ['CA', 'homedepot', 'CA'], ['CA', 'thehomedepot', 'CA'], ['CA', 'staples', 'CA'],
    ['CA', 'canadiantire', 'CA'], ['CA', 'londondrugs', 'CA'], ['CA', 'thesource', 'CA'],
    ['CA', 'ebay', 'CA'],
    ['AU', 'amazonau', 'AU'], ['AU', 'amazoncomau', 'AU'], ['AU', 'jbhifi', 'AU'],
    ['AU', 'harveynorman', 'AU'], ['AU', 'thegoodguys', 'AU'], ['AU', 'bigw', 'AU'],
    ['AU', 'kmart', 'AU'], ['AU', 'target', 'AU'], ['AU', 'officeworks', 'AU'],
    ['AU', 'myer', 'AU'], ['AU', 'davidjones', 'AU'], ['AU', 'catch', 'AU'],
    ['AU', 'kogan', 'AU'], ['AU', 'sonyaustraliaonline', 'AU'], ['AU', 'ebay', 'AU'],
    ['JP', 'amazon', 'JP'], ['JP', 'amazoncojp', 'JP'], ['JP', 'rakuten', 'JP'],
    ['JP', 'yodobashi', 'JP'], ['JP', 'biccamera', 'JP'], ['JP', 'yahooshopping', 'JP'],
  ];

  it('every pre-registry US key still resolves to a US storefront', () => {
    const wrong = OLD_US_KEYS.filter((k) => getMerchantConfig(k).country !== 'US');
    expect(wrong).toEqual([]);
  });

  it('every pre-registry market key still resolves to its storefront country', () => {
    const wrong = OLD_MARKET_KEYS.filter(
      ([market, key, country]) => getMerchantConfig(key, market).country !== country
    );
    expect(wrong).toEqual([]);
  });

  it('drift is closed: verified-only names now carry landed-cost config too', () => {
    expect(getMerchantConfig('Office Depot OfficeMax').country).toBe('US');
    expect(getMerchantConfig('B&H Photo Video Audio').country).toBe('US');
    expect(getMerchantConfig('IKEA').country).toBe('US');
    expect(getMerchantConfig('Ace Hardware').country).toBe('US');
  });

  it('marketplace resellers still get no config (unknown lane)', () => {
    expect(getMerchantConfig('Walmart - ABOUTYES').country).toBeUndefined();
  });
});

describe('VERIFIED_RETAILERS export (badge-logo sync contract)', () => {
  it('contains recognized aliases and excludes config-only ones', () => {
    expect(VERIFIED_RETAILERS.has('walmart')).toBe(true);
    expect(VERIFIED_RETAILERS.has('ikea')).toBe(true);
    expect(VERIFIED_RETAILERS.has('acehardware')).toBe(true);
    expect(VERIFIED_RETAILERS.has('kmart')).toBe(false);
    expect(VERIFIED_RETAILERS.has('thesource')).toBe(false);
  });

  it('aliases are collapse-stable', () => {
    for (const key of VERIFIED_RETAILERS) {
      expect(collapse(key), key).toBe(key);
    }
  });
});
