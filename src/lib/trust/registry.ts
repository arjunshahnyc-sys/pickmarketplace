// The merchant trust registry: the single, versioned source of truth for
// which sellers Pick recognizes, what their official domains are, and how
// each one is treated by trust badges, badge logos, and the landed-cost
// merchant config (storefront country + incoterm).
//
// PRINCIPLES
// - Default deny. A merchant not in this file is unverified, full stop.
//   Verification is opt-in and manual: every entry records when and why it
//   was added.
// - Verification is about the SELLER, not the product. Badge copy must never
//   read as a product-quality judgment.
// - Identity is the collapsed display name (see identity.ts) scoped by feed
//   market, because the feed gives us names, not domains ("Target" in the
//   AU feed is Target Australia, an unrelated company; "eBay" means a
//   different regional marketplace in every feed).
// - Domains are registry metadata, checked as a NEGATIVE signal: when a
//   listing URL carries a real merchant domain, it must match the entry's
//   registered domains exactly (registrable-domain match, allowlisted
//   subdomains only) or the verified badge is withheld. Most Serper listing
//   URLs are Google intermediary links, which carry no signal either way —
//   probed live 2026-08-31: the /shopping payload has no merchant domain or
//   delivery field, so listing-driven domain capture is not possible today.
// - Tiers:
//     brand-direct       official brand store (ikea.com, nike.com, dyson.com)
//     national-retailer  major national chain (walmart.com, acehardware.com)
//     marketplace        platform mixing first- and third-party inventory
//                        (Amazon, eBay, Etsy, Rakuten); gets its own badge,
//                        never the plain "Verified" one
//     config-only        in the registry for landed-cost config (storefront
//                        country) but NOT trust-reviewed; badge stays
//                        "Unverified seller"
// - "Platform - Seller" display names are independent marketplace sellers.
//   They never inherit the platform's badge, logo, or config; they get the
//   distinct "Marketplace seller" treatment when the platform allows
//   third-party sellers, so "sold by Walmart" and "sold by ABOUTYES on
//   Walmart Marketplace" can never be confused.

import type { SourcedValue } from '../landedCost/types';
import { collapse, registrableDomain } from './identity';

export const REGISTRY_VERSION = '2026-09-01.1';

/**
 * A merchant's PUBLISHED standard-shipping policy for its own domestic
 * checkout: tier 2 of the shipping source hierarchy (below a real per-offer
 * quote, above the carrier-benchmark rate tables). Every number is a
 * SourcedValue citing the merchant's own policy page: the calculator's
 * verification gate applies, so an unverified row never becomes a figure.
 * Fields that a policy page states as "varies" are simply absent; the
 * resolver then falls through to the next tier rather than inventing a
 * value.
 */
export interface MerchantShippingPolicy {
  /** Storefront market whose domestic checkout this policy covers. */
  market: RegistryMarket;
  currency: string;
  /** The merchant's own published shipping/delivery policy page. */
  policyUrl: string;
  /** Order value at/above which standard shipping is free (minor units). */
  freeOverMinor?: SourcedValue<number>;
  /** Published flat standard rate below the threshold; absent = unpublished/varies. */
  flatBelowMinor?: SourcedValue<number>;
  /** Standard shipping is free with no minimum. */
  alwaysFree?: SourcedValue<boolean>;
  /** Conditions on the free tier (membership, loyalty signup), stated as an assumption. */
  conditions?: string;
  notes?: string;
}

export type TrustTier =
  | 'brand-direct'
  | 'national-retailer'
  | 'marketplace'
  | 'config-only';

/** Feed markets a registry entry can appear in (matches FEED_MARKETS). */
export type RegistryMarket = 'us' | 'gb' | 'de' | 'fr' | 'ca' | 'au' | 'jp';

export interface MerchantDomains {
  /** Registrable domain (eTLD+1), lowercase: 'ikea.com'. */
  canonical: string;
  /** Official regional domains: 'ikea.co.uk', 'ikea.de'. */
  regional?: string[];
  /**
   * Subdomains allowed to carry the badge; anything else is treated as an
   * uncontrolled subdomain and rejected. 'www' is always allowed.
   */
  allowedSubdomains?: string[];
}

export interface MerchantEntry {
  /** Canonical merchant id, unique across the registry: 'ikea-us'. */
  id: string;
  displayName: string;
  /**
   * Collapsed name variants (identity.ts collapse()) that resolve to this
   * entry within its markets. Must be stored in collapsed form.
   */
  aliases: string[];
  /** Feed markets where these aliases mean THIS merchant. */
  markets: RegistryMarket[];
  domains: MerchantDomains;
  tier: TrustTier;
  /**
   * Badge logo asset under public/logos. Required for every trust-reviewed
   * tier (the product rule is "every recognized seller shows a logo");
   * null only on config-only entries.
   */
  logo: string | null;
  /** When and why this entry was added; the registry's audit trail. */
  added: { date: string; reason: string };
  /** ISO 3166-1 alpha-2 of the storefront, for landed-cost lane detection. */
  storefrontCountry: string;
  /**
   * 'unknown' until verified: the engine then shows a DDP-to-DAP range,
   * never a point estimate. Do not set DDP/DAP without a sourced note.
   */
  incoterm: 'DDP' | 'DAP' | 'unknown';
  /**
   * True for platforms whose feed names appear as "Platform - Seller" for
   * independent sellers (drives the "Marketplace seller" treatment).
   */
  allowsThirdPartySellers?: boolean;
  /** Published standard-shipping policy for the storefront's domestic checkout. */
  shippingPolicy?: MerchantShippingPolicy;
  notes?: string;
}

