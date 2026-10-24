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
  it('wires merchant config, classification, and shipping estimation together', () => {
    const input = buildLandedCostInput(
      product({ id: 'shoe', price: 89.99, retailer: 'Target', category: 'shoes' }),
      { country: 'US', currency: 'USD' }
    )!;
    expect(input.item.priceMinor).toBe(8_999);
    expect(input.item.currency).toBe('USD');
    expect(input.item.hs).toMatchObject({ code: '6404', confidence: 'estimated' });
    expect(input.merchant).toMatchObject({ id: 'target', country: 'US', incoterm: 'unknown' });
    // Tier 2 of the shipping hierarchy: Target's published policy (free
    // standard shipping over $35, verified 2026-09-01) beats the carrier
    // benchmark for an $89.99 domestic order.
    expect(input.shipping).toMatchObject({
      costMinor: 0,
      confidence: 'estimated',
      sourceId: 'shipping-policy:target.com:free-over',
    });
  });

  it('below the free-shipping threshold, the published flat rate applies', () => {
    const input = buildLandedCostInput(
      product({ id: 'cheap', price: 19.99, retailer: 'Target', category: 'shoes' }),
      { country: 'US', currency: 'USD' }
    )!;
    expect(input.shipping).toMatchObject({
      costMinor: 599,
      sourceId: 'shipping-policy:target.com:flat',
    });
  });

  it('merchants with no published policy fall to the carrier benchmark, never a default', () => {
    const input = buildLandedCostInput(
      product({ id: 'shoe', price: 89.99, retailer: 'GameStop', category: 'shoes' }),
      { country: 'US', currency: 'USD' }
    )!;
    // Ground Advantage zone-4 benchmark: boxed shoes ride the 5 lb band.
    expect(input.shipping).toMatchObject({ costMinor: 1_580, confidence: 'estimated' });
    expect(input.shipping!.sourceId).toContain('shipping-estimate:US:US');
  });

  it("a $250 speaker at Dick's rides the free-over-$75 policy: a real zero, labeled", () => {
    const input = buildLandedCostInput(
      product({ id: 'speaker', price: 250, retailer: "Dick's Sporting Goods", category: 'speakers' }),
      { country: 'US', currency: 'USD', subdivision: 'GA' }
    )!;
    expect(input.shipping).toMatchObject({
      costMinor: 0,
      confidence: 'estimated',
      sourceId: 'shipping-policy:dickssportinggoods.com:free-over',
    });
    expect(input.shipping!.basis).toContain('$75.00 or more');
    expect(input.shippingUnknownReason).toBeUndefined();
  });

  it("the delivery state scopes the policy: Academy excludes CA; Lowe's and the benchmark stop at the contiguous US", () => {
    const academyCa = buildLandedCostInput(
      product({ id: 'shoe', price: 89.99, retailer: 'Academy Sports + Outdoors', category: 'shoes' }),
      { country: 'US', currency: 'USD', subdivision: 'CA' }
    )!;
    expect(academyCa.shipping!.sourceId).toContain('shipping-estimate:US:US');
    const academyTx = buildLandedCostInput(
      product({ id: 'shoe', price: 89.99, retailer: 'Academy Sports + Outdoors', category: 'shoes' }),
      { country: 'US', currency: 'USD', subdivision: 'TX' }
    )!;
    expect(academyTx.shipping).toMatchObject({ costMinor: 0 });
    const lowesHi = buildLandedCostInput(
      product({ id: 'shoe', price: 89.99, retailer: "Lowe's", category: 'shoes' }),
      { country: 'US', currency: 'USD', subdivision: 'HI' }
    )!;
    expect(lowesHi.shipping).toBeUndefined();
    expect(lowesHi.shippingUnknownReason).toContain('HI');
    // Macy's publishes a $10 AK/HI surcharge: free-over becomes $10, labeled.
    const macysAk = buildLandedCostInput(
      product({ id: 'shoe', price: 89.99, retailer: "Macy's", category: 'shoes' }),
      { country: 'US', currency: 'USD', subdivision: 'AK' }
    )!;
    expect(macysAk.shipping).toMatchObject({
      costMinor: 1_000,
      sourceId: 'shipping-policy:macys.com:free-over+surcharge',
    });
  });

  it('a typed ZIP never enters the input: only country, currency and state do', () => {
    const picker = { country: 'US', currency: 'USD', subdivision: 'GA', postalCode: '30318' };
    const input = buildLandedCostInput(
      product({ id: 'shoe', price: 89.99, retailer: 'Target', category: 'shoes' }),
      picker
    )!;
    expect(input.destination).toEqual({ country: 'US', currency: 'USD', subdivision: 'GA' });
    expect(JSON.stringify(input)).not.toContain('30318');
  });

  it('returns null for an unusable price', () => {
    expect(
      buildLandedCostInput(product({ id: 'bad', price: NaN }), { country: 'US', currency: 'USD' })
    ).toBeNull();
  });
});

