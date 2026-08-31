import { BadgeCheck, AlertTriangle, HelpCircle, Store } from 'lucide-react';

/**
 * Legend explaining the seller-trust badges on result cards. No hooks —
 * renderable from both client components and server pages. Badge tiers come
 * from the merchant trust registry (src/lib/trust/registry.ts); the copy
 * here must describe the SELLER, never the product.
 */
export default function SellerTrustKey() {
  return (
    <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap mb-4 text-[11px] text-neutral-500">
      <span className="font-medium text-neutral-600">Seller key:</span>
      <span
        className="inline-flex items-center gap-1"
        title="The retailer's official store, recognized by Pick. Describes the seller, not the product."
      >
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-teal-50 text-[#1F7A6F] font-medium">
          <BadgeCheck className="w-3 h-3" aria-hidden="true" />
          Verified
        </span>
        official retailer store
      </span>
      <span
        className="inline-flex items-center gap-1"
        title="An established platform whose listings can come from the platform itself or independent third-party sellers."
      >
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium">
          <Store className="w-3 h-3" aria-hidden="true" />
          Marketplace
        </span>
        platform, mixed sellers
      </span>
      <span
        className="inline-flex items-center gap-1"
        title="Pick doesn't recognize this seller. Not a judgment on the product — check the store's reviews first."
      >
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
          <HelpCircle className="w-3 h-3" aria-hidden="true" />
          Unverified seller
        </span>
        check reviews first
      </span>
      <span
        className="inline-flex items-center gap-1"
        title="This marketplace has widespread reports of scams, counterfeits, or undelivered orders."
      >
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          Possible scam
        </span>
        known scam reports
      </span>
    </div>
  );
}