// ─── Entry builders ────────────────────────────────────────────────────────
// Everything trust-reviewed on 2026-08-31 was either migrated from the
// hand-curated VERIFIED set / merchants.ts tables (in production since
// 2026-08-26) or added by the owner-approved 2026-08-31 registry review.

const MIGRATED = {
  date: '2026-08-31',
  reason: 'Migrated from the VERIFIED set / merchants.ts tables (in production since 2026-08-26).',
};
const REVIEW_2026_08_31 = (why: string) => ({ date: '2026-08-31', reason: why });

interface EntrySpec {
  id: string;
  name: string;
  aliases?: string[];
  markets?: RegistryMarket[];
  domain: string;
  regional?: string[];
  subdomains?: string[];
  tier?: TrustTier;
  logo?: string | null;
  country?: string;
  added?: { date: string; reason: string };
  thirdParty?: boolean;
  shipping?: MerchantShippingPolicy;
  notes?: string;
}

function entry(spec: EntrySpec): MerchantEntry {
  const tier = spec.tier ?? 'national-retailer';
  return {
    id: spec.id,
    displayName: spec.name,
    aliases: spec.aliases ?? [collapse(spec.name)],
    markets: spec.markets ?? ['us'],
    domains: {
      canonical: spec.domain,
      ...(spec.regional ? { regional: spec.regional } : {}),
      ...(spec.subdomains ? { allowedSubdomains: spec.subdomains } : {}),
    },
    tier,
    logo: spec.logo === undefined ? (tier === 'config-only' ? null : `/logos/${collapse(spec.name)}.svg`) : spec.logo,
    added: spec.added ?? MIGRATED,
    storefrontCountry: spec.country ?? 'US',
    incoterm: 'unknown',
    ...(spec.thirdParty ? { allowsThirdPartySellers: true } : {}),
    ...(spec.shipping ? { shippingPolicy: spec.shipping } : {}),
    ...(spec.notes ? { notes: spec.notes } : {}),
  };
}

// ─── Published US shipping policies ────────────────────────────────────────
// Research pass 2026-08-31: 4 finder agents fetched each merchant's own
// policy page; two verifier batches (nike.. and ulta..) adversarially
// confirmed every claim the same day; the other two verifier agents died on
// session limits, so those merchants' figures (walmart, target, bestbuy,
// lowes, rei, staples, wayfair) were re-fetched and confirmed against the
// live pages directly on 2026-09-01. Merchants whose pages publish no
// usable figure (amazon: no dollar threshold published; home depot: policy
// page broken; costco: per-item fees; ikea/acehardware: checkout-calculated)
// are deliberately ABSENT - the resolver falls to the carrier benchmark
// rather than inventing a number. Where a merchant has member and guest
// tiers, the GUEST tier is encoded (worst case) with the member tier noted.

function usPolicy(spec: {
  url: string;
  v: string; // lastVerified
  freeOver?: number;
  flat?: number;
  alwaysFree?: boolean;
  conditions?: string;
  notes?: string;
}): MerchantShippingPolicy {
  const sv = <T>(value: T): SourcedValue<T> => ({
    value,
    sourceUrl: spec.url,
    lastVerified: spec.v,
    verification: 'verified',
  });
  return {
    market: 'us',
    currency: 'USD',
    policyUrl: spec.url,
    ...(spec.freeOver !== undefined ? { freeOverMinor: sv(spec.freeOver) } : {}),
    ...(spec.flat !== undefined ? { flatBelowMinor: sv(spec.flat) } : {}),
    ...(spec.alwaysFree ? { alwaysFree: sv(true) } : {}),
    ...(spec.conditions ? { conditions: spec.conditions } : {}),
    ...(spec.notes ? { notes: spec.notes } : {}),
  };
}

