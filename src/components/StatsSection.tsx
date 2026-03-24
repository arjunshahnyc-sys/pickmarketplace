'use client';

import { motion } from 'motion/react';
import { AnimatedCounter } from './AnimatedCounter';

export function StatsSection() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="py-16 bg-gradient-to-r from-[#2A9D8F]/5 via-white to-[#2A9D8F]/5 dark:from-[#2A9D8F]/10 dark:via-black dark:to-[#2A9D8F]/10"
    >
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center px-4">
        <div>
          <div className="text-3xl md:text-4xl font-heading font-bold text-[#1A1A1A] dark:text-white">
            <AnimatedCounter target={10000} suffix="+" />
          </div>
          <p className="text-sm text-gray-500 dark:text-white/70 mt-1">Active Users</p>
        </div>
        <div>
          <div className="text-3xl md:text-4xl font-heading font-bold text-[#1A1A1A] dark:text-white">
            <AnimatedCounter target={2000000} prefix="$" suffix="+" />
          </div>
          <p className="text-sm text-gray-500 dark:text-white/70 mt-1">Total Saved</p>
        </div>
        <div>
          <div className="text-3xl md:text-4xl font-heading font-bold text-[#1A1A1A] dark:text-white">
            <AnimatedCounter target={50} suffix="+" />
          </div>
          <p className="text-sm text-gray-500 dark:text-white/70 mt-1">Retailers</p>
        </div>
        <div>
          <div className="text-3xl md:text-4xl font-heading font-bold text-[#1A1A1A] dark:text-white">
            <AnimatedCounter target={47} prefix="$" />
          </div>
          <p className="text-sm text-gray-500 dark:text-white/70 mt-1">Avg. Savings</p>
        </div>
      </div>
    </motion.section>
  );
}
