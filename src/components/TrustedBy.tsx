'use client';

import {
  AmazonLogo,
  TargetLogo,
  BestBuyLogo,
  WalmartLogo,
  MacysLogo,
  NordstromLogo,
} from './RetailerLogos';

export function TrustedBy() {
  const retailers = [
    { name: 'Amazon', Component: AmazonLogo },
    { name: 'Target', Component: TargetLogo },
    { name: 'Best Buy', Component: BestBuyLogo },
    { name: 'Walmart', Component: WalmartLogo },
    { name: "Macy's", Component: MacysLogo },
    { name: 'Nordstrom', Component: NordstromLogo },
  ];

  return (
    <section className="py-8 border-y border-gray-100 dark:border-white/10 bg-white/50 dark:bg-black/50">
      <p className="text-center text-xs text-gray-400 uppercase tracking-[0.2em] mb-6 font-medium">
        Searching prices across 50+ retailers
      </p>
      <div className="flex justify-center items-center gap-10 flex-wrap max-w-4xl mx-auto opacity-40 grayscale hover:opacity-60 transition-opacity">
        {retailers.map((retailer) => (
          <div key={retailer.name} className="h-6">
            <retailer.Component />
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] text-gray-300 dark:text-gray-600 mt-4 uppercase tracking-[0.15em]">
        Joining 10,000+ smart shoppers worldwide
      </p>
    </section>
  );
}
