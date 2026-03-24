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
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
        }`}
      >
        Monthly
      </button>

      <div className="relative w-14 h-7 rounded-full bg-[var(--border-primary)] cursor-pointer" onClick={() => onChange(billingPeriod === 'monthly' ? 'annual' : 'monthly')}>
        <motion.div
          className="absolute top-1 w-5 h-5 rounded-full bg-[var(--accent)]"
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
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
        }`}
      >
        Annual
      </button>

      {billingPeriod === 'annual' && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-2 px-3 py-1 bg-[var(--accent-light)] text-[var(--accent)] text-xs font-semibold rounded-full"
        >
          Save 33%
        </motion.span>
      )}
    </div>
  );
}
