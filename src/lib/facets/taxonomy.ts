// Shopper-facing product types derived from listing names.
//
// The feed gives us a title and a store, nothing else (probed 2026-09-03:
// Serper shopping items carry title, source, link, price, image, rating,
// ratingCount, productId, position), and scrapers.ts guessCategory only
// yields nine coarse buckets. This table turns a name into the label a
// shopper would filter by: "Golf Balls", "Stand Bags", "Earbuds".
//
// Ordered, first hit wins, so specific rules go before general ones
// ("Stand Bag" before "Hybrid": Titleist's Hybrid 14 is a bag). Domains
// whose words are ambiguous outside their context (a golf "driver", an
// "iron") are gated on a domain signal found in the name or the query.
//
// This is deliberately separate from lib/landedCost/classify: those keys
// feed duty and weight tables and are pinned by tests; these are display
// labels and free to grow.

export interface TypeRule {
  pattern: RegExp;
  label: string;
  /** Only applies when the name or query shows this domain signal. */
  domain?: RegExp;
}

const GOLF = /golf|titleist|callaway|taylormade|\bping\b|cobra|mizuno|srixon|scotty cameron|vokey|odyssey|footjoy|\bpxg\b|cleveland|wilson staff/i;

export const TYPE_RULES: ReadonlyArray<TypeRule> = [
  // Golf (gated)
  { pattern: /golf balls?|\bballs?\b/i, label: 'Golf Balls', domain: GOLF },
  { pattern: /stand bag/i, label: 'Stand Bags', domain: GOLF },
  { pattern: /cart bag/i, label: 'Cart Bags', domain: GOLF },
  { pattern: /carry bag|staff bag|golf bag|\bbag\b/i, label: 'Golf Bags', domain: GOLF },
  { pattern: /\bwedges?\b/i, label: 'Wedges', domain: GOLF },
  { pattern: /\bputters?\b/i, label: 'Putters', domain: GOLF },
  { pattern: /\bdrivers?\b/i, label: 'Drivers', domain: GOLF },
  { pattern: /fairway woods?|\bwoods?\b/i, label: 'Fairway Woods', domain: GOLF },
  { pattern: /utility iron|\birons?\b|iron set/i, label: 'Irons', domain: GOLF },
  { pattern: /\bhybrids?\b/i, label: 'Hybrids', domain: GOLF },
  { pattern: /\bgloves?\b/i, label: 'Golf Gloves', domain: GOLF },
  { pattern: /golf shoes?|\bshoes?\b/i, label: 'Golf Shoes', domain: GOLF },
  { pattern: /\bhats?\b|\bcaps?\b|visor/i, label: 'Golf Hats', domain: GOLF },
  { pattern: /rangefinder|alignment stick|training aid|practice net|swing trainer/i, label: 'Training Aids', domain: GOLF },
  { pattern: /polo|shirt|pullover|quarter.zip|jacket|vest|shorts|pants|trousers|skirt/i, label: 'Golf Apparel', domain: GOLF },
  { pattern: /\btees?\b|towel|headcover|head cover|divot|ball marker/i, label: 'Golf Accessories', domain: GOLF },

  // Audio
  { pattern: /earbuds?|\bairpods?\b|in-ear|earphones?/i, label: 'Earbuds' },
  { pattern: /headphones?|headset|over-ear|on-ear/i, label: 'Headphones' },
  { pattern: /soundbar|sound bar/i, label: 'Soundbars' },
  { pattern: /\bspeakers?\b/i, label: 'Speakers' },

  // Computing and phones
  { pattern: /laptop|notebook|macbook|chromebook/i, label: 'Laptops' },
  { pattern: /\btablets?\b|\bipad\b/i, label: 'Tablets' },
  { pattern: /smartwatch|smart watch|apple watch|galaxy watch/i, label: 'Smartwatches' },
  { pattern: /phone case|iphone case|\bcase for\b/i, label: 'Phone Cases' },
  { pattern: /smartphone|\biphone\b|\bpixel \d|galaxy s\d|\bphone\b/i, label: 'Phones' },
  { pattern: /\bmonitors?\b/i, label: 'Monitors' },
  { pattern: /television|\btvs?\b|\boled\b|\bqled\b/i, label: 'TVs' },
  { pattern: /gaming mouse|\bmouse\b|\bmice\b/i, label: 'Mice' },
  { pattern: /keyboard/i, label: 'Keyboards' },
  { pattern: /charger|charging cable|power bank|\busb-c cable\b/i, label: 'Chargers & Cables' },
  { pattern: /playstation|\bxbox\b|nintendo switch|console/i, label: 'Game Consoles' },
  { pattern: /camera|camcorder|\bgopro\b/i, label: 'Cameras' },

  // Home and kitchen
  { pattern: /air fryer/i, label: 'Air Fryers' },
  { pattern: /coffee maker|espresso|keurig|nespresso|french press|coffee machine/i, label: 'Coffee Makers' },
  { pattern: /blender/i, label: 'Blenders' },
  { pattern: /stand mixer|hand mixer|\bmixer\b/i, label: 'Mixers' },
  { pattern: /toaster/i, label: 'Toasters' },
  { pattern: /instant pot|pressure cooker|slow cooker|multicooker/i, label: 'Multicookers' },
  { pattern: /\bvacuum\b|robot vac/i, label: 'Vacuums' },
  { pattern: /tumbler|water bottle|\bflask\b|thermos|travel mug|\bquencher\b/i, label: 'Drinkware' },
  { pattern: /cookware|frying pan|skillet|saucepan|dutch oven|\bpans? set\b/i, label: 'Cookware' },
  { pattern: /\bmattress\b/i, label: 'Mattresses' },
  { pattern: /\bpillow|\bsheets? set\b|\bcomforter\b|\bduvet\b/i, label: 'Bedding' },

  // Footwear (before apparel: "running shoes" beats "running")
  { pattern: /running shoes?|\brunners?\b/i, label: 'Running Shoes' },
  { pattern: /sneakers?|trainers?|\bdunk\b|air force|air max|\bjordan\b/i, label: 'Sneakers' },
  { pattern: /\bboots?\b/i, label: 'Boots' },
  { pattern: /sandals?|slides?|flip.flops?/i, label: 'Sandals' },
  { pattern: /\bshoes?\b|footwear|\bloafers?\b|\bheels\b/i, label: 'Shoes' },

  // Apparel
  { pattern: /leggings?|yoga pants|\btights\b/i, label: 'Leggings' },
  { pattern: /hoodies?|sweatshirts?/i, label: 'Hoodies' },
  { pattern: /jackets?|\bcoats?\b|parka|puffer|windbreaker/i, label: 'Jackets' },
  { pattern: /t-shirts?|\btees?\b|\btshirts?\b/i, label: 'T-Shirts' },
  { pattern: /\bjeans\b|\bdenim\b/i, label: 'Jeans' },
  { pattern: /\bdress(?:es)?\b/i, label: 'Dresses' },
  { pattern: /\bshorts\b/i, label: 'Shorts' },
  { pattern: /sports bra|\bbras?\b/i, label: 'Bras' },
  { pattern: /\bsocks\b/i, label: 'Socks' },

  // Bags
  { pattern: /backpack|rucksack/i, label: 'Backpacks' },
  { pattern: /\btote\b|crossbody|shoulder bag|handbag|\bpurse\b/i, label: 'Handbags' },
  { pattern: /suitcase|luggage|carry-on|carry on\b/i, label: 'Luggage' },

  // Beauty and personal care
  { pattern: /sunscreen|\bspf \d/i, label: 'Sunscreen' },
  { pattern: /moisturizer|moisturizing cream|face cream|hydrating cream/i, label: 'Moisturizers' },
  { pattern: /\bserums?\b/i, label: 'Serums' },
  { pattern: /cleanser|face wash/i, label: 'Cleansers' },
  { pattern: /perfume|cologne|fragrance|eau de/i, label: 'Fragrance' },
  { pattern: /lipstick|lip gloss|mascara|foundation|concealer|eyeshadow/i, label: 'Makeup' },
  { pattern: /hair dryer|airwrap|straightener|curling iron|flat iron/i, label: 'Hair Tools' },
  { pattern: /shampoo|conditioner/i, label: 'Hair Care' },

  // Fitness and outdoors
  { pattern: /dumbbells?|kettlebells?|barbell|weight plates?/i, label: 'Weights' },
  { pattern: /yoga mat|exercise mat/i, label: 'Yoga Mats' },
  { pattern: /treadmill|exercise bike|rowing machine|elliptical/i, label: 'Cardio Machines' },
  { pattern: /\btents?\b|sleeping bag|camping/i, label: 'Camping Gear' },
  { pattern: /\bbikes?\b|bicycle/i, label: 'Bikes' },

  // Toys
  { pattern: /\blego\b|building set|building blocks/i, label: 'Building Sets' },
  { pattern: /\bplush\b|stuffed animal|\bsquishmallow/i, label: 'Plush Toys' },
  { pattern: /board game|puzzle/i, label: 'Games & Puzzles' },
  { pattern: /\bdolls?\b|action figure/i, label: 'Dolls & Figures' },

  // Watches and jewelry (after smartwatches)
  { pattern: /\bwatch(?:es)?\b/i, label: 'Watches' },
  { pattern: /necklace|bracelet|earrings?|\brings?\b/i, label: 'Jewelry' },

  // Books and media
  { pattern: /paperback|hardcover|textbook|\bnovel\b/i, label: 'Books' },
];

