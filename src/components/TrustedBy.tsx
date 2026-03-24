'use client';

import { retailerLogos } from './RetailerLogos';

export function TrustedBy() {
  return (
    <section className="py-8 border-y border-black/10 bg-white/50">
      <p className="text-center text-xs text-black/40 uppercase tracking-[0.2em] mb-6 font-medium">
        Searching prices across 50+ retailers
      </p>
      <div className="flex justify-center items-center gap-10 flex-wrap max-w-4xl mx-auto opacity-40 grayscale hover:opacity-60 transition-opacity">
        {retailerLogos.map((retailer) => (
          <div key={retailer.name} className="h-8 flex items-center">
            <img
              src={`https://logo.clearbit.com/${retailer.domain}`}
              alt={`${retailer.name} logo`}
              className="h-8 w-auto object-contain"
              loading="lazy"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.src.includes('google.com')) {
                  img.src = `https://www.google.com/s2/favicons?domain=${retailer.domain}&sz=64`;
                } else {
                  img.style.display = 'none';
                }
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
