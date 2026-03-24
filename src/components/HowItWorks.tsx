'use client';

import { Search, Zap, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';

export function HowItWorks() {
  const steps = [
    {
      icon: Search,
      number: '1',
      title: 'Search Any Product',
      description: 'Type in what you\'re looking for, from headphones to laptops, and we\'ll find it across 50+ retailers.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Zap,
      number: '2',
      title: 'AI Scans in Real-Time',
      description: 'Our AI instantly compares prices, ratings, and availability from Amazon, Target, Best Buy, and more.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: TrendingDown,
      number: '3',
      title: 'Pick the Best Deal',
      description: 'See all options ranked by price with direct links. Save money on every purchase, guaranteed.',
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-b from-white to-[var(--subtle-warm)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-[var(--foreground)] mb-4">
            How It Works
          </h2>
          <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
            Save money in three simple steps. No sign-up required to start searching.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="relative"
              >
                {/* Connecting line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[var(--accent)] to-transparent opacity-30" />
                )}

                <div className="bg-white dark:bg-black rounded-2xl p-8 shadow-sm border border-[var(--border)] hover:shadow-lg transition-shadow relative z-10">
                  {/* Number badge */}
                  <div
                    className={`absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-br ${step.color} text-white flex items-center justify-center text-xl font-bold shadow-lg`}
                  >
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="mb-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" strokeWidth={2} aria-hidden="true" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[var(--muted)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-12"
        >
          <a
            href="#search"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent)] text-white text-lg font-semibold rounded-xl hover:bg-[var(--accent-hover)] transition-all hover:scale-105 shadow-lg"
          >
            Start Saving Now
            <Search className="w-5 h-5" aria-hidden="true" />
          </a>
          <p className="text-sm text-[var(--muted)] mt-4">
            No credit card required • Always free to search
          </p>
        </motion.div>
      </div>
    </section>
  );
}
