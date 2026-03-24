'use client';

import { motion } from 'motion/react';
import { Shield, Zap, Eye, Search, DollarSign, Lock } from 'lucide-react';

export function WhyPick() {
  const features = [
    {
      icon: Shield,
      title: 'Transparent & Honest',
      description: 'No affiliate manipulation. We show you the best price, period.',
      highlight: 'vs Honey: No hidden commissions',
    },
    {
      icon: Zap,
      title: 'Real-Time Comparison',
      description: 'Live prices from 50+ retailers updated every minute.',
      highlight: 'vs Honey: Always current prices',
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'No tracking, no data selling. Your searches stay private.',
      highlight: 'vs Honey: Zero tracking',
    },
    {
      icon: Search,
      title: 'Smarter Search',
      description: 'AI finds similar products at better prices you might have missed.',
      highlight: 'vs Honey: Proactive discovery',
    },
    {
      icon: DollarSign,
      title: 'More Savings',
      description: 'Compare across more retailers for bigger discounts.',
      highlight: 'vs Honey: More retailers = more savings',
    },
    {
      icon: Eye,
      title: 'Full Transparency',
      description: 'See exactly where we\'re searching and why we recommend each deal.',
      highlight: 'vs Honey: No hidden agendas',
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white via-[var(--subtle-warm)] to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" aria-hidden="true" />
            Why Choose Pick
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--foreground)] mb-4">
            Why Pick, Not Honey?
          </h2>
          <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto">
            We're building the shopping assistant you deserve - transparent, fast, and truly on your side.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative group"
              >
                <div className="h-full bg-white rounded-2xl p-8 border border-[var(--border)] hover:border-[var(--accent)] transition-all hover:shadow-xl">
                  {/* Icon */}
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-white" strokeWidth={2} aria-hidden="true" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--muted)] mb-4 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Highlight badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)]/5 text-[var(--accent)] rounded-lg text-sm font-medium">
                    <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full" />
                    {feature.highlight}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20"
        >
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--subtle-warm)]">
                  <th className="py-4 px-6 text-left text-sm font-semibold text-[var(--foreground)]">
                    Feature
                  </th>
                  <th className="py-4 px-6 text-center text-sm font-semibold text-[var(--accent)]">
                    Pick
                  </th>
                  <th className="py-4 px-6 text-center text-sm font-semibold text-[var(--muted)]">
                    Others
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <tr>
                  <td className="py-4 px-6 text-sm text-[var(--foreground)]">Transparent pricing</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[var(--success)]/10 rounded-full">
                      <span className="text-[var(--success)] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                      <span className="text-gray-400 font-bold">✗</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm text-[var(--foreground)]">Real-time price updates</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[var(--success)]/10 rounded-full">
                      <span className="text-[var(--success)] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                      <span className="text-gray-400 font-bold">~</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm text-[var(--foreground)]">No data tracking</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[var(--success)]/10 rounded-full">
                      <span className="text-[var(--success)] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                      <span className="text-gray-400 font-bold">✗</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm text-[var(--foreground)]">50+ retailers</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[var(--success)]/10 rounded-full">
                      <span className="text-[var(--success)] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                      <span className="text-gray-400 text-sm">Limited</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm text-[var(--foreground)]">AI-powered recommendations</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[var(--success)]/10 rounded-full">
                      <span className="text-[var(--success)] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                      <span className="text-gray-400 font-bold">✗</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <a
            href="#search"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent)] text-white text-lg font-semibold rounded-xl hover:bg-[var(--accent-hover)] transition-all hover:scale-105 shadow-lg"
          >
            Try Pick Now - It's Free
            <Search className="w-5 h-5" aria-hidden="true" />
          </a>
          <p className="text-sm text-[var(--muted)] mt-4">
            Join thousands who switched from Honey to Pick
          </p>
        </motion.div>
      </div>
    </section>
  );
}
