'use client';

import { motion } from 'motion/react';

interface PricingToggleProps {
  billingPeriod: 'monthly' | 'annual';
  onChange: (period: 'monthly' | 'annual') => void;
}

export function PricingToggle({ billingPeriod, onChange }: PricingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      <button
        onClick={() => onChange('monthly')}
        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
          billingPeriod === 'monthly'
            ? 'text-black dark:text-white'
            : 'text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60'
        }`}
      >
        Monthly
      </button>

      <div className="relative w-14 h-7 rounded-full bg-black/10 dark:bg-white/10 cursor-pointer" onClick={() => onChange(billingPeriod === 'monthly' ? 'annual' : 'monthly')}>
        <motion.div
          className="absolute top-1 w-5 h-5 rounded-full bg-[#2A9D8F]"
          animate={{
            left: billingPeriod === 'annual' ? '28px' : '4px',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>

      <button
        onClick={() => onChange('annual')}
        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
          billingPeriod === 'annual'
            ? 'text-black dark:text-white'
            : 'text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60'
        }`}
      >
        Annual
      </button>

      {billingPeriod === 'annual' && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-2 px-3 py-1 bg-[#2A9D8F]/10 text-[#2A9D8F] text-xs font-semibold rounded-full"
        >
          Save 33%
        </motion.span>
      )}
    </div>
  );
}
