import { describe, expect, it } from 'vitest';
import { calculateLandedCost } from '../calculate';
import { getMerchantConfig, merchantInputFor, type MerchantConfig } from '../merchants';
import { baseInput, ctxFor, FOBLAND } from './fixtures';

describe('merchant config lookup', () => {
  it('recognizes configured US storefronts under name variants', () => {
    for (const name of ['Target', 'Best Buy', 'The Home Depot', "Macy's", 'Walmart.com']) {
      const config = getMerchantConfig(name);
      expect(config.country, name).toBe('US');
      expect(config.confidence, name).toBe('estimated');
    }
  });

  it('every configured merchant defaults to unknown incoterm until verified', () => {
    // No incoterm has been verified for any merchant; a DDP or DAP value in
    // the table must come with a note and a deliberate edit.
    for (const name of ['Amazon', 'Target', 'Nike']) {
      expect(getMerchantConfig(name).incoterm).toBe('unknown');
    }
  });

  it('harvested US chains are recognized (the "unknown seller" coverage fix)', () => {
    for (const name of ['Academy Sports + Outdoors', 'Golf Galaxy', 'Stanley 1913', 'Ulta Beauty']) {
      expect(getMerchantConfig(name).country, name).toBe('US');
    }
  });

  it('unrecognized merchants get no country and unknown everything', () => {
    const config = getMerchantConfig('Random Storefront 123');
    expect(config.country).toBeUndefined();
    expect(config.incoterm).toBe('unknown');
    expect(config.confidence).toBe('unknown');
  });

  it('does not let lookalike names inherit a real merchant config', () => {
    // Same guarantee retailerTrust makes for badges: exact collapsed match.
    expect(getMerchantConfig('Walmart - SaveMore Deals').country).toBeUndefined();
    expect(getMerchantConfig('Pineapple Boutique').country).toBeUndefined();
  });
});

describe('merchant config drives the breakdown', () => {
  it('a DDP-configured merchant produces prepaid import lines end to end', () => {
    const ddp: MerchantConfig = {
      country: 'US',
      incoterm: 'DDP',
      confidence: 'estimated',
      notes: 'test',
    };
    const input = baseInput();
    input.merchant = {
      id: 'ddp-test',
      country: ddp.country,
      incoterm: ddp.incoterm,
      configConfidence: ddp.confidence,
    };
    const out = calculateLandedCost(input, ctxFor(FOBLAND));
    const duty = out.lines.find((l) => l.kind === 'duty')!;
    expect(duty.amountMinor).toBe(0);
    expect(duty.label).toContain('prepaid');
    // Config is only estimated, so nothing here may claim exactness.
    expect(duty.confidence).toBe('estimated');
    expect(out.totalRange).toBeUndefined();
  });

  it('merchantInputFor shapes an unknown-incoterm merchant into a range result', () => {
    const input = baseInput();
    input.merchant = merchantInputFor('Amazon');
    const out = calculateLandedCost(input, ctxFor(FOBLAND));
    expect(input.merchant.id).toBe('amazon');
    expect(out.lane).toBe('cross-border'); // FOBLAND destination, US merchant
    expect(out.totalRange).toBeDefined();
    expect(out.totalRange!.lowMinor).toBeLessThan(out.totalRange!.highMinor);
  });

  it('merchantInputFor for an unrecognized merchant yields the unknown lane', () => {
    const input = baseInput();
    input.merchant = merchantInputFor('Mystery Shop');
    const out = calculateLandedCost(input, ctxFor(FOBLAND));
    expect(out.lane).toBe('unknown');
    expect(out.unknownComponents).toContain('duty');
  });
});
