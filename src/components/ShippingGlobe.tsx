'use client';

// The globe in the "One World, One Marketplace" section. Real coastlines
// drawn on a canvas as a turning sphere, with a line drawn from each store
// market to the shopper's country. Drag to turn it. The map data and
// drawing code (d3-geo, about 90KB together) load only once the globe
// scrolls into view, and it only animates while it is on screen. Under
// reduced motion it draws once, facing the shopper, and stays still.

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

export interface GlobePlace {
  name: string;
  /** [longitude, latitude] */
  at: [number, number];
}

interface ShippingGlobeProps {
  destination: GlobePlace;
  origins: GlobePlace[];
  size?: number;
}

const TEAL = '#2A9D8F';
const DEEP = '#14524B';
const RED = '#D64545';

export default function ShippingGlobe({ destination, origins, size = 340 }: ShippingGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stopped = false;
    let frame = 0;
    let cleanup = () => {};
    let started = false;
    let onScreen = false;
    let resume = () => {};

    const start = async () => {
      const [d3, topo, world] = await Promise.all([
        import('d3-geo'),
        import('topojson-client'),
        import('world-atlas/land-110m.json'),
      ]);
      if (stopped) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const atlas = (world as any).default ?? world;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const land = topo.feature(atlas, atlas.objects.land) as any;
      const graticule = d3.geoGraticule10();
      const projection = d3
        .geoOrthographic()
        .translate([size / 2, size / 2])
        .scale(size / 2 - 6)
        .clipAngle(90);
      const path = d3.geoPath(projection, ctx);

      // Start facing a point between the stores and the shopper.
      let lambda = -destination.at[0] - 35;
      const phi = -22;
      let dragging = false;
      let lastX = 0;
      const startedAt = performance.now();

      const routes = origins.map((o) => ({ from: o, along: d3.geoInterpolate(o.at, destination.at) }));

      const draw = (now: number) => {
        projection.rotate([lambda, phi]);
        ctx.clearRect(0, 0, size, size);

        // Ocean
        ctx.beginPath();
        path({ type: 'Sphere' });
        ctx.fillStyle = '#F1F8F6';
        ctx.fill();

        ctx.beginPath();
        path(graticule);
        ctx.strokeStyle = 'rgba(20,82,75,0.07)';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.beginPath();
        path(land);
        ctx.fillStyle = 'rgba(42,157,143,0.34)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,82,75,0.35)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Routes: each line grows from the store to the shopper, holds,
        // then starts over, one after another.
        const t = reduceMotion ? Infinity : (now - startedAt) / 1000;
        routes.forEach((route, i) => {
          const cycle = 4.5;
          const local = reduceMotion ? 1 : Math.min(1, Math.max(0, ((t - i * 0.6) % cycle) / 1.8));
          if (local <= 0) return;
          const steps = 48;
          const coords: [number, number][] = [];
          for (let s = 0; s <= Math.round(steps * local); s++) coords.push(route.along(s / steps));
          if (coords.length > 1) {
            ctx.beginPath();
            path({ type: 'LineString', coordinates: coords });
            ctx.strokeStyle = RED;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
          ctx.beginPath();
          path.pointRadius(3.2);
          path({ type: 'Point', coordinates: route.from.at });
          ctx.fillStyle = DEEP;
          ctx.fill();
        });

        ctx.beginPath();
        path.pointRadius(5);
        path({ type: 'Point', coordinates: destination.at });
        ctx.fillStyle = RED;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Rim
        ctx.beginPath();
        path({ type: 'Sphere' });
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };

      let running = false;
      const tick = (now: number) => {
        if (stopped || !onScreen) {
          running = false;
          return;
        }
        if (!dragging) lambda += 0.08;
        draw(now);
        frame = requestAnimationFrame(tick);
      };
      resume = () => {
        if (reduceMotion || running || stopped) return;
        running = true;
        frame = requestAnimationFrame(tick);
      };
      // One frame right away, so there is a globe even where animation
      // frames do not run (a background tab).
      draw(performance.now());
      resume();

      const down = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        lambda += (e.clientX - lastX) * 0.4;
        lastX = e.clientX;
        if (reduceMotion) draw(performance.now());
      };
      const up = () => {
        dragging = false;
      };
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      cleanup = () => {
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
      };
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (!onScreen) return;
        if (!started) {
          started = true;
          start();
        } else {
          resume();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(canvas);

    return () => {
      stopped = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [destination, origins, size, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Globe showing items shipping to ${destination.name} from ${origins.map((o) => o.name).join(', ')}`}
      style={{ width: size, height: size, touchAction: 'pan-y', cursor: 'grab' }}
      className="max-w-full"
    />
  );
}
