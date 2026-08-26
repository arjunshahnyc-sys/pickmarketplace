// Tier 2: LLM-assisted classification, behind an interface.
//
// DECISION (owner, 2026-08-26): ship the interface and cache now, wire a
// real model later. StubLlmClassifier returns null for everything, so
// unmapped products stay honestly unclassified instead of speculatively
// coded. When a real classifier lands it plugs in here; nothing upstream
// changes.
//
// Whatever the implementation claims, its results are NEVER trusted above
// 'estimated': the resolver caps them (see index.ts). Reasoning is stored
// with the result so a human reviewing a classification can see why.

import { productFingerprint } from './fingerprint';

export interface LlmClassification {
  hsCode: string;
  /** The model's own confidence; capped to 'estimated' downstream. */
  confidence: 'exact' | 'estimated';
  reasoning: string;
}

export interface LlmClassifier {
  readonly id: string;
  classify(input: { name: string; brand?: string; categoryId?: string }): Promise<LlmClassification | null>;
}

export class StubLlmClassifier implements LlmClassifier {
  readonly id = 'llm:stub';
  async classify(): Promise<LlmClassification | null> {
    return null;
  }
}

/**
 * Cache wrapper keyed by product fingerprint: the same product is never
 * classified twice in a process, and negative results are cached too (an
 * unclassifiable product should not retry on every search).
 */
export function cachedClassifier(
  inner: LlmClassifier,
  cache: Map<string, LlmClassification | null> = new Map()
): LlmClassifier & { cache: Map<string, LlmClassification | null> } {
  return {
    id: inner.id,
    cache,
    async classify(input) {
      const key = productFingerprint(input);
      if (cache.has(key)) return cache.get(key) ?? null;
      const result = await inner.classify(input);
      cache.set(key, result);
      return result;
    },
  };
}
