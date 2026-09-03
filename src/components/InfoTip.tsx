'use client';

// A small accessible tooltip: a real <button> trigger described by a
// role="tooltip" panel that is ALWAYS in the accessibility tree (visually
// hidden when closed), so screen readers hear the explanation on focus no
// matter what the eyes see. Opens on pointer hover and keyboard focus,
// pins on click or tap, closes on Escape, blur, hover-out, or a tap
// outside (logic in lib/ui/tipState.ts, tested).
//
// Layout contract: render trigger and panel as siblings inside a
// position:relative container. The panel spans that container's width
// (inset-x-0) directly below or above it, so it never needs viewport
// edge math even in a 130px phone card. Give the container's card
// ancestor hover:z-10 focus-within:z-10 has-[[data-tip-open]]:z-10 so an
// open panel paints over the next card.
//
// Hydration: ids come from useId and the initial state is closed on both
// server and client, so it is safe inside the prerendered category page.

import { useEffect, useId, useReducer, useRef, type ReactNode } from 'react';
import { TIP_CLOSED, isTipOpen, tipReducer } from '@/lib/ui/tipState';

export interface InfoTipProps {
  /** Tooltip body: a string or small markup. */
  content: ReactNode;
  /** Trigger content, e.g. an icon or a badge. */
  children: ReactNode;
  /** Accessible name for the trigger when its content is not text. */
  label?: string;
  triggerClassName?: string;
  panelClassName?: string;
  /** Which side of the container the panel opens on. */
  placement?: 'below' | 'above';
}

export default function InfoTip({
  content,
  children,
  label,
  triggerClassName = '',
  panelClassName = '',
  placement = 'below',
}: InfoTipProps) {
  const id = useId();
  const [state, dispatch] = useReducer(tipReducer, TIP_CLOSED);
  const open = isTipOpen(state);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Document listeners only while open, so a page of cards adds nothing
  // until a tip is actually showing.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch('escape');
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      dispatch('outside');
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const side = placement === 'above' ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-no-lift=""
        aria-label={label}
        aria-describedby={id}
        onClick={() => dispatch('click')}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') dispatch('hover-in');
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') dispatch('hover-out');
        }}
        onFocus={() => dispatch('focus')}
        onBlur={() => dispatch('blur')}
        className={triggerClassName}
      >
        {children}
      </button>
      <div
        ref={panelRef}
        id={id}
        role="tooltip"
        data-tip-open={open ? '' : undefined}
        className={
          open
            ? `absolute inset-x-0 ${side} z-20 rounded-lg border border-black/10 bg-white p-2 text-left text-[11px] font-normal leading-snug text-neutral-700 shadow-md ${panelClassName}`
            : 'sr-only'
        }
      >
        {content}
      </div>
    </>
  );
}
