import { describe, expect, it } from 'vitest';
import { CONDITION_LABELS, isKnownNotNew, listingCondition } from '../condition';

const at = (retailer: string, name = 'Sony WH-1000XM5 Wireless Headphones') => ({
  name,
  retailer,
  url: 'https://www.google.com/search?ibp=oshop&q=x',
});

describe('listing condition', () => {
  it('reads refurbished, open box and used from the title', () => {
    expect(listingCondition(at('Best Buy', 'Apple AirPods Pro 3 (Renewed)'))).toBe('refurbished');
    expect(listingCondition(at('Walmart', 'Restored Keurig K-Mini Plus'))).toBe('refurbished');
    expect(listingCondition(at('eBay', 'Sony WH-1000XM5 - Open Box'))).toBe('open-box');
    expect(listingCondition(at('eBay', "Pre-Owned Levi's 501 Jeans"))).toBe('used');
  });

  it('knows resale, lease and e-textbook stores, including a seller on a marketplace', () => {
    expect(listingCondition(at('Poshmark'))).toBe('resale');
    expect(listingCondition(at('mercari.com'))).toBe('resale');
    expect(listingCondition(at('Walmart - ThriftBooks', 'Chemistry: The Central Science'))).toBe('resale');
    expect(listingCondition(at('Rent-A-Center'))).toBe('lease');
    expect(listingCondition(at('VitalSource', 'Chemistry: The Central Science'))).toBe('etextbook');
    expect(listingCondition(at('Back Market'))).toBe('refurbished');
  });

  it('a marketplace listing that says nothing is unstated; a verified store is new', () => {
    expect(listingCondition(at('eBay'))).toBe('unstated');
    expect(listingCondition(at('Walmart - SellerCo'))).toBe('unstated');
    expect(listingCondition(at('Best Buy'))).toBe('new');
    expect(listingCondition(at('Some Shop'))).toBe('new');
  });

  it('labels every condition but new', () => {
    expect(CONDITION_LABELS.new).toBeNull();
    expect(CONDITION_LABELS.unstated).toBe('Condition not stated');
    expect(CONDITION_LABELS.lease).toBe('Lease payment');
  });

  it('isKnownNotNew needs no trust lookup and treats unstated as unknown', () => {
    expect(isKnownNotNew(at('Poshmark'))).toBe(true);
    expect(isKnownNotNew(at('eBay'))).toBe(false);
  });
});
