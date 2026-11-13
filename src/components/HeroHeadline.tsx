'use client';

// The landing headline, with light passing through it. The letters are
// painted by a background clipped to the text, so a band of light can travel
// across them:
//
//   - Once, shortly after the page loads, a band of light sweeps through the
//     letters from left to right.
//   - Click or tap the headline and it sweeps again.
//   - Move a mouse over it and a pool of light follows the pointer through
//     the letters.
//
// The headline's own color never changes; the light is a brighter tint of
// the same teal, so it reads as light through colored glass and not as a
// second color. It is decoration only: the element is still a plain <h1>
// with real text, it takes no focus and has no role. Under
// prefers-reduced-motion nothing moves and the headline is plain. If
// background-clip: text is unavailable, or Windows forced colors is on, the
// .hero-ink rules in globals.css leave ordinary solid text.
//
// Everything the paint reads is a motion value written to a CSS variable,
// so the light moves without a React render per frame.

import { useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from 'motion/react';

/** The headline's color, the brand's deep teal. */
const INK = '#14524B';
/** The light: the brand teal at the edges of the band, a bright mint at its core. */
const LIGHT_EDGE = '#2A9D8F';
const LIGHT_CORE = '#8DEBDD';

/** The band leans like a glint on glass. */
const BAND_ANGLE_DEG = 105;
/** Half-widths in px: where the band has fully faded, and where its tint begins. */
const BAND_REACH = 170;
const BAND_TINT = 70;
const SWEEP_SECONDS = 1.25;
/** The first sweep waits for the hero's entrance fade to finish. */
const FIRST_SWEEP_DELAY_SECONDS = 1;

/** Radius in px of the pool of light under the pointer, and how strong it is. */
const POOL_RADIUS = 170;
const POOL_STRENGTH = 0.95;

const px = (v: number) => `${v}px`;

interface HeroHeadlineProps {
  children: ReactNode;
  className?: string;
  /**
   * The headline's color and the light's two tints. The defaults are the
   * landing page's: deep teal ink on white. On a dark band the ink is white
   * and the light is colored, since white cannot get brighter.
   */
  ink?: string;
  lightEdge?: string;
  lightCore?: string;
}

export function HeroHeadline({
  children,
  className = '',
  ink = INK,
  lightEdge = LIGHT_EDGE,
  lightCore = LIGHT_CORE,
}: HeroHeadlineProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLHeadingElement>(null);
  const sweeping = useRef<AnimationPlaybackControls | null>(null);

  // The band's centre, in px along the gradient line. It rests off the left
  // edge, where none of it is inside the headline.
  const band = useMotionValue(-BAND_REACH);
  // The pool of light under the pointer.
  const poolX = useMotionValue(0);
  const poolY = useMotionValue(0);
  const pool = useMotionValue(0);

  const sweep = (delay = 0) => {
    const el = ref.current;
    if (!el || reduced) return;
    // Length of the gradient line for a leaning band: far enough that the
    // band leaves the headline's last corner completely.
    const rad = (BAND_ANGLE_DEG * Math.PI) / 180;
    const line = Math.abs(el.offsetWidth * Math.sin(rad)) + Math.abs(el.offsetHeight * Math.cos(rad));
    sweeping.current?.stop();
    band.set(-BAND_REACH);
    sweeping.current = animate(band, line + BAND_REACH, {
      duration: SWEEP_SECONDS,
      ease: 'easeInOut',
      delay,
    });
  };

  // One sweep when the page arrives. `sweep` reads only refs, motion values
  // and the reduced-motion flag, so the flag is the one real dependency.
  useEffect(() => {
    sweep(FIRST_SWEEP_DELAY_SECONDS);
    return () => sweeping.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // A click, not a pointerdown: on a phone a pointerdown also starts every
  // scroll, and the light should not fire because a thumb landed on the
  // headline on the way down the page.
  const handleClick = () => sweep();

  const handlePointerMove = (e: PointerEvent<HTMLHeadingElement>) => {
    if (reduced || e.pointerType !== 'mouse' || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    poolX.set(e.clientX - box.left);
    poolY.set(e.clientY - box.top);
    if (pool.get() === 0 && !pool.isAnimating()) {
      animate(pool, POOL_STRENGTH, { duration: 0.25, ease: 'easeOut' });
    }
  };

  const handlePointerLeave = () => {
    animate(pool, 0, { duration: 0.45, ease: 'easeOut' });
  };

  // Clicking twice quickly would otherwise select a word and paint the
  // selection highlight over the light. Dragging to select still works.
  const handleMouseDown = (e: MouseEvent<HTMLHeadingElement>) => {
    if (e.detail > 1) e.preventDefault();
  };

  const vars = {
    '--band': useTransform(band, px),
    '--pool-x': useTransform(poolX, px),
    '--pool-y': useTransform(poolY, px),
    '--pool': pool,
  };

  const at = (offset: number) =>
    `calc(var(--band, ${-BAND_REACH}px) ${offset < 0 ? '-' : '+'} ${Math.abs(offset)}px)`;

  return (
    <motion.h1
      ref={ref}
      className={`hero-ink cursor-pointer touch-manipulation ${className}`}
      style={{
        ...vars,
        // Top layer: the pool of light under the pointer. Bottom layer: the
        // headline's ink with the travelling band in it.
        backgroundImage: [
          `radial-gradient(circle at var(--pool-x, 0px) var(--pool-y, 0px), rgb(141 235 221 / var(--pool, 0)), rgb(42 157 143 / calc(var(--pool, 0) * 0.6)) ${POOL_RADIUS * 0.45}px, transparent ${POOL_RADIUS}px)`,
          `linear-gradient(${BAND_ANGLE_DEG}deg, ${ink} ${at(-BAND_REACH)}, ${lightEdge} ${at(-BAND_TINT)}, ${lightCore} var(--band, ${-BAND_REACH}px), ${lightEdge} ${at(BAND_TINT)}, ${ink} ${at(BAND_REACH)})`,
        ].join(', '),
      }}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onMouseDown={handleMouseDown}
    >
      {children}
    </motion.h1>
  );
}
