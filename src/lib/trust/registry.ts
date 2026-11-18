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

export const REGISTRY_VERSION = '2026-11-18.1';

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
  /**
   * Published standard rates by ORDER VALUE, for stores whose page prints a
   * table instead of one flat rate ("up to $15.00: $6; $15.01 to $25.00:
   * $9; ..."). Ascending by upToMinor; the first tier whose upToMinor is at
   * or above the order value applies. An order above the last tier is not
   * covered by the table (those pages switch to a percentage or a quote)
   * and falls through to the next rule. One SourcedValue for the whole
   * table: it is read off the page as a unit.
   */
  tiersMinor?: SourcedValue<Array<{ upToMinor: number; costMinor: number }>>;
  /** Standard shipping is free with no minimum. */
  alwaysFree?: SourcedValue<boolean>;
  /** Conditions on the free tier (membership, loyalty signup), stated as an assumption. */
  conditions?: string;
  /**
   * Where the published terms apply, structured from the same policy page
   * so the estimate can honor it once the shopper's delivery state is
   * known. Absent = the page states no geographic limit that was captured.
   */
  scope?: ShippingPolicyScope;
  notes?: string;
}

export interface ShippingPolicyScope {
  /** Terms are published for the contiguous US (48 states + DC); AK and HI are excluded or priced separately. */
  contiguousOnly?: boolean;
  /** Terms are published as nationwide ("anywhere in the US"), so they hold for AK and HI too. */
  nationwide?: boolean;
  /** States the published free tier explicitly excludes (two-letter codes). */
  excludedStates?: string[];
  /** Published surcharge on standard shipping for AK, HI, US territories and military addresses (minor units). */
  nonContiguousSurchargeMinor?: SourcedValue<number>;
}

export type TrustTier =
  | 'brand-direct'
  | 'national-retailer'
  | 'marketplace'
  | 'config-only';