const P: Record<string, MerchantShippingPolicy> = {
  'walmart-us': usPolicy({
    url: 'https://www.walmart.com/help/article/the-walmart-site-and-app-experience/27f2678cb25a40a7b57a359fec3ca67f',
    v: '2026-09-01',
    freeOver: 3500,
    flat: 699,
    conditions:
      'Pharmacy, photo, wireless, and tires excluded from the $35 minimum; heavy/oversized freight carries surcharges; Walmart+ members pay no below-minimum fee.',
  }),
  'target-us': usPolicy({
    url: 'https://www.target.com/help/article/000055608',
    v: '2026-09-01',
    freeOver: 3500,
    flat: 599,
    conditions:
      'Free over $35 excluding tax and promotional discounts, or on any order paid with a Target Circle Card; large/heavy items can carry per-unit delivery fees.',
  }),
  'bestbuy-us': usPolicy({
    url: 'https://www.bestbuy.com/site/help-topics/free-shipping/pcmcat276800050002.c?id=pcmcat276800050002',
    v: '2026-09-01',
    freeOver: 3500,
    conditions:
      'Never applies to Marketplace products; $35 total is after coupons, before taxes; large TVs, appliances, and scheduled-delivery items differ; below-threshold rates are checkout-calculated (not published).',
  }),
  'lowes-us': usPolicy({
    url: 'https://www.lowes.com/l/help/shipping-delivery',
    v: '2026-09-01',
    freeOver: 2500,
    conditions:
      'Parcel orders under 150 lbs to the contiguous US; excludes special orders, hazardous-material orders, major appliances, and marketplace sellers; below-threshold rates are weight-based at checkout (not published).',
  }),
  'rei-us': usPolicy({
    url: 'https://www.rei.com/terms/free-shipping',
    v: '2026-09-01',
    freeOver: 6000,
    conditions:
      'Non-member tier; REI Co-op Members ship free with no minimum. Oversize charges still apply to heavy/large items; below-threshold rate is not published.',
  }),
  'staples-us': usPolicy({
    url: 'https://www.staples.com/sbd/content/help/new/tips.html',
    v: '2026-09-01',
    freeOver: 7500,
    conditions:
      'Applies to "most orders" per the published policy; below-threshold rate is not published.',
  }),
  'wayfair-us': usPolicy({
    url: 'https://www.wayfair.com/customerservice/shipping_info.php',
    v: '2026-09-01',
    freeOver: 3500,
    flat: 499,
    conditions:
      'Contiguous US standard ground; items with their own per-item shipping charges are excluded and do not count toward the $35.',
  }),
  'nike-us': usPolicy({
    url: 'https://www.nike.com/help/a/shipping-delivery',
    v: '2026-08-31',
    freeOver: 7500,
    flat: 800,
    conditions:
      'Guest tier; Nike Members get free standard at $50+ and $5 below.',
  }),
  'apple-us': usPolicy({
    url: 'https://www.apple.com/shop/help/shipping_delivery',
    v: '2026-08-31',
    alwaysFree: true,
    conditions: 'Standard delivery is free for all online orders; faster options cost extra.',
  }),
  'dyson-us': usPolicy({
    url: 'https://www.dyson.com/inside-dyson/terms/delivery-details',
    v: '2026-08-31',
    freeOver: 5000,
    flat: 499,
  }),
  'macys-us': usPolicy({
    url: 'https://www.macys.com/customer-service/articles/shipping-options-times',
    v: '2026-08-31',
    freeOver: 4900,
    flat: 1095,
    conditions:
      'Baseline non-member tier, pre-tax; a $10 surcharge applies to AK, HI, military addresses, and US territories.',
  }),
  'nordstrom-us': usPolicy({
    url: 'https://www.nordstrom.com/browse/services/shipping-methods-charges/free-shipping-and-returns',
    v: '2026-08-31',
    alwaysFree: true,
    conditions: 'Free standard shipping anywhere in the US with no minimum or membership.',
  }),
  'kohls-us': usPolicy({
    url: 'https://www.kohls.com/faq/article/5',
    v: '2026-08-31',
    freeOver: 4900,
    flat: 895,
  }),
  'ulta-us': usPolicy({
    url: 'https://www.ulta.com/guestservices/all',
    v: '2026-08-31',
    flat: 695,
    notes:
      'No unconditional free tier is published (free-shipping promotions run periodically), so the published $6.95 standard rate applies at every order value.',
  }),
  'sephora-us': usPolicy({
    url: 'https://www.sephora.com/beauty/shipping-information',
    v: '2026-08-31',
    freeOver: 5000,
    flat: 695,
    conditions:
      'Guest-checkout tier, excluding taxes; Beauty Insider members (free signup) ship free with no minimum.',
  }),
  'dickssportinggoods-us': usPolicy({
    url: 'https://www.dickssportinggoods.com/s/shipping-value-promo-details',
    v: '2026-08-31',
    freeOver: 7500,
    conditions:
      'No-account tier with exclusions (oversized items etc.); below-threshold rates are size/weight-based at checkout (not published).',
  }),
  'academysports-us': usPolicy({
    url: 'https://www.academy.com/help/free-shipping-qualification',
    v: '2026-08-31',
    freeOver: 5000,
    conditions:
      'Signed-out tier, pre-tax, standard ground to contiguous states EXCLUDING California; below-threshold rate is not published.',
  }),
  'bhphoto-us': usPolicy({
    url: 'https://www.bhphotovideo.com/find/HelpCenter/Shipping.jsp',
    v: '2026-08-31',
    alwaysFree: true,
    conditions: 'Most items, contiguous US; expedited free over $49 on most orders.',
  }),
  'officedepot-us': usPolicy({
    url: 'https://www.officedepot.com/l/help/delivery',
    v: '2026-08-31',
    freeOver: 5000,
    conditions:
      'Qualifying orders, contiguous US; non-qualifying orders carry a $9.95 MINIMUM fee that varies upward (not a flat rate, so no below-threshold figure is encoded).',
  }),
};

// ─── The registry ──────────────────────────────────────────────────────────

