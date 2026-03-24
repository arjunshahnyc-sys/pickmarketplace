import { ShoppingBag } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b border-black/10 dark:border-white/10 bg-white dark:bg-black sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 group">
            <ShoppingBag size={22} strokeWidth={1.5} className="text-[#2A9D8F]" />
            <span className="text-xl font-semibold tracking-tight">pick</span>
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold mb-8">Terms of Service</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mb-12">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              By accessing or using Pick's website and browser extension (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Description of Service</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              Pick provides a price comparison service that helps users find products at competitive prices across multiple retailers. We aggregate publicly available pricing information and present it in an easy-to-compare format.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Use of Service</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed mb-4">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-black/80 dark:text-white/80">
              <li>Use the Service in any way that violates any applicable law or regulation</li>
              <li>Attempt to interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to scrape or collect data from the Service</li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
              <li>Transmit any viruses, malware, or other harmful code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Pricing Information</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              While we strive to provide accurate and up-to-date pricing information, prices displayed on our Service are subject to change without notice. We do not guarantee the accuracy, completeness, or timeliness of price information. Always verify prices directly with retailers before making a purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Third-Party Retailers</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              Our Service provides links to third-party retailer websites. We are not responsible for the content, products, services, or practices of these third-party sites. Your transactions with retailers are solely between you and the retailer, and we are not a party to such transactions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Affiliate Relationships</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              We may earn commissions from retailers when you click on links and make purchases. These affiliate relationships do not affect the prices you pay or our commitment to providing unbiased price comparisons.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              The Service, including its content, features, and functionality, is owned by Pick and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Browser Extension</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              Our browser extension is provided "as is" and requires certain permissions to function. By installing the extension, you grant us permission to access product pages you visit on supported retailer websites to provide price comparison features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PICK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              You agree to indemnify and hold Pick harmless from any claims, damages, losses, liabilities, and expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Termination</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              We reserve the right to terminate or suspend your access to the Service at any time, without notice, for any reason, including violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="text-black/80 dark:text-white/80 leading-relaxed">
              If you have questions about these Terms of Service, please contact us at legal@pick.com
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 dark:border-white/10 mt-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-black/60 dark:text-white/60">
            <span className="font-semibold text-black dark:text-white">pick</span>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-black dark:text-white transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-black dark:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
