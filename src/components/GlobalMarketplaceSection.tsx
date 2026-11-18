'use client';

// "One World, One Marketplace": the landed-cost value proposition.
//
// Rendered ONLY behind LANDED_COST_ENABLED (the caller gates it): this
// section claims the capability, so it must never render on a deployment
// that is not showing it. Copy stays inside the honesty rules: estimates
// are called estimates, nothing reads like a quote, and the shipping
// method (published parcel rates at typical weights) is said plainly.

import { motion } from 'motion/react';
import { Globe } from 'lucide-react';
import { useMemo } from 'react';
import { useReveal } from '@/lib/motion/useReveal';
import { useDestination } from '@/contexts/DestinationContext';
import ShippingGlobe, { type GlobePlace } from './ShippingGlobe';

const DESTINATIONS = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP', 'IN'];

// One point per market Pick searches, for the globe: lines run from the
// others to the shopper's own. [longitude, latitude].
const MARKET_POINTS: Record<string, GlobePlace> = {
  US: { name: 'the United States', at: [-74.0, 40.7] },
  CA: { name: 'Canada', at: [-79.4, 43.7] },
  GB: { name: 'the United Kingdom', at: [-0.13, 51.5] },
  DE: { name: 'Germany', at: [13.4, 52.5] },
  FR: { name: 'France', at: [2.35, 48.86] },
  AU: { name: 'Australia', at: [151.2, -33.9] },
  JP: { name: 'Japan', at: [139.7, 35.7] },
  IN: { name: 'India', at: [77.2, 28.6] },
};

export function GlobalMarketplaceSection() {
  const reveal = useReveal();
  const { destination } = useDestination();
  const home = MARKET_POINTS[destination.country] ? destination.country : 'US';
  const globe = useMemo(
    () => ({
      destination: MARKET_POINTS[home],
      origins: DESTINATIONS.filter((c) => c !== home).map((c) => MARKET_POINTS[c]),
    }),
    [home]
  );
  return (
    <motion.section
      {...reveal()}
      className="max-w-5xl mx-auto px-6 pt-14 pb-4"
    >
      <div
        className="bg-[#14524B] text-white p-8 md:p-10 relative overflow-hidden"
        style={{ borderRadius: '12px' }}
      >
        <div className="md:flex md:items-center md:gap-10">
        <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-[#7ECEC2]" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7ECEC2]">
            One World, One Marketplace
          </p>
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 max-w-xl">
          The price on the tag isn&apos;t the price at your door.
        </h2>
        <p className="text-white/80 leading-relaxed max-w-2xl mb-4">
          Shopping from outside the US? Pick estimates what an item really costs to get to
          you: the price, international shipping, import duty, and tax, converted to your
          currency at today&apos;s rate. Results rank by that total, so the cheapest sticker
          price never beats the cheapest real cost.
        </p>
        <p className="text-sm text-white/60 leading-relaxed max-w-2xl mb-6">
          When a store doesn&apos;t quote international shipping, we estimate it from published
          parcel rates at a typical weight for the product, and say so. Every number is
          labeled: estimates say estimate, unknowns say unknown, and nothing is ever a quote.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/50">Delivering estimates for</span>
          {DESTINATIONS.map((c) => (
            <span
              key={c}
              className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium text-[#7ECEC2]"
            >
              {c}
            </span>
          ))}
          <span className="text-xs text-white/50">
            &middot; pick yours in the header
          </span>
        </div>
        </div>
        <div className="mt-8 flex shrink-0 justify-center md:mt-0">
          <ShippingGlobe destination={globe.destination} origins={globe.origins} size={280} />
        </div>
        </div>
      </div>
    </motion.section>
  );
}
