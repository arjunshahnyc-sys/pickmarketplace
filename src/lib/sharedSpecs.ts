// What two different products have in common, read from listing names.
//
// Pick's feeds carry a title and a price and nothing else (Serper shopping
// items and Target's search endpoint both stop at the title, probed
// 2026-09-03 and 2026-09-10), so the only spec data Pick has is whatever
// sellers write into a name: "Over-Ear", "Noise Cancelling", "LDAC",
// "30-Hour Battery". This module reads those phrases with a curated
// vocabulary, one canonical label per spec however a seller spells it, so
// the "What they share" chips on a similar pick can say "Active noise
// canceling" instead of echoing the bare word "noise".
//
// Two rules keep the chips honest:
//   1. A spec belongs to an ITEM, not a listing: the union over every
//      listing name in the item's same-item cluster (productGrouping.ts).
//      One spec-stuffed marketplace title is enough to know the XM6 has
//      LDAC; Best Buy's five-word title is not evidence that it lacks it.
//   2. A chip shows only what BOTH items claim. Figures are shared as the
//      lower one ("30+ hr battery" for a 30-hour item beside a 40-hour
//      one) or, for sizes, only when equal ("40 oz").
// Nothing here can invent a spec the names do not state: Bluetooth
// multipoint appears in no listing name for either headphone on the
// landing page, so no chip says it. When two items share no recognised
// spec, the caller falls back to the plain name words they have in common.
//
// Rules are ordered, and that order is the chip order. Every pattern runs
// against the raw name, case-insensitively, so it spells out its own
// variants ("Canceling", "Cancelling", "ANC"). Add a rule only when the
// phrase means one thing wherever it appears in a product name.

interface RuleBase {
  key: string;
  /** Specs this one already states (Bluetooth is wireless): hidden when this one shows. */
  implies?: string[];
}

/** A yes-or-no spec: the phrase is in the name. */
interface PhraseRule extends RuleBase {
  kind: 'phrase';
  label: string;
  pattern: RegExp;
}

/** A spec with a figure: hours, ounces, gigabytes. */
interface FigureRule extends RuleBase {
  kind: 'figure';
  /** The figure the name states, or nothing. */
  read: (name: string) => number | undefined;
  /** 'floor': both items reach at least the lower figure. 'exact': only an equal figure is shared. */
  share: 'floor' | 'exact';
  format: (value: number) => string;
}

export type SpecRule = PhraseRule | FigureRule;

export interface SpecClaim {
  rule: SpecRule;
  value?: number;
}

/** Specs an item claims, keyed by spec (and by figure for 'exact' ones). */
export type SpecClaims = ReadonlyMap<string, SpecClaim>;

/** Chips never run past this: five reads as a spec sheet, ten as noise. */
export const MAX_SHARED_SPECS = 5;

// ─── Figure readers ──────────────────────────────────────────────────────

const HOURS = String.raw`(\d{1,3})\s*-?\s*(?:h|hr|hrs|hour|hours)\b`;
const BATTERY_WORD = String.raw`(?:battery|playtime|play\s?time|playback|listening|music|runtime)`;
// "30-Hour Battery", "40H of ANC Playtime", "up to 50 hours of playtime"
const BATTERY_FIGURE_FIRST = new RegExp(
  `${HOURS}[\\s-]*(?:of\\s+)?(?:anc\\s+|noise[\\s-]?cancel\\w*\\s+)?${BATTERY_WORD}`,
  'i'
);
// "battery life up to 50 hours", "playtime: 40h"
const BATTERY_WORD_FIRST = new RegExp(`${BATTERY_WORD}(?:\\s+life)?[\\s:,-]*(?:up\\s+to\\s+)?${HOURS}`, 'i');

function readBatteryHours(name: string): number | undefined {
  const m = BATTERY_FIGURE_FIRST.exec(name) ?? BATTERY_WORD_FIRST.exec(name);
  return m ? Number(m[1]) : undefined;
}