export const REGISTRY: readonly MerchantEntry[] = [
  // US market ─ marketplaces
  entry({
    id: 'amazon-us', name: 'Amazon', aliases: ['amazon'], domain: 'amazon.com',
    tier: 'marketplace', logo: '/logos/amazon.svg', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace: amazon.com mixes Amazon retail and third-party sellers; the feed cannot tell them apart.'),
  }),
  entry({
    id: 'ebay-us', name: 'eBay', aliases: ['ebay'], domain: 'ebay.com',
    tier: 'marketplace', logo: '/logos/ebay.svg', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace: eBay inventory is third-party sellers.'),
  }),
  entry({
    id: 'etsy-us', name: 'Etsy', aliases: ['etsy'], domain: 'etsy.com',
    tier: 'marketplace', logo: '/logos/etsy.svg', thirdParty: true,
    added: REVIEW_2026_08_31('Added as marketplace: established platform, listings are independent sellers.'),
  }),

  // US market ─ national retailers and brand-direct stores
  entry({ id: 'walmart-us', shipping: P['walmart-us'], name: 'Walmart', domain: 'walmart.com', thirdParty: true }),
  entry({ id: 'target-us', shipping: P['target-us'], name: 'Target', domain: 'target.com', thirdParty: true }),
  entry({ id: 'bestbuy-us', shipping: P['bestbuy-us'], name: 'Best Buy', domain: 'bestbuy.com', thirdParty: true }),
  entry({ id: 'costco-us', name: 'Costco', domain: 'costco.com' }),
  entry({ id: 'homedepot-us', name: 'Home Depot', domain: 'homedepot.com' }),
  entry({ id: 'lowes-us', shipping: P['lowes-us'], name: "Lowe's", domain: 'lowes.com' }),
  entry({ id: 'macys-us', shipping: P['macys-us'], name: "Macy's", domain: 'macys.com' }),
  entry({ id: 'nordstrom-us', shipping: P['nordstrom-us'], name: 'Nordstrom', domain: 'nordstrom.com' }),
  entry({ id: 'wayfair-us', shipping: P['wayfair-us'], name: 'Wayfair', domain: 'wayfair.com' }),
  entry({ id: 'kroger-us', name: 'Kroger', domain: 'kroger.com' }),
  entry({ id: 'kohls-us', shipping: P['kohls-us'], name: "Kohl's", domain: 'kohls.com' }),
  entry({ id: 'samsclub-us', name: "Sam's Club", domain: 'samsclub.com' }),
  entry({
    id: 'bhphoto-us', shipping: P['bhphoto-us'], name: 'B&H Photo Video',
    aliases: ['bhphoto', 'bhphotovideo', 'bhphotovideoaudio'],
    domain: 'bhphotovideo.com', logo: '/logos/bhphoto.svg',
  }),
  entry({ id: 'adorama-us', name: 'Adorama', domain: 'adorama.com' }),
  entry({ id: 'newegg-us', name: 'Newegg', domain: 'newegg.com' }),
  entry({ id: 'staples-us', shipping: P['staples-us'], name: 'Staples', domain: 'staples.com' }),
  entry({
    id: 'officedepot-us', shipping: P['officedepot-us'], name: 'Office Depot',
    aliases: ['officedepot', 'officedepotofficemax'],
    domain: 'officedepot.com', logo: '/logos/officedepot.svg',
  }),
  entry({ id: 'rei-us', shipping: P['rei-us'], name: 'REI', domain: 'rei.com' }),
  entry({ id: 'chewy-us', name: 'Chewy', domain: 'chewy.com' }),
  entry({ id: 'gamestop-us', name: 'GameStop', domain: 'gamestop.com' }),
  entry({ id: 'microcenter-us', name: 'Micro Center', domain: 'microcenter.com' }),
  entry({ id: 'dickssportinggoods-us', shipping: P['dickssportinggoods-us'], name: "Dick's Sporting Goods", domain: 'dickssportinggoods.com' }),
  entry({ id: 'apple-us', shipping: P['apple-us'], name: 'Apple', domain: 'apple.com', tier: 'brand-direct' }),
  entry({ id: 'nike-us', shipping: P['nike-us'], name: 'Nike', domain: 'nike.com', tier: 'brand-direct' }),
  entry({
    id: 'academysports-us', shipping: P['academysports-us'], name: 'Academy Sports + Outdoors',
    aliases: ['academysportsoutdoors'], domain: 'academy.com',
    logo: '/logos/academysportsoutdoors.svg',
  }),
  entry({ id: 'golfgalaxy-us', name: 'Golf Galaxy', domain: 'golfgalaxy.com' }),
  entry({ id: 'stanley1913-us', name: 'Stanley 1913', domain: 'stanley1913.com', tier: 'brand-direct' }),
  entry({ id: 'zumiez-us', name: 'Zumiez', domain: 'zumiez.com' }),
  entry({ id: 'petco-us', name: 'Petco', domain: 'petco.com' }),
  entry({ id: 'petsmart-us', name: 'PetSmart', domain: 'petsmart.com' }),
  entry({
    id: 'ulta-us', shipping: P['ulta-us'], name: 'Ulta Beauty', aliases: ['ulta', 'ultabeauty'],
    domain: 'ulta.com', logo: '/logos/ulta.svg',
  }),
  entry({ id: 'sephora-us', shipping: P['sephora-us'], name: 'Sephora', domain: 'sephora.com' }),
  entry({
    id: 'bathbodyworks-us', name: 'Bath & Body Works',
    aliases: ['bathbodyworks', 'bathandbodyworks'],
    domain: 'bathandbodyworks.com', logo: '/logos/bathbodyworks.svg',
  }),
  entry({ id: 'footlocker-us', name: 'Foot Locker', domain: 'footlocker.com' }),
  entry({ id: 'finishline-us', name: 'Finish Line', domain: 'finishline.com' }),
  entry({ id: 'jcpenney-us', name: 'JCPenney', domain: 'jcpenney.com' }),
  entry({ id: 'dillards-us', name: "Dillard's", domain: 'dillards.com' }),
  entry({ id: 'belk-us', name: 'Belk', domain: 'belk.com' }),
  entry({
    id: 'qvc-us', name: 'QVC', domain: 'qvc.com',
    added: REVIEW_2026_08_31('Promoted config-only → verified: established US retailer, already in the landed-cost config.'),
  }),
  entry({
    id: 'crateandbarrel-us', name: 'Crate & Barrel',
    // Serper reports both spellings; '&' collapses away, 'and' doesn't.
    aliases: ['crateandbarrel', 'cratebarrel'],
    domain: 'crateandbarrel.com', logo: '/logos/crateandbarrel.svg',
  }),
  entry({ id: 'williamssonoma-us', name: 'Williams Sonoma', domain: 'williams-sonoma.com' }),
  entry({ id: 'potterybarn-us', name: 'Pottery Barn', domain: 'potterybarn.com' }),
  entry({
    id: 'ikea-us', name: 'IKEA', aliases: ['ikea', 'ikeaus'],
    domain: 'ikea.com',
    regional: ['ikea.co.uk', 'ikea.de', 'ikea.fr', 'ikea.ca', 'ikea.com.au', 'ikea.co.jp'],
    tier: 'brand-direct', logo: '/logos/ikea.svg',
    added: REVIEW_2026_08_31('Owner-approved 2026-08-31: official first-party brand site was showing "Unverified seller".'),
  }),
  entry({
    id: 'acehardware-us', name: 'Ace Hardware', domain: 'acehardware.com',
    added: REVIEW_2026_08_31('Owner-approved 2026-08-31: official first-party retail site was showing "Unverified seller".'),
  }),
  entry({
    id: 'dyson-us', shipping: P['dyson-us'], name: 'Dyson', domain: 'dyson.com',
    regional: ['dyson.co.uk', 'dyson.de', 'dyson.fr', 'dyson.ca', 'dyson.com.au', 'dyson.co.jp'],
    tier: 'brand-direct',
    added: REVIEW_2026_08_31('Owner-approved 2026-08-31 brand-direct list.'),
  }),

  // GB market
  entry({
    id: 'amazon-gb', name: 'Amazon UK', aliases: ['amazoncouk'], markets: ['gb'],
    domain: 'amazon.co.uk', tier: 'marketplace', logo: '/logos/amazon.svg',
    country: 'GB', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see amazon-us).'),
  }),
  entry({
    id: 'ebay-gb', name: 'eBay UK', aliases: ['ebay'], markets: ['gb'],
    domain: 'ebay.co.uk', tier: 'marketplace', logo: '/logos/ebay.svg',
    country: 'GB', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see ebay-us).'),
  }),
  entry({
    id: 'currys-gb', name: 'Currys', aliases: ['currys', 'curryspcworld'],
    markets: ['gb'], domain: 'currys.co.uk', logo: '/logos/currys.svg', country: 'GB',
  }),
  entry({ id: 'argos-gb', name: 'Argos', markets: ['gb'], domain: 'argos.co.uk', country: 'GB' }),
  entry({ id: 'johnlewis-gb', name: 'John Lewis', markets: ['gb'], domain: 'johnlewis.com', country: 'GB' }),
  entry({
    id: 'costco-gb', name: 'Costco UK', aliases: ['costcowholesaleuk'],
    markets: ['gb'], domain: 'costco.co.uk', logo: '/logos/costco.svg', country: 'GB',
  }),
  entry({
    id: 'ao-gb', name: 'AO', aliases: ['ao', 'aocom'], markets: ['gb'],
    domain: 'ao.com', logo: '/logos/ao.svg', country: 'GB',
  }),
  entry({ id: 'boots-gb', name: 'Boots', markets: ['gb'], domain: 'boots.com', country: 'GB' }),
  entry({ id: 'screwfix-gb', name: 'Screwfix', markets: ['gb'], domain: 'screwfix.com', country: 'GB' }),
  entry({ id: 'very-gb', name: 'Very', markets: ['gb'], domain: 'very.co.uk', country: 'GB' }),
  entry({
    id: 'cex-gb', name: 'CeX', markets: ['gb'], domain: 'webuy.com', country: 'GB',
    added: REVIEW_2026_08_31('Promoted config-only → verified: established GB chain, already in the landed-cost config.'),
  }),

  // DE/FR markets (EU storefronts appear in both feeds; countries are TRUE
  // storefront countries so intra-EU lanes resolve correctly)
  entry({
    id: 'amazon-de', name: 'Amazon Germany', aliases: ['amazonde'], markets: ['de', 'fr'],
    domain: 'amazon.de', tier: 'marketplace', logo: '/logos/amazon.svg',
    country: 'DE', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see amazon-us).'),
  }),
  entry({
    id: 'amazon-fr', name: 'Amazon France', aliases: ['amazonfr'], markets: ['de', 'fr'],
    domain: 'amazon.fr', tier: 'marketplace', logo: '/logos/amazon.svg',
    country: 'FR', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see amazon-us).'),
  }),
  entry({ id: 'otto-de', name: 'Otto', markets: ['de', 'fr'], domain: 'otto.de', country: 'DE' }),
  entry({ id: 'mediamarkt-de', name: 'MediaMarkt', markets: ['de', 'fr'], domain: 'mediamarkt.de', country: 'DE' }),
  entry({ id: 'saturn-de', name: 'Saturn', markets: ['de', 'fr'], domain: 'saturn.de', country: 'DE' }),
  entry({
    id: 'zalando-de', name: 'Zalando', markets: ['de', 'fr'],
    domain: 'zalando.de', regional: ['zalando.fr'], country: 'DE',
  }),
  entry({ id: 'cyberport-de', name: 'Cyberport', markets: ['de', 'fr'], domain: 'cyberport.de', tier: 'config-only', country: 'DE' }),
  entry({
    id: 'kaufland-de', name: 'Kaufland', aliases: ['kauflandde'], markets: ['de', 'fr'],
    domain: 'kaufland.de', tier: 'config-only', country: 'DE',
  }),
  entry({ id: 'fnac-fr', name: 'Fnac', markets: ['de', 'fr'], domain: 'fnac.com', country: 'FR' }),
  entry({ id: 'darty-fr', name: 'Darty', markets: ['de', 'fr'], domain: 'darty.com', country: 'FR' }),
  entry({ id: 'cdiscount-fr', name: 'Cdiscount', markets: ['de', 'fr'], domain: 'cdiscount.com', tier: 'config-only', country: 'FR' }),
  entry({ id: 'boulanger-fr', name: 'Boulanger', markets: ['de', 'fr'], domain: 'boulanger.com', country: 'FR' }),
  entry({ id: 'laredoute-fr', name: 'La Redoute', markets: ['de', 'fr'], domain: 'laredoute.fr', tier: 'config-only', country: 'FR' }),
  entry({
    id: 'coolblue-nl', name: 'Coolblue', aliases: ['coolblue', 'coolbluede'],
    markets: ['de', 'fr'], domain: 'coolblue.nl', regional: ['coolblue.de'],
    logo: '/logos/coolblue.svg', country: 'NL',
    notes: 'Dutch chain selling into DE/FR: intra-EU lane.',
  }),
  entry({
    id: 'ebay-de', name: 'eBay Germany', aliases: ['ebay'], markets: ['de'],
    domain: 'ebay.de', tier: 'marketplace', logo: '/logos/ebay.svg',
    country: 'DE', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see ebay-us).'),
  }),
  entry({
    id: 'ebay-fr', name: 'eBay France', aliases: ['ebay'], markets: ['fr'],
    domain: 'ebay.fr', tier: 'marketplace', logo: '/logos/ebay.svg',
    country: 'FR', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see ebay-us).'),
  }),

  // CA market (binational banners are their .ca storefronts in the CA feed)
  entry({
    id: 'amazon-ca', name: 'Amazon Canada', aliases: ['amazonca'], markets: ['ca'],
    domain: 'amazon.ca', tier: 'marketplace', logo: '/logos/amazon.svg',
    country: 'CA', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see amazon-us).'),
  }),
  entry({
    id: 'walmart-ca', name: 'Walmart Canada', aliases: ['walmart', 'walmartca'],
    markets: ['ca'], domain: 'walmart.ca', logo: '/logos/walmart.svg',
    country: 'CA', thirdParty: true,
  }),
  entry({
    id: 'bestbuy-ca', name: 'Best Buy Canada', aliases: ['bestbuy', 'bestbuycanada'],
    markets: ['ca'], domain: 'bestbuy.ca', logo: '/logos/bestbuy.svg',
    country: 'CA', thirdParty: true,
  }),
  entry({
    id: 'bestbuy-ca-marketplace', name: 'Best Buy Canada Marketplace',
    aliases: ['bestbuycanadamarketplace'], markets: ['ca'],
    domain: 'bestbuy.ca', tier: 'config-only', country: 'CA',
    notes: 'Explicitly third-party inventory; stays unverified.',
  }),
  entry({
    id: 'costco-ca', name: 'Costco Canada', aliases: ['costco'], markets: ['ca'],
    domain: 'costco.ca', logo: '/logos/costco.svg', country: 'CA',
  }),
  entry({
    id: 'homedepot-ca', name: 'Home Depot Canada', aliases: ['homedepot', 'thehomedepot'],
    markets: ['ca'], domain: 'homedepot.ca', logo: '/logos/homedepot.svg', country: 'CA',
  }),
  entry({
    id: 'staples-ca', name: 'Staples Canada', aliases: ['staples'], markets: ['ca'],
    domain: 'staples.ca', logo: '/logos/staples.svg', country: 'CA',
  }),
  entry({ id: 'canadiantire-ca', name: 'Canadian Tire', markets: ['ca'], domain: 'canadiantire.ca', country: 'CA' }),
  entry({ id: 'londondrugs-ca', name: 'London Drugs', markets: ['ca'], domain: 'londondrugs.com', country: 'CA' }),
  entry({
    id: 'thesource-ca', name: 'The Source', aliases: ['thesource', 'source'],
    markets: ['ca'], domain: 'thesource.ca', tier: 'config-only', country: 'CA',
    notes: "collapse('The Source') strips the leading 'the', so both keys are needed.",
  }),
  entry({
    id: 'ebay-ca', name: 'eBay Canada', aliases: ['ebay'], markets: ['ca'],
    domain: 'ebay.ca', tier: 'marketplace', logo: '/logos/ebay.svg',
    country: 'CA', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see ebay-us).'),
  }),

  // AU market
  entry({
    id: 'amazon-au', name: 'Amazon Australia', aliases: ['amazonau', 'amazoncomau'],
    markets: ['au'], domain: 'amazon.com.au', tier: 'marketplace',
    logo: '/logos/amazon.svg', country: 'AU', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see amazon-us).'),
  }),
  entry({ id: 'jbhifi-au', name: 'JB Hi-Fi', markets: ['au'], domain: 'jbhifi.com.au', country: 'AU' }),
  entry({ id: 'harveynorman-au', name: 'Harvey Norman', markets: ['au'], domain: 'harveynorman.com.au', country: 'AU' }),
  entry({
    id: 'thegoodguys-au', name: 'The Good Guys', aliases: ['thegoodguys', 'goodguys'],
    markets: ['au'], domain: 'thegoodguys.com.au', logo: '/logos/thegoodguys.svg',
    country: 'AU',
    notes: "collapse('The Good Guys') strips the leading 'the', so both keys are needed.",
  }),
  entry({ id: 'bigw-au', name: 'Big W', markets: ['au'], domain: 'bigw.com.au', country: 'AU' }),
  entry({ id: 'kmart-au', name: 'Kmart Australia', aliases: ['kmart'], markets: ['au'], domain: 'kmart.com.au', tier: 'config-only', country: 'AU' }),
  entry({
    id: 'target-au', name: 'Target Australia', aliases: ['target'], markets: ['au'],
    domain: 'target.com.au', logo: '/logos/targetau.svg', country: 'AU',
    notes: 'Unrelated to Target US; in the AU feed the name means the local chain.',
    added: REVIEW_2026_08_31('Own entry so Target Australia stops borrowing Target US identity and logo.'),
  }),
  entry({ id: 'officeworks-au', name: 'Officeworks', markets: ['au'], domain: 'officeworks.com.au', country: 'AU' }),
  entry({ id: 'myer-au', name: 'Myer', markets: ['au'], domain: 'myer.com.au', country: 'AU' }),
  entry({ id: 'davidjones-au', name: 'David Jones', markets: ['au'], domain: 'davidjones.com', country: 'AU' }),
  entry({ id: 'catch-au', name: 'Catch', markets: ['au'], domain: 'catch.com.au', tier: 'config-only', country: 'AU' }),
  entry({ id: 'kogan-au', name: 'Kogan', markets: ['au'], domain: 'kogan.com', tier: 'config-only', country: 'AU' }),
  entry({
    id: 'sonyaustralia-au', name: 'Sony Australia', aliases: ['sonyaustraliaonline'],
    markets: ['au'], domain: 'sony.com.au', tier: 'config-only', country: 'AU',
  }),
  entry({
    id: 'ebay-au', name: 'eBay Australia', aliases: ['ebay'], markets: ['au'],
    domain: 'ebay.com.au', tier: 'marketplace', logo: '/logos/ebay.svg',
    country: 'AU', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see ebay-us).'),
  }),

  // JP market ("Amazon公式サイト" collapses to 'amazon', which in the JP feed
  // is amazon.co.jp; most JP script names collapse to '' and stay unknown)
  entry({
    id: 'amazon-jp', name: 'Amazon Japan', aliases: ['amazon', 'amazoncojp'],
    markets: ['jp'], domain: 'amazon.co.jp', tier: 'marketplace',
    logo: '/logos/amazon.svg', country: 'JP', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace (see amazon-us).'),
  }),
  entry({
    id: 'rakuten-jp', name: 'Rakuten', markets: ['jp'], domain: 'rakuten.co.jp',
    tier: 'marketplace', logo: '/logos/rakuten.svg', country: 'JP', thirdParty: true,
    added: REVIEW_2026_08_31('Reclassified verified → marketplace: Rakuten Ichiba is a mall of independent stores.'),
  }),
  entry({ id: 'yodobashi-jp', name: 'Yodobashi Camera', aliases: ['yodobashi'], markets: ['jp'], domain: 'yodobashi.com', logo: '/logos/yodobashi.svg', country: 'JP' }),
  entry({ id: 'biccamera-jp', name: 'Bic Camera', markets: ['jp'], domain: 'biccamera.com', logo: '/logos/biccamera.svg', country: 'JP' }),
  entry({
    id: 'yahooshopping-jp', name: 'Yahoo! Shopping', aliases: ['yahooshopping'],
    markets: ['jp'], domain: 'yahoo.co.jp', subdomains: ['shopping', 'store', 'www'],
    tier: 'config-only', country: 'JP',
  }),
];

