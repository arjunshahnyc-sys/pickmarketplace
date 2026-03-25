import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Cookie Policy - Pick Marketplace',
  description: 'Learn how Pick Marketplace uses cookies to improve your experience and support our affiliate partnerships.',
};

export default function CookiePolicyPage() {
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
            Cookie Policy
          </h1>
          <p className="text-gray-600 mb-12">
            Last updated: {lastUpdated}
          </p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                What Are Cookies?
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, analyze traffic, and provide personalized experiences.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                How We Use Cookies
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Pick Marketplace uses cookies for the following purposes:
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-black mb-2">Essential Cookies</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    These cookies are necessary for the website to function properly. They enable core functionality like page navigation, secure areas access, and form submissions. These cookies don't collect personal information and can't be disabled.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-black mb-2">Preference Cookies</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    These cookies remember your preferences and settings, such as your preferred retailers, search filters, and display options. This helps us provide a more personalized experience.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-black mb-2">Analytics Cookies</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    We use analytics cookies to understand how visitors interact with our website. This helps us identify popular products, improve search functionality, and optimize the user experience. Data collected is aggregated and anonymous.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-black mb-2">Affiliate Cookies</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    When you click through to a retailer from Pick Marketplace, affiliate cookies may be set to track your purchase. These cookies allow us to earn a commission if you complete a purchase within a certain timeframe (typically 24-90 days, depending on the retailer). This doesn't affect the price you pay.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Third-Party Cookies
              </h2>
              <p className="text-gray-700 leading-relaxed">
                When you click through to a retailer's website (Amazon, Target, Best Buy, etc.), that retailer may set their own cookies. We don't control these third-party cookies. Please review each retailer's cookie policy for more information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Managing Cookies
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can control and manage cookies in several ways:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Browser settings:</strong> Most browsers allow you to refuse or accept cookies, delete existing cookies, or set preferences for certain websites.
                </li>
                <li>
                  <strong>Browser extensions:</strong> Use privacy-focused extensions to block tracking cookies.
                </li>
                <li>
                  <strong>Opt-out tools:</strong> Some advertising networks provide opt-out mechanisms for targeted advertising.
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                Note: Disabling essential cookies may affect the functionality of Pick Marketplace. Preference and analytics cookies are optional and can be disabled without impacting core features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Data Retention
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Cookies are stored for varying lengths of time depending on their purpose:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
                <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
                <li><strong>Preference cookies:</strong> Typically stored for 1 year</li>
                <li><strong>Affiliate cookies:</strong> Stored for 24-90 days depending on the retailer's affiliate program</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Questions About Cookies?
              </h2>
              <p className="text-gray-700 leading-relaxed">
                If you have questions about how we use cookies, please contact us at{' '}
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