function firstFigure(pattern: RegExp): (name: string) => number | undefined {
  return (name) => {
    const m = pattern.exec(name);
    return m ? Number(m[1]) : undefined;
  };
}

/** Storage in gigabytes, whichever unit the name uses. */
function readStorageGb(name: string): number | undefined {
  const m = /(\d{1,4})\s*-?\s*(gb|tb)\s*(?:of\s+)?(?:ssd|storage|nvme|emmc|hdd)\b/i.exec(name);
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2].toLowerCase() === 'tb' ? n * 1024 : n;
}

function formatStorage(gb: number): string {
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} TB storage` : `${gb} GB storage`;
}

// ─── The vocabulary ──────────────────────────────────────────────────────

export const SPEC_RULES: ReadonlyArray<SpecRule> = [
  // Audio: form factor
  { kind: 'phrase', key: 'over-ear', label: 'Over ear', pattern: /over[\s-]?(?:the[\s-])?ear\b/i },
  { kind: 'phrase', key: 'on-ear', label: 'On ear', pattern: /\bon[\s-]ear\b/i },
  { kind: 'phrase', key: 'in-ear', label: 'In ear', pattern: /\bin[\s-]ear\b/i },
  { kind: 'phrase', key: 'open-back', label: 'Open back', pattern: /open[\s-]back\b/i },
  { kind: 'phrase', key: 'closed-back', label: 'Closed back', pattern: /closed[\s-]back\b/i },
  // Audio: noise. "Noise cancelling" on headphones always means active
  // cancellation (passive isolation is sold as "noise isolating"); a
  // noise-cancelling MICROPHONE is a different feature and is skipped.
  {
    kind: 'phrase',
    key: 'anc',
    label: 'Active noise canceling',
    pattern: /noise[\s-]?cancel+(?:ing|ation|ed)?\b(?![\s-]*(?:mic|microphone))|\banc\b/i,
  },
  { kind: 'phrase', key: 'transparency', label: 'Transparency mode', pattern: /transparency|ambient[\s-](?:sound|mode|aware)/i },
  // Audio: codecs and quality
  { kind: 'phrase', key: 'ldac', label: 'LDAC audio', pattern: /\bldac\b/i },
  { kind: 'phrase', key: 'aptx', label: 'aptX audio', pattern: /\bapt-?x\b/i },
  { kind: 'phrase', key: 'hi-res', label: 'Hi-Res audio', pattern: /\bhi-?\s?res\b/i },
  { kind: 'phrase', key: 'spatial', label: 'Spatial audio', pattern: /spatial audio|360 reality audio|dolby atmos/i },
  // Connectivity
  { kind: 'phrase', key: 'multipoint', label: 'Multipoint Bluetooth', pattern: /multi-?\s?point/i, implies: ['bluetooth', 'wireless'] },
  { kind: 'phrase', key: 'bluetooth', label: 'Bluetooth', pattern: /bluetooth|\bbt\s?5(?:\.\d)?\b/i, implies: ['wireless'] },
  { kind: 'phrase', key: 'wireless', label: 'Wireless', pattern: /\bwireless\b/i },
  // Power
  { kind: 'figure', key: 'battery-hours', read: readBatteryHours, share: 'floor', format: (h) => `${h}+ hr battery` },
  { kind: 'phrase', key: 'fast-charge', label: 'Fast charging', pattern: /fast[\s-]charg/i },
  // Audio: build
  { kind: 'phrase', key: 'foldable', label: 'Foldable', pattern: /foldable|folding|fold-?flat/i },
  { kind: 'phrase', key: 'mic', label: 'Built-in mic', pattern: /\bmicrophones?\b|built-?in mic\b|\bmic\b/i },
  { kind: 'phrase', key: 'water', label: 'Water resistant', pattern: /\bipx?[4-8]\b|water-?\s?(?:proof|resistant)|sweat-?\s?(?:proof|resistant)/i },

  // Screens and computing
  { kind: 'figure', key: 'screen-inch', read: firstFigure(/(\d{2}(?:\.\d)?)\s*-?\s*(?:inch|inches|"|”)/i), share: 'exact', format: (n) => `${n} inch` },
  { kind: 'phrase', key: 'oled', label: 'OLED', pattern: /\boled\b/i },
  { kind: 'phrase', key: '4k', label: '4K', pattern: /\b4k\b|\b2160p\b/i },
  { kind: 'phrase', key: 'touchscreen', label: 'Touchscreen', pattern: /touch-?\s?screen/i },
  { kind: 'figure', key: 'ram-gb', read: firstFigure(/(\d{1,3})\s*-?\s*gb\s*(?:of\s+)?(?:ram|memory|ddr\d?|lpddr\d?x?)\b/i), share: 'exact', format: (n) => `${n} GB RAM` },
  { kind: 'figure', key: 'storage-gb', read: readStorageGb, share: 'exact', format: formatStorage },

  // Containers and drinkware
  { kind: 'figure', key: 'oz', read: firstFigure(/(\d+(?:\.\d+)?)\s*-?\s*(?:fl\.?\s*)?(?:oz|ounces?)\b/i), share: 'exact', format: (n) => `${n} oz` },
  { kind: 'figure', key: 'ml', read: firstFigure(/(\d+(?:\.\d+)?)\s*-?\s*(?:ml|millilit(?:er|re)s?)\b/i), share: 'exact', format: (n) => `${n} ml` },
  { kind: 'figure', key: 'liter', read: firstFigure(/(\d+(?:\.\d+)?)\s*-?\s*(?:l|lit(?:er|re)s?)\b/i), share: 'exact', format: (n) => `${n} L` },
  { kind: 'phrase', key: 'insulated', label: 'Insulated', pattern: /\binsulated\b|vacuum[\s-]insulat/i },
  { kind: 'phrase', key: 'stainless', label: 'Stainless steel', pattern: /\bstainless\b/i },
  { kind: 'phrase', key: 'leakproof', label: 'Leakproof', pattern: /leak-?\s?(?:proof|resistant)|spill-?\s?proof/i },
  { kind: 'phrase', key: 'dishwasher', label: 'Dishwasher safe', pattern: /dishwasher[\s-]safe/i },
  { kind: 'phrase', key: 'bpa-free', label: 'BPA free', pattern: /bpa[\s-]free/i },

  // Skincare
  { kind: 'figure', key: 'spf', read: firstFigure(/\bspf\s*-?\s*(\d{2,3})\b/i), share: 'exact', format: (n) => `SPF ${n}` },
  { kind: 'phrase', key: 'fragrance-free', label: 'Fragrance free', pattern: /fragrance[\s-]free|\bunscented\b/i },
  { kind: 'phrase', key: 'oil-free', label: 'Oil free', pattern: /\boil[\s-]free\b/i },
  { kind: 'phrase', key: 'non-comedogenic', label: 'Non-comedogenic', pattern: /non-?\s?comedogenic/i },
  { kind: 'phrase', key: 'hyaluronic', label: 'Hyaluronic acid', pattern: /hyaluronic/i },
  { kind: 'phrase', key: 'ceramides', label: 'Ceramides', pattern: /\bceramides?\b/i },

  // Apparel
  { kind: 'phrase', key: 'high-rise', label: 'High rise', pattern: /high[\s-](?:rise|waist(?:ed)?)\b/i },
];

const RULE_ORDER = new Map(SPEC_RULES.map((rule, i) => [rule.key, i]));

// ─── Bundles ─────────────────────────────────────────────────────────────
//
// A bundle title describes more than the item ("... Headphones + WI-C100
// Wireless Earbuds", "... with Wired Headphones", "... w/ Deco Gear
// Earpads & Master Guide"), and the add-on's words would otherwise read as
// the item's specs (the XM6 is not "in ear" because a bundle adds
// earbuds). Specs are read from the text before the first bundle
// separator; "with" counts as one only when what follows names another
// product, since "Headphones with Adaptive Noise Cancelling" is a feature
// list. A second product glued on with no separator at all is not caught.
const BUNDLE_SEPARATOR = /\s*\+\s*(?=[A-Za-z])|\s&\s|\bw\/\s*|\bbundled?\b/i;
const BUNDLE_WORDS =
  /\b(?:headphones?|earbuds?|earphones?|headset|speaker|stand|case|cover|pouch|bag|charger|charging block|cable|adapter|tag|tracker|light|brick|guide|ear ?pads?|warranty|plan|protection|gift card|power bank|key ?chain|kit|accessor(?:y|ies))\b/i;

/** The part of a listing name that describes the item itself. */
export function specSource(name: string): string {
  let text = name;
  const separator = BUNDLE_SEPARATOR.exec(text);
  if (separator) text = text.slice(0, separator.index);
  const withWord = /\bwith\b/gi;
  let m: RegExpExecArray | null;
  while ((m = withWord.exec(text))) {
    if (BUNDLE_WORDS.test(text.slice(m.index + 4))) {
      text = text.slice(0, m.index);
      break;
    }
  }
  return text;
}

function claimKey(claim: SpecClaim): string {
  return claim.rule.kind === 'figure' && claim.rule.share === 'exact'
    ? `${claim.rule.key}=${claim.value}`
    : claim.rule.key;
}

/** Every spec one listing name states. */
export function specsOf(name: string): SpecClaim[] {
  const claims: SpecClaim[] = [];
  const text = specSource(name);
  for (const rule of SPEC_RULES) {
    if (rule.kind === 'figure') {
      const value = rule.read(text);
      if (value !== undefined && Number.isFinite(value) && value > 0) claims.push({ rule, value });
    } else if (rule.pattern.test(text)) {
      claims.push({ rule });
    }
  }
  return claims;
}

/**
 * The specs an item claims across all of its listing names. A 'floor'
 * figure keeps the lowest value any listing states (the conservative
 * claim); an 'exact' figure keeps every value, one key each.
 */
export function specsOfNames(names: Iterable<string>): SpecClaims {
  const claims = new Map<string, SpecClaim>();
  for (const name of names) {
    for (const claim of specsOf(name)) {
      const key = claimKey(claim);
      const existing = claims.get(key);
      if (!existing) claims.set(key, claim);
      else if (claim.rule.kind === 'figure' && claim.rule.share === 'floor' && (claim.value as number) < (existing.value as number)) {
        claims.set(key, claim);
      }
    }
  }
  return claims;
}

function labelOf(claim: SpecClaim): string {
  return claim.rule.kind === 'figure' ? claim.rule.format(claim.value as number) : claim.rule.label;
}

/**
 * Chip text for what two items both claim, in vocabulary order, at most
 * MAX_SHARED_SPECS of them. A spec another shared spec already states
 * (Wireless beside Bluetooth) is left out.
 */
export function sharedSpecLabels(a: SpecClaims, b: SpecClaims): string[] {
  const shared: SpecClaim[] = [];
  for (const [key, claim] of a) {
    const other = b.get(key);
    if (!other) continue;
    if (claim.rule.kind === 'figure' && claim.rule.share === 'floor') {
      shared.push({ rule: claim.rule, value: Math.min(claim.value as number, other.value as number) });
    } else {
      shared.push(claim);
    }
  }
  const implied = new Set(shared.flatMap((claim) => claim.rule.implies ?? []));
  return shared
    .filter((claim) => !implied.has(claim.rule.key))
    .sort((x, y) => (RULE_ORDER.get(x.rule.key) as number) - (RULE_ORDER.get(y.rule.key) as number))
    .slice(0, MAX_SHARED_SPECS)
    .map(labelOf);
}
