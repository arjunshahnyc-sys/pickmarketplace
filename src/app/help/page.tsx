import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Search, TrendingDown, AlertCircle, Flag, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help Center - Pick Marketplace',
  description: 'Get help using Pick Marketplace. Learn how to search for products, understand price comparisons, and report issues.',
};

export default function HelpPage() {
  const topics = [
    {
      icon: Search,
      title: 'How to Search for Products',
      content: 'Type any product name into the search bar and press Enter. Be specific for better results—for example, "Sony WH-1000XM5 headphones" instead of just "headphones." You can search for brands, product names, or general categories. Pick Marketplace will check prices across all supported retailers and show you results ranked by price.',
    },
    {
      icon: TrendingDown,
      title: 'How Price Comparison Works',
      content: 'When you search, we check current prices from Amazon, Target, Best Buy, Walmart, and 50+ other retailers. Results are sorted by total price when possible. Click on any product to go directly to the retailer's website. Prices update regularly but may not reflect real-time changes—always verify the final price on the retailer's site before purchasing.',
    },
    {
      icon: AlertCircle,
      title: 'Why Prices May Differ',
      content: 'The price shown on Pick Marketplace may differ from the retailer's current price for several reasons: (1) The retailer changed the price after we last checked, (2) The retailer is running a time-limited sale, (3) Shipping costs or taxes aren't included in our displayed price, or (4) The product is marked as an "example" product for demo purposes. Always check the final price at checkout.',
    },
    {
      icon: Flag,
      title: 'How to Report Issues',
      content: 'Found a broken link, incorrect price, or other issue? We want to know! Use the contact form or email us directly at support@pickmarketplace.com. Include the product name, retailer, and a description of the problem. We review all reports and work to fix issues as quickly as possible.',
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Help Center
            </h1>
            <p className="text-xl text-gray-600">
              Find answers to common questions about using Pick Marketplace
            </p>
          </div>

          {/* Help topics */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {topics.map((topic, index) => {
              const Icon = topic.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-white border border-gray-200 rounded-lg hover:border-teal-600 hover:shadow-md transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-teal-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-black mb-3">
                        {topic.title}
                      </h2>
                      <p className="text-gray-700 leading-relaxed">
                        {topic.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional resources */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Link
              href="/faq"
              className="p-6 text-center bg-gray-50 border border-gray-200 rounded-lg hover:border-teal-600 hover:bg-white transition"
            >
              <h3 className="font-semibold text-black mb-2">FAQ</h3>
              <p className="text-sm text-gray-600">
                Frequently asked questions about Pick Marketplace
              </p>
            </Link>

            <Link
              href="/how-it-works"
              className="p-6 text-center bg-gray-50 border border-gray-200 rounded-lg hover:border-teal-600 hover:bg-white transition"
            >
              <h3 className="font-semibold text-black mb-2">How It Works</h3>
              <p className="text-sm text-gray-600">
                Learn how price comparison works step-by-step
              </p>
            </Link>

            <Link
              href="/supported-retailers"
              className="p-6 text-center bg-gray-50 border border-gray-200 rounded-lg hover:border-teal-600 hover:bg-white transition"
            >
              <h3 className="font-semibold text-black mb-2">Retailers</h3>
              <p className="text-sm text-gray-600">
                See all supported retailers and categories
              </p>
            </Link>
          </div>

          {/* Contact CTA */}
          <div className="mt-16 p-8 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg text-center">
            <Mail className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-black mb-3">
              Still Need Help?
            </h2>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Can't find what you're looking for? Our support team is here to help. Send us a message and we'll get back to you within 24-48 hours.
            </p>
            <Link
              href="/contact"
              className="inline-block px-8 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
