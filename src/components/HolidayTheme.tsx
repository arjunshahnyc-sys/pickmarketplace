'use client';

// Switches the holiday look on for the dates in lib/season.ts by marking
// <html data-season="holiday">. Every holiday decoration is in the markup
// all year with the class "holiday-only", which globals.css hides unless
// that mark is present. So the server-rendered HTML is the same in and out
// of season (no hydration mismatch, nothing stale in a cached page), and the
// visitor's own clock decides.

import { useEffect } from 'react';
import { Snowflake } from 'lucide-react';
import { isHolidaySeason } from '@/lib/season';

export function HolidayTheme() {
  useEffect(() => {
    const root = document.documentElement;
    if (isHolidaySeason(new Date())) {
      root.dataset.season = 'holiday';
    } else {
      delete root.dataset.season;
    }
  }, []);
  return null;
}

// Light snow behind the landing hero: a dozen small snowflakes that drift
// down and turn slowly. Fixed positions and timings (no Math.random) so
// server and browser render the same thing. The flakes are a pale tint of
// the brand teal because the page is white. Decoration only:
// hidden from assistive tech, takes no clicks, sits behind the content, and
// under prefers-reduced-motion the global rule in globals.css stops it, which
// leaves every flake parked out of view above the hero.
const FLAKES: Array<{ left: string; size: number; seconds: number; delay: number; drift: number }> = [
  { left: '4%', size: 14, seconds: 15, delay: -2, drift: 18 },
  { left: '12%', size: 20, seconds: 19, delay: -11, drift: -14 },
  { left: '21%', size: 12, seconds: 14, delay: -6, drift: 10 },
  { left: '30%', size: 18, seconds: 21, delay: -15, drift: 22 },
  { left: '39%', size: 13, seconds: 16, delay: -9, drift: -18 },
  { left: '48%', size: 22, seconds: 22, delay: -3, drift: 12 },
  { left: '57%', size: 15, seconds: 17, delay: -13, drift: -10 },
  { left: '66%', size: 12, seconds: 15, delay: -7, drift: 20 },
  { left: '74%', size: 19, seconds: 20, delay: -17, drift: -16 },
  { left: '83%', size: 14, seconds: 18, delay: -4, drift: 14 },
  { left: '91%', size: 21, seconds: 23, delay: -10, drift: -20 },
  { left: '97%', size: 13, seconds: 16, delay: -14, drift: 8 },
];

export function HolidaySnow() {
  return (
    <div aria-hidden="true" className="holiday-only holiday-snow">
      {FLAKES.map((f) => (
        <span
          key={f.left}
          style={{
            left: f.left,
            width: f.size,
            height: f.size,
            animationDuration: `${f.seconds}s`,
            animationDelay: `${f.delay}s`,
            ['--drift' as string]: `${f.drift}px`,
          }}
        >
          <Snowflake width="100%" height="100%" strokeWidth={1.5} />
        </span>
      ))}
    </div>
  );
}

// The landing hero's holiday line, above the headline. Plain text on
// purpose: the earlier version was a tinted pill with a gift icon and a
// two-part slogan, and it read as template filler. The claim stays inside
// what Pick does: check a gift here first, not "the cheapest price anywhere".
export function HolidayGiftLine() {
  return (
    <p className="holiday-only mb-3 text-sm font-medium text-[#D64545]">
      Buying gifts? Check them here first.
    </p>
  );
}
