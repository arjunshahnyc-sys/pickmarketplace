// The landed-cost calculation pipeline. Pure: no network, no framework, no
// clock. Everything an offer's landed cost depends on arrives as arguments.
//
// CALCULATION ORDER (the order changes the answer; this is the contract):
//   1. Customs value per the destination's valuation basis.
//        CIF = goods + freight (+ insurance); FOB = goods only.
//        The basis is DATA on the destination's rules, not an if-ladder.
//        Insurance is never separately available from our sources; CIF is
//        computed as goods + freight with an explicit assumption line and a
//        confidence cap of 'estimated' (stated, not silently zeroed).
//   2. Duty = customs value x duty rate, unless a duty relief (de minimis)
//        policy applies. Relief threshold and basis are data.
//   3. Taxable base = customs value + duty, plus shipping when the
//        destination taxes shipping AND it is not already inside a CIF
//        customs value (never double-counted). Data-driven.
//   4. Import tax = base x rate. The TAX threshold is a SEPARATE policy from
//        duty relief; the two are never conflated.
//   5. Carrier brokerage/disbursement fees: flat + optional percentage of
//        the advanced duty + tax.
//   6. Everything is computed in destination-currency minor units; item and
//        shipping convert on entry via the FxProvider with a stated spread.
//
// CONFIDENCE AND PROVENANCE RULES:
//   - A rules row that is unverified or unfilled NEVER produces a number.
//     The affected line is amountMinor: null, confidence 'unknown', with a
//     warning naming the row. This is the legal guardrail: nothing invented,
//     nothing unverified, ever renders as a figure.
//   - Unknown inputs (shipping, merchant country) likewise produce unknown
//     lines, never zeros.
//   - Confidence combines worst-of along every dependency edge (HS
//     classification -> duty rate -> duty line; customs value -> tax; ...).
//
// INCOTERM:
//   - DDP: the merchant already collects import charges at checkout; duty,
//     tax, and fee lines are zero with "included in price" provenance.
//   - DAP: charges added at the door; computed as above.
//   - unknown: lines show the DAP scenario, totalRange spans DDP-low to
//     DAP-high, and every import line is capped at 'estimated'.

import { applyRateBps, formatMinorUnits, sumMinor } from './money';
import { convertMinor } from './fx';
import {
  combineConfidence,
  type BreakdownLine,
  type Confidence,
  type DestinationRules,
  type EuMembership,
  type Lane,
  type LandedCostBreakdown,
  type LandedCostInput,
  type LineKind,
  type SourcedValue,
  type ThresholdBasis,
} from './types';
import type { FxProvider } from './fx';

export interface CalcContext {
  /** Rules for the destination country; null = no rules data exists for it. */
  rules: DestinationRules | null;
  eu: EuMembership;
  fx: FxProvider;
  /** Data-quality warnings from the rules loader (staleness); passed through. */
  rulesWarnings?: string[];
}

const IMPORT_KINDS: ReadonlySet<LineKind> = new Set(['duty', 'tax', 'fee']);

/** A resolved sourced value: null means "unusable, a warning was recorded". */
interface Resolved<T> {
  value: T;
  confidence: Confidence;
}

interface Known {
  amountMinor: number;
  confidence: Confidence;
  sourceId: string;
}

