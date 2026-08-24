import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Supported Retailers - Pick Marketplace',
  description: 'See all retailers supported by Pick Marketplace including Amazon, Target, Best Buy, Walmart, Macy\'s, and more.',
};

export default function SupportedRetailersPage() {
  const retailers = [
    {
      name: 'Target',
      colorClass: 'bg-red-100 text-red-800 border-red-200',
      source: 'Direct integration: we query Target\'s catalog API',
      categories: 'Home, Clothing, Electronics, Toys, Beauty, Grocery, Baby',
      coverage: 'Wide selection of household goods, apparel, and everyday essentials',
    },
    {
      name: 'Google Shopping',
      colorClass: 'bg-green-100 text-green-800 border-green-200',
      source: 'Aggregator: our source for every retailer below',
      categories: 'All categories from thousands of online retailers',
      coverage: 'Aggregated listings from Google\'s shopping platform',
    },
    {
      name: 'Amazon',
      colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      source: 'Via Google Shopping listings',
      categories: 'Electronics, Books, Home & Kitchen, Clothing, Beauty, Toys, Sports, and more',
      coverage: 'Millions of products across all major categories',
    },
    {
      name: 'Best Buy',
      colorClass: 'bg-blue-100 text-blue-800 border-blue-200',
      source: 'Via Google Shopping listings',
      categories: 'Electronics, Computers, Home Appliances, Gaming, Smart Home',
      coverage: 'Comprehensive electronics and technology products',
    },
    {
      name: 'Walmart',
      colorClass: 'bg-sky-100 text-sky-800 border-sky-200',
      source: 'Via Google Shopping listings',
      categories: 'Grocery, Electronics, Home, Clothing, Toys, Automotive, Health',
      coverage: 'Extensive product range at everyday low prices',
    },
    {
      name: "Macy's",
      colorClass: 'bg-pink-100 text-pink-800 border-pink-200',
      source: 'Via Google Shopping listings',
      categories: 'Clothing, Shoes, Accessories, Home Décor, Beauty',
      coverage: 'Fashion, apparel, and home goods from major brands',
    },
  ];

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Supported Retailers
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pick pulls prices from two sources: Target's catalog, which we query directly,
              and Google Shopping, which aggregates listings from dozens of retailers.
              Here are the stores you'll see most often in results.
            </p>
          </div>

          {/* Retailer list */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {retailers.map((retailer, index) => (
              <div
                key={index}
                className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0">
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${retailer.colorClass}`}>
                      {retailer.name}
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-teal-600 mt-1" />
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Price source
                    </p>
                    <p className="text-sm text-gray-700">
                      {retailer.source}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Categories
                    </p>
                    <p className="text-sm text-gray-700">
                      {retailer.categories}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Coverage
                    </p>
                    <p className="text-sm text-gray-700">
                      {retailer.coverage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional info */}
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <h2 className="text-xl font-semibold text-black mb-3">
                How We Select Retailers
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We prioritize retailers based on:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Product selection and availability</li>
                <li>Competitive pricing and frequent promotions</li>
                <li>Reliable shipping and customer service</li>
                <li>Technical compatibility with our price-checking system</li>
                <li>User demand and search frequency</li>
              </ul>
            </div>

            <div className="p-6 bg-teal-50 border border-teal-200 rounded-lg">
              <h2 className="text-xl font-semibold text-black mb-3">
                Direct Integrations We're Considering
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Retailers like Nordstrom, Costco, Home Depot, and Wayfair already appear in
                results through Google Shopping. Beyond that, we're evaluating direct API
                integrations that would give us richer, first-party data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                <li>Best Buy Products API (real-time electronics pricing and availability)</li>
                <li>Walmart API (full catalog access)</li>
                <li>Amazon Product Advertising API (required for first-party Amazon price data)</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                Want to see a specific retailer added?{' '}
                <a
                  href="/contact"
                  className="text-teal-700 hover:text-teal-800 underline font-medium"
                >
                  Let us know
                </a>
                {' '}and we'll consider it for future integration.
              </p>
            </div>

            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h2 className="text-xl font-semibold text-black mb-3">
                Important Notes
              </h2>
              <ul className="space-y-2 text-gray-700 leading-relaxed">
                <li>
                  <strong>Affiliate relationships:</strong> Pick doesn't currently participate in any retailer affiliate program, and we earn nothing when you click through. If we join affiliate programs in the future, we'll disclose it here first.
                </li>
                <li>
                  <strong>Price accuracy:</strong> While we check prices regularly, retailers can change prices at any time. Always verify the final price on the retailer's website before purchasing.
                </li>
                <li>
                  <strong>Product availability:</strong> Some products may be out of stock or unavailable in certain regions. Availability shown on Pick Marketplace may not reflect real-time inventory.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
