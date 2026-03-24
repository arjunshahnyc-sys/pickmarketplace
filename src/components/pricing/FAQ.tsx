'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes! You can cancel your Premium subscription at any time from your Account page. Your access will continue until the end of your billing period.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Our Free tier is available forever, no credit card required. You can try Pick Basic to see how much you save, then upgrade to Premium when you\'re ready for unlimited searches.',
  },
  {
    question: 'How does Pick make money?',
    answer: 'We earn a small affiliate commission when you purchase through some of our retailer links. This doesn\'t affect your price — you always get the best deal we find. Premium subscriptions help us keep the service fast and ad-free.',
  },
  {
    question: 'Is Pick like Honey?',
    answer: 'Similar goal (save you money), different approach. Honey focuses on coupon codes at checkout. Pick uses AI to compare prices across 50+ retailers and find similar products at better prices. We also prioritize privacy — we don\'t track your browsing or sell your data.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover), Apple Pay, and Google Pay. All payments are processed securely through Stripe.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="max-w-3xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-heading font-bold text-center text-black dark:text-white mb-3">
        Frequently Asked Questions
      </h2>
      <p className="text-center text-black/60 dark:text-white/60 mb-10">
        Everything you need to know about Pick
      </p>

      <div className="space-y-3">
        {faqData.map((item, index) => (
          <div
            key={index}
            className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-black"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="font-semibold text-black dark:text-white">{item.question}</span>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-black/40 dark:text-white/40" />
              </motion.div>
            </button>

            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-6 pb-4 text-black/60 dark:text-white/60 text-sm leading-relaxed">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
