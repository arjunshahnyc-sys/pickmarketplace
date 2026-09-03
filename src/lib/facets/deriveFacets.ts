// Result-set facets: the filter chips are derived from what the search
// actually returned, never from rewrites of the query string, and clicking
// one filters the current results in place (no new paid search).
//
// Four groups, each shown only when it can actually narrow the set:
//   type   a shopper-facing product type from the name (taxonomy.ts)
//   line   a model or series code that recurs across names ("Pro V1", "T100")
//   feature a descriptive phrase that recurs ("Noise Cancelling", "Over Ear")
//   brand  the feed's brand, only when it is a real brand word in the
//          name and not the store (scrapers.ts guessBrand falls back to
//          the retailer, and matches "GE" inside "LINKSLEGEND")
//   store  the retailer
//
// Runs once server-side in performLiveSearch so the JSON API, the cache,
// and the ISR category page share one computation; the pure helpers below
// also do the client-side filtering and counting. Pure, DOM-free, tested.

import { collapse } from '../trust/identity';
import type { Product, ProductAttributes } from '../types';
import { productTypeFor, TYPE_WORDS } from './taxonomy';

export type FacetKey = 'type' | 'line' | 'feature' | 'brand' | 'store';

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface FacetGroup {
  key: FacetKey;
  label: string;
  values: FacetValue[];
}

export type SelectedFacets = Partial<Record<FacetKey, string[]>>;

const GROUP_LABELS: Record<FacetKey, string> = {
  type: 'Type',
  line: 'Series',
  feature: 'Features',
  brand: 'Brand',
  store: 'Store',
};

const MAX_VALUES = 6;
const LABEL_MAX = 32;

// Words that recur in almost any two names and say nothing about the
// product. Kept in sync in spirit with productGrouping's GENERIC_NAME_WORDS.
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'of', 'in', 'on', 'by', 'to', 'from', 'or', 'a', 'an',
  'new', 'set', 'pack', 'official', 'genuine', 'original', 'authentic', 'edition',
  'men', 'mens', "men's", 'women', 'womens', "women's", 'kids', 'unisex', 'adult',
  'black', 'white', 'blue', 'red', 'grey', 'gray', 'green', 'pink', 'silver', 'gold',
  'size', 'sizes', 'color', 'colors', 'style', 'large', 'small', 'medium', 'xl',
  'left', 'right', 'hand', 'handed', 'rh', 'lh', 'inch', 'inches', 'oz', 'ml', 'ct',
  'pcs', 'piece', 'pieces', 'bundle', 'kit', 'free', 'shipping', 'sale', 'deal',
  'wireless', 'bluetooth', 'portable', 'premium',
]);

/** The query minus price and quality modifiers, as scrapers.ts strips them. */
function coreQueryTokens(query: string): Set<string> {
  const stripped = query
    .toLowerCase()
    .replace(/\b(?:under|over|below|above|around)\s*\$?\d+(?:\.\d+)?\b/g, ' ')
    .replace(/\$\d+(?:\.\d+)?/g, ' ')
    .replace(/\b(?:cheap|cheapest|best rated|top rated|on sale|deals?|discount(?:ed)?|for students?)\b/g, ' ');
  const out = new Set<string>();
  for (const t of stripped.split(/[^a-z0-9]+/).filter((w) => w.length > 1)) {
    out.add(t);
    // singular / plural variants so "balls" also excludes "ball"
    if (t.endsWith('s')) out.add(t.slice(0, -1));
    else out.add(`${t}s`);
  }
  return out;
}

/** Name tokens in order, keeping short alphanumerics ("V1") and hyphens. */
function tokenize(name: string): string[] {
  return name
    .split(/[\s,/|()[\]]+/)
    .map((t) => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+]+$/g, ''))
    .filter((t) => t.length >= 2);
}

const YEAR = /^(?:19|20)\d{2}$/;

/**
 * A token that reads as a model or series code: "V1", "T100", "SM11",
 * "WH-1000XM5", or a short all-caps word ("AVX", "ANC"). Digits alone
 * ("5.4", "360", years) are specs, not series, and two-letter caps ("DJ")
 * are too ambiguous to be a chip.
 */
function isCodeToken(t: string): boolean {
  if (YEAR.test(t)) return false;
  if (/\d/.test(t)) return t.length <= 12 && /[A-Za-z]/.test(t) && /^[A-Za-z0-9+.-]+$/.test(t);
  return /^[A-Z]{3,5}$/.test(t);
}

function isCapitalized(t: string): boolean {
  return /^[A-Z][a-z]+$/.test(t);
}

/** Clip a feed-derived label; it is untrusted text and renders as a text node. */
function clip(label: string): string {
  return label.length > LABEL_MAX ? `${label.slice(0, LABEL_MAX - 1).trimEnd()}…` : label;
}

