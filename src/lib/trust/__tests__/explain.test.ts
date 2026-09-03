import { describe, expect, it } from 'vitest';
import { classifySeller, getRetailerTrust, hasUnverifiedSeller, type TrustLevel } from '../../retailerTrust';
import { explainTrust, TRUST_LEVEL_META, UNVERIFIED_DISCLOSURE } from '../explain';
import { findFlagged, FLAGGED_MERCHANTS } from '../flagged';
import { listingHost } from '../registry';

const EM_DASH = '—';

// The tooltip contract: every level explains WHY this seller carries the
// label, naming the merchant, seller, host, or record involved; copy
// describes the seller and never the product; the two legacy substrings
// other tests pin survive; nothing contains an em dash.

describe('classifySeller: structured verdicts keep every level outcome', () => {
  it('verified entries carry their registry entry and domain signal', () => {
    const v = classifySeller('Apple');
    expect(v.level).toBe('verified');
    if (v.level === 'verified') {
      expect(v.entry.id).toBe('apple-us');
      expect(v.domain).toBe('no-signal');
    }
    const matched = classifySeller('IKEA', { url: 'https://www.ikea.com/us/en/p/x' });
    expect(matched.level === 'verified' && matched.host).toBe('ikea.com');
  });

  it('unknown verdicts say which kind of unknown', () => {
    expect(classifySeller('IKEA', { url: 'https://ikea-outlet.com/x' })).toMatchObject({
      level: 'unknown',
      cause: 'domain-mismatch',
      host: 'ikea-outlet.com',
    });
    expect(classifySeller('Kmart', { market: 'AU' })).toMatchObject({ level: 'unknown', cause: 'config-only' });
    expect(classifySeller('Random Storefront 123')).toMatchObject({ level: 'unknown', cause: 'no-entry' });
    expect(classifySeller('Google Shopping')).toMatchObject({ level: 'unknown', cause: 'no-seller-named' });
    expect(classifySeller('Bob - Discount Furniture')).toMatchObject({
      level: 'unknown',
      cause: 'seller-on-unregistered-platform',
    });
  });

  it('marketplace sellers carry platform and seller; flagged carry the matched merchant', () => {
    expect(classifySeller('Walmart - ABOUTYES')).toMatchObject({
      level: 'marketplace-seller',
      seller: 'ABOUTYES',
    });
    const t = classifySeller('AliExpress US Store');
    expect(t.level === 'flagged' && t.flag.displayName).toBe('AliExpress');
  });
});

describe('explainTrust: the reason names the specific basis', () => {
  const reason = (name: string, ctx?: Parameters<typeof classifySeller>[1]) =>
    explainTrust(classifySeller(name, ctx));

  it("verified brand-direct: the brand's own store, its domain, and the review date", () => {
    const e = reason('Apple');
    expect(e.headline).toBe('Verified retailer');
    expect(e.reason).toContain("Apple is the brand's own store (apple.com)");
    expect(e.reason).toMatch(/reviewed list since [A-Z][a-z]{2} \d{1,2}, \d{4}/);
    expect(e.advice).toBe('Verified describes the seller, not the product.');
  });

  it('verified national retailer with third-party sellers explains the Marketplace seller label', () => {
    const e = reason('Walmart');
    expect(e.reason).toContain('Walmart is a national retailer (walmart.com)');
    expect(e.reason).toContain('labeled Marketplace seller instead');
  });

  it('a matched official domain is stated', () => {
    const e = reason('IKEA', { url: 'https://www.ikea.com/us/en/p/x' });
    expect(e.reason).toContain('links to ikea.com, its official domain');
  });

  it('marketplace: mixed inventory the feed cannot separate', () => {
    const e = reason('Amazon');
    expect(e.headline).toBe('Marketplace platform');
    expect(e.reason).toContain('Amazon mixes its own inventory');
    expect(e.advice).toContain('checkout');
  });

  it('marketplace seller: names the seller and the platform, no em dash', () => {
    const e = reason('Walmart - ABOUTYES');
    expect(e.reason).toBe('Sold by "ABOUTYES", an independent seller on Walmart, not by Walmart itself.');
  });

  it('lookalike: names the actual host and the official domain', () => {
    const e = reason('IKEA', { url: 'https://ikea-outlet.com/x' });
    expect(e.reason).toContain('links to ikea-outlet.com');
    expect(e.reason).toContain("not IKEA's official domain (ikea.com)");
  });

  it('config-only versus no record versus unnamed seller read differently', () => {
    expect(reason('Kmart', { market: 'AU' }).reason).toContain('shipping estimates but has not reviewed it as a seller');
    expect(reason('Random Storefront 123').reason).toContain('Pick has no record of Random Storefront 123');
    expect(reason('Google Shopping').reason).toContain('did not name the seller');
  });

  it('every kind of unverified carries the not-a-scam disclosure; no other level does', () => {
    const unknowns: Array<[string, Parameters<typeof classifySeller>[1]]> = [
      ['IKEA', { url: 'https://ikea-outlet.com/x' }],
      ['Kmart', { market: 'AU' }],
      ['Random Storefront 123', undefined],
      ['Google Shopping', undefined],
      ['Bob - Discount Furniture', undefined],
    ];
    for (const [name, ctx] of unknowns) {
      const v = classifySeller(name, ctx);
      expect(v.level, name).toBe('unknown');
      expect(explainTrust(v).note, name).toBe(UNVERIFIED_DISCLOSURE);
    }
    for (const name of ['Apple', 'Amazon', 'Walmart - ABOUTYES', 'Temu']) {
      expect(explainTrust(classifySeller(name)).note, name).toBeUndefined();
    }
    // The disclosure itself: not a scam, only not directly verified by Pick,
    // and it points at the label that IS the warning.
    expect(UNVERIFIED_DISCLOSURE).toContain('does not mean scam');
    expect(UNVERIFIED_DISCLOSURE).toContain('not directly verified');
    expect(UNVERIFIED_DISCLOSURE).toContain('Possible scam');
  });

  it('flagged: names the marketplace and the reports', () => {
    const e = reason('Temu');
    expect(e.headline).toBe('Possible scam');
    expect(e.reason.startsWith('Temu has widespread shopper reports')).toBe(true);
    expect(e.advice).toBe('Buy with caution.');
  });

  it('long feed names are shortened in copy', () => {
    const long = 'A'.repeat(80);
    expect(reason(long).reason.length).toBeLessThan(160);
  });
});