// ─── Resolution ────────────────────────────────────────────────────────────

type MarketIndex = Record<string, Map<string, MerchantEntry>>;

function buildIndex(): { byMarket: MarketIndex; global: Map<string, MerchantEntry> } {
  const byMarket: MarketIndex = {};
  const global = new Map<string, MerchantEntry>();
  for (const e of REGISTRY) {
    for (const market of e.markets) {
      const table = (byMarket[market] ??= new Map());
      for (const alias of e.aliases) {
        // Duplicate aliases within one market are a registry bug; the
        // validation test enforces this, and first-wins keeps runtime sane.
        if (!table.has(alias)) table.set(alias, e);
      }
    }
    for (const alias of e.aliases) {
      // Cross-market duplicates are expected ('ebay', 'target'); registry
      // order decides the global winner, and US entries are listed first.
      if (!global.has(alias)) global.set(alias, e);
    }
  }
  return { byMarket, global };
}

const { byMarket: INDEX, global: GLOBAL_INDEX } = buildIndex();

function normalizeMarket(market?: string): string {
  return (market ?? 'us').toLowerCase();
}

/**
 * Resolve a raw merchant display name (feed value) to its registry entry.
 * The feed market's own aliases win; a miss falls through to the US table
 * (a US brand in a foreign feed usually ships from the US — same fallthrough
 * the landed-cost config has always used), then to any market's entry:
 * trust recognition is brand-global ("Currys" is Currys wherever it shows
 * up), while the landed-cost config stays strictly market-scoped through
 * merchants.ts, so a global hit can never mislabel a shipping lane.
 * Unresolvable names return null: the default state is unverified.
 */
