// The cheaper-twin comparison pages at /compare/[slug]: one page per
// product in the price eval test set (eval/testset.json), so the pages
// cover exactly the items whose prices Pick measures itself against. Each
// entry's evalId is the test set id and its query is the test set query,
// pinned by comparisons.test.ts so the two can never drift.
//
// Shared by the page's slug lookup, the /compare index and the sitemap.
// Slugs are URL-safe (lowercase, digits, hyphens); an unknown slug is a 404
// before any paid search runs.

export interface ComparisonEntry {
  slug: string;
  /** The eval/testset.json entry this page tracks. */
  evalId: string;
  /** The search Pick runs, verbatim from the test set. */
  query: string;
  /** The item as a shopper names it, for the title and heading. */
  name: string;
  category: ComparisonCategory;
}

export type ComparisonCategory =
  | 'earbuds'
  | 'headphones'
  | 'skincare'
  | 'dorm appliances'
  | 'textbooks'
  | 'clothing';

export const COMPARISON_CATEGORY_LABELS: Record<ComparisonCategory, string> = {
  earbuds: 'Earbuds',
  headphones: 'Headphones',
  skincare: 'Skincare',
  'dorm appliances': 'Dorm appliances',
  textbooks: 'Textbooks',
  clothing: 'Clothing',
};