describe('withLandedCosts against the real seeded rules', () => {
  it('US destination without a state: shipping resolves from policy, tax honestly unresolved', () => {
    const [p] = withLandedCosts(
      [product({ id: 'a', price: 200, retailer: 'Target' })],
      { country: 'US', currency: 'USD' },
      NOW
    );
    expect(p.landedCost).toBeDefined();
    const b = p.landedCost!;
    expect(b.lane).toBe('domestic');
    // Shipping is 0 per Target's published free-over-$35 policy; sales tax
    // depends on the delivery state, which is not chosen, so the total is a
    // labeled partial rather than a silent omission.
    expect(b.totalMinor).toBe(20_000);
    expect(b.unknownComponents).toEqual(['tax']);
    expect(summarizeTotal(b)).toEqual({
      kind: 'subtotal',
      totalMinor: 20_000,
      missing: ['tax'],
    });
  });

  it('US destination with a state: sales tax at the verified state base rate', () => {
    const [p] = withLandedCosts(
      [product({ id: 'a', price: 200, retailer: 'Target' })],
      { country: 'US', currency: 'USD', subdivision: 'NJ' },
      NOW
    );
    const b = p.landedCost!;
    const tax = b.lines.find((l) => l.kind === 'tax')!;
    // NJ 6.625% of $200.00 = $13.25, exactly (deci-bps keeps it exact).
    expect(tax.amountMinor).toBe(1_325);
    expect(tax.label).toBe('Sales tax (NJ)');
    expect(tax.sourceId).toBe('US.salesTax.NJ');
    expect(tax.confidence).toBe('estimated'); // local surtaxes not included
    expect(b.unknownComponents).toEqual([]);
    expect(summarizeTotal(b)).toEqual({ kind: 'total', totalMinor: 21_325 });
  });

  it('a zero-rate state yields a verified zero, not a gap', () => {
    const [p] = withLandedCosts(
      [product({ id: 'a', price: 200, retailer: 'Target' })],
      { country: 'US', currency: 'USD', subdivision: 'OR' },
      NOW
    );
    const b = p.landedCost!;
    const tax = b.lines.find((l) => l.kind === 'tax')!;
    expect(tax.amountMinor).toBe(0);
    expect(tax.basis).toContain('No state-level sales tax');
    expect(summarizeTotal(b)).toEqual({ kind: 'total', totalMinor: 20_000 });
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
      { country: 'US', currency: 'USD', subdivision: 'NJ' },
      NOW
    );
    const { products, topSlotOfferId } = orderByLandedCost(enriched);
    // The $10 mystery-merchant offer has no honest total at all, so it
    // sinks to the unavailable bucket; the resolved Target offer wins.
    expect(topSlotOfferId).toBe('known');
    expect(products[0].id).toBe('known');
    expect(products[products.length - 1].id).toBe('mystery');
  });
});
