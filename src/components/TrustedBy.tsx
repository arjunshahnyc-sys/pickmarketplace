'use client';

import Marquee from 'react-fast-marquee';
import { extendedRetailerLogos } from './RetailerLogos';

export function TrustedBy() {
  return (
    <section className="py-8 border-y border-black/10 bg-white/50">
      <p className="text-center text-xs text-black/40 uppercase tracking-[0.2em] mb-6 font-medium">
        Prices from Target, Google Shopping & more
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
