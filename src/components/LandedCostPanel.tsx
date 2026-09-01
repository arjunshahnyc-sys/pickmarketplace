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
//                   never read as a full total. Badge says "partial".
//       unavailable "Total cost unavailable" with the reason on expand. An
//                   honest blank beats a confident wrong number.
//   - The legacy "+ shipping" suffix pattern is DELETED; missing components
//     are named, not appended.
//   - While FX rates are still loading, an FX-caused unavailable renders as
//     "Computing total..." (a loading state, not a verdict).
//   - Unknown amounts render as a "not included" tag, never 0.00.
//   - The summary wording comes from summarizeTotal(); this component adds
//     no arithmetic of its own.

import { ChevronDown } from 'lucide-react';
import { summarizeTotal, type TotalSummary } from '@/lib/landedCost/enrich';
import { formatMinorUnits } from '@/lib/landedCost/money';
import { totalResolution, type TotalResolution } from '@/lib/landedCost/rank';
import type {
  BreakdownLine,
  Confidence,
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
 * rules-row sourceId) always stays visible on its own. Any lane where a
 * derived import amount could be nonzero or unknown keeps the full view.
 * Exported for tests.
 */
export function panelLines(breakdown: LandedCostBreakdown): BreakdownLine[] {
  const collapsible = breakdown.lane === 'domestic' || breakdown.lane === 'intra-eu';
  const isCollapsibleImport = (l: BreakdownLine) =>
    ['duty', 'tax', 'fee'].includes(l.kind) && l.sourceId === 'derived';
  const importLines = breakdown.lines.filter(isCollapsibleImport);
  if (
    !collapsible ||
    importLines.length === 0 ||
    !importLines.every((l) => l.amountMinor === 0)
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
    basis: importLines[0].basis,
    confidence: importLines.reduce(
      (worst, l) => (l.confidence === 'estimated' ? 'estimated' : worst),
      importLines[0].confidence
    ),
    sourceId: importLines[0].sourceId,
  };
  return [
    ...breakdown.lines.filter((l) => !isCollapsibleImport(l)),
    collapsed,
  ];
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

export default function LandedCostPanel({
  breakdown,
  fxPending = false,
}: {
  breakdown: LandedCostBreakdown;
  /** True while FX rates are still loading; see the presentation rules. */
  fxPending?: boolean;
}) {
  const summary = summarizeTotal(breakdown);
  const currency = breakdown.currency;
  const resolution = totalResolution(breakdown);
  const fxLoading = summary.kind === 'unavailable' && summary.code === 'fx' && fxPending;

  const headline = headlineFor(summary, currency, fxLoading);
  const badge = badgeFor(summary, resolution, breakdown.confidence, fxLoading);

  return (
    <details className="mt-1 rounded-lg border border-black/10 bg-gray-50/80 text-left">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-700 [&::-webkit-details-marker]:hidden">
        <span
          className={
            summary.kind === 'unavailable' ? 'text-neutral-500' : 'font-semibold'
          }
        >
          {headline}
        </span>
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
        {fxLoading ? (
          <p className="mb-2 text-[11px] leading-snug text-neutral-600">
            Waiting for today&apos;s exchange rates to convert this offer.
          </p>
        ) : (
          summary.kind === 'unavailable' && (
            <p className="mb-2 text-[11px] leading-snug text-neutral-600">{summary.reason}</p>
          )
        )}
        {resolution === 'partial' && summary.kind !== 'unavailable' && (
          <p className="mb-2 text-[11px] leading-snug text-neutral-600">
            Some costs could not be resolved from real data, so this offer ranks below fully
            resolved totals.
          </p>
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
          Estimates are for comparison only, not a quote. Final duties, taxes, and fees are set
          by customs authorities and carriers at import time.
        </p>
      </div>
    </details>
  );
}
