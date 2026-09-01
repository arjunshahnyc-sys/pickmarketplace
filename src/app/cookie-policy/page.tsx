import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { affiliateLinksEnabled } from '@/lib/affiliate';

export const metadata: Metadata = {
  title: 'Cookie Policy - Pick Marketplace',
  description: 'Learn how Pick Marketplace uses cookies to improve your experience.',
};

export default function CookiePolicyPage() {
  const lastUpdated = 'September 1, 2026';

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-white">
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
                    {affiliateLinksEnabled()
                      ? 'When you click through to a retailer, our affiliate network and the retailer may set cookies that credit Pick for the visit. They are set on the retailer side after you leave Pick, they cost you nothing, and they never affect which results appear or how they are ranked.'
                      : "Pick does not currently set any affiliate tracking cookies, because we don't participate in retailer affiliate programs. If we join affiliate programs in the future, clicking through to a retailer may set affiliate cookies, and we will update this policy before that happens."}
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
                <li>
                  <strong>Affiliate cookies:</strong>{' '}
                  {affiliateLinksEnabled()
                    ? 'Set by the retailer or our affiliate network when you click through, with retention controlled by them; commonly 1 to 30 days'
                    : 'None set today; this will be updated if we join retailer affiliate programs'}
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                Questions About Cookies?
              </h2>
              <p className="text-gray-700 leading-relaxed">
                If you have questions about how we use cookies, please contact us at{' '}
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