describe('legacy description and pinned substrings', () => {
  it('keeps the seller name and the official-domain phrase other tests rely on', () => {
    expect(getRetailerTrust('Walmart - ABOUTYES').description).toContain('ABOUTYES');
    expect(getRetailerTrust('IKEA', { url: 'https://ikea-outlet.com/x' }).description).toContain('official domain');
    // The unverified disclosure rides along in the legacy string too.
    expect(getRetailerTrust('Random Storefront 123').description).toContain('does not mean scam');
    expect(getRetailerTrust('Apple').description).not.toContain('does not mean scam');
  });

  it('every level produces copy about the seller with no em dash', () => {
    const samples: Array<[string, Parameters<typeof getRetailerTrust>[1]]> = [
      ['Apple', undefined],
      ['Walmart', undefined],
      ['Amazon', undefined],
      ['Walmart - ABOUTYES', undefined],
      ['IKEA', { url: 'https://ikea-outlet.com/x' }],
      ['Kmart', { market: 'AU' }],
      ['Random Storefront 123', undefined],
      ['Google Shopping', undefined],
      ['Temu', undefined],
      ['Bob - Discount Furniture', undefined],
    ];
    const seen = new Set<TrustLevel>();
    for (const [name, ctx] of samples) {
      const t = getRetailerTrust(name, ctx);
      seen.add(t.level);
      const note = t.explanation.note ? [t.explanation.note] : [];
      for (const s of [t.description, t.explanation.headline, t.explanation.reason, t.explanation.advice, t.label, ...note]) {
        expect(s, name).not.toContain(EM_DASH);
        expect(s.length, name).toBeGreaterThan(0);
      }
      if (t.level === 'verified') expect(t.description).toContain('seller, not the product');
    }
    expect([...seen].sort()).toEqual(['flagged', 'marketplace', 'marketplace-seller', 'unknown', 'verified']);
  });

  it('TRUST_LEVEL_META covers every level with a label, icon and tone', () => {
    for (const level of ['verified', 'marketplace', 'marketplace-seller', 'unknown', 'flagged'] as const) {
      expect(TRUST_LEVEL_META[level].label.length).toBeGreaterThan(0);
      expect(TRUST_LEVEL_META[level].icon.length).toBeGreaterThan(0);
      expect(TRUST_LEVEL_META[level].className).toContain('bg-');
    }
  });
});

describe('hasUnverifiedSeller: the results footnote fires only when a card shows the badge', () => {
  const offer = (retailer: string, url = 'https://www.google.com/shopping/product/1') => ({ retailer, url });

  it('true with one unverified listing, false for a fully recognized set', () => {
    expect(hasUnverifiedSeller([offer('Apple'), offer('Amazon'), offer('Walmart - ABOUTYES')])).toBe(false);
    expect(hasUnverifiedSeller([offer('Apple'), offer('Random Storefront 123')])).toBe(true);
    expect(hasUnverifiedSeller([offer('Temu')])).toBe(false);
    expect(hasUnverifiedSeller([])).toBe(false);
  });

  it('uses the listing URL like the card does, so a lookalike counts', () => {
    expect(hasUnverifiedSeller([offer('IKEA', 'https://www.ikea.com/us/en/p/x')])).toBe(false);
    expect(hasUnverifiedSeller([offer('IKEA', 'https://ikea-outlet.com/x')])).toBe(true);
  });
});

describe('flagged table reproduces the historical matching', () => {
  it('token, substring and exact modes', () => {
    expect(findFlagged('Temu')?.displayName).toBe('Temu');
    expect(findFlagged('AliExpress US Store')?.displayName).toBe('AliExpress');
    expect(findFlagged('DHgate Official Store')?.displayName).toBe('DHgate');
    expect(findFlagged('Wish')?.displayName).toBe('Wish');
    expect(findFlagged('Wish.com')?.displayName).toBe('Wish');
    expect(findFlagged('Wishlist Gifts')).toBeNull();
    expect(findFlagged('Best Wish Store')).toBeNull();
    expect(findFlagged('Walmart')).toBeNull();
  });

  it('every evidence entry, if any, is dated and sourced', () => {
    for (const m of FLAGGED_MERCHANTS) {
      for (const e of m.evidence) {
        expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(e.sourceUrl).toMatch(/^https?:\/\//);
      }
    }
  });
});

describe('listingHost', () => {
  it('returns the registrable host of a real merchant link', () => {
    expect(listingHost('https://www.ikea.com/us/en/p/x')).toBe('ikea.com');
    expect(listingHost('https://ikea-outlet.com/x')).toBe('ikea-outlet.com');
    expect(listingHost('https://shop.example.co.uk/p')).toBe('example.co.uk');
  });

  it('is null for intermediaries, garbage, and nothing', () => {
    expect(listingHost('https://www.google.com/search?ibp=oshop&q=desk')).toBeNull();
    expect(listingHost('not a url')).toBeNull();
    expect(listingHost(undefined)).toBeNull();
  });
});
