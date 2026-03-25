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

        {/* Links */}
        <div className="flex flex-wrap justify-between items-center gap-4 text-sm text-pick-muted">
          <div>
            <p className="font-heading font-bold text-pick-teal text-lg">Pick Marketplace</p>
            <p className="text-xs mt-1">Compare prices across 50+ retailers</p>
          </div>

          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-pick-teal transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-pick-teal transition-colors">Terms</a>
            <a href="mailto:support@pickmarketplace.com" className="hover:text-pick-teal transition-colors">Contact</a>
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
