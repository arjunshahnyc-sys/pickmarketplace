import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'About Us - Pick Marketplace',
  description: 'Pick Marketplace helps you find the best prices across Amazon, Target, Best Buy, Walmart, and 50+ retailers. Compare deals and save money on every purchase.',
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-6">
            About Pick Marketplace
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Pick Marketplace is a price comparison tool that helps you find the best deals across major online retailers. We scan prices from Amazon, Target, Best Buy, Walmart, Macy's, Google Shopping, and more—so you don't have to.
            </p>

            <h2 className="text-2xl font-semibold text-black mt-12 mb-4">
              What We Do
            </h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              When you search for a product on Pick Marketplace, we check current prices and availability across 50+ retailers in real-time. Our system aggregates results, compares total costs (including shipping when available), and shows you the best options ranked by price.
            </p>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Whether you're shopping for electronics, clothing, home goods, kitchen appliances, or beauty products, Pick Marketplace makes it easy to find the lowest price without manually checking multiple retailer websites.
            </p>

            <h2 className="text-2xl font-semibold text-black mt-12 mb-4">
              How We're Different
            </h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-3 mb-6">
              <li>
                <strong>Multi-retailer coverage:</strong> We check prices across Amazon, Target, Best Buy, Walmart, and dozens of other major retailers—not just one or two.
              </li>
              <li>
                <strong>Direct product links:</strong> When available, we link directly to product pages so you can buy immediately. When we show example products, we clearly label them.
              </li>
              <li>
                <strong>No hidden fees:</strong> Pick Marketplace is free to use. We may earn affiliate commissions when you purchase through our links, but this doesn't affect the prices you see.
              </li>
              <li>
                <strong>Honest about limitations:</strong> We display price verification timestamps and clearly indicate when prices may not be current. We believe in transparency over fake urgency.
              </li>
            </ul>

            <h2 className="text-2xl font-semibold text-black mt-12 mb-4">
              Our Mission
            </h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              We built Pick Marketplace because comparison shopping shouldn't require opening 10 browser tabs. Our goal is simple: help you make informed buying decisions by showing you all available options in one place, sorted by price.
            </p>
            <p className="text-gray-700 mb-8 leading-relaxed">
              We're committed to building a tool that respects your time, provides accurate information, and helps you save money on purchases you were planning to make anyway.
            </p>

            <div className="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-black mb-2">
                Questions or feedback?
              </h3>
              <p className="text-gray-700 mb-4">
                We'd love to hear from you. Reach out to our team at{' '}
                <a
                  href="mailto:support@pickmarketplace.com"
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  support@pickmarketplace.com
                </a>
                {' '}or visit our{' '}
                <Link
                  href="/contact"
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  contact page
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
