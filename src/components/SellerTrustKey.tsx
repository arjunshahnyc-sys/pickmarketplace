import { BadgeCheck, AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * Legend explaining the seller-trust badges on result cards. No hooks —
 * renderable from both client components and server pages.
 */
export default function SellerTrustKey() {
  return (
    <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap mb-4 text-[11px] text-neutral-500">
      <span className="font-medium text-neutral-600">Seller key:</span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-teal-50 text-[#1F7A6F] font-medium">
          <BadgeCheck className="w-3 h-3" aria-hidden="true" />
          Verified
        </span>
        major retailer
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
          <HelpCircle className="w-3 h-3" aria-hidden="true" />
          Unverified seller
        </span>
        check reviews first
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          Possible scam
        </span>
        known scam reports
      </span>
    </div>
  );
}
