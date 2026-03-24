'use client';

import Marquee from 'react-fast-marquee';
import { motion } from 'motion/react';
import { extendedRetailerLogos } from './RetailerLogos';

export default function RetailerMarquee() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="py-10 border-y border-gray-100 dark:border-white/10 bg-white/50 dark:bg-black/50"
    >
      <p className="text-center text-xs text-gray-400 dark:text-white/40 mb-6 uppercase tracking-[0.2em] font-medium">
        Searching across 50+ retailers in real time
      </p>
      <Marquee
        speed={35}
        pauseOnHover
        gradient
        gradientWidth={100}
        gradientColor="#FAFAF8"
        autoFill
        className="dark:[--gradient-color:black]"
      >
        {extendedRetailerLogos.map((logo) => (
          <div
            key={logo.name}
            className="mx-10 flex items-center gap-3 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default"
          >
            <img
              src={`https://logo.clearbit.com/${logo.domain}`}
              alt={`${logo.name} logo`}
              className="h-7 w-7 object-contain"
              loading="lazy"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.src.includes('google.com')) {
                  img.src = `https://www.google.com/s2/favicons?domain=${logo.domain}&sz=64`;
                } else {
                  img.style.display = 'none';
                }
              }}
            />
            <span className="text-sm font-medium text-gray-500 dark:text-white/40 whitespace-nowrap">
              {logo.name}
            </span>
          </div>
        ))}
      </Marquee>
    </motion.section>
  );
}
