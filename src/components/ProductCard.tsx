"use client";

import { memo, useState } from "react";
import { useSavedList } from "@/contexts/SavedListContext";
import { ShoppingBag, Check, BadgeCheck, AlertTriangle, HelpCircle, Store, Users, Info } from "lucide-react";
import { getRetailerTrust } from "@/lib/retailerTrust";
import { TRUST_LEVEL_META, type TrustLevelMeta } from "@/lib/trust/explain";
import InfoTip from "./InfoTip";
import { getRetailerLogo } from "./RetailerLogos";
import { isAffiliateUrl } from "@/lib/affiliate";
import { currencySymbol, formatPrice, formatRating } from "@/lib/formatters";
import LandedCostPanel from "./LandedCostPanel";
import { overlaysFor } from "@/lib/cardOverlays";
import { IMAGE_BOX_CLASS } from "@/lib/cardLayout";
import type { Product } from "@/lib/types";
import type { EnhancedProduct } from "@/lib/productGrouping";

// Deterministic across server and client (explicit locale + UTC): cards are
// prerendered on /search/[slug] pages, and locale/timezone-dependent output
// like bare toLocaleDateString() causes React hydration mismatches there.
// Month and day only: a live price check is always recent, and the year
// pushed the line into a wrap beside the Compare pill.
// Badge icons by the level meta's icon name (lib/trust/explain.ts).
const TRUST_ICONS: Record<TrustLevelMeta['icon'], typeof BadgeCheck> = {
  'badge-check': BadgeCheck,
  store: Store,
  users: Users,
  'help-circle': HelpCircle,
  'alert-triangle': AlertTriangle,
};

const verifiedDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

interface ProductCardProps {
  product: EnhancedProduct;
  /** Ticked in the compare selection; draws the ring. */
  isSelected?: boolean;
  /** Present on surfaces that offer compare; absent = no checkbox rendered. */
  onSelect?: (product: Product) => void;
  isBestDeal?: boolean;
  isLowestInGroup?: boolean;
  groupSavingsAmount?: number;
  groupSavingsPercent?: number;
  groupSize?: number;
  /** True while FX rates are loading; the cost panel shows a loading state. */
  fxPending?: boolean;
  /** Destination country the landed-cost estimate is for, e.g. 'GB'. */
  destinationCountry?: string;
}

