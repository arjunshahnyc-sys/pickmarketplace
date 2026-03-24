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
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2A9D8F]/10 text-[#2A9D8F] rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" aria-hidden="true" />
            Why Choose Pick
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Why Pick, Not Honey?
          </h2>
          <p className="text-xl text-black/60 max-w-3xl mx-auto">
            We're building the shopping assistant you deserve: transparent, fast, and truly on your side.
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
                <div className="h-full bg-white rounded-2xl p-8 border border-black/10 hover:border-[#2A9D8F] transition-all hover:shadow-xl">
                  {/* Icon */}
                  <div className="w-14 h-14 bg-[#2A9D8F] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-white" strokeWidth={2} aria-hidden="true" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-black mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-black/60 mb-4 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Highlight badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2A9D8F]/5 text-[#2A9D8F] rounded-lg text-sm font-medium">
                    <span className="w-1.5 h-1.5 bg-[#2A9D8F] rounded-full" />
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
          <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-black/5">
                  <th className="py-4 px-6 text-left text-sm font-semibold text-black">
                    Feature
                  </th>
                  <th className="py-4 px-6 text-center text-sm font-semibold text-[#2A9D8F]">
                    Pick
                  </th>
                  <th className="py-4 px-6 text-center text-sm font-semibold text-black/60">
                    Others
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                <tr>
                  <td className="py-4 px-6 text-sm text-black">Transparent pricing</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#10B981]/10 rounded-full">
                      <span className="text-[#10B981] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-black/5 rounded-full">
                      <span className="text-black/40 font-bold">✗</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm text-black">Real-time price updates</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#10B981]/10 rounded-full">
                      <span className="text-[#10B981] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-black/5 rounded-full">
                      <span className="text-black/40 font-bold">~</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm text-black">No data tracking</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#10B981]/10 rounded-full">
                      <span className="text-[#10B981] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-black/5 rounded-full">
                      <span className="text-black/40 font-bold">✗</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm text-black">50+ retailers</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#10B981]/10 rounded-full">
                      <span className="text-[#10B981] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-black/5 rounded-full">
                      <span className="text-black/40 text-sm">Limited</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm text-black">AI-powered recommendations</td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#10B981]/10 rounded-full">
                      <span className="text-[#10B981] font-bold">✓</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-black/5 rounded-full">
                      <span className="text-black/40 font-bold">✗</span>
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
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#2A9D8F] text-white text-lg font-semibold rounded-xl hover:bg-[#238B7E] transition-all hover:scale-105 shadow-lg"
          >
            Try Pick Now, It's Free
            <Search className="w-5 h-5" aria-hidden="true" />
          </a>
          <p className="text-sm text-black/60 mt-4">
            Join thousands who switched from Honey to Pick
          </p>
        </motion.div>
      </div>
    </section>
  );
}
