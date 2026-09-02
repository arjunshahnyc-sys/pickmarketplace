'use client';

import Marquee from 'react-fast-marquee';
import { extendedRetailerLogos } from './RetailerLogos';

// The landing page's ONE retailer list and ONE sourcing sentence. Every other
// copy of both was merged into this strip on 2026-09-01; don't add another
// list elsewhere on the page, and keep the Target-direct / Google Shopping
// distinction here (it's what makes the retailer names an honest claim).
export function TrustedBy() {
  return (
    <section className="py-8 border-y border-black/10 bg-white/50">
      {/* Sentence case, not the old all-caps eyebrow: this is the page's one
          sourcing disclaimer and it has to be readable. */}
      <p className="text-center text-sm text-neutral-600 mb-6 px-6 max-w-2xl mx-auto">
        Pick checks Target&apos;s catalog directly and gets everything else from Google Shopping
        listings across retailers including
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
    </section>
  );
}
