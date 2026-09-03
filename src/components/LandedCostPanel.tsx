'use client';

// Per-offer landed-cost panel: a collapsed one-line summary that expands to
// the full line-by-line breakdown with per-line confidence.
//
// PRESENTATION RULES (deliberate, do not restyle away):
//   - Three explicit states, never blended:
//       resolved    "Total $31.42" (or a DDP-to-DAP range) - every
//                   component is a known, sourced number; the badge carries
//                   the real confidence (exact vs estimate).
//       partial     "Known costs $27.97 · shipping not included" - a
//                   known-components sum must NAME what is missing; it may
//                   never read as a full total. Badge says "partial". The
//                   expanded body says what the gap means for the shopper.
//       unavailable "Total cost unavailable" with the reason shown inline
//                   as a second line. No expandable body: every line would
//                   read "not included", and an accordion that opens onto
//                   nothing is clutter (owner sign-off 2026-09-03). An
//                   honest blank beats a confident wrong number, and the
//                   row stays so a shopper can see why the offer ranks last.
//   - The legacy "+ shipping" suffix pattern is DELETED; missing components
//     are named, not appended. "Shipping calculated at checkout" is never a
//     headline: no unavailable code is about shipping, and a shipping gap
//     is a partial whose headline already names it.
//   - While FX rates are still loading, an FX-caused unavailable renders as
//     "Computing total..." (a loading state, not a verdict), also inline.
//   - Unknown amounts render as a "not included" tag, never 0.00.
//   - The summary wording comes from summarizeTotal(); this component adds
//     no arithmetic of its own.

import { useId, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import InfoTip from './InfoTip';
import { summarizeTotal, type TotalSummary, type UnavailableCode } from '@/lib/landedCost/enrich';
import { formatMinorUnits } from '@/lib/landedCost/money';
import { totalResolution, type TotalResolution } from '@/lib/landedCost/rank';
import type {
  BreakdownLine,
  Confidence,
  Lane,
  LandedCostBreakdown,
  LineKind,
} from '@/lib/landedCost/types';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  CAD: 'CA$',
  GBP: '£',
  EUR: '€',
  AUD: 'A$',
  JPY: '¥',
};

