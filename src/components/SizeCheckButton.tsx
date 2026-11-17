'use client';

// "Check size" on a result card in a size search. One tap asks
// /api/size-check what this store's own listing says about the size (a paid
// lookup, so it runs only when asked), and the answer replaces the button.
// The wording repeats what the store and Google say and nothing more.

import { useState } from 'react';
import type { SizeCheckResult } from '@/lib/sizeSearch';

interface SizeCheckButtonProps {
  url: string;
  size: string;
  retailer: string;
}

type State = { phase: 'idle' } | { phase: 'loading' } | { phase: 'done'; result: SizeCheckResult };

export function sizeCheckMessage(result: SizeCheckResult, size: string, retailer: string): { text: string; tone: string } {
  switch (result.status) {
    case 'in-stock':
      return { text: `Size ${size} in stock at ${retailer}`, tone: 'text-[#1F7A6F]' };
    case 'out-of-stock':
      return { text: `Size ${size} is out of stock at ${retailer}`, tone: 'text-red-600' };
    case 'listed':
      return { text: `${retailer} lists size ${size}. Stock not shown.`, tone: 'text-neutral-700' };
    case 'other-size':
      return { text: `This listing is size ${result.otherSize}, not ${size}`, tone: 'text-amber-700' };
    case 'unstated':
      return { text: `${retailer} does not say which sizes it has. Check at the store.`, tone: 'text-neutral-600' };
    default:
      return { text: 'Could not check this one. Check at the store.', tone: 'text-neutral-600' };
  }
}

export default function SizeCheckButton({ url, size, retailer }: SizeCheckButtonProps) {
  const [state, setState] = useState<State>({ phase: 'idle' });

  const check = async () => {
    setState({ phase: 'loading' });
    try {
      const response = await fetch(url);
      const result = (await response.json()) as SizeCheckResult;
      setState({ phase: 'done', result });
    } catch {
      setState({ phase: 'done', result: { status: 'unknown', alsoAt: [] } });
    }
  };

  // A sibling of the card's link overlay, lifted above it like the Compare
  // pill, so the tap lands here and not on the store link.
  if (state.phase === 'done') {
    const { text, tone } = sizeCheckMessage(state.result, size, retailer);
    const others = state.result.alsoAt;
    return (
      <p role="status" className={`relative z-[1] mb-1.5 text-[11px] leading-snug ${tone}`}>
        {text}
        {others.length > 0 && state.result.status !== 'in-stock' && (
          <span className="block text-neutral-600">
            Size {size} in stock at {others.join(' and ')}
          </span>
        )}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={check}
      disabled={state.phase === 'loading'}
      className="tap-grow relative z-[1] mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-gray-200/70 bg-white px-2.5 py-1.5 md:px-2 md:py-0.5 text-xs md:text-[11px] font-medium text-neutral-700 transition-colors hover:border-pick-teal disabled:opacity-60"
    >
      {state.phase === 'loading' ? (
        <>
          <span className="h-3 w-3 rounded-full border-2 border-black/10 border-t-[#2A9D8F] spinner" aria-hidden="true" />
          Checking size {size}
        </>
      ) : (
        <>Check size {size}</>
      )}
    </button>
  );
}
