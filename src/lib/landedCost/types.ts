// Type contracts for the landed-cost core.
//
// Two principles govern everything here:
//   1. Every displayed number carries provenance (sourceId) and confidence.
//   2. Unknown is a first-class value. A component we cannot compute is
//      amountMinor: null, never a silent zero.

import type { CurrencyCode } from './money';

export type Confidence = 'exact' | 'estimated' | 'unknown';

/** Worst-of combine: any unknown poisons, any estimated caps. */
export function combineConfidence(...cs: Confidence[]): Confidence {
  if (cs.includes('unknown')) return 'unknown';
  if (cs.includes('estimated')) return 'estimated';
  return 'exact';
}

export type LineKind = 'item' | 'shipping' | 'duty' | 'tax' | 'fee';

export interface BreakdownLine {
  kind: LineKind;
  /** Short user-facing label, e.g. "Import VAT (20%)". */
  label: string;
  /** Destination-currency minor units. null = unknown, NEVER zero-substituted. */
  amountMinor: number | null;
  /** Human-readable computation basis, e.g. "customs value 12599 x 530 bps". */
  basis: string;
  confidence: Confidence;
  /** Provenance: a rules row id ('US.importTax.rate'), 'input', 'fx:<provider>', or 'derived'. */
  sourceId: string;
}

export type Incoterm = 'DDP' | 'DAP' | 'unknown';

export interface LandedCostInput {
  item: {
    priceMinor: number;
    currency: CurrencyCode;
    categoryId?: string;
    /**
     * Resolved HS classification. Structured (code + confidence + source)
     * rather than a bare string so the classifier's uncertainty flows into
     * every duty line computed from it.
     */
    hs?: { code: string; confidence: Confidence; sourceId: string };
    /** ISO 3166-1 alpha-2. Customs origin; falls back to merchant country with an assumption. */
    originCountry?: string;
    weightGrams?: number;
  };
  merchant: {
    id: string;
    /** undefined = unknown merchant country: the lane cannot be determined. */
    country?: string;
    incoterm: Incoterm;
    /** Confidence in the merchant config itself (country + incoterm). */
    configConfidence: Confidence;
  };
  /**
   * undefined = shipping cost unknown. When present, this is either a
   * merchant quote (confidence omitted = 'exact') or a labeled ESTIMATE
   * assembled by enrichment from the shipping-estimate tables (confidence
   * 'estimated', with basis/assumption text carried through to the line).
   */
  shipping?: {
    costMinor: number;
    currency: CurrencyCode;
    carrier?: string;
    /** Default 'exact' (a real quote). Estimates say 'estimated'. */
    confidence?: Confidence;
    /** Provenance of the amount; default 'input'. */
    sourceId?: string;
    /** Line basis text override, e.g. the estimate's service + weight. */
    basis?: string;
    /** Pushed into the breakdown's assumptions when present. */
    assumption?: string;
  };
  destination: {
    country: string;
    subdivision?: string;
    /** Shopper display currency; all breakdown lines are in this currency. */
    currency: CurrencyCode;
  };
}

/**
 * Which import path the offer takes. Drives which components are REQUIRED
 * for ranking eligibility (see rank.ts): cross-border requires duty and tax;
 * domestic and intra-eu require none beyond the item; unknown lane can never
 * be eligible for the top slot.
 */
export type Lane = 'domestic' | 'intra-eu' | 'cross-border' | 'unknown';

