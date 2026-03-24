'use client';

import { motion } from 'motion/react';

export function StatsSection() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="py-16 bg-gradient-to-r from-[#2A9D8F]/5 via-white to-[#2A9D8F]/5[#2A9D8F]/10[#2A9D8F]/10"
    >
      <div className="max-w-4xl mx-auto text-center px-4">
        <h3 className="text-2xl font-heading font-bold text-black mb-4">
          Compare Prices Across Top Retailers
        </h3>
        <p className="text-black/60 text-lg mb-8">
          We search Amazon, Target, Best Buy, Walmart, Macy's, Nordstrom, and more
          to find you the best price on every product.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-black/60">
          {['Amazon', 'Target', 'Best Buy', 'Walmart', "Macy's", 'Nordstrom', 'Nike', 'eBay', 'Etsy', 'Costco'].map((retailer) => (
            <div
              key={retailer}
              className="px-4 py-2 rounded-lg border border-black/10 bg-white"
            >
              {retailer}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