export function calculateLandedCost(
  input: LandedCostInput,
  ctx: CalcContext
): LandedCostBreakdown {
  const warnings: string[] = [...(ctx.rulesWarnings ?? [])];
  const assumptions: string[] = [];
  const lines: BreakdownLine[] = [];
  const dest = input.destination;

  const resolve = <T>(sv: SourcedValue<T>, rowId: string): Resolved<T> | null => {
    if (sv.value === null || sv.verification !== 'verified') {
      const reason =
        sv.verification !== 'verified'
          ? sv.value === null
            ? 'unverified and not filled in'
            : 'unverified'
          : 'not filled in';
      warnings.push(
        `Rule ${rowId} is ${reason}; the dependent amount is unknown. Verify against ${sv.sourceUrl}.`
      );
      return null;
    }
    return { value: sv.value, confidence: 'exact' };
  };

  const fmt = (minor: number) => `${formatMinorUnits(minor, dest.currency)} ${dest.currency}`;

  // ── Lane ─────────────────────────────────────────────────────────────────
  const merchantCountry = input.merchant.country;
  let lane: Lane;
  let laneConfidence: Confidence = input.merchant.configConfidence;
  if (!merchantCountry) {
    lane = 'unknown';
    laneConfidence = 'unknown';
    warnings.push(
      `Merchant "${input.merchant.id}" has no configured country; import charges cannot be determined.`
    );
  } else if (merchantCountry === dest.country) {
    lane = 'domestic';
  } else if (
    ctx.eu.members.includes(merchantCountry) &&
    ctx.eu.members.includes(dest.country)
  ) {
    lane = 'intra-eu';
    if (ctx.eu.verification !== 'verified') {
      laneConfidence = combineConfidence(laneConfidence, 'estimated');
      warnings.push(
        `EU membership table is unverified (source: ${ctx.eu.sourceUrl}); intra-EU treatment is an estimate.`
      );
    }
  } else {
    lane = 'cross-border';
  }

  // ── Currency conversion on entry (step 6's rate, applied up front) ──────
  const toDest = (amountMinor: number, from: string): Known | null => {
    const conv = convertMinor(amountMinor, from, dest.currency, ctx.fx);
    if (!conv) {
      warnings.push(`No FX rate available from ${from} to ${dest.currency}.`);
      return null;
    }
    if (conv.assumption && !assumptions.includes(conv.assumption)) {
      assumptions.push(conv.assumption);
    }
    return { amountMinor: conv.amountMinor, confidence: conv.confidence, sourceId: conv.sourceId };
  };

  const itemDest = toDest(input.item.priceMinor, input.item.currency);
  lines.push(
    itemDest
      ? {
          kind: 'item',
          label: 'Item price',
          amountMinor: itemDest.amountMinor,
          basis: `Listed price ${formatMinorUnits(input.item.priceMinor, input.item.currency)} ${input.item.currency}`,
          confidence: itemDest.confidence,
          sourceId: itemDest.sourceId === 'fx:identity' ? 'input' : itemDest.sourceId,
        }
      : {
          kind: 'item',
          label: 'Item price',
          amountMinor: null,
          basis: `Listed in ${input.item.currency}; no rate to ${dest.currency}`,
          confidence: 'unknown',
          sourceId: 'input',
        }
  );

  const shippingDest: Known | null = input.shipping
    ? toDest(input.shipping.costMinor, input.shipping.currency)
    : null;
  if (input.shipping && shippingDest) {
    lines.push({
      kind: 'shipping',
      label: 'Shipping',
      amountMinor: shippingDest.amountMinor,
      basis: `Quoted by merchant${input.shipping.carrier ? ` via ${input.shipping.carrier}` : ''}`,
      confidence: shippingDest.confidence,
      sourceId: shippingDest.sourceId === 'fx:identity' ? 'input' : shippingDest.sourceId,
    });
  } else {
    if (!input.shipping) {
      warnings.push('Shipping cost is not available from the offer source.');
    }
    lines.push({
      kind: 'shipping',
      label: 'Shipping',
      amountMinor: null,
      basis: input.shipping
        ? `Quoted in ${input.shipping.currency}; no rate to ${dest.currency}`
        : 'Not provided by the offer source',
      confidence: 'unknown',
      sourceId: 'input',
    });
  }

  // ── Import charges by lane ───────────────────────────────────────────────
  if (lane === 'domestic') {
    const c = combineConfidence('exact', input.merchant.configConfidence);
    pushZero(lines, 'duty', 'Import duty', 'Domestic purchase: no import charges', c);
    pushZero(lines, 'tax', 'Import tax', 'Domestic purchase: no import charges', c);
    pushZero(lines, 'fee', 'Customs fees', 'Domestic purchase: no import charges', c);
    assumptions.push('Domestic sales tax charged at checkout, if any, is not included.');
  } else if (lane === 'intra-eu') {
    pushZero(lines, 'duty', 'Import duty', 'Intra-EU delivery: free movement of goods', laneConfidence);
    pushZero(lines, 'tax', 'VAT', 'Intra-EU delivery: VAT is included in the listed price', laneConfidence);
    pushZero(lines, 'fee', 'Customs fees', 'Intra-EU delivery: no customs processing', laneConfidence);
    assumptions.push('Assumes the listed price already includes VAT, as EU consumer prices must.');
  } else if (lane === 'unknown') {
    pushUnknown(lines, 'duty', 'Import duty', 'Merchant country unknown');
    pushUnknown(lines, 'tax', 'Import tax', 'Merchant country unknown');
    pushUnknown(lines, 'fee', 'Customs fees', 'Merchant country unknown');
  } else if (input.merchant.incoterm === 'DDP') {
    // Merchant collects import charges at checkout. This is decidable even
    // with no rules data at all, which is the point of tracking incoterms.
    const c = combineConfidence('exact', input.merchant.configConfidence);
    const basis = 'Merchant sells DDP: import charges are included in the listed price';
    pushZero(lines, 'duty', 'Import duty (prepaid by merchant)', basis, c);
    pushZero(lines, 'tax', 'Import tax (prepaid by merchant)', basis, c);
    pushZero(lines, 'fee', 'Customs fees (prepaid by merchant)', basis, c);
  } else {
    crossBorderCharges(input, ctx, lines, warnings, assumptions, itemDest, shippingDest, resolve, fmt);
    if (input.merchant.incoterm === 'unknown') {
      // Shown lines are the DAP scenario; cap them at 'estimated' since the
      // merchant may in fact prepay, and surface the range on the total.
      for (const line of lines) {
        if (IMPORT_KINDS.has(line.kind)) {
          line.confidence = combineConfidence(line.confidence, 'estimated');
        }
      }
      assumptions.push(
        'This merchant may or may not collect import charges at checkout; the range spans charges-prepaid (low) to charges-added-on-delivery (high).'
      );
    } else {
      assumptions.push('Assumes import charges are not prepaid by the merchant (DAP).');
    }
  }

  // ── Assemble ─────────────────────────────────────────────────────────────
  const knownAmounts = lines
    .map((l) => l.amountMinor)
    .filter((a): a is number => a !== null);
  const totalMinor = sumMinor(knownAmounts);
  const unknownComponents = Array.from(
    new Set(lines.filter((l) => l.amountMinor === null).map((l) => l.kind))
  );
  let confidence = combineConfidence(...lines.map((l) => l.confidence));

  let totalRange: LandedCostBreakdown['totalRange'];
  if (lane === 'cross-border' && input.merchant.incoterm === 'unknown') {
    const lowMinor = sumMinor(
      lines
        .filter((l) => l.amountMinor !== null)
        .map((l) => (IMPORT_KINDS.has(l.kind) ? 0 : (l.amountMinor as number)))
    );
    totalRange = { lowMinor, highMinor: totalMinor };
    confidence = combineConfidence(confidence, 'estimated');
  }

  return {
    lines,
    totalMinor,
    totalRange,
    confidence,
    assumptions: dedupe(assumptions),
    warnings: dedupe(warnings),
    unknownComponents,
    lane,
    currency: dest.currency,
  };
}

