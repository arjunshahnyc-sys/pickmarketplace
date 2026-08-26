import { affiliateLinksEnabled } from '@/lib/affiliate';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0F3D37] mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* FTC Disclosure - Shortened */}
        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-xs text-white/60 leading-relaxed">
            <strong className="font-semibold text-white/80">Disclosure:</strong>{' '}
            {affiliateLinksEnabled()
              ? 'Pick earns a commission from the retailer when you buy through our links, never by ranking results.'
              : "Pick doesn't currently earn commissions from retailer links; we'll disclose it here before any commission-earning links go live."}{' '}
            Prices shift, so always double-check at checkout.
          </p>
        </div>

        {/* Navigation - Simplified to 3 columns max */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/about" className="text-white/70 hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/how-it-works" className="text-white/70 hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/supported-retailers" className="text-white/70 hover:text-white transition-colors">
                  Supported Retailers
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/help" className="text-white/70 hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/faq" className="text-white/70 hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/contact" className="text-white/70 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/privacy" className="text-white/70 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-white/70 hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/cookie-policy" className="text-white/70 hover:text-white transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="/compliance" className="text-white/70 hover:text-white transition-colors">
                  Compliance
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-heading font-bold text-white text-lg">Don't waste your money.</p>
            <p className="text-xs text-white/50">
              © {currentYear} Pick. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
