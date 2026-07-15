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
      className="py-10 border-y border-black/10 bg-white/50"
    >
      <p className="text-center text-xs text-black/40 mb-6 uppercase tracking-[0.2em] font-medium">
        Comparing prices from top online stores
      </p>
      <Marquee
        speed={35}
        pauseOnHover
        gradient
        gradientWidth={100}
        gradientColor="#FAFAF8"
        autoFill
      >
        {extendedRetailerLogos.map((logo) => (
          <div
            key={logo.name}
            className="mx-10 flex items-center gap-3 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default"
          >
            <img
              src={logo.src}
              alt={`${logo.name} logo`}
              className="h-6 w-auto max-w-[110px] object-contain"
            />
          </div>
        ))}
      </Marquee>
    </motion.section>
  );
}
