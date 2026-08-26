// Property test over randomized inputs with a SEEDED generator: failures
// reproduce exactly. Checks the structural invariants the UI and ranking
// rely on, for every lane/incoterm/data-availability combination.

import { describe, expect, it } from 'vitest';
import { calculateLandedCost } from '../calculate';
import type { LandedCostInput } from '../types';
import { CIFLAND, ctxFor, FOBLAND } from './fixtures';

// mulberry32: tiny deterministic PRNG, plenty for input shuffling.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, xs: readonly T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

function randomInput(r: () => number): { input: LandedCostInput; rulesKey: 'FB' | 'CF' } {
  const rulesKey = pick(r, ['FB', 'CF'] as const);
  const destCountry = pick(r, [rulesKey, 'US', 'FR'] as const);
  const merchantCountry = pick(r, ['US', 'DE', undefined] as const);
  const withShipping = r() < 0.5;
  const input: LandedCostInput = {
    item: {
      priceMinor: 100 + Math.floor(r() * 500_000),
      // GBP -> USD has no fixture quote on purpose: exercises unknown item.
      currency: r() < 0.15 ? 'GBP' : 'USD',
      hs:
        r() < 0.4
          ? { code: pick(r, ['640411', '850000', '999999']), confidence: 'estimated', sourceId: 'test' }
          : undefined,
    },
    merchant: {
      id: 'prop-merchant',
      country: merchantCountry,
      incoterm: pick(r, ['DAP', 'DDP', 'unknown'] as const),
      configConfidence: pick(r, ['exact', 'estimated'] as const),
    },
    shipping: withShipping
      ? { costMinor: Math.floor(r() * 10_000), currency: 'USD', carrier: r() < 0.5 ? 'TestPost' : undefined }
      : undefined,
    destination: { country: destCountry, currency: 'USD' },
  };
  return { input, rulesKey };
}

describe('calculateLandedCost properties', () => {
  it('holds structural invariants across 500 randomized inputs', () => {
    const r = rng(20260826);
    for (let i = 0; i < 500; i++) {
      const { input, rulesKey } = randomInput(r);
      const ctx = ctxFor(input.destination.country === rulesKey ? (rulesKey === 'FB' ? FOBLAND : CIFLAND) : null);
      const out = calculateLandedCost(input, ctx);

      // Exactly one line per kind, always all five kinds.
      expect(out.lines.map((l) => l.kind).sort()).toEqual(
        ['duty', 'fee', 'item', 'shipping', 'tax'].sort()
      );

      // The property from the brief: total always equals the sum of lines.
      const sum = out.lines.reduce((acc, l) => acc + (l.amountMinor ?? 0), 0);
      expect(out.totalMinor).toBe(sum);

      // Amounts are non-negative safe integers; no floats ever escape.
      for (const l of out.lines) {
        if (l.amountMinor !== null) {
          expect(Number.isSafeInteger(l.amountMinor)).toBe(true);
          expect(l.amountMinor).toBeGreaterThanOrEqual(0);
        }
      }

      // Unknown confidence exactly when a component is unknown.
      expect(out.confidence === 'unknown').toBe(out.unknownComponents.length > 0);

      // Range invariants: low <= high, high is the displayed (DAP) total.
      if (out.totalRange) {
        expect(out.totalRange.lowMinor).toBeLessThanOrEqual(out.totalRange.highMinor);
        expect(out.totalRange.highMinor).toBe(out.totalMinor);
      }

      // Determinism: same input, same context, byte-identical output.
      expect(calculateLandedCost(input, ctx)).toEqual(out);
    }
  });
});
