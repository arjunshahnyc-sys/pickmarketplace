import type { Metadata } from 'next';
import { ShoppingBag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - Pick Marketplace',
  description: 'How Pick Marketplace collects, uses, and protects your data when you compare prices across retailers.',
};

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black/10 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 group">
            <ShoppingBag size={22} strokeWidth={1.5} className="text-[#2A9D8F]" />
            <span className="text-xl font-semibold tracking-tight">pick</span>
          </a>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm text-black/60 mb-12">Last updated: September 1, 2026</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p className="text-black/80 leading-relaxed">
              Pick ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information when you use our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <p className="text-black/80 leading-relaxed mb-4">
              We collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-black/80">
              <li><strong>Search Queries:</strong> Product searches you make on our platform to provide relevant price comparisons</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our service, including pages visited and features used</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and similar technical data for security and optimization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="text-black/80 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-black/80">
              <li>Provide and improve our price comparison services</li>
              <li>Keep you signed in if you create an account</li>
              <li>Analyze usage patterns to enhance our platform</li>
              <li>Prevent fraud and ensure security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
            <p className="text-black/80 leading-relaxed">
              We do not sell your personal information. We may share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-black/80">
              <li><strong>Service Providers:</strong> Third-party vendors who help us operate our service</li>
              <li><strong>Retailers:</strong> When you click on product links, retailers may receive information about your visit</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking</h2>
            <p className="text-black/80 leading-relaxed">
              We use a session cookie to keep you signed in if you create an account, and similar technologies to analyze usage patterns. Your delivery country and saved list are kept in your browser's local storage rather than in cookies, and they never leave your device. You can control cookies and site data through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p className="text-black/80 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your information. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p className="text-black/80 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-black/80">
              <li>Ask for a copy of the personal information we hold about you (for an account, that is your name and email address)</li>
              <li>Ask us to correct information that is inaccurate</li>
              <li>Ask us to delete your account and its information</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p className="text-black/80 leading-relaxed mt-4">
              There is no settings page for these requests yet. Email support@pickmarketplace.app from the address on your account and we will take care of it. We do not send marketing email, so there is nothing to unsubscribe from.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
            <p className="text-black/80 leading-relaxed">
              Our service is not intended for children under 13. We do not knowingly collect information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
            <p className="text-black/80 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-black/80 leading-relaxed">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at support@pickmarketplace.app
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 mt-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-black/60">
            <span className="font-semibold text-black">pick</span>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-black transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-black transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
