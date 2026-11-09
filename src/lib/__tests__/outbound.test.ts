import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../types';

const WRAPPER = 'https://go.skimresources.com/?id=TEST123&url=';
const GOOGLE = 'https://www.google.com/search?ibp=oshop&q=xbox&prds=catalogid:1';

/** outbound.ts and affiliate.ts read env at call/load time; load fresh per state. */
async function load(env: { secret?: string; wrapper?: string; serper?: string } = {}) {
  vi.resetModules();
  vi.stubEnv('AUTH_SECRET', env.secret ?? 'test-secret');
  vi.stubEnv('NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER', env.wrapper ?? '');
  vi.stubEnv('SERPER_API_KEY', env.serper ?? 'test-key');
  const mod = await import('../outbound');
  mod.clearOfferCache();
  return mod;
}

const product = (over: Partial<Product> = {}): Product => ({
  name: 'Microsoft Xbox One S',
  price: 169.99,
  image: '',
  retailer: 'GameStop',
  url: GOOGLE,
  googleProductId: '8023173743908562582',
  sourceMarket: 'US',
  ...over,
});

const paramsOf = (clickUrl: string) => new URL(clickUrl, 'https://pick.test').searchParams;

function mockOffers(offers: Array<{ source: string; link: string }>, ok = true) {
  const fetchMock = vi.fn(async () => ({ ok, status: ok ? 200 : 400, json: async () => ({ offers }) }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('buildClickUrl', () => {
  it('builds a signed /api/out link that verifies back to the same params', async () => {
    const { buildClickUrl, verifyClickParams } = await load();
    const clickUrl = buildClickUrl(product())!;
    expect(clickUrl.startsWith('/api/out?')).toBe(true);
    expect(verifyClickParams(paramsOf(clickUrl))).toEqual({
      pid: '8023173743908562582',
      retailer: 'GameStop',
      market: 'US',
      fallback: GOOGLE,
      title: 'Microsoft Xbox One S',
    });
  });

  it('still verifies a link issued without a title (pre-title cached pages)', async () => {
    const { buildClickUrl, verifyClickParams } = await load();
    const qs = paramsOf(buildClickUrl(product({ name: '' }))!);
    expect(qs.has('t')).toBe(false);
    expect(verifyClickParams(qs)).toEqual({
      pid: '8023173743908562582',
      retailer: 'GameStop',
      market: 'US',
      fallback: GOOGLE,
    });
  });

  it('leaves a product without an id, or with a non-http link, on its plain link', async () => {
    const { buildClickUrl } = await load();
    expect(buildClickUrl(product({ googleProductId: undefined }))).toBeUndefined();
    expect(buildClickUrl(product({ url: '/search/xbox' }))).toBeUndefined();
  });

  it('is off without AUTH_SECRET rather than emitting unsigned links', async () => {
    const { buildClickUrl } = await load({ secret: '' });
    expect(buildClickUrl(product())).toBeUndefined();
  });

  it.each(['Amazon', 'Best Buy', 'Walmart', 'Walmart - ABOUTYES', 'Target'])(
    'spends no lookup on commission-excluded %s',
    async (retailer) => {
      const { buildClickUrl } = await load({ wrapper: WRAPPER });
      expect(buildClickUrl(product({ retailer }))).toBeUndefined();
    }
  );
});

describe('verifyClickParams', () => {
  it.each(['pid', 'r', 'm', 'u', 't'])('rejects a link whose %s was changed', async (key) => {
    const { buildClickUrl, verifyClickParams } = await load();
    const qs = paramsOf(buildClickUrl(product())!);
    qs.set(key, key === 'u' ? 'https://evil.example/phish' : 'tampered');
    expect(verifyClickParams(qs)).toBeNull();
  });

  it('rejects a link whose title was stripped', async () => {
    const { buildClickUrl, verifyClickParams } = await load();
    const qs = paramsOf(buildClickUrl(product())!);
    qs.delete('t');
    expect(verifyClickParams(qs)).toBeNull();
  });

  it('rejects a missing or wrong-length signature', async () => {
    const { buildClickUrl, verifyClickParams } = await load();
    const qs = paramsOf(buildClickUrl(product())!);
    qs.set('s', 'short');
    expect(verifyClickParams(qs)).toBeNull();
    qs.delete('s');
    expect(verifyClickParams(qs)).toBeNull();
  });

  it('rejects a link signed with a different secret', async () => {
    const a = await load({ secret: 'secret-a' });
    const clickUrl = a.buildClickUrl(product())!;
    const b = await load({ secret: 'secret-b' });
    expect(b.verifyClickParams(paramsOf(clickUrl))).toBeNull();
  });
});

describe('stripTrackingParams', () => {
  it('drops Google attribution and utm params, keeps the rest', async () => {
    const { stripTrackingParams } = await load();
    expect(
      stripTrackingParams(
        'https://www.walmart.com/ip/Sony/203?wmlspartner=wlpa&selectedSellerId=101&srsltid=AbC&utm_source=google'
      )
    ).toBe('https://www.walmart.com/ip/Sony/203?selectedSellerId=101');
    expect(stripTrackingParams('https://electronics.sony.com/p/wh1000xm6-b?srsltid=AYCX')).toBe(
      'https://electronics.sony.com/p/wh1000xm6-b'
    );
  });

  it('returns an unparseable string untouched', async () => {
    const { stripTrackingParams } = await load();
    expect(stripTrackingParams('not a url')).toBe('not a url');
  });
});

describe('resolveMerchantUrl', () => {
  const OFFERS = [
    { source: 'Greentoe - TV\'s & Home Theater', link: 'https://www.greentoe.com/buynow/x' },
    { source: 'GameStop', link: 'https://www.gamestop.com/p/xbox-one-s/123.html?srsltid=AbC' },
    { source: 'Sony', link: 'javascript:alert(1)' },
  ];
  let mod: Awaited<ReturnType<typeof load>>;

  beforeEach(async () => {
    mod = await load();
  });

  it("returns the clicked seller's product page, cleaned", async () => {
    const fetchMock = mockOffers(OFFERS);
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US')).toBe('https://www.gamestop.com/p/xbox-one-s/123.html');
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body).toMatchObject({ productId: '1', gl: 'us' });
  });

  it('matches display-name variants of the same seller', async () => {
    mockOffers(OFFERS);
    expect(await mod.resolveMerchantUrl('1', 'gamestop.com', 'US')).toBe('https://www.gamestop.com/p/xbox-one-s/123.html');
  });

  it('never substitutes another seller, and ignores non-http offer links', async () => {
    mockOffers(OFFERS);
    expect(await mod.resolveMerchantUrl('1', 'Crutchfield', 'US')).toBeNull();
    expect(await mod.resolveMerchantUrl('1', 'Sony', 'US')).toBeNull();
  });

  it('pays for one lookup per product, however many sellers are clicked', async () => {
    const fetchMock = mockOffers(OFFERS);
    await mod.resolveMerchantUrl('1', 'GameStop', 'US');
    await mod.resolveMerchantUrl('1', 'Crutchfield', 'US');
    await mod.resolveMerchantUrl('1', 'GameStop', 'US');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await mod.resolveMerchantUrl('2', 'GameStop', 'US');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null and does not retry at once when the lookup fails', async () => {
    const fetchMock = mockOffers([], false);
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US')).toBeNull();
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when fetch throws, and makes no call without an API key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US')).toBeNull();

    const noKey = await load({ serper: '' });
    const fetchMock = mockOffers(OFFERS);
    expect(await noKey.resolveMerchantUrl('9', 'GameStop', 'US')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('sellerDomain', () => {
  it.each([
    ['GameStop', 'US', 'gamestop.com'],
    ['vtenh.com', 'US', 'vtenh.com'],
    ['www.loaded.com', 'US', 'loaded.com'],
  ])('%s (%s) searches %s', async (retailer, market, domain) => {
    const { sellerDomain } = await load();
    expect(sellerDomain(retailer, market)).toBe(domain);
  });

  it.each([
    ['eBay', 'a marketplace: every listing is another seller'],
    ['Newegg.com - Hooray Store', 'a platform seller'],
    ['Les Appartements de Juju', 'an unknown name with no domain'],
  ])('%s is not searched (%s)', async (retailer) => {
    const { sellerDomain } = await load();
    expect(sellerDomain(retailer, 'US')).toBeNull();
  });
});

describe('isSameProduct', () => {
  it.each([
    ['Microsoft Xbox One S', 'Microsoft Xbox One S Console'],
    ['Sony WH-1000XM6 Wireless Noise Canceling Headphones', 'Sony WH-1000XM6 Wireless Noise Canceling Headphones (Black)'],
    ['Microsoft Xbox Series X Console 1TB', 'Xbox Series X 1TB Console - Microsoft | GameStop'],
  ])('%s matches %s', async (name, title) => {
    const { isSameProduct } = await load();
    expect(isSameProduct(name, title)).toBe(true);
  });

  it.each([
    ['Microsoft Xbox One S', 'Microsoft Xbox One S Console 1TB - White', 'result adds a capacity'],
    ['Microsoft Xbox Series S 512GB', 'Microsoft Xbox Series S 1TB', 'different capacity'],
    ['Xbox Series X', 'Xbox Series S Console', 'sibling model'],
    ['Sony WH-1000XM6 Headphones', 'Sony WH-1000XM5 Headphones', 'previous model'],
    ['Microsoft Xbox One S', 'Xbox One Consoles', 'category page'],
    ['', 'Anything', 'empty listing name'],
  ])('%s does not match %s (%s)', async (name, title) => {
    const { isSameProduct } = await load();
    expect(isSameProduct(name, title)).toBe(false);
  });
});

describe('resolveMerchantUrl, second-chance site search', () => {
  const NAME = 'Microsoft Xbox One S';
  // The product lookup lists other sellers but not the clicked one.
  const OTHER_OFFERS = [{ source: 'The Video Game Company', link: 'https://www.thevideogamecompany.com/p/1' }];
  const ORGANIC = [
    { link: 'https://www.gamestop.com/', title: 'Microsoft Xbox One S' },
    { link: 'https://gamestop.evil.com/p/1', title: 'Microsoft Xbox One S Console' },
    { link: 'https://www.gamestop.com/products/xbox-one-s-1tb-white/131069.html', title: 'Microsoft Xbox One S Console 1TB - White' },
    { link: 'https://www.gamestop.com/products/xbox-one-s/10138875.html?utm_source=google', title: 'Microsoft Xbox One S Console' },
  ];
  let mod: Awaited<ReturnType<typeof load>>;

  function mockSerper(opts: { offers?: typeof OTHER_OFFERS; organic?: typeof ORGANIC; searchOk?: boolean } = {}) {
    const fetchMock = vi.fn(async (...args: [url: string, init: { body: string }]) => {
      const [url] = args;
      if (url.endsWith('/product')) {
        return { ok: true, status: 200, json: async () => ({ offers: opts.offers ?? OTHER_OFFERS }) };
      }
      const ok = opts.searchOk ?? true;
      return { ok, status: ok ? 200 : 400, json: async () => ({ organic: opts.organic ?? ORGANIC }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const calls = (suffix: string) => fetchMock.mock.calls.filter(([url]) => url.endsWith(suffix));
    return { fetchMock, calls };
  }

  beforeEach(async () => {
    mod = await load();
  });

  it("finds the seller's page for the same product, skipping homepage, lookalike domain and variant", async () => {
    const { calls } = mockSerper();
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US', NAME)).toBe(
      'https://www.gamestop.com/products/xbox-one-s/10138875.html'
    );
    expect(JSON.parse(calls('/search')[0][1].body)).toMatchObject({
      q: 'Microsoft Xbox One S site:gamestop.com',
      gl: 'us',
    });
  });

  it('does not search when the product lookup already lists the seller', async () => {
    const { calls } = mockSerper({ offers: [{ source: 'GameStop', link: 'https://www.gamestop.com/p/from-lookup' }] });
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US', NAME)).toBe('https://www.gamestop.com/p/from-lookup');
    expect(calls('/search')).toHaveLength(0);
  });

  it('does not search without a title, for a marketplace, a platform seller, or an unknown name', async () => {
    const { calls } = mockSerper();
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US')).toBeNull();
    expect(await mod.resolveMerchantUrl('1', 'eBay', 'US', NAME)).toBeNull();
    expect(await mod.resolveMerchantUrl('1', 'Newegg.com - Hooray Store', 'US', NAME)).toBeNull();
    expect(await mod.resolveMerchantUrl('1', 'Les Appartements de Juju', 'US', NAME)).toBeNull();
    expect(calls('/search')).toHaveLength(0);
  });

  it('returns null when no result is the same product', async () => {
    mockSerper({ organic: ORGANIC.slice(0, 3) });
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US', NAME)).toBeNull();
  });

  it('pays for one site search per product and seller, match or no match', async () => {
    const { calls } = mockSerper();
    await mod.resolveMerchantUrl('1', 'GameStop', 'US', NAME);
    await mod.resolveMerchantUrl('1', 'GameStop', 'US', NAME);
    expect(calls('/search')).toHaveLength(1);
    expect(calls('/product')).toHaveLength(1);

    // A search that finds nothing is remembered too.
    const fresh = await load();
    const again = mockSerper({ organic: [] });
    expect(await fresh.resolveMerchantUrl('2', 'GameStop', 'US', NAME)).toBeNull();
    expect(await fresh.resolveMerchantUrl('2', 'GameStop', 'US', NAME)).toBeNull();
    expect(again.calls('/search')).toHaveLength(1);
  });

  it('returns null and does not retry at once when the site search fails', async () => {
    const { calls } = mockSerper({ searchOk: false });
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US', NAME)).toBeNull();
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US', NAME)).toBeNull();
    expect(calls('/search')).toHaveLength(1);
  });

  it('still searches when the product lookup itself failed', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/product')
        ? { ok: false, status: 404, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ organic: ORGANIC }) }
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await mod.resolveMerchantUrl('1', 'GameStop', 'US', NAME)).toBe(
      'https://www.gamestop.com/products/xbox-one-s/10138875.html'
    );
  });
});
