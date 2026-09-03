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

import { ChevronDown } from 'lucide-react';
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

  return (
    <details className="mt-1 rounded-lg border border-black/10 bg-gray-50/80 text-left">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-700 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold">{headline}</span>
        {badge && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
          >
            {badge.text}
          </span>
        )}
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
      </summary>

      <div className="border-t border-black/5 px-2.5 py-2">
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
    </details>
  );
}