export function resolveMerchant(
  rawName: string,
  market?: string
): MerchantEntry | null {
  const key = collapse(rawName);
  if (!key) return null;
  const m = normalizeMarket(market);
  return INDEX[m]?.get(key) ?? INDEX['us']?.get(key) ?? GLOBAL_INDEX.get(key) ?? null;
}

/** Look up an entry by canonical id (scripts, tests). */
export function getEntryById(id: string): MerchantEntry | null {
  return REGISTRY.find((e) => e.id === id) ?? null;
}

// ─── Domain matching ───────────────────────────────────────────────────────

export type DomainSignal = 'match' | 'mismatch' | 'no-signal';

// Hosts that are intermediaries, not merchant sites: they say nothing about
// who the seller is. Serper listing links are Google shopping redirects.
const NEUTRAL_DOMAINS = new Set(['google.com', 'bing.com', 'doubleclick.net']);

function unwrapAffiliate(url: string): string {
  const wrapper = process.env.NEXT_PUBLIC_AFFILIATE_LINK_WRAPPER;
  if (wrapper && url.startsWith(wrapper)) {
    try {
      return decodeURIComponent(url.slice(wrapper.length));
    } catch {
      return url;
    }
  }
  return url;
}

/**
 * What a listing URL says about whether the offer really lives on the
 * entry's official domain.
 *
 *   'match'     hostname is a registered domain (or an allowlisted
 *               subdomain of one)
 *   'mismatch'  a real, non-intermediary host that is NOT registered for
 *               this merchant — lookalikes ("ikea-outlet.com"), uncontrolled
 *               subdomains ("ikea.evil.com"), and typosquats land here and
 *               the badge is withheld
 *   'no-signal' no URL, an unparseable URL, or a Google intermediary link;
 *               name-based resolution stands on its own
 *
 * Redirect chains cannot be followed client-side; the check applies to the
 * URL the card actually links to, which for major US retailers is a
 * synthesized official-domain link and for everything else is usually a
 * Google intermediary (no-signal).
 */