// ── Cross-border pipeline: steps 1 through 5 ───────────────────────────────
function crossBorderCharges(
  input: LandedCostInput,
  ctx: CalcContext,
  lines: BreakdownLine[],
  warnings: string[],
  assumptions: string[],
  itemDest: Known | null,
  shippingDest: Known | null,
  resolve: <T>(sv: SourcedValue<T>, rowId: string) => Resolved<T> | null,
  fmt: (minor: number) => string
): void {
  const rules = ctx.rules;
  const dest = input.destination;
  if (!rules) {
    warnings.push(`No customs rules data for destination ${dest.country}.`);
    pushUnknown(lines, 'duty', 'Import duty', `No rules data for ${dest.country}`);
    pushUnknown(lines, 'tax', 'Import tax', `No rules data for ${dest.country}`);
    pushUnknown(lines, 'fee', 'Customs fees', `No rules data for ${dest.country}`);
    return;
  }
  const R = (rowId: string) => `${rules.country}.${rowId}`;

  if (!input.item.originCountry) {
    assumptions.push(
      'Assumes non-preferential origin: no trade-agreement duty discounts are applied.'
    );
  }

  // Step 1: customs value.
  const basisRule = resolve(rules.valuationBasis, R('valuationBasis'));
  let customsValue: Known | null = null;
  if (basisRule && itemDest) {
    if (basisRule.value === 'FOB') {
      customsValue = {
        amountMinor: itemDest.amountMinor,
        confidence: combineConfidence(itemDest.confidence, basisRule.confidence),
        sourceId: R('valuationBasis'),
      };
    } else if (shippingDest) {
      customsValue = {
        amountMinor: itemDest.amountMinor + shippingDest.amountMinor,
        confidence: combineConfidence(
          itemDest.confidence,
          shippingDest.confidence,
          basisRule.confidence,
          'estimated' // insurance not separately available; stated below
        ),
        sourceId: R('valuationBasis'),
      };
      assumptions.push(
        'CIF customs value is computed as goods + freight; insurance is not separately available.'
      );
    } else {
      warnings.push(
        `${rules.country} uses CIF valuation, which needs the shipping cost; it is unavailable, so duty and tax are unknown.`
      );
    }
  }

  const thresholdBase = (basis: ThresholdBasis): Known | null =>
    basis === 'intrinsic-goods-value' ? itemDest : customsValue;

  // Step 2: duty.
  let duty: Known | null = null;
  let dutyLabel = 'Import duty';
  let dutyBasis = '';
  const reliefRule = resolve(rules.dutyRelief, R('dutyRelief'));
  if (customsValue && reliefRule) {
    const policy = reliefRule.value;
    let relieved = false;
    let reliefConfidence: Confidence = reliefRule.confidence;
    if (policy.kind === 'threshold') {
      const base = thresholdBase(policy.basis);
      if (!base) {
        warnings.push(
          `Duty relief threshold for ${rules.country} compares against ${policy.basis}, which is unknown.`
        );
        reliefConfidence = 'unknown';
      } else if (base.amountMinor <= policy.amountMinor) {
        relieved = true;
        duty = {
          amountMinor: 0,
          confidence: combineConfidence(reliefRule.confidence, base.confidence),
          sourceId: R('dutyRelief'),
        };
        dutyBasis = `${policy.basis} ${fmt(base.amountMinor)} is at or under the ${fmt(policy.amountMinor)} duty relief threshold`;
      }
    }
    if (!relieved && reliefConfidence !== 'unknown') {
      // Step 2 continued: rate by longest HS-prefix match. Origin-specific
      // rows apply only when the goods' origin matches, and beat the generic
      // row at equal prefix length. Origin falls back to merchant country
      // (the non-preferential-origin assumption is recorded above).
      const hs = input.item.hs;
      const origin = input.item.originCountry ?? input.merchant.country;
      const rows = rules.dutyRates
        .filter((r) => !r.originCountry || r.originCountry === origin)
        .sort(
          (a, b) =>
            b.hsPrefix.length - a.hsPrefix.length ||
            Number(Boolean(b.originCountry)) - Number(Boolean(a.originCountry))
        );
      const match = hs
        ? rows.find((r) => r.hsPrefix !== 'default' && hs.code.startsWith(r.hsPrefix)) ??
          rows.find((r) => r.hsPrefix === 'default')
        : rows.find((r) => r.hsPrefix === 'default');
      if (!hs) {
        warnings.push('No HS classification for this product; using the default duty rate if one exists.');
      }
      const rateRowId = match
        ? `dutyRates.${match.hsPrefix}${match.originCountry ? `:${match.originCountry}` : ''}`
        : '';
      const rate = match ? resolve(match.rateBps, R(rateRowId)) : null;
      if (match && rate) {
        const amount = applyRateBps(customsValue.amountMinor, rate.value);
        duty = {
          amountMinor: amount,
          confidence: combineConfidence(
            rate.confidence,
            customsValue.confidence,
            hs?.confidence ?? 'estimated'
          ),
          sourceId: R(rateRowId),
        };
        dutyLabel = match.label;
        dutyBasis = `Customs value ${fmt(customsValue.amountMinor)} x ${(rate.value / 100).toFixed(2)}%${hs ? ` (HS ${hs.code}, ${hs.confidence})` : ' (default rate, no HS code)'}`;
      } else if (!match) {
        warnings.push(
          `No duty rate row matches HS ${hs?.code ?? '(none)'} for ${rules.country} and no default exists.`
        );
      }
    }
  }
  if (duty) {
    lines.push({
      kind: 'duty',
      label: dutyLabel,
      amountMinor: duty.amountMinor,
      basis: dutyBasis,
      confidence: duty.confidence,
      sourceId: duty.sourceId,
    });
  } else {
    pushUnknown(lines, 'duty', 'Import duty', 'Cannot be computed from available data');
  }

  // Steps 3 + 4: taxable base, then import tax. Thresholds are separate from
  // duty relief BY DESIGN; do not "simplify" them into one check.
  let tax: Known | null = null;
  let taxBasis = '';
  const taxRules = rules.importTax;
  const thresholdRule = resolve(taxRules.threshold, R('importTax.threshold'));
  const rateRule = resolve(taxRules.rateBps, R('importTax.rate'));
  const shipInBase = resolve(taxRules.baseIncludesShipping, R('importTax.baseIncludesShipping'));
  if (thresholdRule) {
    const policy = thresholdRule.value;
    if (policy.kind === 'threshold') {
      const base = thresholdBase(policy.basis);
      if (!base) {
        warnings.push(
          `${taxRules.label} threshold for ${rules.country} compares against ${policy.basis}, which is unknown.`
        );
      } else if (base.amountMinor <= policy.amountMinor) {
        if (policy.belowThreshold === 'no-import-tax') {
          tax = {
            amountMinor: 0,
            confidence: combineConfidence(thresholdRule.confidence, base.confidence),
            sourceId: R('importTax.threshold'),
          };
          taxBasis = `${policy.basis} ${fmt(base.amountMinor)} is at or under the ${fmt(policy.amountMinor)} ${taxRules.label} threshold`;
        } else {
          tax = {
            amountMinor: 0,
            confidence: 'estimated',
            sourceId: R('importTax.threshold'),
          };
          taxBasis = `Under ${fmt(policy.amountMinor)}, ${rules.country} requires the merchant to collect ${taxRules.label} at checkout`;
          assumptions.push(
            `Assumes the merchant collected ${taxRules.label} at checkout, as ${rules.country} requires for low-value imports.`
          );
        }
      }
    }
  }
  if (!tax && customsValue && duty && thresholdRule && rateRule && shipInBase) {
    let base = customsValue.amountMinor + duty.amountMinor;
    let baseConfidence = combineConfidence(customsValue.confidence, duty.confidence);
    let baseNote = 'customs value + duty';
    const basisRuleValue = basisRule?.value;
    if (shipInBase.value && basisRuleValue === 'FOB') {
      // Shipping joins the tax base only when not already inside CIF.
      if (shippingDest) {
        base += shippingDest.amountMinor;
        baseConfidence = combineConfidence(baseConfidence, shippingDest.confidence);
        baseNote = 'customs value + duty + shipping';
      } else {
        warnings.push(
          `${rules.country} taxes shipping, but the shipping cost is unknown, so ${taxRules.label} is unknown.`
        );
        base = -1; // sentinel: cannot compute
      }
    }
    if (base >= 0) {
      const amount = applyRateBps(base, rateRule.value);
      tax = {
        amountMinor: amount,
        confidence: combineConfidence(rateRule.confidence, baseConfidence, shipInBase.confidence),
        sourceId: R('importTax.rate'),
      };
      taxBasis = `${baseNote} ${fmt(base)} x ${(rateRule.value / 100).toFixed(2)}%`;
    }
  }
  if (tax) {
    lines.push({
      kind: 'tax',
      label: taxRules.label,
      amountMinor: tax.amountMinor,
      basis: taxBasis,
      confidence: tax.confidence,
      sourceId: tax.sourceId,
    });
  } else {
    pushUnknown(lines, 'tax', taxRules.label, 'Cannot be computed from available data');
  }

  // Step 5: carrier fees. Percentage components apply to the advanced
  // duty + tax (that is what disbursement fees are charged on).
  const carrier = input.shipping?.carrier;
  const feeRow =
    (carrier && rules.carrierFees.find((r) => r.carrier === carrier)) ||
    rules.carrierFees.find((r) => r.carrier === 'default');
  if (feeRow) {
    const flat = resolve(feeRow.flatMinor, R(`carrierFees.${feeRow.carrier}.flat`));
    const pct = feeRow.pctBps
      ? resolve(feeRow.pctBps, R(`carrierFees.${feeRow.carrier}.pct`))
      : undefined; // undefined = no percentage component at all
    if (flat && pct !== null) {
      const advanced =
        duty && tax ? { amountMinor: duty.amountMinor + tax.amountMinor } : null;
      if (pct && !advanced) {
        pushUnknown(
          lines,
          'fee',
          feeRow.label,
          'Percentage fee applies to duty + tax, which are unknown'
        );
      } else {
        const pctAmount = pct && advanced ? applyRateBps(advanced.amountMinor, pct.value) : 0;
        const amount = flat.value + pctAmount;
        lines.push({
          kind: 'fee',
          label: feeRow.label,
          amountMinor: amount,
          basis: pct
            ? `${fmt(flat.value)} flat + ${(pct.value / 100).toFixed(2)}% of advanced charges`
            : `${fmt(flat.value)} flat`,
          // Fee schedules vary by service level; never better than estimated.
          confidence: combineConfidence(
            'estimated',
            flat.confidence,
            pct?.confidence ?? 'exact',
            ...(pct && duty && tax ? [duty.confidence, tax.confidence] : [])
          ),
          sourceId: R(`carrierFees.${feeRow.carrier}`),
        });
      }
    } else {
      pushUnknown(lines, 'fee', feeRow.label, 'Fee schedule is unverified or unfilled');
    }
  } else {
    warnings.push(`No carrier fee data for ${rules.country}${carrier ? ` (carrier ${carrier})` : ''}.`);
    pushUnknown(lines, 'fee', 'Customs fees', 'No fee schedule for this destination');
  }
}

function pushZero(
  lines: BreakdownLine[],
  kind: LineKind,
  label: string,
  basis: string,
  confidence: Confidence
): void {
  lines.push({ kind, label, amountMinor: 0, basis, confidence, sourceId: 'derived' });
}

function pushUnknown(lines: BreakdownLine[], kind: LineKind, label: string, basis: string): void {
  lines.push({ kind, label, amountMinor: null, basis, confidence: 'unknown', sourceId: 'derived' });
}

function dedupe(xs: string[]): string[] {
  return Array.from(new Set(xs));
}
