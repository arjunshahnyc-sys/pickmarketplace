// Live search keeps every real offer it is handed. A 2026-09-22 capture of
// 50 queries (eval/runs) lost real listings in two places before ranking:
// the relevance filter (a title that abbreviates, or a query with filler
// words) and the dedup step (keyed on the title alone, so a second store
// selling under the same title vanished). Target's internal endpoint was
// removed the same week; Google Shopping is the only source.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRelevantResult } from '../scrapers';
import { performLiveSearch } from '../searchService';

describe('relevance filter', () => {
  it('keeps titles that abbreviate what the query spells out', () => {
    expect(isRelevantResult('Apple Airpods 4 Anc Bluetooth Earbuds W/ Charging Case White', 'airpods 4 with active noise cancellation')).toBe(true);
    expect(isRelevantResult('Galanz Retro Compact Refrigerator', 'galanz retro mini fridge 3.1 cu ft')).toBe(true);
  });

  it('keeps a title carrying the query model number', () => {
    expect(isRelevantResult('K87 Tee - Navy - S', 'carhartt k87 pocket t-shirt')).toBe(true);
    expect(isRelevantResult('Sony WH1000XM5/B Wireless Headphones', 'sony wh-1000xm5')).toBe(true);
  });

  it('does not let filler words such as "edition" sink a title', () => {
    expect(isRelevantResult('Principles of Economics', 'mankiw principles of economics 10th edition')).toBe(true);
  });

  it('still drops unrelated titles', () => {
    expect(isRelevantResult('Stanley Quencher H2.0 Tumbler 40 oz', 'sony wh-1000xm5')).toBe(false);
    expect(isRelevantResult('Bluetooth Speaker Waterproof Portable', 'airpods 4 with active noise cancellation')).toBe(false);
  });

  it('does not treat a size or an ordinal as a model number', () => {
    // "16oz" and "4th" are not model numbers: a title must still share words.
    expect(isRelevantResult('Insulated Water Bottle 16oz', 'cerave moisturizing cream 16oz')).toBe(false);
  });
});

describe('performLiveSearch', () => {
  const calls: string[] = [];

  beforeEach(() => {
    calls.length = 0;
    (globalThis as { __pickSearchCache?: Map<string, unknown> }).__pickSearchCache?.clear();
    vi.stubEnv('SERPER_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        calls.push(url);
        const item = (source: string, price: string) => ({
          title: 'CeraVe Moisturizing Cream with Pump',
          source,
          price,
          link: 'https://www.google.com/search?ibp=oshop&q=cerave',
          imageUrl: '',
        });
        return new Response(
          JSON.stringify({
            shopping: [item('Walmart', '$17.97'), item('T.J.Maxx', '$12.99'), item('Walmart', '$17.97')],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('keeps two stores that share a title and drops only exact repeats', async () => {
    const data = await performLiveSearch('cerave moisturizing cream');
    const offers = data.results.map((p) => `${p.retailer} ${p.price}`).sort();
    expect(offers).toEqual(['T.J.Maxx 12.99', 'Walmart 17.97']);
  });

  it('asks Google Shopping only: no request goes to a retailer site', async () => {
    await performLiveSearch('cerave moisturizing cream');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe('https://google.serper.dev/shopping');
  });
});
