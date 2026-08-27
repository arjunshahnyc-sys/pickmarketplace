'use client';

// Per-offer landed-cost panel: a collapsed one-line summary that expands to
// the full line-by-line breakdown with per-line confidence.
//
// PRESENTATION RULES (deliberate, do not restyle away):
//   - Everything here reads as an ESTIMATE: muted styling, an explicit
//     "est." marker on non-exact numbers, and a disclaimer in the expanded
//     view. Never the visual language of a quote or an invoice.
//   - Unknown amounts render as an em-free "not included" tag, never 0.00.
//   - The summary wording comes from summarizeTotal(); this component adds
//     no arithmetic of its own.

import { ChevronDown } from 'lucide-react';
import { summarizeTotal } from '@/lib/landedCost/enrich';
import { formatMinorUnits } from '@/lib/landedCost/money';
import { isTopSlotEligible } from '@/lib/landedCost/rank';
import type { BreakdownLine, LandedCostBreakdown } from '@/lib/landedCost/types';

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

/**
 * Lines as displayed: for domestic and intra-EU lanes, the three
 * structurally-zero import lines (duty, tax, fee) collapse into one
 * plain-language line, so the panel reads as an answer rather than a form
 * of zeros. Any lane where an import amount could be nonzero or unknown
 * keeps the full line-by-line view. Exported for tests.
 */
export function panelLines(breakdown: LandedCostBreakdown): BreakdownLine[] {
  const collapsible = breakdown.lane === 'domestic' || breakdown.lane === 'intra-eu';
  const importLines = breakdown.lines.filter((l) =>
    ['duty', 'tax', 'fee'].includes(l.kind)
  );
  if (!collapsible || !importLines.every((l) => l.amountMinor === 0)) {
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
    ...breakdown.lines.filter((l) => !['duty', 'tax', 'fee'].includes(l.kind)),
    collapsed,
  ];
}

export default function LandedCostPanel({ breakdown }: { breakdown: LandedCostBreakdown }) {
  const summary = summarizeTotal(breakdown);
  const currency = breakdown.currency;
  const eligible = isTopSlotEligible(breakdown);

  let headline: string;
  if (summary.kind === 'unavailable') {
    headline = 'Total cost estimate unavailable';
  } else if (summary.kind === 'range') {
    // A degenerate range (all import lines zero in both scenarios) reads as
    // a rendering bug; collapse it to the single figure it is.
    headline =
      summary.lowMinor === summary.highMinor
        ? `Est. total ${money(summary.lowMinor, currency)}`
        : `Est. total ${money(summary.lowMinor, currency)} to ${money(summary.highMinor, currency)}`;
    if (summary.missing.includes('shipping')) headline += ' + shipping';
  } else if (summary.kind === 'subtotal') {
    headline = `Est. total ${money(summary.totalMinor, currency)}`;
    if (summary.missing.includes('shipping')) headline += ' + shipping';
  } else {
    headline = `Total ${money(summary.totalMinor, currency)}`;
  }

  return (
    <details className="mt-1 rounded-lg border border-black/10 bg-gray-50/80 text-left">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-700 [&::-webkit-details-marker]:hidden">
        <span className={summary.kind === 'unavailable' ? 'text-neutral-500' : 'font-semibold'}>
          {headline}
        </span>
        {summary.kind !== 'unavailable' && breakdown.confidence !== 'exact' && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
            estimate
          </span>
        )}
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
      </summary>

      <div className="border-t border-black/5 px-2.5 py-2">
        {summary.kind === 'unavailable' && (
          <p className="mb-2 text-[11px] leading-snug text-neutral-600">{summary.reason}</p>
        )}
        {!eligible && summary.kind !== 'unavailable' && (
          <p className="mb-2 text-[11px] leading-snug text-neutral-600">
            Estimate unavailable for ranking: a required charge could not be computed.
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
