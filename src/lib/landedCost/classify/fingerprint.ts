// Stable product fingerprint for classification caching and overrides.
//
// The fingerprint must survive cosmetic feed differences (case, punctuation,
// word order does NOT survive by design: different order usually means a
// different listing) so that a correction made once keeps applying to the
// same product next search.

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// FNV-1a 32-bit: tiny, dependency-free, stable across runtimes.
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface FingerprintInput {
  name: string;
  brand?: string;
  categoryId?: string;
}

export function productFingerprint(p: FingerprintInput): string {
  const key = [normalize(p.name), normalize(p.brand ?? ''), normalize(p.categoryId ?? '')].join('|');
  return fnv1a(key);
}
