import { describe, expect, it } from 'vitest';
import { parseEcbDailyXml, usdCrossPairsMicros } from '../ecb';
import { convertMinor, TableFxProvider } from '../fx';
import { withLandedCosts } from '../enrich';
import type { Product } from '../../types';

// Fixture in the exact eurofxref-daily.xml shape; FIXTURE RATES, not market data.
const FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <Cube>
    <Cube time='2026-08-25'>
      <Cube currency='USD' rate='1.0800'/>
      <Cube currency='GBP' rate='0.8532'/>
      <Cube currency='JPY' rate='158.76'/>
      <Cube currency='CAD' rate='1.4580'/>
      <Cube currency='AUD' rate='1.6200'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`;

describe('parseEcbDailyXml', () => {
  it('extracts the date and integer-micro rates', () => {
    const table = parseEcbDailyXml(FIXTURE_XML)!;
    expect(table.asOf).toBe('2026-08-25');
    expect(table.eurMicros).toEqual({
      USD: 1_080_000,
      GBP: 853_200,
      JPY: 158_760_000,
      CAD: 1_458_000,
      AUD: 1_620_000,
    });
  });

  it('returns null for documents that do not look like the ECB format', () => {
    expect(parseEcbDailyXml('<html>maintenance page</html>')).toBeNull();
    expect(parseEcbDailyXml('')).toBeNull();
  });
});

describe('usdCrossPairsMicros', () => {
  const table = parseEcbDailyXml(FIXTURE_XML)!;

  it('computes USD-based cross rates exactly, EUR included', () => {
    const pairs = usdCrossPairsMicros(table, ['GBP', 'EUR', 'JPY', 'CAD', 'AUD'])!;
    // USD->GBP = 0.8532 / 1.08 = 0.79 exactly with these fixture rates
    expect(pairs['USD:GBP']).toBe(790_000);
    // USD->EUR = 1 / 1.08
    expect(pairs['USD:EUR']).toBe(925_926);
    // USD->JPY = 158.76 / 1.08 = 147.0
    expect(pairs['USD:JPY']).toBe(147_000_000);
    expect(pairs['USD:CAD']).toBe(1_350_000);
    expect(pairs['USD:AUD']).toBe(1_500_000);
  });

  it('omits unlisted targets and refuses everything without EUR->USD', () => {
    const pairs = usdCrossPairsMicros(table, ['GBP', 'CHF'])!;
    expect(pairs['USD:CHF']).toBeUndefined();
    expect(usdCrossPairsMicros({ asOf: table.asOf, eurMicros: { GBP: 853_200 } }, ['GBP'])).toBeNull();
  });
});

describe('TableFxProvider', () => {
  const table = parseEcbDailyXml(FIXTURE_XML)!;
  const pairs = usdCrossPairsMicros(table, ['GBP', 'EUR', 'JPY', 'CAD', 'AUD'])!;
  const snapshot = { pairsMicros: pairs, asOf: table.asOf, spreadBps: 150, sourceId: 'fx:ecb' };

  it('quotes known pairs with the stated spread, estimated confidence', () => {
    const provider = new TableFxProvider(snapshot, new Date('2026-08-26T00:00:00Z'));
    const conv = convertMinor(10_000, 'USD', 'GBP', provider)!;
    // $100.00 x 0.79 x 1.015 = 80.185 -> 8019 pence
    expect(conv.amountMinor).toBe(8_019);
    expect(conv.confidence).toBe('estimated');
    expect(conv.assumption).toContain('1.50% conversion spread');
    expect(conv.assumption).toContain('2026-08-25');
  });

  it('has no quote for unknown pairs', () => {
    const provider = new TableFxProvider(snapshot, new Date('2026-08-26T00:00:00Z'));
    expect(provider.getQuote('USD', 'CHF')).toBeNull();
    expect(provider.getQuote('GBP', 'USD')).toBeNull(); // only USD-based pairs served
  });

  it('the staleness cap silences ALL quotes rather than serving old rates', () => {
    const fresh = new TableFxProvider(snapshot, new Date('2026-08-28T00:00:00Z')); // 3 days: fine (weekend gap)
    expect(fresh.getQuote('USD', 'GBP')).not.toBeNull();
    const stale = new TableFxProvider(snapshot, new Date('2026-09-05T00:00:00Z')); // 11 days
    expect(stale.getQuote('USD', 'GBP')).toBeNull();
  });
});

describe('end to end: ECB snapshot rates drive real cross-border estimates', () => {
  it('a GB shopper sees a computed subtotal through the table provider', () => {
    const table = parseEcbDailyXml(FIXTURE_XML)!;
    const pairs = usdCrossPairsMicros(table, ['GBP'])!;
    const provider = new TableFxProvider(
      { pairsMicros: pairs, asOf: table.asOf, spreadBps: 0, sourceId: 'fx:ecb' },
      new Date('2026-08-26T00:00:00Z')
    );
    const product: Product = {
      id: 'p1',
      name: 'Test Headphones',
      price: 100,
      image: '',
      retailer: 'Target',
      category: 'headphones',
      url: 'https://example.test/p1',
    };
    const [enriched] = withLandedCosts(
      [product],
      { country: 'GB', currency: 'GBP' },
      new Date('2026-08-27T00:00:00Z'),
      provider
    );
    const b = enriched.landedCost!;
    // GBP 79.00 intrinsic (under the 135 threshold -> duty relieved, VAT
    // merchant-collects, fee waived) plus the estimated FCPIS 2 lb shipping
    // for 700 g headphones: $35.70 -> 28.20 GBP. Nothing unknown remains.
    expect(b.lines.find((l) => l.kind === 'shipping')!.amountMinor).toBe(2_820);
    expect(b.totalMinor).toBe(7_900 + 2_820);
    expect(b.unknownComponents).toEqual([]);
  });
});
