// US ZIP code -> delivery state, for the header's ZIP field. DATA plus pure
// logic: no network, no storage, nothing async.
//
// PRIVACY POSTURE: the shopper types the ZIP and it is resolved HERE, in
// the browser. It persists only as an explicit picker choice (localStorage,
// see contexts/DestinationContext), it never rides on a request to Pick's
// servers (search requests carry the destination COUNTRY only, and /api/geo
// takes no input), and the landed-cost input never holds it: the calculator
// keys on the state this module derives (enrich.ts copies country, currency
// and state into the input and nothing else). Pick cannot see a shopper's
// ZIP, and the header says so beside the field.
//
// WHAT THE ZIP DECIDES: the delivery state, which drives the sales-tax
// estimate and the geographic scope of stores' published shipping policies
// (contiguous-US-only terms, state exclusions, Alaska/Hawaii surcharges).
// It does NOT make the carrier benchmark zone-accurate: USPS zones depend
// on the ORIGIN ZIP as well, and the feed never says where a store ships
// from, so the benchmark stays the labeled zone-4 figure.
//
// DATA: three-digit ZIP prefix -> state, the USPS sectional-center
// allocation. Verified 2026-10-23 against two independent published lists:
// the per-state five-digit ranges at
// https://www.structnet.com/instructions/zip_min_max_by_state.html and the
// sectional center facility roster (prefixes per plant, with the
// cross-state prefixes called out: 739 OK, 986 WA, 297 SC, 865 AZ, 961 CA,
// 268 WV, 718 AR, 755 TX, 880 and 883 NM, 813 CO, 679 KS) at
// https://en.wikipedia.org/wiki/Sectional_center_facility. A prefix outside
// every listed block resolves to nothing, never to a neighbor. A handful of
// unassigned prefixes sit inside a state's block (e.g. 429 in Kentucky);
// none carries a real address, so resolving one to the surrounding state
// cannot mislead anyone.

type Kind = 'state' | 'territory' | 'military';

export type ZipResolution =
  /** A US state or DC (the destinations Pick can estimate for), or a
   * territory / military post office (it cannot). */
  | { kind: Kind; code: string }
  /** Well-formed, but no such prefix exists. */
  | { kind: 'unassigned' };

