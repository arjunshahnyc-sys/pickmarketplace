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
  /** undefined = shipping cost unknown (the common case for scraped offers). */
  shipping?: {
    costMinor: number;
    currency: CurrencyCode;
    carrier?: string;
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
  | { kind: 'threshold'; amountMinor: number; basis: ThresholdBasis }
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

/** EU membership table shape (data lives in rules/eu.ts, Phase 2). */
export interface EuMembership {
  members: string[];
  sourceUrl: string;
  lastVerified: string | null;
  verification: Verification;
}