export interface LandedCostBreakdown {
  lines: BreakdownLine[];
  /**
   * Sum of all KNOWN (non-null) line amounts, destination-currency minor
   * units. When unknownComponents is non-empty this is a known-components
   * subtotal, not a full landed cost; the UI must present it as such.
   * Invariant (property-tested): totalMinor === sum of non-null line amounts.
   */
  totalMinor: number;
  /**
   * Present when merchant incoterm is unknown: lowMinor is the DDP scenario
   * (duties already in the price), highMinor the DAP scenario (duties added
   * at the door). Ranking sorts on lowMinor; display shows the range.
   */
  totalRange?: { lowMinor: number; highMinor: number };
  confidence: Confidence;
  /** Plain-language assumptions baked into the numbers, shown in the UI. */
  assumptions: string[];
  /** Data-quality problems: stale rules, unverified rates, missing inputs. */
  warnings: string[];
  /** Line kinds whose amount is unknown (null). */
  unknownComponents: LineKind[];
  lane: Lane;
  currency: CurrencyCode;
}

// ---------------------------------------------------------------------------
// Destination rules: DATA, not code. One file per destination (Phase 2).
// ---------------------------------------------------------------------------

export type Verification = 'verified' | 'unverified';

/**
 * A single sourced, dated value. THE LEGAL GUARDRAIL LIVES HERE: the
 * calculator refuses to turn an unverified or unfilled (value: null) numeric
 * rule into a user-facing number; it emits an unknown line instead. Seed
 * files ship with value: null / verification: 'unverified' and only become
 * live once a human verifies them against sourceUrl and fills them in.
 */
export interface SourcedValue<T> {
  value: T | null;
  /** Primary source to verify against (CBP/HTSUS, TARIC, UK Trade Tariff...). */
  sourceUrl: string;
  /** ISO date of last human verification; null = never verified. */
  lastVerified: string | null;
  verification: Verification;
  notes?: string;
}

/** What a relief/tax threshold is compared against. */
export type ThresholdBasis = 'intrinsic-goods-value' | 'customs-value';

export type ReliefPolicy =
  | {
      kind: 'threshold';
      amountMinor: number;
      basis: ThresholdBasis;
      /**
       * HS prefixes the destination EXCLUDES from relief (e.g. Japan's
       * 10,000-yen exemption excludes leather bags, knitwear, footwear).
       * Matching is mutual-prefix (either string starts with the other) so a
       * heading-level classification like '6404' hits a subheading-level
       * exclusion; when ambiguity remains, the calculator refuses to relieve
       * and computes duty instead — over-excluding produces a labeled
       * estimate, never a confidently wrong zero. A product with NO HS
       * classification under an exclusion-bearing threshold is undecidable:
       * duty goes unknown.
       */
      excludedHsPrefixes?: string[];
    }
  /**
   * A flat per-item duty replaces ad valorem duty at or under a value
   * threshold (the EU's transitional regime: EUR 3 per item on consignments
   * up to EUR 150, in force 2026-07-01 to 2028-07-01). Above the threshold,
   * normal ad valorem rates apply. Offers are modeled as single-item
   * consignments; the calculator states that as an assumption.
   */
  | {
      kind: 'flat-below-threshold';
      amountMinor: number;
      basis: ThresholdBasis;
      flatDutyMinorPerItem: number;
      /** Same semantics as the 'threshold' variant's exclusions. */
      excludedHsPrefixes?: string[];
    }
  /** Verified fact that NO relief exists (e.g. US de minimis suspended). */
  | { kind: 'none' };

export type TaxThresholdPolicy =
  | {
      kind: 'threshold';
      amountMinor: number;
      basis: ThresholdBasis;
      /**
       * Below the threshold: 'no-import-tax' = simply not charged;
       * 'merchant-collects' = the destination shifts collection to the
       * merchant at checkout (e.g. UK low-value regime), so the import
       * event itself owes nothing but the price likely included it.
       */
      belowThreshold: 'no-import-tax' | 'merchant-collects';
      /** Same semantics as ReliefPolicy.excludedHsPrefixes. */
      excludedHsPrefixes?: string[];
    }
  | { kind: 'none' };

