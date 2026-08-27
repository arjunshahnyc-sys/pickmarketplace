import { describe, expect, it } from 'vitest';
import { productFingerprint } from '../classify/fingerprint';
import { overrideFor } from '../classify/overrides';
import { curatedCategoryCount, curatedHeadingFor } from '../classify/categoryToHs';
import { resolveHsCode, resolveHsCodeSync } from '../classify';
import {
  cachedClassifier,
  StubLlmClassifier,
  type LlmClassifier,
} from '../classify/llmClassifier';

describe('productFingerprint', () => {
  it('survives cosmetic feed differences', () => {
    const a = productFingerprint({ name: 'Sony WH-1000XM5 Headphones', brand: 'Sony' });
    const b = productFingerprint({ name: 'sony wh 1000xm5   headphones!', brand: 'SONY' });
    expect(a).toBe(b);
  });

  it('distinguishes different products and different categories', () => {
    const base = { name: 'Wireless Mouse', brand: 'Logitech' };
    expect(productFingerprint(base)).not.toBe(
      productFingerprint({ ...base, name: 'Wireless Keyboard' })
    );
    expect(productFingerprint(base)).not.toBe(
      productFingerprint({ ...base, categoryId: 'gaming-mice' })
    );
  });
});

describe('curated category map', () => {
  it('covers roughly twenty categories and normalizes lookups', () => {
    expect(curatedCategoryCount()).toBeGreaterThanOrEqual(20);
    expect(curatedHeadingFor('headphones')?.heading).toBe('8518');
    expect(curatedHeadingFor('Coffee-Makers')?.heading).toBe('8516');
    expect(curatedHeadingFor('gaming-mice')?.heading).toBe('8471');
  });

  it('splits monitors from TVs at the subheading level (rates diverge hard)', () => {
    expect(curatedHeadingFor('monitors')?.heading).toBe('852852');
    expect(curatedHeadingFor('tvs')?.heading).toBe('852872');
  });

  it('refuses to map deliberately ambiguous retail buckets', () => {
    expect(curatedHeadingFor('Electronics')).toBeNull();
    expect(curatedHeadingFor('Clothing')).toBeNull();
    expect(curatedHeadingFor('Other')).toBeNull();
  });
});

describe('override table', () => {
  const shoe = { name: 'Test Shoe', categoryId: 'shoes' };
  const fp = productFingerprint(shoe);
  const productOverride = {
    hsCode: '640411',
    confidence: 'estimated' as const,
    notes: 'test',
    date: '2026-08-26',
  };
  const categoryOverride = {
    hsCode: '640399',
    confidence: 'exact' as const,
    notes: 'test',
    date: '2026-08-26',
  };

  it('product override beats category override', () => {
    const hit = overrideFor(fp, 'shoes', {
      byFingerprint: { [fp]: productOverride },
      byCategory: { shoes: categoryOverride },
    });
    expect(hit?.override.hsCode).toBe('640411');
    expect(hit?.sourceId).toBe(`override:product:${fp}`);
  });

  it('falls back to category override, then to nothing', () => {
    const hit = overrideFor(fp, 'shoes', {
      byFingerprint: {},
      byCategory: { shoes: categoryOverride },
    });
    expect(hit?.override.hsCode).toBe('640399');
    expect(overrideFor(fp, 'shoes', { byFingerprint: {}, byCategory: {} })).toBeNull();
  });

  it('the live tables start empty (corrections are added per real product)', () => {
    expect(overrideFor(fp, 'shoes')).toBeNull();
  });
});

describe('resolver tiers', () => {
  it('curated map resolves as estimated with category-map provenance', () => {
    const r = resolveHsCodeSync({ name: 'Some Shoes', categoryId: 'shoes' });
    expect(r).toEqual({
      code: '6404',
      confidence: 'estimated',
      sourceId: 'category-map:shoes',
    });
  });

  it('unmapped category with the stub classifier resolves to null, never a guess', async () => {
    const r = await resolveHsCode({ name: 'Mystery Gadget', categoryId: 'Electronics' });
    expect(r).toBeNull();
  });

  it('LLM results are capped at estimated even when the model claims exact', async () => {
    const overconfident: LlmClassifier = {
      id: 'llm:test',
      async classify() {
        return { hsCode: '851713', confidence: 'exact', reasoning: 'trust me' };
      },
    };
    const r = await resolveHsCode({ name: 'Mystery Gadget' }, overconfident);
    expect(r).toEqual({ code: '851713', confidence: 'estimated', sourceId: 'llm:llm:test' });
  });

  it('caches by fingerprint, including negative results', async () => {
    let calls = 0;
    const counting: LlmClassifier = {
      id: 'llm:counting',
      async classify(input) {
        calls++;
        return input.name.includes('classifiable')
          ? { hsCode: '950300', confidence: 'estimated', reasoning: 'toy-like' }
          : null;
      },
    };
    const cached = cachedClassifier(counting);
    await cached.classify({ name: 'classifiable widget' });
    await cached.classify({ name: 'CLASSIFIABLE widget!' }); // same fingerprint
    expect(calls).toBe(1);
    await cached.classify({ name: 'unclassifiable thing' });
    await cached.classify({ name: 'unclassifiable thing' });
    expect(calls).toBe(2); // negative result cached too
  });

  it('the stub classifier classifies nothing', async () => {
    expect(await new StubLlmClassifier().classify()).toBeNull();
  });
});
