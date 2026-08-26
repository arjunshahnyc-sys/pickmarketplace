// HS classification resolver. Tier order, first hit wins:
//
//   0. Human override (per product, then per category) — the only tier that
//      may ever be 'exact', and only when backed by a ruling.
//   1. Curated category -> heading map — 'estimated' at best.
//   2. LLM classifier (cached by product fingerprint) — 'estimated' at
//      best, whatever the model claims.
//
// The resolved code is returned WITH its confidence and sourceId, shaped
// exactly for LandedCostInput.item.hs, so provenance survives all the way
// into the duty line a shopper sees. No resolution = null: the calculator
// then falls back to the destination's default duty row or reports duty as
// unknown. Nothing is ever silently coded.

import { combineConfidence, type Confidence } from '../types';
import { curatedHeadingFor } from './categoryToHs';
import { productFingerprint, type FingerprintInput } from './fingerprint';
import { overrideFor } from './overrides';
import { StubLlmClassifier, cachedClassifier, type LlmClassifier } from './llmClassifier';

export interface HsResolution {
  code: string;
  confidence: Confidence;
  sourceId: string;
}

/**
 * Synchronous tiers only (overrides + curated map). This is what the UI
 * enrichment path uses today: with the LLM tier stubbed, the async resolver
 * adds nothing for interactive use.
 */
export function resolveHsCodeSync(product: FingerprintInput): HsResolution | null {
  const fp = productFingerprint(product);
  const hit = overrideFor(fp, product.categoryId);
  if (hit) {
    return {
      code: hit.override.hsCode,
      confidence: hit.override.confidence,
      sourceId: hit.sourceId,
    };
  }
  if (product.categoryId) {
    const curated = curatedHeadingFor(product.categoryId);
    if (curated) {
      return {
        code: curated.heading,
        confidence: 'estimated',
        sourceId: `category-map:${product.categoryId}`,
      };
    }
  }
  return null;
}

const defaultClassifier = cachedClassifier(new StubLlmClassifier());

/** Full resolver including the (currently stubbed) LLM tier. */
export async function resolveHsCode(
  product: FingerprintInput,
  classifier: LlmClassifier = defaultClassifier
): Promise<HsResolution | null> {
  const sync = resolveHsCodeSync(product);
  if (sync) return sync;

  const llm = await classifier.classify(product);
  if (llm) {
    return {
      code: llm.hsCode,
      // The cap: an LLM result is never trusted above 'estimated'.
      confidence: combineConfidence(llm.confidence, 'estimated'),
      sourceId: `llm:${classifier.id}`,
    };
  }
  return null;
}
