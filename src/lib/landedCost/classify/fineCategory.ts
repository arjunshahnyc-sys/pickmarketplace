// Fine-grained product categorization for landed-cost enrichment ONLY.
//
// The feed's display category (scrapers.ts guessCategory) collapses most
// electronics into 'Electronics', which the curated HS and weight tables
// deliberately refuse as too vague. This resolver re-derives a curated
// category key from the product NAME, falling back to the feed category
// (Target's item_type_name is often already fine-grained). It exists beside
// guessCategory rather than replacing it so flag-off surfaces keep their
// exact current category strings.
//
// Ordering matters: 'headphone' must match before 'phone', 'smartwatch'
// before 'watch'. First hit wins.

const RULES: Array<[RegExp, string]> = [
  [/headphone|headset/i, 'headphones'],
  [/earbud|airpod/i, 'earbuds'],
  [/speaker|soundbar/i, 'speakers'],
  [/laptop|notebook|macbook|chromebook/i, 'laptops'],
  [/tablet|ipad/i, 'tablets'],
  [/smartwatch|smart watch|apple watch|galaxy watch/i, 'smartwatches'],
  [/\bwatch\b/i, 'watches'],
  [/television|\btvs?\b/i, 'tvs'],
  [/monitor/i, 'monitors'],
  [/smartphone|iphone|\bphone\b/i, 'phones'],
  [/camera|camcorder/i, 'cameras'],
  [/keyboard/i, 'keyboards'],
  [/\bmouse\b|\bmice\b/i, 'gamingmice'],
  [/console|playstation|\bxbox\b|nintendo switch/i, 'gamingconsoles'],
  [/shoe|sneaker|\bboot\b|sandal|footwear|trainer/i, 'shoes'],
  [/perfume|cologne|fragrance|eau de/i, 'perfume'],
  [/moisturizer|serum|skincare|lotion|sunscreen|cleanser/i, 'skincare'],
  [/makeup|lipstick|foundation|mascara|cosmetic/i, 'beauty'],
  [/backpack|rucksack/i, 'backpacks'],
  [/coffee maker|espresso|keurig|nespresso|french press/i, 'coffeemakers'],
  [/blender|air fryer|toaster|mixer|kettle|microwave|cookware|instant pot/i, 'kitchen'],
  [/\btoy\b|\blego\b|\bdoll\b|puzzle|plush/i, 'toys'],
  [/yoga|dumbbell|fitness|exercise|treadmill|kettlebell|resistance band/i, 'sports'],
];

/**
 * Best category key for classification and weight lookup: a name-derived
 * curated key when a rule hits, otherwise the feed category as-is (the
 * curated tables normalize and may still recognize it). Never invents a
 * category: no hit and no feed category = undefined, and downstream stays
 * honestly unknown.
 */
export function fineCategoryFor(name: string, feedCategory?: string): string | undefined {
  for (const [pattern, key] of RULES) {
    if (pattern.test(name)) return key;
  }
  return feedCategory;
}
