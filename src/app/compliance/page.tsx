import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { affiliateLinksEnabled } from '@/lib/affiliate';
import { landedCostEnabled } from '@/lib/flags';

export const metadata: Metadata = {
  title: 'Compliance - Pick Marketplace',
  description: 'Learn about Pick Marketplace\'s compliance with FTC guidelines, data privacy regulations, and affiliate disclosure requirements.',
};

export default function CompliancePage() {
  const lastUpdated = 'September 1, 2026';

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-white">
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
                  <strong className="text-black">Disclosure:</strong>{' '}
                  {affiliateLinksEnabled()
                    ? 'Pick Marketplace participates in retailer affiliate programs. When you buy through a link on this site, the retailer pays us a commission at no additional cost to you. Commissions never determine which products appear or how results are ranked.'
                    : 'Pick Marketplace does not currently participate in any affiliate marketing program. We earn nothing when you click through to a retailer or make a purchase. If we join affiliate programs in the future, we will update this disclosure before any commission-earning links go live.'}
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed">
                In line with the Federal Trade Commission's (FTC) guidelines on endorsements and material connections, we disclose that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
                {affiliateLinksEnabled() ? (
                  <li>Outbound links on this site are affiliate links: retailers pay us a commission on purchases made through them.</li>
                ) : (
                  <li>We have no affiliate, sponsorship, or paid-placement relationship with any retailer shown on our platform, including Amazon, Target, Best Buy, and Walmart.</li>
                )}
                <li>No retailer pays us for inclusion, ranking, or placement.</li>
                <li>Our price comparisons reflect the prices our data sources report and are never adjusted for commercial reasons.</li>
                <li>We clearly label example or demo products that may not reflect current real-time availability.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Where Our Price Data Comes From
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Pick uses two data sources: we query Target's public catalog API directly, and we aggregate product listings from Google Shopping, which cover retailers such as Amazon, Walmart, Best Buy, Nordstrom, and Macy's. We do not scrape retailer websites, and prices for retailers other than Target come from their Google Shopping listings rather than from the retailer directly.
              </p>
              <p className="text-gray-700 leading-relaxed">
                If we join a retailer's affiliate or API program in the future, we will source that retailer's data as its program terms require. For Amazon specifically, that means price and availability data would come from Amazon's Product Advertising API, refreshed and timestamped per the Amazon Associates program policies.
              </p>
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
                  <h3 className="font-semibold text-black mb-2">Account Information</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    If you create an account, we store your name, your email address, and a hashed version of your password so you can sign in. That is everything an account holds today. Your saved list and delivery country live in your browser's local storage and are never sent to our servers. Account data is stored securely and never sold to third parties.
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
                Ranking and Link Transparency
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We maintain transparency about how results are ranked and where links go:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>No preferential ranking:</strong> Products are sorted by price, relevance, or user-selected criteria. No retailer can pay for placement.</li>
                <li><strong>Direct links:</strong> Result links go straight to the retailer's site, with no tracking parameters added by us.</li>
                <li><strong>Honest recommendations:</strong> We do not promote products based on commercial incentives. Our goal is to help you find the best price.</li>
              </ul>
            </section>

            {landedCostEnabled() && (
              <section>
                <h2 className="text-2xl font-semibold text-black mb-4">
                  Landed Cost Estimates
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Where shown, total cost figures (item, shipping, import duty, import tax, and
                  carrier fees) are estimates for comparison only. They are not quotes, invoices,
                  or customs advice. Actual charges are determined by customs authorities,
                  carriers, and the merchant at the time of import, and can differ from our
                  estimates.
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Labeled uncertainty:</strong> every estimated figure is marked as an estimate, and components we cannot compute are shown as unknown rather than assumed to be zero.</li>
                  <li><strong>Ranges, not false precision:</strong> when we cannot tell whether a merchant collects duties at checkout, we show a range instead of a single number.</li>
                  <li><strong>Verify before you buy:</strong> always confirm final pricing, shipping, and any import charges with the retailer and carrier before purchasing.</li>
                  <li><strong>Location default:</strong> the delivery country starts at your approximate location (country level only, derived from your network connection by our hosting provider). We do not store it, and picking a country in the header always overrides it and is remembered instead.</li>
                </ul>
              </section>
            )}

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
                  href="mailto:support@pickmarketplace.app"
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  support@pickmarketplace.app
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
                  href="mailto:support@pickmarketplace.app"
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  support@pickmarketplace.app
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
                <li>Retailers may update prices more frequently than our sources refresh them</li>
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
                  href="mailto:support@pickmarketplace.app"
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  support@pickmarketplace.app
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
