'use client';

import { motion } from 'motion/react';
import Marquee from 'react-fast-marquee';
import { useReveal } from '@/lib/motion/useReveal';
import { extendedRetailerLogos } from './RetailerLogos';

// The landing page's ONE retailer list and ONE sourcing sentence. Every other
// copy of both was merged into this strip on 2026-09-01; don't add another
// list elsewhere on the page. Every name in the strip must be a store that
// actually appears in US Google Shopping results (Amazon and Costco do not,
// so they are not listed); that is what makes the strip an honest claim.
export function TrustedBy() {
  const reveal = useReveal();
  return (
    <motion.section {...reveal()} className="py-8 border-y border-black/10 bg-white/50">
      {/* Sentence case, not the old all-caps eyebrow: this is the page's one
          sourcing disclaimer and it has to be readable. */}
      <p className="text-center text-sm text-neutral-600 mb-6 px-6 max-w-2xl mx-auto">
        Pick gets its prices from Google Shopping listings across retailers including
      </p>
      <Marquee
        speed={35}
        pauseOnHover
        gradient
        gradientWidth={100}
        gradientColor="#FAFAF8"
        autoFill
      >
        {extendedRetailerLogos.map((retailer) => (
          <div
            key={retailer.name}
            className="mx-10 h-8 flex items-center opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default"
          >
            <img
              src={retailer.src}
              alt={`${retailer.name} logo`}
              className="h-6 w-auto max-w-[110px] object-contain"
            />
          </div>
        ))}
      </Marquee>
    </motion.section>
  );
}