interface Candidate {
  kind: 'line' | 'feature';
  keys: string[]; // lowercased tokens
  label: string;
}

/**
 * Series codes: a code token on its own ("T100", "AVX") or a code beside a
 * word ("Pro V1", "Vokey SM11"). Features: a maximal run of two to four
 * capitalized words ("Noise Cancelling", "Open Back Planar Magnetic"),
 * counted whole so fragments like "Active Noise" never surface. Query,
 * store, brand, stop and type words break runs and are never candidates.
 */
function lineCandidates(name: string, exclude: Set<string>): Candidate[] {
  const tokens = tokenize(name);
  const usable = tokens.map((t) => {
    const low = t.toLowerCase();
    return { t, low, ok: !exclude.has(low) && !STOP_WORDS.has(low) && !TYPE_WORDS.has(low) };
  });
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (kind: Candidate['kind'], keys: string[], label: string) => {
    const k = `${kind}:${keys.join(' ')}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ kind, keys, label });
  };
  for (let i = 0; i < usable.length; i++) {
    const a = usable[i];
    if (!a.ok) continue;
    if (isCodeToken(a.t)) push('line', [a.low], a.t);
    const b = usable[i + 1];
    if (b && b.ok && (isCodeToken(a.t) || isCodeToken(b.t)) && !(isCodeToken(a.t) && isCodeToken(b.t))) {
      push('line', [a.low, b.low], `${a.t} ${b.t}`);
    }
  }
  // Capitalized runs: every 2- to 4-word phrase inside a run is a
  // candidate ("Sony Active Noise Cancelling" yields "Active Noise
  // Cancelling", "Noise Cancelling", ...); keep() then drops any phrase
  // that only ever appears inside a longer kept phrase, so the chips are
  // the longest phrases that actually recur.
  let i = 0;
  while (i < usable.length) {
    if (!usable[i].ok || !isCapitalized(usable[i].t)) {
      i++;
      continue;
    }
    let j = i;
    while (j < usable.length && usable[j].ok && isCapitalized(usable[j].t)) j++;
    const run = usable.slice(i, j);
    for (let len = 2; len <= Math.min(4, run.length); len++) {
      for (let k = 0; k + len <= run.length; k++) {
        const part = run.slice(k, k + len);
        push('feature', part.map((u) => u.low), part.map((u) => u.t).join(' '));
      }
    }
    i = j;
  }
  return out;
}

/** The feed brand, only when it is a whole word of the name and not the store. */
function brandFor(product: Product, exclude: Set<string>): string | undefined {
  const brand = product.brand?.trim();
  if (!brand) return undefined;
  if (collapse(brand) === collapse(product.retailer)) return undefined;
  if (exclude.has(brand.toLowerCase())) return undefined;
  const word = new RegExp(`(^|[^A-Za-z0-9])${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z0-9])`, 'i');
  return word.test(product.name) ? brand : undefined;
}

export interface DerivedFacets<T extends Product> {
  /** The same products, in the same order, with `attributes` attached. */
  products: T[];
  facets: FacetGroup[];
}

export function deriveFacets<T extends Product>(products: T[], query: string): DerivedFacets<T> {
  if (products.length === 0) return { products, facets: [] };
  const exclude = coreQueryTokens(query);

  // Per-product attributes plus the line candidates (kept aside; only the
  // recurring ones become attributes).
  const perProduct = products.map((p) => {
    const retailerTokens = new Set(collapse(p.retailer).split(/\s+/));
    const lineExclude = new Set([...exclude, ...retailerTokens]);
    const brand = brandFor(p, exclude);
    if (brand) lineExclude.add(brand.toLowerCase());
    return {
      type: productTypeFor(p.name, query, p.category),
      brand,
      candidates: lineCandidates(p.name, lineExclude),
    };
  });

  // Count candidates across products (each product counts once per key),
  // keep the ones that recur but do not cover nearly everything.
  const ceiling = Math.max(2, Math.floor(products.length * 0.8));
  const keep = (kind: Candidate['kind']) => {
    const count = new Map<string, { label: string; count: number; keys: string[] }>();
    perProduct.forEach(({ candidates }) => {
      for (const c of candidates) {
        if (c.kind !== kind) continue;
        const k = c.keys.join(' ');
        const entry = count.get(k) ?? { label: c.label, count: 0, keys: c.keys };
        entry.count += 1;
        count.set(k, entry);
      }
    });
    let kept = [...count.entries()]
      .map(([k, v]) => ({ key: k, ...v }))
      .filter((v) => v.count >= 2 && v.count <= ceiling);
    // A phrase that only ever appears inside a longer kept phrase is the
    // same chip twice: keep "Pro V1", drop "V1"; keep "Active Noise
    // Cancelling", drop "Active Noise".
    const contains = (outer: string[], inner: string[]) =>
      outer.length > inner.length &&
      outer.some((_, i) => inner.every((k, j) => outer[i + j] === k));
    kept = kept.filter(
      (v) => !kept.some((w) => contains(w.keys, v.keys) && w.count >= v.count)
    );
    kept.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    return new Map(kept.slice(0, MAX_VALUES).map((v) => [v.key, v]));
  };
  const keptLines = keep('line');
  const keptFeatures = keep('feature');

  const withAttributes = products.map((p, i) => {
    const info = perProduct[i];
    const attributes: ProductAttributes = {};
    if (info.type) attributes.type = info.type;
    if (info.brand) attributes.brand = info.brand;
    const productLines = info.candidates
      .filter((c) => c.kind === 'line' && keptLines.has(c.keys.join(' ')))
      .map((c) => keptLines.get(c.keys.join(' '))!.label);
    if (productLines.length > 0) attributes.lines = productLines;
    const productFeatures = info.candidates
      .filter((c) => c.kind === 'feature' && keptFeatures.has(c.keys.join(' ')))
      .map((c) => keptFeatures.get(c.keys.join(' '))!.label);
    if (productFeatures.length > 0) attributes.features = productFeatures;
    return { ...p, attributes };
  });

  const facets: FacetGroup[] = [];
  const countBy = (pick: (p: T & { attributes: ProductAttributes }) => string | undefined) => {
    const m = new Map<string, number>();
    for (const p of withAttributes) {
      const v = pick(p);
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([value, count]) => ({ value, label: clip(value), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };

  const types = countBy((p) => p.attributes.type);
  if (types.length >= 2) facets.push({ key: 'type', label: GROUP_LABELS.type, values: types.slice(0, MAX_VALUES) });

  // A single series or feature chip still narrows (the 80% ceiling
  // guarantees it), so one value is enough here; type, brand and store
  // need two values to be useful.
  const lineValues = [...keptLines.values()].map((v) => ({ value: v.label, label: clip(v.label), count: v.count }));
  if (lineValues.length >= 1) facets.push({ key: 'line', label: GROUP_LABELS.line, values: lineValues });
  const featureValues = [...keptFeatures.values()].map((v) => ({ value: v.label, label: clip(v.label), count: v.count }));
  if (featureValues.length >= 1) facets.push({ key: 'feature', label: GROUP_LABELS.feature, values: featureValues });

  const brands = countBy((p) => p.attributes.brand);
  if (brands.length >= 2) facets.push({ key: 'brand', label: GROUP_LABELS.brand, values: brands.slice(0, MAX_VALUES) });

  const stores = countBy((p) => p.retailer);
  if (stores.length >= 2) facets.push({ key: 'store', label: GROUP_LABELS.store, values: stores.slice(0, MAX_VALUES) });

  return { products: withAttributes, facets };
}

/** OR within a group, AND across groups. Products without attributes never match a type/line/brand pick. */
export function matchesFacets(product: Product, selected: SelectedFacets): boolean {
  const a = product.attributes;
  const type = selected.type;
  if (type && type.length > 0 && !(a?.type && type.includes(a.type))) return false;
  const line = selected.line;
  if (line && line.length > 0 && !(a?.lines && a.lines.some((l) => line.includes(l)))) return false;
  const feature = selected.feature;
  if (feature && feature.length > 0 && !(a?.features && a.features.some((f) => feature.includes(f)))) return false;
  const brand = selected.brand;
  if (brand && brand.length > 0 && !(a?.brand && brand.includes(a.brand))) return false;
  const store = selected.store;
  if (store && store.length > 0 && !store.includes(product.retailer)) return false;
  return true;
}

export function applyFacets<T extends Product>(products: T[], selected: SelectedFacets): T[] {
  if (!hasFacetSelection(selected)) return products;
  return products.filter((p) => matchesFacets(p, selected));
}

export function hasFacetSelection(selected: SelectedFacets): boolean {
  return Object.values(selected).some((v) => v && v.length > 0);
}

export function toggleFacet(selected: SelectedFacets, key: FacetKey, value: string): SelectedFacets {
  const current = selected[key] ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const out = { ...selected, [key]: next };
  if (next.length === 0) delete out[key];
  return out;
}

/**
 * Chip counts: each group's values are counted against the pool with the
 * OTHER groups' picks applied (the sale/verified toggle rule), so a chip's
 * number always matches what clicking it would show. Keyed "group:value".
 */
export function facetCounts(pool: Product[], facets: FacetGroup[], selected: SelectedFacets): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of facets) {
    const others: SelectedFacets = { ...selected };
    delete others[group.key];
    const base = applyFacets(pool, others);
    for (const v of group.values) {
      out[`${group.key}:${v.value}`] = base.filter((p) => matchesFacets(p, { [group.key]: [v.value] })).length;
    }
  }
  return out;
}
