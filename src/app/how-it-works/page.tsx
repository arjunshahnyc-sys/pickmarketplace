import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Search, Zap, ShoppingCart, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works - Pick Marketplace',
  description: 'Learn how Pick Marketplace compares prices across 50+ retailers to help you find the best deals. Simple, fast, and free to use.',
};

export default function HowItWorksPage() {
  const steps = [
    {
      icon: Search,
      title: 'Search for Any Product',
      description: 'Type what you\'re looking for—headphones, running shoes, air fryer, laptop, dress—into the search bar. Be as specific or general as you want.',
    },
    {
      icon: Zap,
      title: 'We Check Prices Across Retailers',
      description: 'Pick Marketplace scans current prices from Amazon, Target, Best Buy, Walmart, Macy's, and 50+ other retailers. This happens in seconds.',
    },
    {
      icon: ShoppingCart,
      title: 'See Results Ranked by Price',
      description: 'We show you all available options sorted by total price (including shipping when available). Each result links directly to the retailer so you can buy immediately.',
    },
    {
      icon: CheckCircle,
      title: 'Click Through and Save Money',
      description: 'Choose the best deal for you and click through to complete your purchase on the retailer's site. That's it—no sign-up required, no hidden fees.',
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              How Pick Marketplace Works
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Finding the best price across dozens of retailers should be easy. Here's how we make it happen.
            </p>
          </div>

          {/* Steps - Vertical layout with alternating alignment */}
          <div className="space-y-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  className={`flex flex-col md:flex-row items-start gap-6 ${
                    isEven ? '' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Icon and number */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-xl bg-teal-600 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 ${isEven ? 'md:text-left' : 'md:text-right'}`}>
                    <h2 className="text-2xl font-semibold text-black mb-3">
                      {step.title}
                    </h2>
                    <p className="text-lg text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional info */}
          <div className="mt-20 grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-black mb-3">
                No Sign-Up Required
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Start searching immediately. We don't require an account, email address, or payment information to use Pick Marketplace. Just search and save.
              </p>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-black mb-3">
                Always Free
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Pick Marketplace is completely free to use. We earn affiliate commissions when you purchase through our links, but this doesn't affect the prices you pay.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <a
              href="/"
              className="inline-block px-8 py-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              Start Comparing Prices
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
