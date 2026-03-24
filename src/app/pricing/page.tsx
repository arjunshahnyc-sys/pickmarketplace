'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import CheckoutModal from '@/components/membership/CheckoutModal';
import { PricingToggle } from '@/components/pricing/PricingToggle';
import { FAQ } from '@/components/pricing/FAQ';
import { TrustedBy } from '@/components/TrustedBy';

export default function PricingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      router.push('/signup');
    }
  };

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      router.push('/signup');
    } else {
      setShowCheckout(true);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-black/60 dark:text-white/60">
            Start free, upgrade anytime
          </p>
        </div>

        <PricingToggle billingPeriod={billingPeriod} onChange={setBillingPeriod} />

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white dark:bg-black rounded-xl shadow-lg p-8 border-2 border-black/10 dark:border-white/10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-2">Pick Basic</h2>
              <div className="flex items-baseline mb-4">
                <span className="text-4xl font-bold text-black dark:text-white">$0</span>
                <span className="text-black/60 dark:text-white/60 ml-2">/month</span>
              </div>
              <p className="text-black/60 dark:text-white/60">Perfect to get started</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-black dark:text-white">5 searches per day</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-black dark:text-white">10 results per search</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-black dark:text-white">2 retailers (Amazon, Target)</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-black dark:text-white">Basic AI chatbot</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-black/40 dark:text-white/40 line-through">Price comparison</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-black/40 dark:text-white/40 line-through">Price history & alerts</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-black/40 dark:text-white/40 line-through">Similar products</span>
              </li>
            </ul>

            <button
              onClick={handleGetStarted}
              disabled={isAuthenticated && user?.plan === 'free'}
              className="w-full bg-black/10 dark:bg-white/10 text-black dark:text-white py-3 rounded-lg font-semibold hover:bg-black/20 dark:hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticated && user?.plan === 'free' ? 'Current Plan' : 'Get Started Free'}
            </button>
          </div>

          {/* Premium Tier */}
          <div className="bg-gradient-to-br from-[#2A9D8F] to-[#1A7A6F] rounded-xl shadow-2xl p-8 border-2 border-[#2A9D8F] relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-white dark:bg-black text-[#2A9D8F] px-4 py-1 rounded-full text-sm font-bold">
                MOST POPULAR
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Premium</h2>
              <div className="flex items-baseline mb-4">
                <span className="text-4xl font-bold text-white">
                  ${billingPeriod === 'monthly' ? '4.99' : '3.33'}
                </span>
                <span className="text-white/80 ml-2">/month</span>
              </div>
              {billingPeriod === 'annual' && (
                <p className="text-white/70 text-sm mb-2">Billed annually at $39.99</p>
              )}
              <p className="text-white/80">Everything you need</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-medium">Unlimited searches</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-medium">100+ results per search</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-medium">All retailers</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-medium">Full AI chatbot</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-medium">Price comparison</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-medium">Price history & alerts</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-medium">Similar products</span>
              </li>
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={isAuthenticated && user?.plan === 'premium'}
              className="w-full bg-white dark:bg-black text-[#2A9D8F] py-3 rounded-lg font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[#2A9D8F]"
            >
              {isAuthenticated && user?.plan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
            </button>
          </div>
        </div>
      </div>

      <TrustedBy />
      <FAQ />

      <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} />
    </div>
  );
}
