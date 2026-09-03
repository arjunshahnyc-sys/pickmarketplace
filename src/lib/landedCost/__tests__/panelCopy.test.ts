import { describe, expect, it } from 'vitest';
import {
  disclaimerFor,
  gapNotes,
  includedSummary,
  panelLines,
  panelMode,
  unavailableCopy,
} from '@/components/LandedCostPanel';
import { calculateLandedCost } from '../calculate';
import { summarizeTotal, type TotalSummary } from '../enrich';
import { NullFxProvider } from '../fx';
import { EU_MEMBERSHIP } from '../rules/eu';
import { loadRulesFor } from '../rules/loader';
import type { LandedCostInput } from '../types';

// The row's three modes and the copy under each, as tests: the static
// modes never expand, the unavailable reasons never blame shipping, and a
// partial's gaps get an answer the shopper can act on.

const NOW = new Date('2026-09-01T00:00:00Z');
const EM_DASH = '—';

const unavailable = (code: 'fx' | 'unknown-seller' | 'import-charges'): TotalSummary => ({
  kind: 'unavailable',
  reason: 'x',
  code,
});

describe('panelMode: only real figures get an accordion', () => {
  it('fx while rates are pending is the loading line', () => {
    expect(panelMode(unavailable('fx'), true)).toBe('loading');
  });

  it('every other unavailable is the static unavailable line', () => {
    expect(panelMode(unavailable('fx'), false)).toBe('unavailable');
    expect(panelMode(unavailable('unknown-seller'), true)).toBe('unavailable');
    expect(panelMode(unavailable('import-charges'), false)).toBe('unavailable');
  });

  it('totals, ranges and partials keep the expandable breakdown', () => {
    expect(panelMode({ kind: 'total', totalMinor: 100 }, false)).toBe('panel');
    expect(panelMode({ kind: 'subtotal', totalMinor: 100, missing: ['tax'] }, true)).toBe('panel');
    expect(
      panelMode({ kind: 'range', lowMinor: 100, highMinor: 200, missing: [] }, false)
    ).toBe('panel');
  });
});

describe('unavailableCopy: names what is missing, never shipping', () => {
  it('fx names both currencies when the listing currency is known', () => {
    expect(unavailableCopy('fx', { itemCurrency: 'GBP', currency: 'USD' })).toBe(
      'This GBP price could not be converted to USD today.'
    );
    expect(unavailableCopy('fx', { currency: 'USD' })).toBe(
      'This price could not be converted to USD today.'
    );
  });

  it('import-charges names the destination when known', () => {
    expect(unavailableCopy('import-charges', { currency: 'GBP', country: 'GB' })).toContain(
      'delivery to GB'
    );
    expect(unavailableCopy('import-charges', { currency: 'GBP' })).toContain('this destination');
  });

  it('no code blames shipping or promises a checkout figure', () => {
    for (const code of ['fx', 'unknown-seller', 'import-charges'] as const) {
      const copy = unavailableCopy(code, { itemCurrency: 'EUR', currency: 'USD', country: 'US' });
      expect(copy.toLowerCase()).not.toContain('shipping');
      expect(copy.toLowerCase()).not.toContain('checkout');
      expect(copy).not.toContain(EM_DASH);
    }
  });
});

describe('gapNotes: a partial explains its gaps and its rank', () => {
  it('a missing shipping line is the one honest place for "at checkout"', () => {
    const notes = gapNotes({ kind: 'subtotal', totalMinor: 100, missing: ['shipping'] }, 'domestic');
    expect(notes[0]).toBe('Shipping is set by the seller at checkout and is not included above.');
    expect(notes[notes.length - 1]).toContain('rank below');
  });

  it('a missing domestic sales tax line tells the shopper to pick a state', () => {
    const notes = gapNotes({ kind: 'subtotal', totalMinor: 100, missing: ['tax'] }, 'domestic');
    expect(notes[0]).toBe('Choose a delivery state in the header to include sales tax.');
  });

  it('cross-border tax gaps do not get the state advice', () => {
    const notes = gapNotes(
      { kind: 'range', lowMinor: 100, highMinor: 200, missing: ['tax'] },
      'cross-border'
    );
    expect(notes.join(' ')).not.toContain('delivery state');
    expect(notes).toHaveLength(1);
  });

  it('nothing to say for complete totals or unavailable summaries', () => {
    expect(gapNotes({ kind: 'total', totalMinor: 100 }, 'domestic')).toEqual([]);
    expect(gapNotes(unavailable('fx'), 'domestic')).toEqual([]);
    expect(
      gapNotes({ kind: 'range', lowMinor: 100, highMinor: 200, missing: [] }, 'cross-border')
    ).toEqual([]);
  });

  it('both gaps, both notes, in headline order', () => {
    const notes = gapNotes(
      { kind: 'subtotal', totalMinor: 100, missing: ['shipping', 'tax'] },
      'domestic'
    );
    expect(notes).toHaveLength(3);
    expect(notes[0]).toContain('Shipping');
    expect(notes[1]).toContain('delivery state');
  });
});

describe('disclaimerFor: the caveat matches the lane', () => {
  it('domestic and intra-EU talk about the retailer, not customs', () => {
    expect(disclaimerFor('domestic')).toContain('retailer at checkout');
    expect(disclaimerFor('intra-eu')).toContain('retailer at checkout');
    expect(disclaimerFor('domestic')).not.toContain('customs');
  });

  it('cross-border keeps the customs sentence', () => {
    expect(disclaimerFor('cross-border')).toContain('customs authorities');
    expect(disclaimerFor('unknown')).toContain('customs authorities');
  });

  it('no produced string contains an em dash', () => {
    for (const lane of ['domestic', 'intra-eu', 'cross-border', 'unknown'] as const) {
      expect(disclaimerFor(lane)).not.toContain(EM_DASH);
    }
  });
});