export const COMPARISONS: ComparisonEntry[] = [
  // Earbuds
  { slug: 'airpods-pro-3', evalId: 'earbuds-airpods-pro-3', query: 'airpods pro 3', name: 'Apple AirPods Pro 3', category: 'earbuds' },
  { slug: 'airpods-4-anc', evalId: 'earbuds-airpods-4-anc', query: 'airpods 4 with active noise cancellation', name: 'Apple AirPods 4 with Active Noise Cancellation', category: 'earbuds' },
  { slug: 'samsung-galaxy-buds3-pro', evalId: 'earbuds-galaxy-buds3-pro', query: 'samsung galaxy buds3 pro', name: 'Samsung Galaxy Buds3 Pro', category: 'earbuds' },
  { slug: 'sony-wf-1000xm5', evalId: 'earbuds-sony-wf-1000xm5', query: 'sony wf-1000xm5', name: 'Sony WF-1000XM5', category: 'earbuds' },
  { slug: 'google-pixel-buds-pro-2', evalId: 'earbuds-pixel-buds-pro-2', query: 'google pixel buds pro 2', name: 'Google Pixel Buds Pro 2', category: 'earbuds' },
  { slug: 'beats-studio-buds-plus', evalId: 'earbuds-beats-studio-buds-plus', query: 'beats studio buds+', name: 'Beats Studio Buds +', category: 'earbuds' },
  { slug: 'soundcore-liberty-4-nc', evalId: 'earbuds-soundcore-liberty-4-nc', query: 'soundcore liberty 4 nc', name: 'Soundcore Liberty 4 NC', category: 'earbuds' },
  { slug: 'jlab-go-air-pop', evalId: 'earbuds-jlab-go-air-pop', query: 'jlab go air pop', name: 'JLab Go Air Pop', category: 'earbuds' },
  { slug: 'bose-quietcomfort-ultra-earbuds', evalId: 'earbuds-bose-qc-ultra-earbuds-2', query: 'bose quietcomfort ultra earbuds', name: 'Bose QuietComfort Ultra Earbuds (2nd Gen)', category: 'earbuds' },
  // Headphones
  { slug: 'sony-wh-1000xm5', evalId: 'headphones-sony-wh-1000xm5', query: 'sony wh-1000xm5', name: 'Sony WH-1000XM5', category: 'headphones' },
  { slug: 'sony-wh-1000xm6', evalId: 'headphones-sony-wh-1000xm6', query: 'sony wh-1000xm6', name: 'Sony WH-1000XM6', category: 'headphones' },
  { slug: 'bose-quietcomfort-ultra-headphones', evalId: 'headphones-bose-qc-ultra-2', query: 'bose quietcomfort ultra headphones', name: 'Bose QuietComfort Ultra Headphones (2nd Gen)', category: 'headphones' },
  { slug: 'airpods-max', evalId: 'headphones-airpods-max', query: 'airpods max', name: 'Apple AirPods Max (USB-C)', category: 'headphones' },
  { slug: 'beats-studio-pro', evalId: 'headphones-beats-studio-pro', query: 'beats studio pro', name: 'Beats Studio Pro', category: 'headphones' },
  { slug: 'soundcore-space-one', evalId: 'headphones-soundcore-space-one', query: 'soundcore space one', name: 'Soundcore Space One', category: 'headphones' },
  { slug: 'sony-wh-ch720n', evalId: 'headphones-sony-wh-ch720n', query: 'sony wh-ch720n', name: 'Sony WH-CH720N', category: 'headphones' },
  { slug: 'bose-quietcomfort-headphones', evalId: 'headphones-bose-quietcomfort', query: 'bose quietcomfort headphones', name: 'Bose QuietComfort Headphones', category: 'headphones' },
  // Skincare
  { slug: 'cerave-moisturizing-cream-16oz', evalId: 'skincare-cerave-moisturizing-cream-16oz', query: 'cerave moisturizing cream 16 oz', name: 'CeraVe Moisturizing Cream, 16 oz', category: 'skincare' },
  { slug: 'cerave-hydrating-facial-cleanser-16oz', evalId: 'skincare-cerave-hydrating-cleanser-16oz', query: 'cerave hydrating facial cleanser', name: 'CeraVe Hydrating Facial Cleanser, 16 fl oz', category: 'skincare' },
  { slug: 'la-roche-posay-toleriane-double-repair', evalId: 'skincare-lrp-toleriane-double-repair', query: 'la roche-posay toleriane double repair moisturizer', name: 'La Roche-Posay Toleriane Double Repair Moisturizer', category: 'skincare' },
  { slug: 'the-ordinary-niacinamide-10-zinc-1', evalId: 'skincare-ordinary-niacinamide-30ml', query: 'the ordinary niacinamide 10% + zinc 1%', name: 'The Ordinary Niacinamide 10% + Zinc 1%', category: 'skincare' },
  { slug: 'neutrogena-hydro-boost-water-gel', evalId: 'skincare-neutrogena-hydro-boost-gel', query: 'neutrogena hydro boost water gel', name: 'Neutrogena Hydro Boost Water Gel', category: 'skincare' },
  { slug: 'cetaphil-gentle-skin-cleanser-16oz', evalId: 'skincare-cetaphil-gentle-cleanser-16oz', query: 'cetaphil gentle skin cleanser', name: 'Cetaphil Gentle Skin Cleanser, 16 fl oz', category: 'skincare' },
  { slug: 'eltamd-uv-clear-spf-46', evalId: 'skincare-eltamd-uv-clear-spf46', query: 'eltamd uv clear spf 46', name: 'EltaMD UV Clear SPF 46', category: 'skincare' },
  { slug: 'paulas-choice-2-bha-liquid-exfoliant', evalId: 'skincare-paulas-choice-bha-4oz', query: "paula's choice 2% bha liquid exfoliant", name: "Paula's Choice 2% BHA Liquid Exfoliant", category: 'skincare' },
  { slug: 'supergoop-unseen-sunscreen-spf-40', evalId: 'skincare-supergoop-unseen-spf40', query: 'supergoop unseen sunscreen spf 40', name: 'Supergoop Unseen Sunscreen SPF 40', category: 'skincare' },
  // Dorm appliances
  { slug: 'galanz-retro-mini-fridge-3-1-cu-ft', evalId: 'dorm-galanz-retro-mini-fridge', query: 'galanz retro mini fridge 3.1 cu ft', name: 'Galanz 3.1 cu ft Retro Mini Fridge', category: 'dorm appliances' },
  { slug: 'keurig-k-mini', evalId: 'dorm-keurig-k-mini', query: 'keurig k-mini', name: 'Keurig K-Mini', category: 'dorm appliances' },
  { slug: 'ninja-air-fryer-pro-4-in-1', evalId: 'dorm-ninja-air-fryer-pro', query: 'ninja air fryer pro 4-in-1', name: 'Ninja Air Fryer Pro 4-in-1', category: 'dorm appliances' },
  { slug: 'dash-mini-waffle-maker', evalId: 'dorm-dash-mini-waffle-maker', query: 'dash mini waffle maker', name: 'Dash Mini Waffle Maker', category: 'dorm appliances' },
  { slug: 'shark-navigator-lift-away-adv', evalId: 'dorm-shark-navigator-adv', query: 'shark navigator lift-away adv', name: 'Shark Navigator Lift-Away ADV', category: 'dorm appliances' },
  { slug: 'vornado-533', evalId: 'dorm-vornado-533', query: 'vornado 533 air circulator fan', name: 'Vornado 533 Air Circulator', category: 'dorm appliances' },
  { slug: 'brita-everyday-10-cup-pitcher', evalId: 'dorm-brita-everyday-10-cup', query: 'brita 10 cup everyday water filter pitcher', name: 'Brita Everyday 10-Cup Water Filter Pitcher', category: 'dorm appliances' },
  { slug: 'nutribullet-pro-900', evalId: 'dorm-nutribullet-pro-900', query: 'nutribullet pro 900 blender', name: 'NutriBullet Pro 900', category: 'dorm appliances' },
  { slug: 'levoit-core-300', evalId: 'dorm-levoit-core-300', query: 'levoit core 300 air purifier', name: 'Levoit Core 300 Air Purifier', category: 'dorm appliances' },
  // Textbooks
  { slug: 'campbell-biology-12th-edition', evalId: 'textbooks-campbell-biology-12e', query: 'campbell biology 12th edition', name: 'Campbell Biology, 12th Edition', category: 'textbooks' },
  { slug: 'stewart-calculus-early-transcendentals-9th-edition', evalId: 'textbooks-stewart-calculus-et-9e', query: 'stewart calculus early transcendentals 9th edition', name: 'Stewart Calculus: Early Transcendentals, 9th Edition', category: 'textbooks' },
  { slug: 'mankiw-principles-of-economics-10th-edition', evalId: 'textbooks-mankiw-economics-10e', query: 'mankiw principles of economics 10th edition', name: 'Mankiw Principles of Economics, 10th Edition', category: 'textbooks' },
  { slug: 'chemistry-the-central-science-15th-edition', evalId: 'textbooks-brown-chemistry-15e', query: 'chemistry the central science 15th edition', name: 'Chemistry: The Central Science, 15th Edition', category: 'textbooks' },
  { slug: 'introduction-to-algorithms-4th-edition', evalId: 'textbooks-clrs-algorithms-4e', query: 'introduction to algorithms 4th edition', name: 'Introduction to Algorithms, 4th Edition', category: 'textbooks' },
  { slug: 'klein-organic-chemistry-4th-edition', evalId: 'textbooks-klein-organic-chemistry-4e', query: 'klein organic chemistry 4th edition', name: 'Klein Organic Chemistry, 4th Edition', category: 'textbooks' },
  { slug: 'university-physics-15th-edition', evalId: 'textbooks-university-physics-15e', query: 'university physics 15th edition', name: 'University Physics with Modern Physics, 15th Edition', category: 'textbooks' },
  // Clothing
  { slug: 'levis-501-original-fit-jeans', evalId: 'clothing-levis-501-original', query: "levi's 501 original fit jeans", name: "Levi's 501 Original Fit Jeans", category: 'clothing' },
  { slug: 'nike-club-fleece-hoodie', evalId: 'clothing-nike-club-fleece-hoodie', query: 'nike club fleece hoodie', name: 'Nike Sportswear Club Fleece Hoodie', category: 'clothing' },
  { slug: 'carhartt-k87-pocket-t-shirt', evalId: 'clothing-carhartt-k87', query: 'carhartt k87 pocket t-shirt', name: 'Carhartt K87 Pocket T-Shirt', category: 'clothing' },
  { slug: 'uniqlo-airism-oversized-t-shirt', evalId: 'clothing-uniqlo-airism-oversized-tee', query: 'uniqlo airism oversized t-shirt', name: 'Uniqlo AIRism Cotton Oversized T-Shirt', category: 'clothing' },
  { slug: 'lululemon-align-pant-25', evalId: 'clothing-lululemon-align-25', query: 'lululemon align pant 25', name: 'lululemon Align High-Rise Pant 25"', category: 'clothing' },
  { slug: 'converse-chuck-taylor-all-star-high-top', evalId: 'clothing-converse-chuck-taylor-hi', query: 'converse chuck taylor all star high top', name: 'Converse Chuck Taylor All Star High Top', category: 'clothing' },
  { slug: 'adidas-samba-og', evalId: 'clothing-adidas-samba-og', query: 'adidas samba og', name: 'adidas Samba OG', category: 'clothing' },
  { slug: 'patagonia-better-sweater-jacket', evalId: 'clothing-patagonia-better-sweater', query: 'patagonia better sweater jacket', name: 'Patagonia Better Sweater Fleece Jacket', category: 'clothing' },
];

export function getComparison(slug: string): ComparisonEntry | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

/** Entries grouped by category, in catalog order. */
export function comparisonsByCategory(): Array<{ category: ComparisonCategory; label: string; entries: ComparisonEntry[] }> {
  const order: ComparisonCategory[] = [];
  const groups = new Map<ComparisonCategory, ComparisonEntry[]>();
  for (const entry of COMPARISONS) {
    if (!groups.has(entry.category)) {
      order.push(entry.category);
      groups.set(entry.category, []);
    }
    groups.get(entry.category)!.push(entry);
  }
  return order.map((category) => ({
    category,
    label: COMPARISON_CATEGORY_LABELS[category],
    entries: groups.get(category)!,
  }));
}