export interface DutyRateRule {
  /** HS code prefix this rate covers ('6404'), or 'default' as a last resort. */
  hsPrefix: string;
  /**
   * When set, the row applies only to goods of this origin (ISO alpha-2) and
   * beats the generic row for the same prefix. Origin surcharges that STACK
   * on a base rate must be encoded as a combined rate in one row; the
   * calculator applies exactly one duty row per offer.
   */
  originCountry?: string;
  label: string;
  rateBps: SourcedValue<number>;
}

export interface CarrierFeeRule {
  /** Carrier name this fee schedule belongs to, or 'default'. */
  carrier: string;
  label: string;
  flatMinor: SourcedValue<number>;
  /** Optional ad valorem component on top of the flat fee. */
  pctBps?: SourcedValue<number>;
  /**
   * The fee applies only when the customs value exceeds this amount
   * (destination minor units); at or below it the fee is zero (e.g.
   * Australia's import processing charge is $0 at or under AUD 1,000).
   * Unknown customs value makes the fee unknown.
   */
  appliesAboveMinor?: number;
  /**
   * The fee is charged only when import charges are actually due (e.g.
   * postal handling fees billed only on dutiable/taxable items). Zero duty
   * and tax -> zero fee; unknown duty or tax -> unknown fee.
   */
  onlyWhenChargesDue?: boolean;
}

export interface DestinationRules {
  /** ISO 3166-1 alpha-2. */
  country: string;
  currency: CurrencyCode;
  /**
   * Customs valuation basis. CIF: goods + freight + insurance. FOB: goods
   * only. Differs by country; encoded as data so a country switch never
   * requires a code change.
   */
  valuationBasis: SourcedValue<'CIF' | 'FOB'>;
  /**
   * Duty relief (de minimis). SEPARATE from importTax.threshold BY DESIGN:
   * conflating the two thresholds is the most common bug in this domain.
   */
  dutyRelief: SourcedValue<ReliefPolicy>;
  /** Longest hsPrefix match wins; no match and no 'default' row = duty unknown. */
  dutyRates: DutyRateRule[];
  importTax: {
    /** User-facing name: 'Import VAT', 'GST', ... */
    label: string;
    rateBps: SourcedValue<number>;
    /**
     * Add shipping to the taxable base when it is not already inside the
     * customs value (i.e. under FOB valuation). Under CIF, freight is
     * already in the customs value and is never added twice.
     */
    baseIncludesShipping: SourcedValue<boolean>;
    /** SEPARATE from dutyRelief. See above. */
    threshold: SourcedValue<TaxThresholdPolicy>;
  };
  carrierFees: CarrierFeeRule[];
  /** See money.ts for what this means; per-country cash rounding would extend it. */
  displayRounding: 'standard-minor-units';
  meta: { sourceUrl: string; notes?: string };
}

// ---------------------------------------------------------------------------
// Shipping estimates: DATA, not code (rules/shippingEstimates.ts).
// ---------------------------------------------------------------------------

export interface ShippingEstimateBand {
  /** Band applies to shipped weights up to and including this many grams. */
  maxGrams: number;
  /** Retail rate for the band, in the route's currency minor units. */
  costMinor: SourcedValue<number>;
}

/**
 * Published retail parcel rates for one origin->destination route, used to
 * ESTIMATE shipping when no merchant quote exists. Estimates are always
 * 'estimated' confidence with the service and assumed weight stated; a
 * weight above the last band, or an unverified band, yields no estimate
 * (shipping stays honestly unknown).
 */
export interface ShippingEstimateRoute {
  origin: string;
  destination: string;
  currency: CurrencyCode;
  /** The benchmarked service, e.g. 'USPS Priority Mail International'. */
  service: string;
  /** Ascending by maxGrams. */
  bands: ShippingEstimateBand[];
  meta: { sourceUrl: string; notes?: string };
}

/** EU membership table shape (data lives in rules/eu.ts, Phase 2). */
export interface EuMembership {
  members: string[];
  sourceUrl: string;
  lastVerified: string | null;
  verification: Verification;
}
