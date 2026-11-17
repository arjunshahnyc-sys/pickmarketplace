'use client';

// The Pick bag turning in 3D while a search runs, in place of the small
// ring spinner. The flat logo is stacked in a few layers a pixel apart
// so it has an edge when it turns side-on. CSS only; under reduced motion it
// stands still (the "Checking..." text beside it still says what's happening).

import { PickLogo } from '@/components/PickLogo';

const LAYERS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

export default function SpinningBag({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block"
      style={{ width: size, height: size, perspective: size * 6 }}
    >
      <style>{`
        @keyframes pick-bag-turn { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
        .pick-bag-turn { animation: pick-bag-turn 1.6s linear infinite; transform-style: preserve-3d; }
        @media (prefers-reduced-motion: reduce) { .pick-bag-turn { animation: none; } }
      `}</style>
      <span className="pick-bag-turn absolute inset-0 block">
        {LAYERS.map((z) => (
          <span key={z} className="absolute inset-0 block" style={{ transform: `translateZ(${z * (size / 64)}px)` }}>
            <PickLogo size={size} />
          </span>
        ))}
      </span>
    </span>
  );
}
