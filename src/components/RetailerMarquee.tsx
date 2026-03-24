'use client';

import Marquee from 'react-fast-marquee';
import { motion } from 'motion/react';
import {
  AmazonLogo,
  TargetLogo,
  BestBuyLogo,
  WalmartLogo,
  MacysLogo,
  NordstromLogo,
  NikeLogo,
  CostcoLogo,
} from './RetailerLogos';

const retailers = [
  { name: 'Amazon', Component: AmazonLogo },
  { name: 'Target', Component: TargetLogo },
  { name: 'Best Buy', Component: BestBuyLogo },
  { name: 'Walmart', Component: WalmartLogo },
  { name: "Macy's", Component: MacysLogo },
  { name: 'Nordstrom', Component: NordstromLogo },
  { name: 'Nike', Component: NikeLogo },
  { name: 'Costco', Component: CostcoLogo },
];

export default function RetailerMarquee() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="py-10 border-y border-gray-100 bg-white/50 dark:bg-black/50"
    >
      <p className="text-center text-xs text-gray-400 mb-6 uppercase tracking-[0.2em] font-medium">
        Searching across 50+ retailers in real time
      </p>
      <Marquee
        speed={35}
        pauseOnHover
        gradient
        gradientWidth={100}
        gradientColor="#FAFAF8"
        autoFill
      >
        {retailers.map((r) => (
          <div
            key={r.name}
            className="mx-10 flex items-center gap-3 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default"
          >
            <r.Component />
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
              {r.name}
            </span>
          </div>
        ))}
      </Marquee>
    </motion.section>
  );
}
