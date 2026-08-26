import { describe, expect, it } from 'vitest';
import {
  buildLandedCostInput,
  dollarsToMinor,
  orderByLandedCost,
  summarizeTotal,
  withLandedCosts,
} from '../enrich';
import type { Product } from '../../types';

const NOW = new Date('2026-08-26T00:00:00Z');

function product(over: Partial<Product> & { id: string; price: number }): Product {
  return {
    name: over.id,
    image: '',
    retailer: 'Target',
    url: `https://example.test/${over.id}`,
    ...over,
  };
}

describe('dollarsToMinor (the float boundary)', () => {
  it('converts feed dollars to integer cents', () => {
    expect(dollarsToMinor(15.99)).toBe(1_599);
    expect(dollarsToMinor(0.1)).toBe(10);
    expect(dollarsToMinor(200)).toBe(20_000);
    // The classic float trap: 19.99 * 100 = 1998.9999999999998
    expect(dollarsToMinor(19.99)).toBe(1_999);
  });

  it('returns null for garbage instead of guessing', () => {
    expect(dollarsToMinor(NaN)).toBeNull();
    expect(dollarsToMinor(Infinity)).toBeNull();
    expect(dollarsToMinor(-5)).toBeNull();
  });
});

describe('buildLandedCostInput', () => {
  it('wires merchant config, classification, and unknown shipping together', () => {
    const input = buildLandedCostInput(
      product({ id: 'shoe', price: 89.99, retailer: 'Target', category: 'shoes' }),
      { country: 'US', currency: 'USD' }
    )!;
    expect(input.item.priceMinor).toBe(8_999);
    expect(input.item.currency).toBe('USD');
    expect(input.item.hs).toMatchObject({ code: '6404', confidence: 'estimated' });
    expect(input.merchant).toMatchObject({ id: 'target', country: 'US', incoterm: 'unknown' });
    expect(input.shipping).toBeUndefined();
  });

  it('returns null for an unusable price', () => {
    expect(
      buildLandedCostInput(product({ id: 'bad', price: NaN }), { country: 'US', currency: 'USD' })
    ).toBeNull();
  });
});

describe('withLandedCosts against the real seeded rules', () => {
  it('US destination: domestic path works today, shipping honestly unknown', () => {
    const [p] = withLandedCosts(
      [product({ id: 'a', price: 200, retailer: 'Target' })],
      { country: 'US', currency: 'USD' },
      NOW
    );
    expect(p.landedCost).toBeDefined();
    const b = p.landedCost!;
    expect(b.lane).toBe('domestic');
    expect(b.totalMinor).toBe(20_000);
    expect(b.unknownComponents).toEqual(['shipping']);
    expect(summarizeTotal(b)).toEqual({
      kind: 'subtotal',
      totalMinor: 20_000,
      missing: ['shipping'],
    });
  });

  it('GB destination: unverified rules + no FX = estimate unavailable, never a number', () => {
    const [p] = withLandedCosts(
      [product({ id: 'a', price: 200, retailer: 'Target' })],
      { country: 'GB', currency: 'GBP' },
      NOW
    );
    const b = p.landedCost!;
    expect(b.lane).toBe('cross-border');
    // No FX provider is wired in production: the USD item cannot convert.
    expect(b.unknownComponents).toContain('item');
    expect(summarizeTotal(b).kind).toBe('unavailable');
    // The important legal property: no invented figures anywhere.
    for (const line of b.lines) {
      if (line.amountMinor !== null) expect(line.amountMinor).toBe(0);
    }
  });

  it('unrecognized merchants come out unrankable, not cheap', () => {
    const enriched = withLandedCosts(
      [
        product({ id: 'known', price: 300, retailer: 'Target' }),
        product({ id: 'mystery', price: 10, retailer: 'Random Shop' }),
      ],
      { country: 'US', currency: 'USD' },
      NOW
    );
    const { products, topSlotOfferId } = orderByLandedCost(enriched);
    // The $10 mystery-merchant offer sorts cheap but cannot take the top
    // slot: its lane (and thus its import charges) is unknown.
    expect(topSlotOfferId).toBe('known');
    expect(products[0].id).toBe('known');
  });
});