const GUESS_BUCKETS = new Set([
  'electronics', 'shoes', 'clothing', 'home', 'beauty', 'kitchen', 'sports', 'toys', 'other',
]);

/** Title case for a feed-provided phrase ("golf balls" -> "Golf Balls"). */
function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * The type label for a listing: the first matching rule (domain-gated
 * rules need their signal in the name or the query), else the feed's own
 * category when it is a real product type (Target's item_type_name, a
 * short clean phrase) rather than one of the nine guessed buckets, else
 * nothing. Never invents a label.
 */
export function productTypeFor(name: string, query: string, feedCategory?: string): string | undefined {
  const haystack = `${name} ${query}`;
  for (const rule of TYPE_RULES) {
    if (rule.domain && !rule.domain.test(haystack)) continue;
    if (rule.pattern.test(name)) return rule.label;
  }
  if (
    feedCategory &&
    !GUESS_BUCKETS.has(feedCategory.trim().toLowerCase()) &&
    /^[A-Za-z][A-Za-z&' -]{1,30}$/.test(feedCategory) &&
    feedCategory.trim().split(/\s+/).length <= 3
  ) {
    return titleCase(feedCategory);
  }
  return undefined;
}

/** Every word used by a type label, lowercased: excluded from series chips. */
export const TYPE_WORDS: ReadonlySet<string> = new Set(
  TYPE_RULES.flatMap((r) => r.label.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)).filter(Boolean)
);
