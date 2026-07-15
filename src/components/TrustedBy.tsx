'use client';

import { retailerLogos } from './RetailerLogos';

export function TrustedBy() {
  return (
    <section className="py-8 border-y border-black/10 bg-white/50">
      <p className="text-center text-xs text-black/40 uppercase tracking-[0.2em] mb-6 font-medium">
        Prices from Target, Google Shopping & more
      </p>
      <div className="flex justify-center items-center gap-10 flex-wrap max-w-4xl mx-auto opacity-40 grayscale hover:opacity-60 transition-opacity">
        {retailerLogos.map((retailer) => (
          <div key={retailer.name} className="h-8 flex items-center">
            <img
              src={retailer.src}
              alt={`${retailer.name} logo`}
              className="h-6 w-auto max-w-[110px] object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
