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

const DESTINATIONS = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP'];

export function GlobalMarketplaceSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="max-w-5xl mx-auto px-6 pt-14 pb-4"
    >
      <div
        className="bg-[#14524B] text-white p-8 md:p-10 relative overflow-hidden"
        style={{ borderRadius: '12px' }}
      >
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
    </motion.section>
  );
}
