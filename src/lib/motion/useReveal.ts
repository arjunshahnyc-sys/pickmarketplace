'use client';

// Scroll-triggered reveal, the landing page's one entrance animation: a
// short fade and a 16px rise the first time a section scrolls into view
// (motion's whileInView, so the IntersectionObserver is shared and the
// element is left with no inline transform afterwards). Spread the result
// onto a motion element: <motion.section {...reveal()}>. Pass a delay in
// seconds to stagger siblings. Under prefers-reduced-motion the same props
// run with a zero duration, so a section still appears when it is reached
// but nothing moves.
//
// Elements that take these props must not also carry a CSS transition on
// `transform` (Tailwind's bare `transition` includes it): motion drives the
// transform frame by frame and a CSS transition would fight it. Use
// transition-[translate,box-shadow] or similar for hover effects instead.

import { useReducedMotion, type Transition } from 'motion/react';

const DURATION = 0.5;
const VIEWPORT = { once: true, amount: 0.15 } as const;

export function useReveal() {
  const reduced = useReducedMotion();
  return (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: VIEWPORT,
    transition: (reduced
      ? { duration: 0 }
      : { duration: DURATION, ease: 'easeOut', delay }) as Transition,
  });
}
