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
  [/tumbler|water bottle|flask|thermos|travel mug/i, 'drinkware'],
];

// ACCESSORIES (2026-11-18). An accessory is usually named after the product
// it fits: an "Owala Bottle Boot" is a silicone sleeve, yet \bboot\b filed
// it under shoes and the estimate charged postage for 1.5 kg of boxed
// footwear ($15.80 against the store's real $6.99). The same trap catches
// "iPhone 15 Case" (a phone), "Watch Band" (a watch) and "Nespresso Pods"
// (a coffee maker). An accessory gets NO category: its weight and tariff
// heading are not its parent's, and no number beats a wrong one.
//
// Only the HEAD of the name is tested, the part before "with", "and", a
// comma or a bracket, so a product that merely comes with an accessory
// ("Earbuds with Charging Case", "Tumbler with Lid and Straw") stays what
// it is. A noun followed by "for" ("Case for iPhone 15") is an accessory
// wherever it appears.
// Words that name an accessory on their own. Deliberately absent, because a
// scan of 1,593 real listings showed them inside ordinary product names:
// bare "skin" (skincare), bare "sleeve" (clothing), "refill" (a refill
// pouch is the product), bare "band" (resistance bands) and bare "boot"
// (footwear). Those count only in the fitted forms below.
const ACCESSORY_NOUNS =
  'cases?|covers?|straps?|lids?|straws?|chargers?|cables?|cords?|adapters?|mounts?|holders?|docks?|protectors?|laces|insoles?|ear ?pads?|ear ?cushions?|ear ?tips?|keycaps?|mouse ?pads?|pods|capsules|replacement|decals?|stand(?! mixer)s?';
const FITTED_FORMS =
  '(?:bottle|tumbler|flask|cup|mug|silicone)\\s+boots?|(?:laptop|tablet|macbook|ipad|phone|bottle|tumbler|cup|can)\\s+sleeves?|(?:headphones?|earbuds?|console|controller|laptop|phone|macbook)\\s+skins?|skins?\\s*(?:&|and)\\s*wraps?|watch ?bands?';
const ACCESSORY_IN_HEAD = new RegExp(
  `\\b(?:${ACCESSORY_NOUNS}|${FITTED_FORMS})\\b`,
  'i'
);
const ACCESSORY_FOR = new RegExp(
  `\\b(?:${ACCESSORY_NOUNS}|${FITTED_FORMS}|bands?)\\s+(?:for|fits|compatible with)\\b`,
  'i'
);
const HEAD_END = /\bwith\b|\bw\/|\bw\b|\binclud\w+|\bplus\b|\band\b|[,(+&|]|\s[-\u2013]\s/i;
// Earbuds are sold in their charging case; the phrase names the product,
// not an accessory, unless the listing says it is a replacement.
const BUNDLED_CASE = /\b(?:wireless |usb-c |lightning |magsafe )*(?:charging|magsafe) case\b/gi;

/** Is this listing an accessory or part for some other product? */
export function isAccessoryListing(name: string): boolean {
  if (ACCESSORY_FOR.test(name)) return true;
  let head = name.split(HEAD_END)[0];
  if (!/\breplacement\b/i.test(head)) head = head.replace(BUNDLED_CASE, ' ');
  return ACCESSORY_IN_HEAD.test(head);
}

/**
 * Best category key for classification and weight lookup: a name-derived
 * curated key when a rule hits, otherwise the feed category as-is (the
 * curated tables normalize and may still recognize it). Never invents a
 * category: no hit and no feed category = undefined, and downstream stays
 * honestly unknown. An accessory (see above) is always undefined.
 */
export function fineCategoryFor(name: string, feedCategory?: string): string | undefined {
  // The feed category is no safer for an accessory: the display guesser
  // reads the same words ("boot" -> Shoes).
  if (isAccessoryListing(name)) return undefined;
  for (const [pattern, key] of RULES) {
    if (pattern.test(name)) return key;
  }
  return feedCategory;
}
