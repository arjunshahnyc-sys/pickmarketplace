'use client';

// A money figure that counts to its final value, formatted as currency on
// every frame (`format` runs on each tick, so no long decimals ever show).
// The count starts the first time `active` turns true and runs once. The
// server and the first client paint both render the final value, so nothing
// shifts when the count never runs: under prefers-reduced-motion, or while
// `active` is false. `reserve` holds the final value's width so a figure
// counting up from $0 cannot reflow the text around it.

import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

// Ease-out: fast ticks at first, slowing as the figure settles.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface AnimatedAmountProps {
  /** The real value, shown once the count ends. */
  to: number;
  /** Where the count starts. Default: 35% above `to`, so a price counts down. */
  from?: number;
  /** Starts the count; the first true wins, later changes do nothing. */
  active: boolean;
  format: (value: number) => string;
  /** Seconds. */
  duration?: number;
  reserve?: boolean;
}

export function AnimatedAmount({
  to,
  from = to * 1.35,
  active,
  format,
  duration = 1.3,
  reserve = false,
}: AnimatedAmountProps) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (!active || reduced) return;
    const controls = animate(from, to, { duration, ease: EASE, onUpdate: setValue });
    return () => controls.stop();
  }, [active, reduced, from, to, duration]);

  const final = format(to);
  const shown = format(value);

  // Assistive tech reads the final figure only; the ticking copy is hidden
  // from it so a screen reader never announces a half-finished count.
  if (!reserve) {
    return (
      <>
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{final}</span>
      </>
    );
  }
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span className="invisible" aria-hidden="true">
        {final}
      </span>
      <span className="sr-only">{final}</span>
      <span aria-hidden="true" className="absolute inset-0">
        {shown}
      </span>
    </span>
  );
}
