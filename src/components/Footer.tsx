export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-pick-border mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* FTC Disclosure */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-gray-700 leading-relaxed">
            <strong className="font-semibold">Disclosure:</strong> Pick Marketplace may earn commissions from purchases made through links on this site. This does not affect our price comparisons or recommendations. Prices and availability are subject to change and may not reflect real-time data. Always verify current prices on the retailer's website before making a purchase.
          </p>
        </div>

        {/* Navigation */}
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
                <a href="/compliance" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Compliance
                </a>
              </li>
              <li>
                <a href="/cookie-policy" className="text-pick-muted hover:text-pick-teal transition-colors">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-heading font-bold text-pick-teal text-lg mb-2">Pick Marketplace</p>
            <p className="text-xs text-pick-muted">
              Compare prices across 50+ retailers
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-pick-border text-center">
          <p className="text-xs text-pick-muted">
            © {currentYear} Pick Marketplace. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