export function domainSignal(
  url: string | undefined,
  entry: MerchantEntry
): DomainSignal {
  if (!url) return 'no-signal';
  let hostname: string;
  try {
    hostname = new URL(unwrapAffiliate(url)).hostname.toLowerCase();
  } catch {
    return 'no-signal';
  }
  const rd = registrableDomain(hostname);
  if (!rd) return 'no-signal';
  if (NEUTRAL_DOMAINS.has(rd)) return 'no-signal';

  const registered = [entry.domains.canonical, ...(entry.domains.regional ?? [])];
  const allowedSubs = new Set(['www', ...(entry.domains.allowedSubdomains ?? [])]);
  for (const domain of registered) {
    if (hostname === domain) return 'match';
    if (hostname.endsWith(`.${domain}`)) {
      const sub = hostname.slice(0, -(domain.length + 1));
      if (allowedSubs.has(sub)) return 'match';
      return 'mismatch'; // uncontrolled subdomain of a real domain
    }
  }
  return 'mismatch';
}

// ─── Validation (exercised by the registry test suite) ─────────────────────

export function validateRegistry(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const aliasByMarket = new Map<string, string>();

  for (const e of REGISTRY) {
    if (ids.has(e.id)) errors.push(`duplicate id: ${e.id}`);
    ids.add(e.id);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.added.date)) {
      errors.push(`${e.id}: added.date is not YYYY-MM-DD`);
    }
    if (!e.added.reason.trim()) errors.push(`${e.id}: added.reason is empty`);
    if (!/^[A-Z]{2}$/.test(e.storefrontCountry)) {
      errors.push(`${e.id}: storefrontCountry is not ISO alpha-2`);
    }
    if (e.aliases.length === 0) errors.push(`${e.id}: no aliases`);
    for (const alias of e.aliases) {
      if (collapse(alias) !== alias || alias.length === 0) {
        errors.push(`${e.id}: alias "${alias}" is not in collapsed form`);
      }
      for (const market of e.markets) {
        const seen = aliasByMarket.get(`${market}:${alias}`);
        if (seen) errors.push(`alias "${alias}" in market ${market} claimed by both ${seen} and ${e.id}`);
        else aliasByMarket.set(`${market}:${alias}`, e.id);
      }
    }
    for (const domain of [e.domains.canonical, ...(e.domains.regional ?? [])]) {
      if (domain !== domain.toLowerCase() || !registrableDomain(domain)) {
        errors.push(`${e.id}: domain "${domain}" is not a lowercase registrable domain`);
      } else if (registrableDomain(domain) !== domain) {
        errors.push(`${e.id}: domain "${domain}" carries a subdomain; use allowedSubdomains`);
      }
    }
    if (e.tier !== 'config-only' && !e.logo) {
      errors.push(`${e.id}: trust-reviewed entries must carry a badge logo`);
    }
    if (e.incoterm !== 'unknown' && !e.notes) {
      errors.push(`${e.id}: a non-unknown incoterm requires a sourced note`);
    }
    if (e.shippingPolicy) {
      const p = e.shippingPolicy;
      if (!e.markets.includes(p.market)) {
        errors.push(`${e.id}: shipping policy market ${p.market} is not one of the entry's markets`);
      }
      if (!/^[A-Z]{3}$/.test(p.currency)) {
        errors.push(`${e.id}: shipping policy currency is not an ISO code`);
      }
      if (!/^https:\/\//.test(p.policyUrl)) {
        errors.push(`${e.id}: shipping policyUrl must be the merchant's https policy page`);
      }
      for (const [field, sv] of Object.entries({
        freeOverMinor: p.freeOverMinor,
        flatBelowMinor: p.flatBelowMinor,
      })) {
        if (sv && sv.value !== null && (!Number.isSafeInteger(sv.value) || sv.value < 0)) {
          errors.push(`${e.id}: shipping policy ${field} must be a non-negative integer`);
        }
        if (sv && sv.verification === 'verified' && !sv.lastVerified) {
          errors.push(`${e.id}: verified shipping policy ${field} needs lastVerified`);
        }
      }
      if (!p.freeOverMinor && !p.flatBelowMinor && !p.alwaysFree) {
        errors.push(`${e.id}: shipping policy carries no usable rule`);
      }
    }
  }
  return errors;
}
