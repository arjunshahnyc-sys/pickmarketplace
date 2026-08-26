// Golden-file tests: snapshot the ENTIRE breakdown (lines, provenance,
// confidence, assumptions, warnings), not just the total, for each scenario
// the brief names. A change to any displayed number, label, or caveat shows
// up as a snapshot diff for review.

import { describe, expect, it } from 'vitest';
import { calculateLandedCost } from '../calculate';
import { baseInput, CIFLAND, ctxFor, FOBLAND } from './fixtures';

describe('golden breakdowns', () => {
  it('domestic: no import cost path', () => {
    const out = calculateLandedCost(
      baseInput({ merchantCountry: 'US', destCountry: 'US', shipping: null }),
      ctxFor(null)
    );
    expect(out).toMatchSnapshot();
  });

  it('low-value cross-border: under both thresholds', () => {
    expect(
      calculateLandedCost(baseInput({ priceMinor: 4_000 }), ctxFor(FOBLAND))
    ).toMatchSnapshot();
  });

  it('high-value cross-border: duty, tax on duty-inclusive base, fees', () => {
    expect(
      calculateLandedCost(
        baseInput({
          priceMinor: 20_000,
          hs: { code: '640411', confidence: 'estimated', sourceId: 'category-map:shoes' },
        }),
        ctxFor(FOBLAND)
      )
    ).toMatchSnapshot();
  });

  it('tax threshold differs from duty threshold: relieved duty, charged tax', () => {
    expect(
      calculateLandedCost(baseInput({ priceMinor: 8_000 }), ctxFor(FOBLAND))
    ).toMatchSnapshot();
  });

  it('intra-EU: no duty or import VAT', () => {
    expect(
      calculateLandedCost(
        baseInput({ merchantCountry: 'DE', destCountry: 'FR' }),
        ctxFor(null)
      )
    ).toMatchSnapshot();
  });

  it('unknown-HS fallback: default duty rate with warning', () => {
    expect(calculateLandedCost(baseInput(), ctxFor(FOBLAND))).toMatchSnapshot();
  });

  it('DDP merchant: import charges prepaid, decidable without rules data', () => {
    expect(
      calculateLandedCost(
        baseInput({ incoterm: 'DDP', destCountry: 'CF' }),
        ctxFor(CIFLAND)
      )
    ).toMatchSnapshot();
  });

  it('unknown incoterm: DAP lines with a DDP-to-DAP total range', () => {
    expect(
      calculateLandedCost(baseInput({ incoterm: 'unknown' }), ctxFor(FOBLAND))
    ).toMatchSnapshot();
  });
});
