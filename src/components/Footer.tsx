export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-pick-border mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* FTC Disclosure - Shortened */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-gray-700 leading-relaxed">
            <strong className="font-semibold">Disclosure:</strong> Pick may earn a commission when you buy through our links. Prices shift, so always double-check at checkout.
          </p>
        </div>

        {/* Navigation - Simplified to 4 columns max */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-black mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/about" className="text-pick-muted hover:text-pick-teal transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/how-it-works" className="text-pick-muted hover:text-pick-teal transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/supported-retailers" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Supported Retailers
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-black mb-3">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/help" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/faq" className="text-pick-muted hover:text-pick-teal transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/contact" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-black mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/privacy" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/cookie-policy" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="/compliance" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Compliance
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-black mb-3">Plans</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/pricing" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-pick-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-heading font-bold text-pick-teal text-lg">Still broke. Still shopping.</p>
            <p className="text-xs text-pick-muted">
              © {currentYear} Pick. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
