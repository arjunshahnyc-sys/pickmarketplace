// Tier 0: human override table. Corrections made here stick permanently
// (the file is checked into git, so every fix is reviewed and dated) and
// beat every automatic tier.
//
// Two keyspaces:
//   - byFingerprint: one specific product (see fingerprint.ts). Strongest.
//   - byCategory: every product in a category. Useful when a curated-map
//     entry proves wrong for this marketplace's actual feed.
//
// confidence may be 'exact' ONLY when the code comes from a binding ruling
// or equivalent authority; a human's best judgment is 'estimated'.

export interface HsOverride {
  hsCode: string;
  confidence: 'exact' | 'estimated';
  /** Who decided and on what basis; required so future readers can judge it. */
  notes: string;
  date: string; // ISO date the override was recorded
}

export const OVERRIDES_BY_FINGERPRINT: Record<string, HsOverride> = {
  // Example (remove when the first real override lands):
  // 'a1b2c3d4': {
  //   hsCode: '640411',
  //   confidence: 'estimated',
  //   notes: 'Arjun 2026-09-01: sports footwear with textile upper per listing photos.',
  //   date: '2026-09-01',
  // },
};

export const OVERRIDES_BY_CATEGORY: Record<string, HsOverride> = {};

export interface OverrideTables {
  byFingerprint: Record<string, HsOverride>;
  byCategory: Record<string, HsOverride>;
}

export function overrideFor(
  fingerprint: string,
  categoryId?: string,
  tables: OverrideTables = {
    byFingerprint: OVERRIDES_BY_FINGERPRINT,
    byCategory: OVERRIDES_BY_CATEGORY,
  }
): { override: HsOverride; sourceId: string } | null {
  const byProduct = tables.byFingerprint[fingerprint];
  if (byProduct) return { override: byProduct, sourceId: `override:product:${fingerprint}` };
  if (categoryId) {
    const byCategory = tables.byCategory[categoryId];
    if (byCategory) return { override: byCategory, sourceId: `override:category:${categoryId}` };
  }
  return null;
}
