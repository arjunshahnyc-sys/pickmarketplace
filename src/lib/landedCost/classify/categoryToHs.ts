// Tier 1: curated category -> HS heading map. Hand-written, deliberately
// small, and NEVER better than 'estimated': a heading guessed from a retail
// category is a plausible starting point, not a customs ruling. The
// confidence flows into every duty line computed from it, so the UI always
// labels these as estimates.
//
// Headings are 4-digit HS 2022 nomenclature (the internationally shared
// level; national tariff lines extend them). Deliberately ambiguous retail
// buckets (Electronics, Clothing, Home, Other) are NOT mapped: a confident
// wrong heading is worse than falling through to the LLM tier or to the
// unmapped path. Where a category straddles headings (footwear by upper
// material, cookware by metal), the note names the ambiguity and the
// mapping picks the variant most common in this marketplace's feed.
//
// Verify against the WCO HS nomenclature: https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition.aspx

export interface CuratedHsEntry {
  heading: string;
  label: string;
  notes?: string;
}

// Keys are normalized category ids: lowercase, hyphenless, singular-ish.
// matchCategory() below normalizes lookups the same way.
const CURATED: Record<string, CuratedHsEntry> = {
  headphones: { heading: '8518', label: 'Headphones and earphones' },
  earbuds: { heading: '8518', label: 'Headphones and earphones' },
  speakers: { heading: '8518', label: 'Loudspeakers' },
  laptops: { heading: '8471', label: 'Portable computers' },
  tablets: { heading: '8471', label: 'Portable computers' },
  // Monitors and TVs are 6-digit deliberately: heading 8528 splits hard
  // (computer monitors duty-free vs colour TVs at 14% in GB/EU, 5% in CA),
  // so heading-level codes would hand one of them the wrong rate.
  monitors: { heading: '852852', label: 'Computer monitors (ADP-connectable)' },
  tvs: { heading: '852872', label: 'Colour television receivers' },
  phones: { heading: '8517', label: 'Telephones for cellular networks' },
  smartwatches: {
    heading: '8517',
    label: 'Smart watches (communication function)',
    notes: 'Contested: some administrations classify under 9102. Estimated only.',
  },
  cameras: { heading: '8525', label: 'Digital cameras' },
  keyboards: { heading: '8471', label: 'Computer input units' },
  gamingmice: { heading: '8471', label: 'Computer input units' },
  gamingconsoles: { heading: '9504', label: 'Video game consoles' },
  shoes: {
    heading: '6404',
    label: 'Footwear with textile or rubber uppers',
    notes: 'Leather-upper footwear is 6403; upper material is unknowable from listings. Estimated only.',
  },
  skincare: { heading: '3304', label: 'Beauty and skin care preparations' },
  beauty: { heading: '3304', label: 'Beauty and skin care preparations' },
  perfume: { heading: '3303', label: 'Perfumes and toilet waters' },
  watches: { heading: '9102', label: 'Wrist-watches' },
  backpacks: { heading: '4202', label: 'Backpacks, cases and similar containers' },
  coffeemakers: { heading: '8516', label: 'Electrothermic appliances' },
  kitchen: {
    heading: '8516',
    label: 'Electrothermic appliances',
    notes: 'Kitchen bucket mixes appliances (8516/8509) and cookware (7323). Estimated only.',
  },
  toys: { heading: '9503', label: 'Toys' },
  sports: {
    heading: '9506',
    label: 'Sports and fitness equipment',
    notes: 'Sports bucket mixes equipment, apparel and footwear. Estimated only.',
  },
};

// Exported: weightEstimates.ts keys on the same normalization so the two
// category tables can never disagree about identity.
export function normalizeCategory(categoryId: string): string {
  return categoryId.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function curatedHeadingFor(categoryId: string): CuratedHsEntry | null {
  return CURATED[normalizeCategory(categoryId)] ?? null;
}

export function curatedCategoryCount(): number {
  return Object.keys(CURATED).length;
}