describe('panelLines: the zero import rows collapse even beside an unknown tax row', () => {
  function usInput(subdivision?: string): LandedCostInput {
    return {
      item: { priceMinor: 10_000, currency: 'USD' },
      merchant: { id: 'target', country: 'US', incoterm: 'unknown', configConfidence: 'estimated' },
      shipping: { costMinor: 0, currency: 'USD', confidence: 'estimated' },
      destination: { country: 'US', currency: 'USD', subdivision },
    };
  }
  function usCtx() {
    const { rules, rulesWarnings } = loadRulesFor('US', NOW);
    return { rules, eu: EU_MEMBERSHIP, fx: new NullFxProvider(), rulesWarnings };
  }

  it('US with no delivery state: item, shipping, unknown sales tax, one collapsed line', () => {
    const out = calculateLandedCost(usInput(), usCtx());
    expect(summarizeTotal(out)).toMatchObject({ kind: 'subtotal', missing: ['tax'] });
    const lines = panelLines(out);
    expect(lines.map((l) => l.kind)).toEqual(['item', 'shipping', 'tax', 'duty']);
    expect(lines[2].amountMinor).toBeNull();
    expect(lines[3].label).toBe('No import charges (domestic purchase)');
    expect(lines[3].amountMinor).toBe(0);
    // The two $0.00 import rows are gone; nothing else was dropped.
    expect(lines.filter((l) => l.amountMinor === 0 && l.kind !== 'shipping')).toHaveLength(1);
  });

  it('US with a state: the computed sales tax row stays beside the collapsed line', () => {
    const lines = panelLines(calculateLandedCost(usInput('NJ'), usCtx()));
    expect(lines.some((l) => l.label === 'Sales tax (NJ)' && l.amountMinor !== null)).toBe(true);
    expect(lines.some((l) => l.label.includes('No import charges'))).toBe(true);
    expect(lines).toHaveLength(4);
  });
});

describe('includedSummary: the tooltip lists what the panel actually shows', () => {
  function usInput(subdivision?: string): LandedCostInput {
    return {
      item: { priceMinor: 10_000, currency: 'USD' },
      merchant: { id: 'target', country: 'US', incoterm: 'unknown', configConfidence: 'estimated' },
      shipping: { costMinor: 599, currency: 'USD', confidence: 'estimated' },
      destination: { country: 'US', currency: 'USD', subdivision },
    };
  }
  function usCtx() {
    const { rules, rulesWarnings } = loadRulesFor('US', NOW);
    return { rules, eu: EU_MEMBERSHIP, fx: new NullFxProvider(), rulesWarnings };
  }

  it('a resolved domestic estimate names item, shipping and state sales tax', () => {
    const text = includedSummary(calculateLandedCost(usInput('NJ'), usCtx()));
    expect(text).toContain('This total is an estimate.');
    expect(text).toContain('item price');
    expect(text).toContain('shipping (est.)');
    expect(text).toContain('sales tax (NJ) (est.)');
    expect(text).toContain('no import charges on a domestic purchase');
    expect(text).toContain('not a quote from the seller');
    expect(text).not.toContain('not included');
    expect(text).not.toContain(EM_DASH);
  });

  it('a partial says known costs only and names the gap', () => {
    const text = includedSummary(calculateLandedCost(usInput(), usCtx()));
    expect(text).toContain('Known costs only:');
    expect(text).toContain('Tax is not included.');
    expect(text).not.toContain('This total');
  });

  it('an unavailable breakdown has nothing to summarize', () => {
    const input = usInput('NJ');
    input.merchant = { id: 'mystery', country: undefined, incoterm: 'unknown', configConfidence: 'unknown' };
    expect(includedSummary(calculateLandedCost(input, usCtx()))).toBe('');
  });

  it('a hand-built exact total says so and skips the estimate caveat', () => {
    const text = includedSummary({
      lines: [
        { kind: 'item', label: 'Item price', amountMinor: 1000, basis: '', confidence: 'exact', sourceId: 'input' },
        { kind: 'shipping', label: 'Shipping', amountMinor: 500, basis: '', confidence: 'exact', sourceId: 'input' },
      ],
      totalMinor: 1500,
      confidence: 'exact',
      assumptions: [],
      warnings: [],
      unknownComponents: [],
      lane: 'cross-border',
      currency: 'USD',
    });
    expect(text).toBe(
      'This total includes item price and shipping, all from sourced figures. Expand the row for the full breakdown.'
    );
  });

  it('a range explains the DDP-to-DAP spread', () => {
    const text = includedSummary({
      lines: [
        { kind: 'item', label: 'Item price', amountMinor: 1000, basis: '', confidence: 'exact', sourceId: 'input' },
        { kind: 'duty', label: 'Import duty', amountMinor: 100, basis: '', confidence: 'estimated', sourceId: 'GB.duty' },
        { kind: 'tax', label: 'Import VAT (20%)', amountMinor: 220, basis: '', confidence: 'estimated', sourceId: 'GB.vat' },
      ],
      totalMinor: 1320,
      totalRange: { lowMinor: 1000, highMinor: 1320 },
      confidence: 'estimated',
      assumptions: [],
      warnings: [],
      unknownComponents: [],
      lane: 'cross-border',
      currency: 'GBP',
    });
    expect(text).toContain('import duty (est.)');
    expect(text).toContain('import VAT (20%) (est.)');
    expect(text).toContain('prepaid by the seller (low)');
  });
});