/** Feed markets a registry entry can appear in (matches FEED_MARKETS). */
export type RegistryMarket = 'us' | 'gb' | 'de' | 'fr' | 'ca' | 'au' | 'jp' | 'in';

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
const REVIEW_2026_09_06 = (why: string) => ({ date: '2026-09-06', reason: why });
const IN_2026_11_18 = (why: string) => ({ date: '2026-11-18', reason: why });
const BRAND_DIRECT_REASON = 'Brand-owned storefront (2026-09-06 sweep: the brand\'s own site was showing "Unverified seller").';
const NATIONAL_RETAILER_REASON = 'Established US retailer (2026-09-06 sweep: common in results, was showing "Unverified seller").';
const MARKETPLACE_REASON = 'Marketplace: listings are independent sellers, so prices there describe the seller, not the item.';

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
  /** [order value up to (cents), standard rate (cents)], ascending. */
  tiers?: Array<[number, number]>;
  alwaysFree?: boolean;
  conditions?: string;
  // Geographic scope (see ShippingPolicyScope), structured on 2026-10-23
  // from the conditions text the research passes above captured off the
  // same policy pages. No new facts: a scope field is set only where the
  // captured wording says so, which is why most policies carry none.
  contiguousOnly?: boolean;
  nationwide?: boolean;
  excludedStates?: string[];
  nonContiguousSurcharge?: number;
  notes?: string;
}): MerchantShippingPolicy {
  const sv = <T>(value: T): SourcedValue<T> => ({
    value,
    sourceUrl: spec.url,
    lastVerified: spec.v,
    verification: 'verified',
  });
  const scope: ShippingPolicyScope = {
    ...(spec.contiguousOnly ? { contiguousOnly: true } : {}),
    ...(spec.nationwide ? { nationwide: true } : {}),
    ...(spec.excludedStates ? { excludedStates: spec.excludedStates } : {}),
    ...(spec.nonContiguousSurcharge !== undefined
      ? { nonContiguousSurchargeMinor: sv(spec.nonContiguousSurcharge) }
      : {}),
  };
  return {
    market: 'us',
    currency: 'USD',
    policyUrl: spec.url,
    ...(spec.freeOver !== undefined ? { freeOverMinor: sv(spec.freeOver) } : {}),
    ...(spec.flat !== undefined ? { flatBelowMinor: sv(spec.flat) } : {}),
    ...(spec.tiers
      ? { tiersMinor: sv(spec.tiers.map(([upToMinor, costMinor]) => ({ upToMinor, costMinor }))) }
      : {}),
    ...(spec.alwaysFree ? { alwaysFree: sv(true) } : {}),
    ...(spec.conditions ? { conditions: spec.conditions } : {}),
    ...(Object.keys(scope).length > 0 ? { scope } : {}),
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
    contiguousOnly: true,
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
    contiguousOnly: true,
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
    nonContiguousSurcharge: 1000,
    conditions:
      'Baseline non-member tier, pre-tax; a $10 surcharge applies to AK, HI, military addresses, and US territories.',
  }),
  'nordstrom-us': usPolicy({
    url: 'https://www.nordstrom.com/browse/services/shipping-methods-charges/free-shipping-and-returns',
    v: '2026-08-31',
    alwaysFree: true,
    nationwide: true,
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
    contiguousOnly: true,
    excludedStates: ['CA'],
    conditions:
      'Signed-out tier, pre-tax, standard ground to contiguous states EXCLUDING California; below-threshold rate is not published.',
  }),
  'bhphoto-us': usPolicy({
    url: 'https://www.bhphotovideo.com/find/HelpCenter/Shipping.jsp',
    v: '2026-08-31',
    alwaysFree: true,
    contiguousOnly: true,
    conditions: 'Most items, contiguous US; expedited free over $49 on most orders.',
  }),
  'officedepot-us': usPolicy({
    url: 'https://www.officedepot.com/l/help/delivery',
    v: '2026-08-31',
    freeOver: 5000,
    contiguousOnly: true,
    conditions:
      'Qualifying orders, contiguous US; non-qualifying orders carry a $9.95 MINIMUM fee that varies upward (not a flat rate, so no below-threshold figure is encoded).',
  }),
  // Research pass 2026-11-18: five finder agents read each store's own policy
  // page (60 stores); three verifier agents then re-loaded every figure below
  // the same day and tried to refute it. Encoded conservatively: where a page
  // says "over $X" or contradicts itself on the exact threshold, X.01 is
  // used; where a store has member and guest prices, the GUEST price; a
  // banner promotion is never a threshold. Stores read but left out because
  // their own pages publish no usable figure: Owala, adidas, DSW, Newegg,
  // Adorama, Home Depot, BJ's, Vitamix, Samsung ("most items"), Sam's Club
  // (Plus tier only), New Balance and Nordstrom Rack (holiday promotion
  // only on the page), Books-A-Million (rate table headed for territories),
  // Gap (its entry also answers for Gap Factory, which was not read), YETI,
  // Sony and JBL (pages blocked).
  'stanley1913-us': usPolicy({
    url: 'https://www.stanley1913.com/pages/faq/help',
    v: '2026-11-18',
    freeOver: 5000, flat: 599,
    conditions:
      'Threshold is before tax; the page states no terms for Alaska or Hawaii.',
  }),
  'hydroflask-us': usPolicy({
    url: 'https://faq.hydroflask.com/faqs-shipping-handling-SJhv655Np',
    v: '2026-11-18',
    freeOver: 4900, nationwide: true,
    conditions:
      '$49 subtotal; valid throughout the US including Alaska and Hawaii; cannot be combined with some promo codes; below $49 the rate is carrier-calculated (not published).',
  }),
  'keurig-us': usPolicy({
    url: 'https://support.keurig.com/?kmContentId=1014902&page=shell&shell=knowledge-article',
    v: '2026-11-18',
    freeOver: 3500, flat: 799, contiguousOnly: true,
    conditions:
      '$35 after promo codes and discounts, contiguous US and PO boxes; Alaska and Hawaii pay $12.99 under $35 (not encoded).',
  }),
  'nespresso-us': usPolicy({
    url: 'https://www.nespresso.com/us/en/shipping-and-returns',
    v: '2026-11-18',
    flat: 695, nonContiguousSurcharge: 500,
    conditions:
      'Guest checkout tier: $6.95 on every order ($11.95 to Alaska and Hawaii); registered customers (free account) ship free at $50 excluding tax.',
  }),
  'cuisinart-us': usPolicy({
    url: 'https://www.cuisinart.com/support/shipping-and-return.html',
    v: '2026-11-18',
    freeOver: 3501, nationwide: true,
    conditions:
      'Page wording is "over $35", so exactly $35.00 is not treated as free; "anywhere within the US"; oversized fees may apply; no rate is published below the threshold.',
  }),
  'bathbodyworks-us': usPolicy({
    url: 'https://customercare.bathandbodyworks.com/hc/en-us/articles/4410658776211-Shipping-Options-United-States',
    v: '2026-11-18',
    freeOver: 5000, tiers: [[999, 1099], [4999, 799]], contiguousOnly: true,
    conditions:
      '$50 merchandise subtotal after all discounts, contiguous US; not valid on Annual Candle Day dates; Alaska and Hawaii pay $19.99 to $23.99 with no free tier (not encoded).',
  }),
  'sallybeauty-us': usPolicy({
    url: 'https://www.sallybeauty.com/help/shipping-information/',
    v: '2026-11-18',
    freeOver: 4000, contiguousOnly: true,
    conditions:
      '$40 after discounts and before tax, 48 contiguous states and DC only, no PO boxes; the page calls this an offer the store may end or change; no rate is published below the threshold.',
  }),
  'dermstore-us': usPolicy({
    url: 'https://www.dermstore.com/info/delivery-information.list',
    v: '2026-11-18',
    freeOver: 5001, flat: 700,
    conditions:
      'Page wording is "over $50" free and "$7 under $50" (after any discount, before tax); exactly $50.00 is not treated as free.',
  }),
  'crateandbarrel-us': usPolicy({
    url: 'https://www.crateandbarrel.com/customer-service/faq-shipping-delivery',
    v: '2026-11-18',
    tiers: [[1500, 600], [2500, 900], [4500, 1100], [6500, 1500], [9000, 1800], [12500, 2000], [20000, 2500], [30000, 3000]], nonContiguousSurcharge: 1000,
    conditions:
      'Standard rates by merchandise total, contiguous US; Alaska, Hawaii and territories are $10 more per tier; above $300 the rate is 10% of merchandise (not encoded); oversize and furniture delivery fees are separate.',
  }),
  'williamssonoma-us': usPolicy({
    url: 'https://www.williams-sonoma.com/customer-service/shipping-info.html',
    v: '2026-11-18',
    tiers: [[1500, 600], [2500, 900], [4500, 1100], [6500, 1500], [9000, 1800], [12500, 2000], [20000, 2500], [30000, 3000]], nonContiguousSurcharge: 2000,
    conditions:
      'Standard rates by order total, contiguous 48 states; Alaska and Hawaii add $20; above $300 the rate is 10% of merchandise (not encoded); bulky or heavy items can carry a delivery surcharge.',
  }),
  'bose-us': usPolicy({
    url: 'https://www.bose.com/help/shipping-and-delivery',
    v: '2026-11-18',
    freeOver: 4900,
    conditions:
      'In-stock orders of $49 or more (stated on Bose product pages); below $49 the charge is shown in the basket (not published).',
  }),
  'soundcore-us': usPolicy({
    url: 'https://www.soundcore.com/policies/shipping-policy',
    v: '2026-11-18',
    alwaysFree: true,
    conditions:
      'Free Standard Shipping on all orders; faster options are paid.',
  }),
  'sharkninja-us': usPolicy({
    url: 'https://www.sharkninja.com/shipping.html',
    v: '2026-11-18',
    freeOver: 9900, flat: 1000, nonContiguousSurcharge: 10000,
    conditions:
      'Orders under $99 "may be subject to" the $10 fee, so $10 is the most a standard order pays; Hawaii and Alaska orders carry a $100 surcharge.',
  }),
  'gamestop-us': usPolicy({
    url: 'https://www.gamestop.com/help/articles/156000190550',
    v: '2026-11-18',
    flat: 699, contiguousOnly: true,
    conditions:
      'Non-member tier: $6.99 standard on every order; Pro members ship free at $54+; continental US only; graded cards and pre-orders are charged per item.',
  }),
  'crutchfield-us': usPolicy({
    url: 'https://www.crutchfield.com/support/shipping.aspx',
    v: '2026-11-18',
    freeOver: 5001, flat: 999,
    conditions:
      'The page says both "$50 and up" and "must be over $50", so exactly $50.00 is not treated as free; thresholds apply after discounts and before tax.',
  }),
  'dell-us': usPolicy({
    url: 'https://www.dell.com/en-us/lp/dell-free-shipping',
    v: '2026-11-18',
    alwaysFree: true, contiguousOnly: true,
    conditions:
      'Free standard delivery on everything with no minimum, continental US only (excludes Alaska and PO boxes).',
  }),
  'microsoft-us': usPolicy({
    url: 'https://support.microsoft.com/en-us/account-billing/shipping-options-costs-and-delivery-times-63d48e68-3fb8-6d6f-e73f-f321467d6aee',
    v: '2026-11-18',
    alwaysFree: true,
    conditions:
      'The cheapest tier (named Expedited, 2-3 business days) is free on eligible products; customizable products are excluded; not available for some Alaska ZIP codes.',
  }),
  'levis-us': usPolicy({
    url: 'https://www.levi.com/US/en_US/info/shipping',
    v: '2026-11-18',
    flat: 795,
    conditions:
      'Guest tier: ground $7.95 on every order; Red Tab members (free to join) ship free over $75.',
  }),
  'uniqlo-us': usPolicy({
    url: 'https://faq-us.uniqlo.com/articles/en_US/Knowledge/Which-shipping-options-do-you-offer-and-how-much-do-they-cost',
    v: '2026-11-18',
    freeOver: 9900, flat: 799,
    conditions:
      'Order subtotal of $99 or more before taxes and shipping, after coupons.',
  }),
  'lululemon-us': usPolicy({
    url: 'https://shop.lululemon.com/help/shipping-and-delivery',
    v: '2026-11-18',
    alwaysFree: true,
    conditions:
      'Standard shipping is free on every order; Express and Priority are paid.',
  }),
  'oldnavy-us': usPolicy({
    url: 'https://oldnavy.gap.com/customerService/info.do?cid=3019',
    v: '2026-11-18',
    flat: 900,
    conditions:
      'Non-member tier: qualifying items ship for $9; signed-in rewards members ship free at $50 and pay $7 below; third-party seller items ship free.',
  }),
  'hm-us': usPolicy({
    url: 'https://www2.hm.com/en_us/customer-service/shippinganddelivery.html',
    v: '2026-11-18',
    freeOver: 7500, flat: 699,
    conditions:
      'Non-member tier: $6.99 below $75; members (free to join) ship free over $50; furniture and lighting ship separately.',
  }),
  'abercrombie-us': usPolicy({
    url: 'https://www.abercrombie.com/shop/us/help/shipping-handling',
    v: '2026-11-18',
    flat: 700,
    conditions:
      'Standard $7 from the rate card. A site banner offers free standard shipping on orders over $99 (after discounts, before tax) with no end date; it is an offer rather than policy text, so it is not encoded.',
  }),
  'americaneagle-us': usPolicy({
    url: 'https://www.ae.com/us/en/content/help/shipping-handling',
    v: '2026-11-18',
    freeOver: 7500, flat: 795,
    conditions:
      'Guest tier; Real Rewards members get lower thresholds; charged once per order; some categories (bras, swim, third-party shoes) have no free tier.',
  }),
  'jcrew-us': usPolicy({
    url: 'https://www.jcrew.com/help/shipping-handling',
    v: '2026-11-18',
    flat: 700, nationwide: true,
    conditions:
      'Flat $7 regardless of order size, to all 50 states; free standard shipping is for logged-in rewards members only.',
  }),
  'zara-us': usPolicy({
    url: 'https://www.zara.com/us/en/help-center/DeliveryMethods',
    v: '2026-11-18',
    flat: 495,
    conditions:
      'Home delivery in 2-4 working days; no free-shipping threshold is published; delivery to a Zara store is free; bulky home items carry their own fee.',
  }),
  'urbanoutfitters-us': usPolicy({
    url: 'https://www.urbanoutfitters.com/help/shipping',
    v: '2026-11-18',
    freeOver: 6000, flat: 750,
    conditions:
      'Merchandise only (taxes and gift cards do not count); oversized items and furniture can cost more; the app threshold is $50.',
  }),
  'asos-us': usPolicy({
    url: 'https://www.asos.com/us/payments-and-shipping/delivery/?country=us',
    v: '2026-11-18',
    freeOver: 7501, flat: 1000,
    conditions:
      'Read for ZIP 10001; the page says options vary by location. Wording is "spend over $75.00".',
  }),
  'converse-us': usPolicy({
    url: 'https://converseconsumerservices.my.site.com/s/article/what-are-converse-com-s-shipping-options',
    v: '2026-11-18',
    freeOver: 7500, flat: 800, contiguousOnly: true,
    conditions:
      'Guest tier; signed-in members ship free; the free offer excludes Alaska and Hawaii.',
  }),
  'underarmour-us': usPolicy({
    url: 'https://www.underarmour.com/en-us/t/shipping.html',
    v: '2026-11-18',
    freeOver: 9900, flat: 800,
    conditions:
      'Standing policy text; a $75+ promotional banner was also present in the page on 2026-11-18.',
  }),
  'puma-us': usPolicy({
    url: 'https://help.us.puma.com/hc/en-us/articles/38820770179099-Shipping-Delivery',
    v: '2026-11-18',
    freeOver: 7500, flat: 800, contiguousOnly: true,
    conditions:
      'Pretax total; members have a $50 threshold; Alaska, Hawaii and territories pay $15 on all orders (not encoded).',
  }),
  'vans-us': usPolicy({
    url: 'https://www.vans.com/en-us/help/faq',
    v: '2026-11-18',
    freeOver: 9900, flat: 800,
    conditions:
      'Guest tier; Vans Family members ship free at $50 and pay $5 below.',
  }),
  'crocs-us': usPolicy({
    url: 'https://www.crocs.com/customer-service/faqs',
    v: '2026-11-18',
    freeOver: 4499, flat: 899,
    conditions:
      'Economy, the cheapest tier; pre-tax subtotal after discounts; the tier named Standard Ground costs more.',
  }),
  'skechers-us': usPolicy({
    url: 'https://www.skechers.com/shipping-policy/',
    v: '2026-11-18',
    flat: 995, nationwide: true,
    conditions:
      'Guest tier: $9.95 on every order, all 50 states; Skechers Plus members (free to join) get free standard shipping.',
  }),
  'footlocker-us': usPolicy({
    url: 'https://help.footlocker.com/hc/en-us/articles/360034159954-What-are-your-shipping-prices-and-time-frames',
    v: '2026-11-18',
    flat: 899, nonContiguousSurcharge: 300,
    conditions:
      'Non-member tier: $8.99 within the 48 contiguous states, $11.99 elsewhere; FLX members (free to join) ship free on non-excluded items.',
  }),
  'journeys-us': usPolicy({
    url: 'https://www.journeys.com/help?a=Shipping-Options---id--DtQkYyScRdSBSIR-EGLwGA',
    v: '2026-11-18',
    flat: 799, contiguousOnly: true,
    conditions:
      'Non-member tier; All Access members (free to join) ship free; Hawaii is $17.99 (not encoded). A temporary non-member free-shipping promotion at $75+ was live on 2026-11-18.',
  }),
  'zappos-us': usPolicy({
    url: 'https://www.zappos.com/c/shipping-and-returns',
    v: '2026-11-18',
    alwaysFree: true, nationwide: true,
    conditions:
      'Free shipping anywhere in the United States including territories and APO/FPO.',
  }),
  'walgreens-us': usPolicy({
    url: 'https://www.walgreens.com/topic/help/shipping/shipping_help_main.jsp',
    v: '2026-11-18',
    freeOver: 3500, flat: 599, contiguousOnly: true,
    conditions:
      'Order subtotal after promo codes, excluding tax; standard shipping only inside the 48 contiguous states; orders over 20 lb pay a per-weight fee.',
  }),
  'cvs-us': usPolicy({
    url: 'https://www.cvs.com/retail/help/help-subtopic-shipping-information',
    v: '2026-11-18',
    freeOver: 3500, flat: 599,
    conditions:
      'Orders outside the 48 contiguous states may carry additional charges; orders over 50 lb carry a surcharge.',
  }),
  'jcpenney-us': usPolicy({
    url: 'https://www.jcpenney.com/m/customer-service/shipping-information',
    v: '2026-11-18',
    freeOver: 4900, flat: 895, contiguousOnly: true,
    conditions:
      'Rates for the 48 contiguous states; truck-delivered and some manufacturer-delivered items excluded; oversized surcharges are separate.',
  }),
  'belk-us': usPolicy({
    url: 'https://www.belk.com/customer-service/shipping-information/',
    v: '2026-11-18',
    freeOver: 9900, flat: 1295,
    conditions:
      'The page notes it may not reflect all current shipping promotions.',
  }),
  'barnesnoble-us': usPolicy({
    url: 'https://help.barnesandnoble.com/hc/en-us/articles/5334520517531-Shipping-Speeds-and-Fees',
    v: '2026-11-18',
    freeOver: 6000, flat: 699,
    conditions:
      'Non-member tier, eligible items; Premium and Legacy members ship free at $15; orders with a vinyl record pay $7.99 below the threshold.',
  }),
  'chewy-us': usPolicy({
    url: 'https://www.chewy.com/customer-care/shipping-and-tracking/shipping-information/shipping-cost-and-timing',
    v: '2026-11-18',
    freeOver: 4900, flat: 695, contiguousOnly: true,
    conditions:
      'Subtotal before tax and discounts; contiguous US only, no PO boxes.',
  }),
  'lego-us': usPolicy({
    url: 'https://www.lego.com/en-us/page/shipping-handling',
    v: '2026-11-18',
    freeOver: 3500, flat: 695,
    conditions:
      'Merchandise only; the page states a $12.50 Alaska and Hawaii surcharge under express shipping without saying whether it applies to standard orders, so those states are left unestimated.',
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
  entry({ id: 'chewy-us', shipping: P['chewy-us'], name: 'Chewy', domain: 'chewy.com' }),
  entry({ id: 'gamestop-us', shipping: P['gamestop-us'], name: 'GameStop', domain: 'gamestop.com' }),
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
  entry({ id: 'stanley1913-us', shipping: P['stanley1913-us'], name: 'Stanley 1913', domain: 'stanley1913.com', tier: 'brand-direct' }),
  entry({ id: 'zumiez-us', name: 'Zumiez', domain: 'zumiez.com' }),
  entry({ id: 'petco-us', name: 'Petco', domain: 'petco.com' }),
  entry({ id: 'petsmart-us', name: 'PetSmart', domain: 'petsmart.com' }),
  entry({
    id: 'ulta-us', shipping: P['ulta-us'], name: 'Ulta Beauty', aliases: ['ulta', 'ultabeauty'],
    domain: 'ulta.com', logo: '/logos/ulta.svg',
  }),
  entry({ id: 'sephora-us', shipping: P['sephora-us'], name: 'Sephora', domain: 'sephora.com' }),
  entry({
    id: 'bathbodyworks-us', shipping: P['bathbodyworks-us'], name: 'Bath & Body Works',
    aliases: ['bathbodyworks', 'bathandbodyworks'],
    domain: 'bathandbodyworks.com', logo: '/logos/bathbodyworks.svg',
  }),
  entry({ id: 'footlocker-us', shipping: P['footlocker-us'], name: 'Foot Locker', domain: 'footlocker.com' }),
  entry({ id: 'finishline-us', name: 'Finish Line', domain: 'finishline.com' }),
  entry({ id: 'jcpenney-us', shipping: P['jcpenney-us'], name: 'JCPenney', domain: 'jcpenney.com' }),
  entry({ id: 'dillards-us', name: "Dillard's", domain: 'dillards.com' }),
  entry({ id: 'belk-us', shipping: P['belk-us'], name: 'Belk', domain: 'belk.com' }),
  entry({
    id: 'qvc-us', name: 'QVC', domain: 'qvc.com',
    added: REVIEW_2026_08_31('Promoted config-only → verified: established US retailer, already in the landed-cost config.'),
  }),
  entry({
    id: 'crateandbarrel-us', shipping: P['crateandbarrel-us'], name: 'Crate & Barrel',
    // Serper reports both spellings; '&' collapses away, 'and' doesn't.
    aliases: ['crateandbarrel', 'cratebarrel'],
    domain: 'crateandbarrel.com', logo: '/logos/crateandbarrel.svg',
  }),
  entry({ id: 'williamssonoma-us', shipping: P['williamssonoma-us'], name: 'Williams Sonoma', domain: 'williams-sonoma.com' }),
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

  // US market ─ 2026-09-06 review: brand-owned stores, established
  // retailers and marketplaces that the 2026-09-05 live sweep showed as
  // "Unverified seller" (lululemon, Gap, H&M, Walgreens, ThriftBooks,
  // SharkNinja...) or as unlabelled marketplaces (Whatnot, Poshmark, StockX).
  // Badge logos are plain wordmarks under public/logos.
  entry({ id: 'lululemon-us', shipping: P['lululemon-us'], name: 'lululemon', domain: 'lululemon.com', tier: 'brand-direct', aliases: ['lululemon', 'lululemonathletica'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'gap-us', name: 'Gap', domain: 'gap.com', tier: 'brand-direct', aliases: ['gap', 'gapfactory'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'oldnavy-us', shipping: P['oldnavy-us'], name: 'Old Navy', domain: 'gap.com', tier: 'brand-direct', subdomains: ['oldnavy'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'bananarepublic-us', name: 'Banana Republic', domain: 'gap.com', tier: 'brand-direct', subdomains: ['bananarepublic'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'athleta-us', name: 'Athleta', domain: 'gap.com', tier: 'brand-direct', subdomains: ['athleta'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'hm-us', shipping: P['hm-us'], name: 'H&M', domain: 'hm.com', tier: 'national-retailer', aliases: ['hm', 'handm'], subdomains: ['www2'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'uniqlo-us', shipping: P['uniqlo-us'], name: 'Uniqlo', domain: 'uniqlo.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'hollister-us', name: 'Hollister', domain: 'hollisterco.com', tier: 'brand-direct', aliases: ['hollister', 'hollisterco'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'abercrombie-us', shipping: P['abercrombie-us'], name: 'Abercrombie & Fitch', domain: 'abercrombie.com', tier: 'brand-direct', aliases: ['abercrombiefitch', 'abercrombie', 'abercrombieandfitch'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'americaneagle-us', shipping: P['americaneagle-us'], name: 'American Eagle', domain: 'ae.com', tier: 'brand-direct', aliases: ['americaneagle', 'americaneagleoutfitters', 'aerie'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'loft-us', name: 'LOFT', domain: 'loft.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'anntaylor-us', name: 'Ann Taylor', domain: 'anntaylor.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'jcrew-us', shipping: P['jcrew-us'], name: 'J.Crew', domain: 'jcrew.com', tier: 'brand-direct', aliases: ['jcrew', 'jcrewfactory'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'levis-us', shipping: P['levis-us'], name: "Levi's", domain: 'levi.com', tier: 'brand-direct', aliases: ['levis', 'levi'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'adidas-us', name: 'adidas', domain: 'adidas.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'underarmour-us', shipping: P['underarmour-us'], name: 'Under Armour', domain: 'underarmour.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'newbalance-us', name: 'New Balance', domain: 'newbalance.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'puma-us', shipping: P['puma-us'], name: 'PUMA', domain: 'puma.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'reebok-us', name: 'Reebok', domain: 'reebok.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'converse-us', shipping: P['converse-us'], name: 'Converse', domain: 'converse.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'vans-us', shipping: P['vans-us'], name: 'Vans', domain: 'vans.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'skechers-us', shipping: P['skechers-us'], name: 'Skechers', domain: 'skechers.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'crocs-us', shipping: P['crocs-us'], name: 'Crocs', domain: 'crocs.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'zara-us', shipping: P['zara-us'], name: 'Zara', domain: 'zara.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'asos-us', shipping: P['asos-us'], name: 'ASOS', domain: 'asos.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'fashionnova-us', name: 'Fashion Nova', domain: 'fashionnova.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'revolve-us', name: 'Revolve', domain: 'revolve.com', tier: 'national-retailer', aliases: ['revolve', 'revolveclothing'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'princesspolly-us', name: 'Princess Polly', domain: 'princesspolly.com', tier: 'brand-direct', subdomains: ['us'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'gymshark-us', name: 'Gymshark', domain: 'gymshark.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'sharkninja-us', shipping: P['sharkninja-us'], name: 'SharkNinja', domain: 'sharkninja.com', tier: 'brand-direct', aliases: ['sharkninja', 'ninja', 'ninjakitchen', 'shark', 'sharkclean'], regional: ['ninjakitchen.com', 'sharkclean.com'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'sony-us', name: 'Sony', domain: 'sony.com', tier: 'brand-direct', aliases: ['sony', 'sonyelectronics'], subdomains: ['electronics', 'store'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'samsung-us', name: 'Samsung', domain: 'samsung.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'bose-us', shipping: P['bose-us'], name: 'Bose', domain: 'bose.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'jbl-us', name: 'JBL', domain: 'jbl.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'soundcore-us', shipping: P['soundcore-us'], name: 'soundcore', domain: 'soundcore.com', tier: 'brand-direct', aliases: ['soundcore', 'anker', 'ankersoundcore'], regional: ['anker.com'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'jlab-us', name: 'JLab', domain: 'jlab.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'sennheiser-us', name: 'Sennheiser', domain: 'sennheiser.com', tier: 'brand-direct', aliases: ['sennheiser', 'sennheiserconsumeraudio'], regional: ['sennheiser-hearing.com'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'logitech-us', name: 'Logitech', domain: 'logitech.com', tier: 'brand-direct', aliases: ['logitech', 'logitechg'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'garmin-us', name: 'Garmin', domain: 'garmin.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'gopro-us', name: 'GoPro', domain: 'gopro.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'lego-us', shipping: P['lego-us'], name: 'LEGO', domain: 'lego.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'nintendo-us', name: 'Nintendo', domain: 'nintendo.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'microsoft-us', shipping: P['microsoft-us'], name: 'Microsoft', domain: 'microsoft.com', tier: 'brand-direct', aliases: ['microsoft', 'microsoftstore'], added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'dell-us', shipping: P['dell-us'], name: 'Dell', domain: 'dell.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'hp-us', name: 'HP', domain: 'hp.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'lenovo-us', name: 'Lenovo', domain: 'lenovo.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'yeti-us', name: 'YETI', domain: 'yeti.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'hydroflask-us', shipping: P['hydroflask-us'], name: 'Hydro Flask', domain: 'hydroflask.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'owala-us', name: 'Owala', domain: 'owala.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'cuisinart-us', shipping: P['cuisinart-us'], name: 'Cuisinart', domain: 'cuisinart.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'keurig-us', shipping: P['keurig-us'], name: 'Keurig', domain: 'keurig.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'nespresso-us', shipping: P['nespresso-us'], name: 'Nespresso', domain: 'nespresso.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'vitamix-us', name: 'Vitamix', domain: 'vitamix.com', tier: 'brand-direct', added: REVIEW_2026_09_06(BRAND_DIRECT_REASON) }),
  entry({ id: 'walgreens-us', shipping: P['walgreens-us'], name: 'Walgreens', domain: 'walgreens.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'cvs-us', shipping: P['cvs-us'], name: 'CVS Pharmacy', domain: 'cvs.com', tier: 'national-retailer', aliases: ['cvs', 'cvspharmacy'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'riteaid-us', name: 'Rite Aid', domain: 'riteaid.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'thriftbooks-us', name: 'ThriftBooks', domain: 'thriftbooks.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'barnesnoble-us', shipping: P['barnesnoble-us'], name: 'Barnes & Noble', domain: 'barnesandnoble.com', tier: 'national-retailer', aliases: ['barnesnoble', 'barnesandnoble'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'booksamillion-us', name: 'Books-A-Million', domain: 'booksamillion.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'overstock-us', name: 'Overstock', domain: 'overstock.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'brandsmart-us', name: 'BrandsMart USA', domain: 'brandsmartusa.com', tier: 'national-retailer', aliases: ['brandsmartusa', 'brandsmart'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'abt-us', name: 'Abt', domain: 'abt.com', tier: 'national-retailer', aliases: ['abt', 'abtelectronics'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'crutchfield-us', shipping: P['crutchfield-us'], name: 'Crutchfield', domain: 'crutchfield.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'sweetwater-us', name: 'Sweetwater', domain: 'sweetwater.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'guitarcenter-us', name: 'Guitar Center', domain: 'guitarcenter.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'musiciansfriend-us', name: "Musician's Friend", domain: 'musiciansfriend.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'audioadvisor-us', name: 'Audio Advisor', domain: 'audioadvisor.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'pcrichard-us', name: 'P.C. Richard & Son', domain: 'pcrichard.com', tier: 'national-retailer', aliases: ['pcrichardson', 'pcrichard', 'pcrichardandson'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'publiclands-us', name: 'Public Lands', domain: 'publiclands.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'goinggoinggone-us', name: 'Going Going Gone', domain: 'goinggoinggone.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'hibbett-us', name: 'Hibbett', domain: 'hibbett.com', tier: 'national-retailer', aliases: ['hibbett', 'hibbettsports', 'hibbettkids', 'citygear'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'jdsports-us', name: 'JD Sports', domain: 'jdsports.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'champssports-us', name: 'Champs Sports', domain: 'champssports.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'zappos-us', shipping: P['zappos-us'], name: 'Zappos', domain: 'zappos.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'dsw-us', name: 'DSW', domain: 'dsw.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'famousfootwear-us', name: 'Famous Footwear', domain: 'famousfootwear.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'journeys-us', shipping: P['journeys-us'], name: 'Journeys', domain: 'journeys.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'shoecarnival-us', name: 'Shoe Carnival', domain: 'shoecarnival.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'hottopic-us', name: 'Hot Topic', domain: 'hottopic.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'pacsun-us', name: 'PacSun', domain: 'pacsun.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'tillys-us', name: "Tilly's", domain: 'tillys.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'urbanoutfitters-us', shipping: P['urbanoutfitters-us'], name: 'Urban Outfitters', domain: 'urbanoutfitters.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'anthropologie-us', name: 'Anthropologie', domain: 'anthropologie.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'freepeople-us', name: 'Free People', domain: 'freepeople.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'nordstromrack-us', name: 'Nordstrom Rack', domain: 'nordstromrack.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'saks-us', name: 'Saks Fifth Avenue', domain: 'saksfifthavenue.com', tier: 'national-retailer', aliases: ['saksfifthavenue', 'saks'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'bloomingdales-us', name: "Bloomingdale's", domain: 'bloomingdales.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'neimanmarcus-us', name: 'Neiman Marcus', domain: 'neimanmarcus.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'cb2-us', name: 'CB2', domain: 'cb2.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'westelm-us', name: 'West Elm', domain: 'westelm.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'surlatable-us', name: 'Sur La Table', domain: 'surlatable.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'basspro-us', name: 'Bass Pro Shops', domain: 'basspro.com', tier: 'national-retailer', aliases: ['bassproshops', 'basspro'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'cabelas-us', name: "Cabela's", domain: 'cabelas.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'scheels-us', name: 'Scheels', domain: 'scheels.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'backcountry-us', name: 'Backcountry', domain: 'backcountry.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'moosejaw-us', name: 'Moosejaw', domain: 'moosejaw.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'sallybeauty-us', shipping: P['sallybeauty-us'], name: 'Sally Beauty', domain: 'sallybeauty.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'dermstore-us', shipping: P['dermstore-us'], name: 'Dermstore', domain: 'dermstore.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'iherb-us', name: 'iHerb', domain: 'iherb.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'vitacost-us', name: 'Vitacost', domain: 'vitacost.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'gnc-us', name: 'GNC', domain: 'gnc.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'vitaminshoppe-us', name: 'The Vitamin Shoppe', domain: 'vitaminshoppe.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'containerstore-us', name: 'The Container Store', domain: 'containerstore.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'michaels-us', name: 'Michaels', domain: 'michaels.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'hobbylobby-us', name: 'Hobby Lobby', domain: 'hobbylobby.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'ashley-us', name: 'Ashley', domain: 'ashleyfurniture.com', tier: 'national-retailer', aliases: ['ashley', 'ashleyfurniture', 'ashleyhomestore'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'bjs-us', name: "BJ's Wholesale Club", domain: 'bjs.com', tier: 'national-retailer', aliases: ['bjswholesaleclub', 'bjs', 'bjswholesale'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'harborfreight-us', name: 'Harbor Freight Tools', domain: 'harborfreight.com', tier: 'national-retailer', aliases: ['harborfreighttools', 'harborfreight'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'tractorsupply-us', name: 'Tractor Supply Co', domain: 'tractorsupply.com', tier: 'national-retailer', aliases: ['tractorsupplyco', 'tractorsupply', 'tractorsupplycompany'], added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'menards-us', name: 'Menards', domain: 'menards.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'dormco-us', name: 'DormCo', domain: 'dormco.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'verizon-us', name: 'Verizon', domain: 'verizon.com', tier: 'national-retailer', added: REVIEW_2026_09_06(NATIONAL_RETAILER_REASON) }),
  entry({ id: 'whatnot-us', name: 'Whatnot', domain: 'whatnot.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'poshmark-us', name: 'Poshmark', domain: 'poshmark.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'mercari-us', name: 'Mercari', domain: 'mercari.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'stockx-us', name: 'StockX', domain: 'stockx.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'goat-us', name: 'GOAT', domain: 'goat.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'depop-us', name: 'Depop', domain: 'depop.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'grailed-us', name: 'Grailed', domain: 'grailed.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'vinted-us', name: 'Vinted', domain: 'vinted.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'offerup-us', name: 'OfferUp', domain: 'offerup.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'swappa-us', name: 'Swappa', domain: 'swappa.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'reebelo-us', name: 'Reebelo', domain: 'reebelo.com', tier: 'marketplace', aliases: ['reebelo', 'reebelousa'], thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'backmarket-us', name: 'Back Market', domain: 'backmarket.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'reverb-us', name: 'Reverb', domain: 'reverb.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'thredup-us', name: 'ThredUp', domain: 'thredup.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'therealreal-us', name: 'The RealReal', domain: 'therealreal.com', tier: 'marketplace', aliases: ['realreal', 'therealreal'], thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'abebooks-us', name: 'AbeBooks', domain: 'abebooks.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'bonanza-us', name: 'Bonanza', domain: 'bonanza.com', tier: 'marketplace', thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),
  entry({ id: 'facebookmarketplace-us', name: 'Facebook Marketplace', domain: 'facebook.com', tier: 'marketplace', aliases: ['facebookmarketplace', 'facebook'], thirdParty: true, added: REVIEW_2026_09_06(MARKETPLACE_REASON) }),

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

  // IN market (added 2026-11-18 from three live feed probes). Only
  // Amazon.in and Nike's own India store carry a badge, reusing logos
  // already reviewed for their US entries; the rest are config-only: the
  // registry knows they are Indian storefronts (so their offers compute as
  // domestic, not as imports) but no seller review has been done and they
  // show no badge.
  entry({
    id: 'amazon-in', name: 'Amazon India', aliases: ['amazonin', 'amazon'],
    markets: ['in'], domain: 'amazon.in', tier: 'marketplace',
    logo: '/logos/amazon.svg', country: 'IN', thirdParty: true,
    added: IN_2026_11_18(MARKETPLACE_REASON),
  }),
  entry({
    id: 'nike-in', name: 'Nike India', aliases: ['nikeindia'], markets: ['in'],
    domain: 'nike.com', tier: 'brand-direct', logo: '/logos/nike.svg', country: 'IN',
    added: IN_2026_11_18("Nike's own India storefront (nike.com/in); same brand-direct treatment as nike-us."),
  }),
  entry({
    id: 'flipkart-in', name: 'Flipkart', markets: ['in'], domain: 'flipkart.com',
    tier: 'config-only', country: 'IN', thirdParty: true,
    added: IN_2026_11_18('India storefront country for the delivered-cost estimate; not seller-reviewed.'),
  }),
  entry({
    id: 'croma-in', name: 'Croma', markets: ['in'], domain: 'croma.com',
    tier: 'config-only', country: 'IN',
    added: IN_2026_11_18('India storefront country for the delivered-cost estimate; not seller-reviewed.'),
  }),
  entry({
    id: 'reliancedigital-in', name: 'Reliance Digital', markets: ['in'],
    domain: 'reliancedigital.in', tier: 'config-only', country: 'IN',
    added: IN_2026_11_18('India storefront country for the delivered-cost estimate; not seller-reviewed.'),
  }),
  entry({
    id: 'vijaysales-in', name: 'Vijay Sales', markets: ['in'], domain: 'vijaysales.com',
    tier: 'config-only', country: 'IN',
    added: IN_2026_11_18('India storefront country for the delivered-cost estimate; not seller-reviewed.'),
  }),
  entry({
    id: 'tatacliq-in', name: 'Tata CLiQ',
    aliases: ['tatacliq', 'tatacliqluxury', 'tatacliqfashion'],
    markets: ['in'], domain: 'tatacliq.com', subdomains: ['luxury', 'www'],
    tier: 'config-only', country: 'IN', thirdParty: true,
    added: IN_2026_11_18('India storefront country for the delivered-cost estimate; not seller-reviewed.'),
  }),
  entry({
    id: 'ajio-in', name: 'AJIO', aliases: ['ajio', 'ajiocom'], markets: ['in'],
    domain: 'ajio.com', tier: 'config-only', country: 'IN', thirdParty: true,
    added: IN_2026_11_18('India storefront country for the delivered-cost estimate; not seller-reviewed.'),
  }),
  entry({
    id: 'myntra-in', name: 'Myntra', markets: ['in'], domain: 'myntra.com',
    tier: 'config-only', country: 'IN', thirdParty: true,
    added: IN_2026_11_18('India storefront country for the delivered-cost estimate; not seller-reviewed.'),
  }),
  entry({
    id: 'nykaa-in', name: 'Nykaa', markets: ['in'], domain: 'nykaa.com',
    tier: 'config-only', country: 'IN',
    added: IN_2026_11_18('India storefront country for the delivered-cost estimate; not seller-reviewed.'),
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
  const m = normalizeMarket(market);
  let name = rawName;
  // Exact collapse first; on a miss, peel one storefront suffix at a time
  // ("Dyson Official", "soundcore US", "Hollister Co - Official") and
  // retry. Only whole trailing words that name the store's own storefront
  // are peeled, so "Nike Outlet Store" still resolves to nothing.
  for (let attempt = 0; attempt < 3; attempt++) {
    const key = collapse(name);
    if (!key) return null;
    const hit = INDEX[m]?.get(key) ?? INDEX['us']?.get(key) ?? GLOBAL_INDEX.get(key);
    if (hit) return hit;
    const peeled = name.replace(STOREFRONT_SUFFIX, '');
    if (peeled === name) return null;
    name = peeled;
  }
  return null;
}

/**
 * Trailing words a feed appends to a merchant's own storefront name:
 * "Official", "Official Store", "Online Store", "US". A dash before them
 * ("Hollister Co - Official") is the feed's seller-suffix separator, which
 * here introduces no seller, so it is peeled with the word.
 */
export const STOREFRONT_SUFFIX =
  /\s*(?:[-–—]\s*)?\b(?:official(?:\s+(?:store|site|shop))?|online\s+store|store|shop|us|usa|united\s+states)\s*$/i;

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

/**
 * The registrable host a listing actually links to, for copy that names
 * it ("links to ikea-outlet.com"). Null when there is no URL, it does not
 * parse, or it is an intermediary (Google) that says nothing about the
 * seller. Same unwrapping and neutral-host rules as domainSignal.
 */
export function listingHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const rd = registrableDomain(new URL(unwrapAffiliate(url)).hostname.toLowerCase());
    if (!rd || NEUTRAL_DOMAINS.has(rd)) return null;
    return rd;
  } catch {
    return null;
  }
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
      if (!p.freeOverMinor && !p.flatBelowMinor && !p.alwaysFree && !p.tiersMinor) {
        errors.push(`${e.id}: shipping policy carries no usable rule`);
      }
      const tiers = p.tiersMinor?.value;
      if (tiers) {
        if (tiers.length === 0) errors.push(`${e.id}: shipping policy tier table is empty`);
        tiers.forEach((t, i) => {
          if (!Number.isSafeInteger(t.upToMinor) || !Number.isSafeInteger(t.costMinor) || t.upToMinor <= 0 || t.costMinor < 0) {
            errors.push(`${e.id}: shipping policy tier ${i} must hold non-negative integer cents`);
          }
          if (i > 0 && t.upToMinor <= tiers[i - 1].upToMinor) {
            errors.push(`${e.id}: shipping policy tiers must ascend by order value`);
          }
        });
        if (p.tiersMinor?.verification === 'verified' && !p.tiersMinor.lastVerified) {
          errors.push(`${e.id}: verified shipping policy tiersMinor needs lastVerified`);
        }
      }
      const scope = p.scope;
      if (scope) {
        if (scope.contiguousOnly && scope.nationwide) {
          errors.push(`${e.id}: shipping policy scope cannot be both contiguous-only and nationwide`);
        }
        for (const state of scope.excludedStates ?? []) {
          if (!/^[A-Z]{2}$/.test(state)) {
            errors.push(`${e.id}: shipping policy excludedStates entry "${state}" is not a state code`);
          }
        }
        const surcharge = scope.nonContiguousSurchargeMinor;
        if (
          surcharge &&
          surcharge.value !== null &&
          (!Number.isSafeInteger(surcharge.value) || surcharge.value < 0)
        ) {
          errors.push(`${e.id}: shipping policy nonContiguousSurchargeMinor must be a non-negative integer`);
        }
        if (surcharge && surcharge.verification === 'verified' && !surcharge.lastVerified) {
          errors.push(`${e.id}: verified shipping policy nonContiguousSurchargeMinor needs lastVerified`);
        }
      }
    }
  }
  return errors;
}
