import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const WRAPPER = 'https://go.skimresources.com/?id=TEST123&url=';

/**
 * affiliate.ts reads NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER once at module load
 * (Next inlines it at build time), so each state needs a fresh module.
 */
async function loadWith(wrapper?: string) {
  vi.resetModules();
  if (wrapper === undefined) {
    vi.stubEnv('NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER', '');
  } else {
    vi.stubEnv('NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER', wrapper);
  }
  return import('../affiliate');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('affiliate tagging, wrapper unset', () => {
  it('is disabled and passes every URL through untouched', async () => {
    const { affiliateLinksEnabled, toAffiliateUrl, isAffiliateUrl } = await loadWith();
    expect(affiliateLinksEnabled()).toBe(false);

    const url = 'https://www.walmart.com/ip/123';
    expect(toAffiliateUrl(url, { retailer: 'Walmart', market: 'US' })).toBe(url);
    expect(isAffiliateUrl(url)).toBe(false);
  });
});

describe('affiliate tagging, wrapper set', () => {
  let mod: typeof import('../affiliate');

  beforeEach(async () => {
    mod = await loadWith(WRAPPER);
  });

  it('is enabled and wraps an ordinary retailer link', () => {
    expect(mod.affiliateLinksEnabled()).toBe(true);

    const url = 'https://www.macys.com/shop/product/123';
    const tagged = mod.toAffiliateUrl(url, { retailer: "Macy's", market: 'US' });

    expect(tagged).toBe(`${WRAPPER}${encodeURIComponent(url)}`);
    expect(mod.isAffiliateUrl(tagged)).toBe(true);
  });

  it('leaves non-http(s) links alone', () => {
    for (const url of ['mailto:x@example.com', '/search/foo', 'javascript:alert(1)']) {
      expect(mod.toAffiliateUrl(url, { retailer: "Macy's" })).toBe(url);
    }
  });

  it('wraps Google intermediary links, which carry no merchant domain', () => {
    const url = 'https://www.google.com/url?q=https%3A%2F%2Fwww.macys.com%2Fp%2F123';
    expect(mod.toAffiliateUrl(url, { retailer: "Macy's", market: 'US' })).not.toBe(url);
  });
});

describe('Amazon is never commission-tagged', () => {
  let mod: typeof import('../affiliate');

  beforeEach(async () => {
    mod = await loadWith(WRAPPER);
  });

  it.each([
    ['Amazon', 'US'],
    ['amazon', 'US'],
    ['Amazon.com', 'US'],
    ['Amazon UK', 'GB'],
    ['Amazon Germany', 'DE'],
    ['Amazon Japan', 'JP'],
    // Sub-brands and third-party sellers, which the registry does not carry
    ['Amazon Warehouse', 'US'],
    ['Amazon - ABOUTYES', 'US'],
  ])('excludes %s in %s by merchant name', (retailer, market) => {
    const url = 'https://www.google.com/url?q=someplace';
    expect(mod.isCommissionExcluded(url, { retailer, market })).toBe(true);
    expect(mod.toAffiliateUrl(url, { retailer, market })).toBe(url);
  });

  it.each([
    'https://www.amazon.com/dp/B00TEST',
    'https://www.amazon.co.uk/dp/B00TEST',
    'https://amazon.de/dp/B00TEST',
    'https://www.amazon.co.jp/dp/B00TEST',
    'https://amzn.to/3abcdef',
  ])('excludes %s by URL even when the merchant name is missing', (url) => {
    expect(mod.isCommissionExcluded(url)).toBe(true);
    expect(mod.toAffiliateUrl(url)).toBe(url);
  });

  it('marks an excluded Amazon link as not affiliate, so rel stays plain', () => {
    const url = 'https://www.amazon.com/dp/B00TEST';
    expect(mod.isAffiliateUrl(mod.toAffiliateUrl(url, { retailer: 'Amazon' }))).toBe(false);
  });

  it('does not exclude Amazon lookalike domains that are not Amazon', () => {
    // Registrable-domain matching is exact: these are other people's sites.
    for (const url of ['https://amazon.evil.com/dp/1', 'https://amazon-deals.com/dp/1']) {
      expect(mod.isCommissionExcluded(url)).toBe(false);
    }
  });

  it('still tags other marketplaces and their third-party sellers', () => {
    const url = 'https://www.google.com/url?q=x';
    expect(mod.isCommissionExcluded(url, { retailer: "Macy's", market: 'US' })).toBe(false);
    expect(mod.isCommissionExcluded(url, { retailer: 'eBay', market: 'US' })).toBe(false);
    expect(mod.isCommissionExcluded(url, { retailer: 'Etsy', market: 'US' })).toBe(false);
  });
});

describe('Best Buy, Walmart and Target are never commission-tagged', () => {
  let mod: typeof import('../affiliate');
  const GOOGLE = 'https://www.google.com/url?q=x';

  beforeEach(async () => {
    mod = await loadWith(WRAPPER);
  });

  it.each([
    ['Best Buy', 'US'],
    ['BestBuy.com', 'US'],
    ['Best Buy Canada', 'CA'],
    ['Best Buy - TechSeller', 'US'],
    ['Walmart', 'US'],
    ['Walmart - ABOUTYES', 'US'],
    ['Walmart Canada', 'CA'],
    ['Walmart Business', 'US'],
    ['Target', 'US'],
    ['Target - SomeSeller', 'US'],
  ])('excludes %s (%s) by name, even behind a Google link', (retailer, market) => {
    expect(mod.isCommissionExcluded(GOOGLE, { retailer, market })).toBe(true);
    expect(mod.toAffiliateUrl(GOOGLE, { retailer, market })).toBe(GOOGLE);
    expect(mod.isAffiliateUrl(mod.toAffiliateUrl(GOOGLE, { retailer, market }))).toBe(false);
  });

  it.each([
    'https://www.bestbuy.com/site/123.p',
    'https://www.bestbuy.ca/en-ca/product/123',
    'https://www.walmart.com/ip/123',
    'https://www.walmart.ca/ip/123',
    'https://www.target.com/p/-/A-123',
  ])('excludes %s by domain with no retailer name', (url) => {
    expect(mod.toAffiliateUrl(url)).toBe(url);
  });

  it('does not exclude Target Australia, an unrelated company', () => {
    expect(mod.isCommissionExcluded(GOOGLE, { retailer: 'Target', market: 'AU' })).toBe(false);
    expect(mod.isCommissionExcluded('https://www.target.com.au/p/123')).toBe(false);
  });

  it('does not exclude lookalike domains', () => {
    for (const url of ['https://walmart.evil.com/ip/1', 'https://bestbuy-deals.com/1', 'https://target-sale.com/1']) {
      expect(mod.isCommissionExcluded(url)).toBe(false);
    }
  });
});
