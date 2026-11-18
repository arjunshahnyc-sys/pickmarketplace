// ZIP-level combined sales tax: the published table and the tax line that
// reads it. The table is the real file the site serves
// (public/salestax/us.json), so these also guard a bad rebuild.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculateLandedCost } from '../calculate';
import { NullFxProvider } from '../fx';
import { EU_MEMBERSHIP } from '../rules/eu';
import { loadRulesFor } from '../rules/loader';
import { US_STATE_SALES_TAX_DECIBPS } from '../rules/usSalesTax';
import { lookupLocalSalesTax, type UsLocalSalesTaxTable } from '../usLocalSalesTax';
import type { LandedCostInput, LocalSalesTaxRate } from '../types';

const TABLE: UsLocalSalesTaxTable = JSON.parse(
  readFileSync(new URL('../../../../public/salestax/us.json', import.meta.url), 'utf8')
);
const NOW = new Date('2026-11-18T00:00:00Z');

function taxLine(args: {
  priceMinor: number;
  shippingMinor?: number;
  state: string;
  local?: LocalSalesTaxRate | null;
}) {
  const { rules, rulesWarnings } = loadRulesFor('US', NOW);
  const input: LandedCostInput = {
    item: { priceMinor: args.priceMinor, currency: 'USD' },
    merchant: { id: 'owala', country: 'US', incoterm: 'unknown', configConfidence: 'estimated' },
    ...(args.shippingMinor !== undefined
      ? {
          shipping: {
            costMinor: args.shippingMinor,
            currency: 'USD',
            confidence: 'estimated' as const,
            sourceId: 'test',
            basis: 'test',
          },
        }
      : {}),
    destination: {
      country: 'US',
      currency: 'USD',
      subdivision: args.state,
      ...(args.local ? { localSalesTax: args.local } : {}),
    },
  };
  const out = calculateLandedCost(input, { rules, eu: EU_MEMBERSHIP, fx: new NullFxProvider(), rulesWarnings });
  return { line: out.lines.find((l) => l.kind === 'tax')!, out };
}