function ProductCard({
  product,
  isSelected = false,
  onSelect,
  isBestDeal = false,
  isLowestInGroup,
  groupSavingsAmount,
  groupSavingsPercent,
  groupSize,
  fxPending = false,
  destinationCountry,
}: ProductCardProps) {
  // Use props first, fallback to product properties
  const showLowestPrice = isLowestInGroup ?? product.isLowestInGroup;
  const savingsAmount = groupSavingsAmount ?? product.groupSavingsAmount;
  const productGroupSize = groupSize ?? product.groupSize;
  // Image overlay chips: one anchored stack, savings first, then the
  // discount or EXAMPLE tag (rules and ordering in lib/cardOverlays.ts).
  const overlays = overlaysFor({
    ...product,
    isLowestInGroup: showLowestPrice,
    groupSavingsAmount: savingsAmount,
  });

  const { isSaved, toggleItem } = useSavedList();
  const saved = isSaved(product.url);
  // Market-scoped identity: "Target" in the AU feed is Target Australia,
  // not Target US. The URL feeds the registry's lookalike guard.
  const trust = getRetailerTrust(product.retailer, {
    market: product.sourceMarket,
    url: product.url,
  });
  const flagged = trust.level === 'flagged';
  const trustMeta = TRUST_LEVEL_META[trust.level];
  const TrustIcon = TRUST_ICONS[trustMeta.icon];
  const retailerLogo = getRetailerLogo(product.retailer, product.sourceMarket);
  const showVerified = !product.isFallback && !!product.lastVerified;
  // Example cards are deep links, not offers: nothing to compare.
  const showCompare = !!onSelect && !product.isFallback;

  // Track the failed URL, not a boolean: memoized cards get recycled under
  // index keys, and a bare flag would keep showing the fallback after the
  // card is reused for a product whose image loads fine.
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageFailed = !product.image || failedImage === product.image;

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({
      name: product.name,
      price: product.price,
      image: product.image,
      retailer: product.retailer,
      url: product.url,
    });
  };

  // The link's accessible name carries everything a screen reader needs in
  // one announcement: name, seller, price, and the seller warning if any.
  const linkLabel = `${
    product.isFallback
      ? `Search for ${product.name} on ${product.retailer}`
      : `View ${product.name} on ${product.retailer}, ${currencySymbol(product.currency)}${formatPrice(product.price, product.currency)}`
  }${
    flagged
      ? '. Warning: possible scam, not from a verified reseller'
      : trust.level === 'unknown'
        ? '. Unverified seller'
        : trust.level === 'marketplace-seller'
          ? '. Independent marketplace seller'
          : ''
  }`;

  return (
    // CARD SHELL. The wrapper is the visible card and fills its grid cell
    // (h-full flex-col), so every card in a row ends at the same height and
    // the footer (verified date, cost row) sits at the bottom via mt-auto.
    // The only link is the title text; its ::after pseudo-element stretches
    // over the whole card so the card stays one click target, while every
    // interactive control (Save, Compare, cost row, tooltips) is a SIBLING
    // positioned above that overlay: interactive-inside-interactive is
    // invalid HTML and trips screen readers. `isolate` scopes z-indexes to
    // the card; the z-10 bumps lift a card while a tooltip is open so it
    // paints over its neighbours and stays under the sticky bar (z-20).
    // The whole card rings when the link has keyboard focus.
    <div
      className={`relative isolate group h-full w-full flex flex-col bg-white rounded-xl border p-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:z-10 focus-within:z-10 has-[[data-tip-open]]:z-10 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-pick-teal ${
        flagged ? 'border-red-300' : 'border-gray-200/70'
      } ${isSelected ? 'ring-2 ring-pick-teal' : flagged ? 'ring-2 ring-red-400/70' : ''}`}
    >
      <div className={IMAGE_BOX_CLASS}>
        {imageFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs text-black/60 font-medium">
              {product.name.length > 30 ? `${product.name.substring(0, 30)}...` : product.name}
            </span>
          </div>
        ) : (
          // Decorative: the title link already names the product, so an alt
          // would make screen readers hear the name twice per card.
          <img
            src={product.image}
            alt=""
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            onError={() => setFailedImage(product.image)}
          />
        )}
        {/* Overlay chips, pinned to the image box's top-left corner as one
            stack so nothing floats over the product photo and two chips can
            never collide. Order: the savings tag (same item or similar
            pick) first, then the discount or EXAMPLE pill. The stack's
            max-width leaves the Save button's column (top-right) alone at
            every breakpoint, down to a 130px phone image box; the savings
            tag is two short lines (label over amount) for the same reason. */}
        {(overlays.savings || overlays.tag) && (
          <div className="absolute top-2 left-2 z-[1] flex max-w-[calc(100%-2.75rem)] flex-col items-start gap-1">
            {overlays.savings?.kind === 'same-item' && (
              // Same-item tag: this exact product, cheapest of its listings.
              <span className="flex max-w-full flex-col items-start rounded-lg bg-white/95 px-2 py-1 shadow-sm max-sm:px-1.5">
                <span className="text-[9px] font-medium uppercase leading-none tracking-wide text-neutral-500">
                  Same item
                </span>
                <span className="max-w-full truncate text-xs font-semibold leading-tight text-[#1F7A6F] max-sm:text-[11px]">
                  Save {currencySymbol(overlays.savings.currency)}
                  {formatPrice(overlays.savings.amount, overlays.savings.currency)}
                </span>
              </span>
            )}
            {overlays.savings?.kind === 'similar' && (
              // Similar-alternative tag: a different product, much cheaper.
              // Solid dark fill so the two decisions never look alike.
              <span className="flex max-w-full flex-col items-start rounded-lg bg-[#14524B] px-2 py-1 text-white shadow-sm max-sm:px-1.5">
                <span className="text-[9px] font-medium uppercase leading-none tracking-wide text-white/75">
                  Similar pick
                </span>
                <span className="text-xs font-semibold leading-tight max-sm:text-[11px]">
                  {overlays.savings.percent}% less
                </span>
              </span>
            )}
            {overlays.tag?.kind === 'discount' && (
              <span className="whitespace-nowrap bg-neutral-900/80 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                -{overlays.tag.percent}%
              </span>
            )}
            {overlays.tag?.kind === 'example' && (
              <span className="whitespace-nowrap bg-yellow-100 text-yellow-800 text-[10px] font-medium px-2 py-0.5 rounded-full border border-yellow-300">
                EXAMPLE
              </span>
            )}
          </div>
        )}
        {/* Top-right of the image box: the Save button, a sibling of the
            link positioned above its overlay. */}
        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
          title={saved ? 'Remove from saved items' : 'Save to your list'}
          className={`absolute top-2 right-2 z-[1] w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
            saved
              ? 'bg-pick-teal text-white'
              : 'bg-white/90 text-black/50 hover:text-pick-teal hover:bg-white'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
        </button>
      </div>

      {/* Seller row: logo or text pill plus the trust badge. The badge is
          a real button (a sibling of the link, above its overlay) whose
          tooltip says WHY this seller carries the label; its explanation
          is always in the accessibility tree via aria-describedby. The
          row is position:relative so the panel spans the card width.
          min-h reserves one line so a wrapped row on a narrow card does
          not push the title out of line with its neighbours. */}
      <div className="relative mt-3 flex items-center gap-1.5 flex-wrap min-h-5">
        {retailerLogo ? (
          // Fixed-size box so every card's logo badge is identical;
          // object-contain centers wordmarks of any aspect ratio inside it.
          // alt carries the retailer name so screen readers hear the same
          // label the text badge gave them.
          <span
            title={product.retailer}
            className="inline-flex items-center justify-center w-[72px] h-5 shrink-0 rounded-full bg-gray-100"
          >
            <img
              src={retailerLogo.src}
              alt={product.retailer}
              className="w-14 h-3.5 object-contain"
              loading="lazy"
            />
          </span>
        ) : (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-neutral-600">
            {product.retailer}
          </span>
        )}
        <InfoTip
          content={
            <>
              <p className="font-semibold text-neutral-900">{trust.explanation.headline}</p>
              <p className="mt-0.5">{trust.explanation.reason}</p>
              <p className="mt-1 text-neutral-500">{trust.explanation.advice}</p>
            </>
          }
          triggerClassName={`relative z-[1] inline-flex cursor-help items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${trustMeta.className}`}
        >
          <TrustIcon className="w-3 h-3" aria-hidden="true" />
          <span className="underline decoration-dotted underline-offset-2">{trustMeta.label}</span>
          <Info className="w-2.5 h-2.5 opacity-70" aria-hidden="true" />
          <span className="sr-only">, about this seller</span>
        </InfoTip>
      </div>
      {flagged && (
        <p className="mt-1 text-[11px] leading-tight text-red-600">
          Not from a verified reseller. Buy with caution.
        </p>
      )}

      {/* The title is the card's one link. min-h reserves exactly two lines
          (2 x leading-tight) so a one-line name does not shorten the card
          and a three-line name cannot leak a sliver; leading-tight is
          marked important because the unlayered h1-h6 rule in globals.css
          would otherwise win and leave the reservation 3px too tall. The
          link's ::after
          overlay is what makes the whole card clickable; the <a> and <h3>
          must stay non-positioned so the overlay measures the wrapper. */}
      <h3 className="text-sm font-semibold text-neutral-900 mt-2 line-clamp-2 leading-tight! min-h-[2.5em] group-hover:text-pick-teal transition">
        <a
          href={product.url}
          target="_blank"
          // rel=sponsored is a machine-readable paid-link claim; only make it
          // when THIS link actually carries commission tracking. Per-link, not
          // site-wide: commission-excluded merchants (Amazon) keep a plain rel
          // even when affiliate links are live everywhere else.
          rel={isAffiliateUrl(product.url) ? "noopener noreferrer sponsored" : "noopener noreferrer"}
          aria-label={linkLabel}
          // The global a:focus-visible outline would ring only the title
          // text; the wrapper rings the whole card instead (has-[a:focus-visible]).
          className="focus-visible:outline-none! focus-visible:shadow-none! after:absolute after:inset-0 after:rounded-xl after:content-['']"
        >
          {product.name}
        </a>
      </h3>

      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        {/* "from" only on the card that actually carries the group's lowest
            price; on the others it would advertise a floor the price isn't. */}
        {productGroupSize && productGroupSize > 1 && showLowestPrice && (
          <span className="text-xs text-neutral-500">from</span>
        )}
        <span className="text-xl font-bold tabular-nums text-neutral-900">{currencySymbol(product.currency)}{formatPrice(product.price, product.currency)}</span>
        {product.originalPrice && product.originalPrice > product.price && (
          <span className="text-sm line-through text-neutral-400 font-normal">{currencySymbol(product.currency)}{formatPrice(product.originalPrice, product.currency)}</span>
        )}
      </div>

      {typeof product.rating === "number" && product.rating > 0 && !product.isFallback && (
        <div className="flex items-center gap-1 mt-1 text-xs text-pick-muted">
          <span className="text-yellow-500">
            {"★".repeat(Math.min(5, Math.max(0, Math.round(product.rating))))}
          </span>
          <span>{formatRating(product.rating)}</span>
          {product.reviewCount ? (
            <span>({product.reviewCount.toLocaleString("en-US")})</span>
          ) : null}
        </div>
      )}

      {/* Why this alternative is comparable: reviews above, shared specs here */}
      {product.matchType === 'similar' && product.similarTo && !product.isFallback && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-[11px] leading-snug text-[#14524B]">
            Alternative to{' '}
            <span className="font-medium">
              {product.similarTo.name.length > 34
                ? `${product.similarTo.name.substring(0, 34)}…`
                : product.similarTo.name}
            </span>
          </p>
          {product.similarTo.sharedSpecs.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {product.similarTo.sharedSpecs.map((spec) => (
                <span
                  key={spec}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#14524B]/5 text-[#14524B]"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {product.isFallback && (
        <div className="mt-2 pt-2 border-t border-pick-border">
          <p className="text-[10px] text-pick-muted leading-tight">
            Example product • Click to search on {product.retailer}
          </p>
        </div>
      )}

      {/* Footer, pushed to the card's bottom edge so a row of cards lines
          up. The cost row is interactive: a positioned sibling above the
          link overlay (see the shell comment). */}
      <div className="mt-auto pt-1">
        {(showVerified || showCompare) && (
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            {showVerified ? (
              <div className="whitespace-nowrap text-[10px] text-pick-muted">
                Price verified {verifiedDateFormat.format(new Date(product.lastVerified!))}
              </div>
            ) : (
              <span />
            )}
            {/* Compare: a native checkbox in a labelled pill, so Space
                toggles it, its state is announced, and the whole pill is
                the tap target. A sibling of the link, above its overlay. */}
            {showCompare && (
              <label className="relative z-[1] ml-auto inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-gray-200/70 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 transition-colors hover:border-pick-teal has-[:checked]:border-pick-teal has-[:checked]:bg-teal-50 has-[:checked]:text-[#1F7A6F]">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 cursor-pointer accent-pick-teal"
                  checked={isSelected}
                  onChange={() => onSelect?.(product)}
                  aria-label={`Compare ${product.name}`}
                />
                Compare
              </label>
            )}
          </div>
        )}
        {product.landedCost && !product.isFallback && (
          <LandedCostPanel
            breakdown={product.landedCost}
            fxPending={fxPending}
            itemCurrency={product.currency}
            country={destinationCountry}
          />
        )}
      </div>
    </div>
  );
}

// Memoized: the results grid re-renders on every compare-mode selection and
// filter change; cards only need to re-render when their own props change.
export default memo(ProductCard);