function money(amountMinor: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${formatMinorUnits(amountMinor, currency)}`;
}

function confidenceTag(line: BreakdownLine): string | null {
  if (line.amountMinor === null) return 'unknown';
  if (line.confidence === 'exact') return null;
  return 'est.';
}

const MISSING_LABELS: Record<LineKind, string> = {
  item: 'item price',
  shipping: 'shipping',
  duty: 'duty',
  tax: 'tax',
  fee: 'fees',
};

function missingList(missing: LineKind[]): string {
  const labels = missing.map((k) => MISSING_LABELS[k]);
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * Lines as displayed: for domestic and intra-EU lanes, the structurally-zero
 * DERIVED import lines (duty, tax, fee with sourceId 'derived') collapse
 * into one plain-language line, so the panel reads as an answer rather than
 * a form of zeros. A computed line on those lanes (US sales tax, with a
 * rules-row sourceId) always stays visible on its own, and so does a
 * derived line that is UNKNOWN (US sales tax with no delivery state chosen):
 * only the zeros collapse, the unknown row keeps its "not included" tag.
 * Any lane where a derived import amount could be nonzero keeps the full
 * view. Exported for tests.
 */
export function panelLines(breakdown: LandedCostBreakdown): BreakdownLine[] {
  const collapsible = breakdown.lane === 'domestic' || breakdown.lane === 'intra-eu';
  const isDerivedImport = (l: BreakdownLine) =>
    ['duty', 'tax', 'fee'].includes(l.kind) && l.sourceId === 'derived';
  const importLines = breakdown.lines.filter(isDerivedImport);
  const zeroLines = importLines.filter((l) => l.amountMinor === 0);
  if (
    !collapsible ||
    zeroLines.length === 0 ||
    importLines.some((l) => l.amountMinor !== null && l.amountMinor !== 0)
  ) {
    return breakdown.lines;
  }
  const collapsed: BreakdownLine = {
    kind: 'duty',
    label:
      breakdown.lane === 'domestic'
        ? 'No import charges (domestic purchase)'
        : 'No import charges (intra-EU delivery)',
    amountMinor: 0,
    basis: zeroLines[0].basis,
    confidence: zeroLines.reduce(
      (worst, l) => (l.confidence === 'estimated' ? 'estimated' : worst),
      zeroLines[0].confidence
    ),
    sourceId: zeroLines[0].sourceId,
  };
  return [...breakdown.lines.filter((l) => !zeroLines.includes(l)), collapsed];
}

/**
 * The collapsed bar's text for a summary. Exported for the honesty tests:
 * the legacy "+ shipping" suffix pattern must be unreproducible, a partial
 * must always name its gaps, and only a complete summary may say "Total".
 */
export function headlineFor(
  summary: TotalSummary,
  currency: string,
  fxLoading = false
): string {
  if (fxLoading && summary.kind === 'unavailable' && summary.code === 'fx') {
    return 'Computing total…';
  }
  if (summary.kind === 'unavailable') {
    return 'Total cost unavailable';
  }
  if (summary.kind === 'range') {
    // A degenerate range (all import lines zero in both scenarios) reads as
    // a rendering bug; collapse it to the single figure it is.
    const figure =
      summary.lowMinor === summary.highMinor
        ? money(summary.lowMinor, currency)
        : `${money(summary.lowMinor, currency)} to ${money(summary.highMinor, currency)}`;
    return summary.missing.length > 0
      ? `Known costs ${figure} · ${missingList(summary.missing)} not included`
      : `Total ${figure}`;
  }
  if (summary.kind === 'subtotal') {
    return `Known costs ${money(summary.totalMinor, currency)} · ${missingList(summary.missing)} not included`;
  }
  return `Total ${money(summary.totalMinor, currency)}`;
}

/**
 * The badge carries the REAL state of the number, not a static label:
 * partial for named gaps, exact only when every line is exact, estimate
 * otherwise; none on unavailable/loading. Exported for tests.
 */
export function badgeFor(
  summary: TotalSummary,
  resolution: TotalResolution,
  confidence: Confidence,
  fxLoading = false
): { text: string; className: string } | null {
  if (fxLoading || summary.kind === 'unavailable') return null;
  if (resolution === 'partial') {
    return { text: 'partial', className: 'bg-neutral-200/80 text-neutral-700' };
  }
  if (confidence === 'exact') {
    return { text: 'exact', className: 'bg-teal-50 text-[#1F7A6F]' };
  }
  return { text: 'estimate', className: 'bg-amber-100 text-amber-800' };
}

/**
 * How the row renders: a static line for the two no-number states, the
 * expandable breakdown for everything with real figures. Kept next to
 * headlineFor so the two can never disagree about what "unavailable" is.
 * Exported for tests.
 */
export type PanelMode = 'loading' | 'unavailable' | 'panel';

export function panelMode(summary: TotalSummary, fxLoading: boolean): PanelMode {
  if (summary.kind !== 'unavailable') return 'panel';
  return fxLoading && summary.code === 'fx' ? 'loading' : 'unavailable';
}

export interface UnavailableContext {
  /** Currency the offer is listed in (Product.currency); absent = unknown. */
  itemCurrency?: string;
  /** Display currency of the breakdown. */
  currency: string;
  /** Destination country code for the estimate, e.g. 'GB'. */
  country?: string;
}

/**
 * The shopper-facing reason under "Total cost unavailable", one per code.
 * Each names the thing that is actually missing; none may mention shipping,
 * because no unavailable code is about shipping. Exported for tests.
 */
export function unavailableCopy(code: UnavailableCode, ctx: UnavailableContext): string {
  switch (code) {
    case 'fx':
      return ctx.itemCurrency && ctx.itemCurrency !== ctx.currency
        ? `This ${ctx.itemCurrency} price could not be converted to ${ctx.currency} today.`
        : `This price could not be converted to ${ctx.currency} today.`;
    case 'unknown-seller':
      return 'Pick does not recognize this seller, so it cannot tell whether import charges apply.';
    case 'import-charges':
      return ctx.country
        ? `Import duty and tax for delivery to ${ctx.country} could not be computed from verified data.`
        : 'Import duty and tax for this destination could not be computed from verified data.';
  }
}

export const LOADING_COPY = "Waiting for today's exchange rates to convert this offer.";

/**
 * What a partial's named gaps mean for the shopper, one line per gap that
 * has a specific, actionable answer, followed by the ranking consequence.
 * A shipping gap is the ONE place "at checkout" is honest: the seller
 * really does charge it there. Exported for tests.
 */
export function gapNotes(summary: TotalSummary, lane: Lane): string[] {
  if (summary.kind !== 'subtotal' && summary.kind !== 'range') return [];
  const notes: string[] = [];
  if (summary.missing.includes('shipping')) {
    notes.push('Shipping is set by the seller at checkout and is not included above.');
  }
  if (summary.missing.includes('tax') && lane === 'domestic') {
    notes.push('Choose a delivery state in the header to include sales tax.');
  }
  if (summary.missing.length > 0) {
    notes.push('Offers with unresolved costs rank below fully resolved totals.');
  }
  return notes;
}

/** The closing caveat, worded for the lane the money actually crosses. */
export function disclaimerFor(lane: Lane): string {
  if (lane === 'domestic' || lane === 'intra-eu') {
    return 'Estimates are for comparison only, not a quote. Final shipping and tax are set by the retailer at checkout.';
  }
  return 'Estimates are for comparison only, not a quote. Final duties, taxes, and fees are set by customs authorities and carriers at import time.';
}

/**
 * What the headline figure is made of, built from the panel's OWN lines so
 * the tooltip can never overclaim: it lists every line that has a number,
 * marks the estimated ones, turns the collapsed "no import charges" row
 * into a clause, names a partial's gaps, and explains a DDP-to-DAP range.
 * Exported for tests.
 */
export function includedSummary(breakdown: LandedCostBreakdown): string {
  const summary = summarizeTotal(breakdown);
  if (summary.kind === 'unavailable') return '';
  const lines = panelLines(breakdown);
  const noImport = lines.find((l) => l.label.startsWith('No import charges'));
  const included = lines
    .filter((l) => l !== noImport && l.amountMinor !== null)
    .map((l) => {
      const label = /^[A-Z][a-z]/.test(l.label)
        ? l.label.charAt(0).toLowerCase() + l.label.slice(1)
        : l.label;
      return l.confidence === 'exact' ? label : `${label} (est.)`;
    });
  const list =
    included.length <= 1
      ? included[0] ?? 'nothing yet'
      : `${included.slice(0, -1).join(', ')} and ${included[included.length - 1]}`;
  const clause = noImport
    ? breakdown.lane === 'intra-eu'
      ? ', with no import charges on an intra-EU delivery'
      : ', with no import charges on a domestic purchase'
    : '';

  const parts: string[] = [];
  const resolution = totalResolution(breakdown);
  if (resolution === 'partial') {
    parts.push(`Known costs only: ${list}${clause}.`);
    const missing = summary.kind === 'total' ? [] : summary.missing;
    const names = missingList(missing);
    if (names) {
      const cap = names.charAt(0).toUpperCase() + names.slice(1);
      parts.push(`${cap} ${missing.length > 1 ? 'are' : 'is'} not included.`);
    }
  } else if (breakdown.confidence === 'exact') {
    parts.push(`This total includes ${list}${clause}, all from sourced figures.`);
  } else {
    parts.push(`This total is an estimate. It includes ${list}${clause}.`);
  }
  if (summary.kind === 'range') {
    parts.push(
      'The range runs from import charges prepaid by the seller (low) to charged on delivery (high).'
    );
  }
  if (included.some((l) => l.endsWith('(est.)'))) {
    parts.push(
      'Amounts marked est. come from published rates and policies, not a quote from the seller.'
    );
  }
  parts.push('Expand the row for the full breakdown.');
  return parts.join(' ');
}

export default function LandedCostPanel({
  breakdown,
  fxPending = false,
  itemCurrency,
  country,
}: {
  breakdown: LandedCostBreakdown;
  /** True while FX rates are still loading; see the presentation rules. */
  fxPending?: boolean;
  /** Currency the offer is listed in, so an FX failure can name both sides. */
  itemCurrency?: string;
  /** Destination country the estimate is for. */
  country?: string;
}) {
  const [open, setOpen] = useState(false);
  const headlineId = useId();
  const badgeId = useId();
  const bodyId = useId();
  const summary = summarizeTotal(breakdown);
  const currency = breakdown.currency;
  const resolution = totalResolution(breakdown);
  const fxLoading = summary.kind === 'unavailable' && summary.code === 'fx' && fxPending;

  const headline = headlineFor(summary, currency, fxLoading);
  const badge = badgeFor(summary, resolution, breakdown.confidence, fxLoading);
  const mode = panelMode(summary, fxLoading);

  // No number to show: a static two-line note, nothing to expand.
  if (mode !== 'panel' && summary.kind === 'unavailable') {
    return (
      <div className="mt-1 rounded-lg border border-black/10 bg-gray-50/80 px-2.5 py-1.5 text-left text-xs">
        <p className="text-neutral-500">{headline}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">
          {mode === 'loading'
            ? LOADING_COPY
            : unavailableCopy(summary.code, { itemCurrency, currency, country })}
        </p>
      </div>
    );
  }

  const notes = gapNotes(summary, breakdown.lane);
  const tip = includedSummary(breakdown);

  return (
    // Controlled disclosure instead of <details>: the bar needs a real
    // Info trigger in flow right after the badge, and a button nested in
    // <summary> would be a button inside a button. The full-width overlay
    // button keeps "click anywhere on the bar to expand"; the trigger and
    // chevron sit above it. Both buttons opt out of the global hover scale.
    <div className="relative mt-1 rounded-lg border border-black/10 bg-gray-50/80 text-left">
      <div className="relative flex flex-wrap items-center gap-x-1.5 gap-y-1 px-2.5 py-1.5 text-xs text-neutral-700">
        <button
          type="button"
          data-no-lift=""
          aria-expanded={open}
          aria-controls={bodyId}
          aria-labelledby={badge ? `${headlineId} ${badgeId}` : headlineId}
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-0 h-full w-full cursor-pointer rounded-lg"
        />
        <span id={headlineId} className="relative font-semibold">
          {headline}
        </span>
        {badge && (
          <span
            id={badgeId}
            className={`relative rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
          >
            {badge.text}
          </span>
        )}
        {badge && tip && (
          <InfoTip
            label="What this total includes"
            content={tip}
            triggerClassName="relative z-[1] -my-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 hover:text-pick-teal"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </InfoTip>
        )}
        <ChevronDown
          className={`relative ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </div>

      <div id={bodyId} hidden={!open} className="border-t border-black/5 px-2.5 py-2">
        {notes.length > 0 && (
          <div className="mb-2 space-y-1">
            {notes.map((note) => (
              <p key={note} className="text-[11px] leading-snug text-neutral-600">
                {note}
              </p>
            ))}
          </div>
        )}

        <ul className="space-y-1">
          {panelLines(breakdown).map((line) => (
            <li
              key={`${line.kind}-${line.label}`}
              className="flex items-baseline justify-between gap-2 text-[11px]"
            >
              <span className="text-neutral-600" title={line.basis}>
                {line.label}
                {confidenceTag(line) === 'est.' && (
                  <span className="ml-1 text-[10px] text-amber-700">est.</span>
                )}
              </span>
              {line.amountMinor === null ? (
                <span className="rounded bg-neutral-200/70 px-1 text-[10px] text-neutral-600">
                  not included
                </span>
              ) : (
                <span className="tabular-nums text-neutral-800">
                  {money(line.amountMinor, currency)}
                </span>
              )}
            </li>
          ))}
        </ul>

        {breakdown.assumptions.length > 0 && (
          <p className="mt-2 text-[10px] leading-snug text-neutral-500">
            {breakdown.assumptions.join(' ')}
          </p>
        )}
        <p className="mt-1.5 text-[10px] leading-snug text-neutral-500">
          {disclaimerFor(breakdown.lane)}
        </p>
      </div>
    </div>
  );
}