describe('the published ZIP table', () => {
  it('covers the states with a current official file', () => {
    expect(Object.keys(TABLE.states).sort()).toEqual([
      'AR', 'GA', 'IA', 'KS', 'MN', 'NC', 'ND', 'NE', 'NV', 'OH', 'OK', 'SD', 'TN', 'UT', 'VT', 'WA', 'WI', 'WV', 'WY',
    ]);
  });

  it('reproduces rates known from outside the file', () => {
    // 30022 is the ZIP on the real Owala checkout of 2026-11-18, which
    // charged $1.16 on $14.98: 7.75%.
    expect(lookupLocalSalesTax(TABLE, 'GA', '30022')).toMatchObject({ deciBps: 7750, minDeciBps: 7750, maxDeciBps: 7750 });
    expect(lookupLocalSalesTax(TABLE, 'GA', '30303')?.deciBps).toBe(8900); // downtown Atlanta
    expect(lookupLocalSalesTax(TABLE, 'TN', '37203')?.deciBps).toBe(9750); // Nashville
    expect(lookupLocalSalesTax(TABLE, 'NC', '27601')?.deciBps).toBe(7250); // Raleigh
    expect(lookupLocalSalesTax(TABLE, 'NV', '89101')?.deciBps).toBe(8375); // Las Vegas
    expect(lookupLocalSalesTax(TABLE, 'MN', '55401')?.deciBps).toBe(9025); // Minneapolis
    expect(lookupLocalSalesTax(TABLE, 'OH', '45202')?.deciBps).toBe(7800); // Cincinnati
  });

  it('every row is ordered lowest <= most common <= highest and never below the state base rate', () => {
    const bad: string[] = [];
    for (const [state, t] of Object.entries(TABLE.states)) {
      const base = US_STATE_SALES_TAX_DECIBPS[state].value!;
      for (const [zip, [common, lo, hi]] of Object.entries(t.zips)) {
        const ok = /^\d{5}$/.test(zip) && lo <= common && common <= hi && hi <= 15_000;
        // Nevada's file folds the state rate into each county's figure and
        // Utah's state row is the 4.85% portion alone; both still land at
        // or above the base rate on record.
        if (!ok || common < base) bad.push(`${state} ${zip} ${common}/${lo}/${hi} (base ${base})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('returns nothing for a state without a file, an unknown ZIP, or a ZIP from another state', () => {
    expect(lookupLocalSalesTax(TABLE, 'CA', '90210')).toBeNull();
    expect(lookupLocalSalesTax(TABLE, 'GA', '00000')).toBeNull();
    expect(lookupLocalSalesTax(TABLE, 'GA', '37203')).toBeNull();
    expect(lookupLocalSalesTax(null, 'GA', '30022')).toBeNull();
    expect(lookupLocalSalesTax(TABLE, 'GA', undefined)).toBeNull();
  });

  it('refuses a corrupt row instead of taxing at it', () => {
    const broken = { sourceUrl: 'x', states: { GA: { ...TABLE.states.GA, zips: { '30022': [99_000, 7750, 7750] } } } };
    expect(lookupLocalSalesTax(broken as unknown as UsLocalSalesTaxTable, 'GA', '30022')).toBeNull();
  });
});

describe('the sales tax line with a ZIP rate', () => {
  it('state only: the state base rate, as before, and the note asks for a ZIP', () => {
    const { line, out } = taxLine({ priceMinor: 799, state: 'GA' });
    expect(line.amountMinor).toBe(32); // 4% of $7.99
    expect(line.basis).toContain('4% GA state base rate');
    expect(out.assumptions.join(' ')).toContain('enter a ZIP code');
  });

  it('with the ZIP: the combined rate the state publishes for it', () => {
    const local = lookupLocalSalesTax(TABLE, 'GA', '30022');
    const { line, out } = taxLine({ priceMinor: 799, state: 'GA', local });
    expect(line.amountMinor).toBe(62); // 7.75% of $7.99
    expect(line.basis).toContain('7.75% combined state and local rate for your ZIP');
    expect(line.confidence).toBe('estimated');
    expect(out.assumptions.join(' ')).toContain('GA publishes for your ZIP code');
  });

  it('a ZIP that straddles jurisdictions uses its most common rate and states the spread', () => {
    const local = lookupLocalSalesTax(TABLE, 'GA', '30004')!; // Fulton, Forsyth and Cherokee counties
    expect(local.minDeciBps).toBeLessThan(local.maxDeciBps);
    const { line, out } = taxLine({ priceMinor: 10_000, state: 'GA', local });
    expect(line.amountMinor).toBe(Math.round((10_000 * local.deciBps) / 100_000));
    expect(out.assumptions.join(' ')).toMatch(/between 7% and 7\.75%; the rate covering the most addresses is used/);
  });

  it('never taxes below the state base rate, even if handed a lower figure', () => {
    const { line } = taxLine({
      priceMinor: 10_000,
      state: 'GA',
      local: { deciBps: 1000, minDeciBps: 1000, maxDeciBps: 1000, asOf: '2026-11-18', sourceUrl: 'x' },
    });
    expect(line.amountMinor).toBe(400);
  });
});

describe('sales tax on shipping', () => {
  it('reproduces the real Owala checkout: $7.99 item, $6.99 shipping, ZIP 30022, tax $1.16', () => {
    const local = lookupLocalSalesTax(TABLE, 'GA', '30022');
    const { line, out } = taxLine({ priceMinor: 799, shippingMinor: 699, state: 'GA', local });
    expect(line.amountMinor).toBe(116);
    expect(line.basis).toContain('Item price plus shipping x 7.75%');
    expect(out.totalMinor).toBe(799 + 699 + 116); // $16.14, the checkout total
    expect(out.assumptions.join(' ')).toContain('GA taxes shipping charges on taxable items');
  });

  it('a state that taxes shipping, shipping unknown: item only, and the gap is said', () => {
    const { line, out } = taxLine({ priceMinor: 799, state: 'GA', local: lookupLocalSalesTax(TABLE, 'GA', '30022') });
    expect(line.amountMinor).toBe(62);
    expect(out.assumptions.join(' ')).toContain('not included because the shipping cost is unknown');
  });

  it('free shipping adds nothing to the base', () => {
    const { line } = taxLine({ priceMinor: 5_000, shippingMinor: 0, state: 'GA', local: lookupLocalSalesTax(TABLE, 'GA', '30022') });
    expect(line.amountMinor).toBe(388); // 7.75% of $50.00
  });

  it('a state that does not tax separately stated shipping keeps the item-only base (Utah)', () => {
    const { line, out } = taxLine({ priceMinor: 10_000, shippingMinor: 1_000, state: 'UT' });
    expect(line.amountMinor).toBe(485); // 4.85% of the item alone
    expect(line.basis).toContain('Item price x');
    expect(out.assumptions.join(' ')).toContain('UT does not tax a separately stated shipping charge');
  });

  it('a state with no row keeps the old behavior and the old caveat (California, Nevada)', () => {
    for (const state of ['CA', 'NV']) {
      const { line, out } = taxLine({ priceMinor: 10_000, shippingMinor: 1_000, state });
      expect(line.basis).toContain('Item price x');
      expect(out.assumptions.join(' ')).toContain('Whether shipping is taxed varies by state');
    }
  });

  it('applies with the state alone too (no ZIP): Georgia base rate on item plus shipping', () => {
    const { line } = taxLine({ priceMinor: 799, shippingMinor: 699, state: 'GA' });
    expect(line.amountMinor).toBe(60); // 4% of $14.98
  });
});
