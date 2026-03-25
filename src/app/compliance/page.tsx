import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Compliance - Pick Marketplace',
  description: 'Learn about Pick Marketplace\'s compliance with FTC guidelines, data privacy regulations, and affiliate disclosure requirements.',
};

export default function CompliancePage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Compliance
          </h1>
          <p className="text-gray-600 mb-12">
            Last updated: {lastUpdated}
          </p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                FTC Affiliate Disclosure
              </h2>
              <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                <p className="text-gray-800 leading-relaxed">
                  <strong className="text-black">Disclosure:</strong> Pick Marketplace participates in affiliate marketing programs. When you click on links to retailers and make a purchase, we may earn a commission at no additional cost to you. This helps us keep the service free and support ongoing development.
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed">
                In compliance with the Federal Trade Commission's (FTC) guidelines on endorsements and testimonials, we disclose that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
                <li>We have affiliate relationships with Amazon, Target, Best Buy, Walmart, and other retailers featured on our platform.</li>
                <li>We may receive compensation when you click through our links and make a purchase.</li>
                <li>Commission rates vary by retailer and product category, but they do not affect the prices you pay.</li>
                <li>Our price comparisons reflect actual retail prices and are not inflated to increase our commission.</li>
                <li>We clearly label example or demo products that may not reflect current real-time availability.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Data Collection and Use
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We are committed to protecting your privacy and handling your data responsibly. Here's what we collect and why:
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-black mb-2">Search Queries</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    We collect and analyze search queries to improve product recommendations, identify trending products, and optimize search functionality. Search data is anonymized and aggregated.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-black mb-2">User Preferences</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    If you create an account, we store your preferences (preferred retailers, search filters, notification settings) to personalize your experience. This data is stored securely and never sold to third parties.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-black mb-2">Analytics Data</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    We collect anonymized usage data (page views, click patterns, time on site) to understand how users interact with Pick Marketplace and improve the service. We do not track personally identifiable information without consent.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Affiliate Relationship Transparency
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We maintain transparency about our affiliate relationships:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>No preferential ranking:</strong> We do not rank search results based on commission rates. Products are sorted by price, relevance, or user-selected criteria.</li>
                <li><strong>Clear labeling:</strong> External links to retailers include appropriate rel="sponsored" attributes for search engine transparency.</li>
                <li><strong>Honest recommendations:</strong> We do not promote products solely based on commission potential. Our goal is to help you find the best price, not maximize our earnings.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                CCPA Compliance (California Residents)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Under the California Consumer Privacy Act (CCPA), California residents have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Know what personal information we collect, use, and share</li>
                <li>Request deletion of personal information</li>
                <li>Opt-out of the "sale" of personal information (Note: We do not sell personal information)</li>
                <li>Non-discrimination for exercising CCPA rights</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise these rights, contact us at{' '}
                <a
                  href="mailto:support@pickmarketplace.com"
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  support@pickmarketplace.com
                </a>{' '}
                with "CCPA Request" in the subject line.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                GDPR Compliance (EU Residents)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you are located in the European Union, you have rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Right to access your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise GDPR rights, contact us at{' '}
                <a
                  href="mailto:support@pickmarketplace.com"
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  support@pickmarketplace.com
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Price Accuracy and Disclaimers
              </h2>
              <p className="text-gray-700 leading-relaxed">
                While we strive to provide accurate, up-to-date pricing information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
                <li>Prices and availability are subject to change without notice</li>
                <li>Retailers may update prices more frequently than we can scrape them</li>
                <li>Shipping costs may vary and are not always included in displayed prices</li>
                <li>We clearly label example products and estimated prices when real-time data is unavailable</li>
                <li>Always verify the final price on the retailer's website before purchasing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Questions or Concerns?
              </h2>
              <p className="text-gray-700 leading-relaxed">
                If you have questions about our compliance policies, data practices, or affiliate relationships, please contact us at{' '}
                <a
                  href="mailto:support@pickmarketplace.com"
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  support@pickmarketplace.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