// [first prefix, last prefix, code, kind], ascending.
const BLOCKS: ReadonlyArray<readonly [number, number, string, Kind]> = [
  [5, 5, 'NY', 'state'], // 005: Holtsville NY (IRS)
  [6, 7, 'PR', 'territory'],
  [8, 8, 'VI', 'territory'],
  [9, 9, 'PR', 'territory'],
  [10, 27, 'MA', 'state'],
  [28, 29, 'RI', 'state'],
  [30, 38, 'NH', 'state'],
  [39, 49, 'ME', 'state'],
  [50, 54, 'VT', 'state'],
  [55, 55, 'MA', 'state'], // 055: Andover MA (IRS)
  [56, 59, 'VT', 'state'],
  [60, 69, 'CT', 'state'],
  [70, 89, 'NJ', 'state'],
  [90, 98, 'AE', 'military'], // APO/FPO Europe, Middle East, Africa, Canada
  [100, 149, 'NY', 'state'],
  [150, 196, 'PA', 'state'],
  [197, 199, 'DE', 'state'],
  [200, 200, 'DC', 'state'],
  [201, 201, 'VA', 'state'], // 201: Dulles / Northern Virginia
  [202, 205, 'DC', 'state'],
  [206, 212, 'MD', 'state'],
  [214, 219, 'MD', 'state'],
  [220, 246, 'VA', 'state'],
  [247, 268, 'WV', 'state'],
  [270, 289, 'NC', 'state'],
  [290, 299, 'SC', 'state'],
  [300, 319, 'GA', 'state'],
  [320, 339, 'FL', 'state'],
  [340, 340, 'AA', 'military'], // APO/FPO Americas
  [341, 342, 'FL', 'state'],
  [344, 344, 'FL', 'state'],
  [346, 347, 'FL', 'state'],
  [349, 349, 'FL', 'state'],
  [350, 352, 'AL', 'state'],
  [354, 369, 'AL', 'state'],
  [370, 385, 'TN', 'state'],
  [386, 397, 'MS', 'state'],
  [398, 399, 'GA', 'state'], // 398: south Georgia via Tallahassee; 399: Atlanta (IRS)
  [400, 427, 'KY', 'state'],
  [430, 459, 'OH', 'state'],
  [460, 479, 'IN', 'state'],
  [480, 499, 'MI', 'state'],
  [500, 528, 'IA', 'state'],
  [530, 549, 'WI', 'state'],
  [550, 567, 'MN', 'state'],
  [569, 569, 'DC', 'state'], // 569: Parcel Return Service, Washington DC
  [570, 577, 'SD', 'state'],
  [580, 588, 'ND', 'state'],
  [590, 599, 'MT', 'state'],
  [600, 629, 'IL', 'state'],
  [630, 658, 'MO', 'state'],
  [660, 679, 'KS', 'state'],
  [680, 693, 'NE', 'state'],
  [700, 714, 'LA', 'state'],
  [716, 729, 'AR', 'state'],
  [730, 731, 'OK', 'state'],
  [733, 733, 'TX', 'state'], // 733: Austin TX (IRS)
  [734, 741, 'OK', 'state'],
  [743, 749, 'OK', 'state'],
  [750, 799, 'TX', 'state'],
  [800, 816, 'CO', 'state'],
  [820, 831, 'WY', 'state'],
  [832, 838, 'ID', 'state'],
  [840, 847, 'UT', 'state'],
  [850, 865, 'AZ', 'state'],
  [870, 884, 'NM', 'state'],
  [885, 885, 'TX', 'state'], // 885: El Paso TX
  [889, 898, 'NV', 'state'],
  [900, 961, 'CA', 'state'],
  [962, 966, 'AP', 'military'], // APO/FPO Pacific
  [967, 968, 'HI', 'state'],
  [969, 969, 'GU', 'territory'], // Guam; the prefix also serves MP, FM, MH and PW
  [970, 979, 'OR', 'state'],
  [980, 994, 'WA', 'state'],
  [995, 999, 'AK', 'state'],
];

// Five-digit exceptions inside another block.
const ZIP_OVERRIDES: Record<string, { code: string; kind: Kind }> = {
  '06390': { code: 'NY', kind: 'state' }, // Fishers Island NY, served from Connecticut
  '75502': { code: 'AR', kind: 'state' }, // Texarkana AR, inside the Texarkana TX prefix
  '96799': { code: 'AS', kind: 'territory' }, // American Samoa, inside the Hawaii block
};

/** '30318', ' 30318 ', '30318-1234' -> '30318'; anything else -> null. */
export function normalizeZip(input: string): string | null {
  const match = input.trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match ? match[1] : null;
}

/**
 * The state (or territory / military post office) a ZIP addresses; null
 * when `input` is not a ZIP at all, 'unassigned' when it is well-formed
 * but no such prefix exists.
 */
export function resolveZip(input: string): ZipResolution | null {
  const zip = normalizeZip(input);
  if (!zip) return null;
  const override = ZIP_OVERRIDES[zip];
  if (override) return { kind: override.kind, code: override.code };
  const prefix = Number(zip.slice(0, 3));
  const block = BLOCKS.find(([from, to]) => prefix >= from && prefix <= to);
  return block ? { kind: block[3], code: block[2] } : { kind: 'unassigned' };
}

/**
 * Alaska and Hawaii: stores and carriers price delivery there separately,
 * free-shipping terms usually stop at the contiguous US, and the USPS
 * zone-4 benchmark understates it. DC counts as contiguous.
 */
export const NON_CONTIGUOUS_STATES: readonly string[] = ['AK', 'HI'];

export function isContiguousUs(state: string): boolean {
  return !NON_CONTIGUOUS_STATES.includes(state.toUpperCase());
}

/** Every state code the table can produce (for the coverage test). */
export function zipTableStateCodes(): string[] {
  const codes = new Set<string>();
  for (const [, , code, kind] of BLOCKS) if (kind === 'state') codes.add(code);
  for (const { code, kind } of Object.values(ZIP_OVERRIDES)) if (kind === 'state') codes.add(code);
  return Array.from(codes);
}
