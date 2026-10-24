'use client';

import { useId, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedList } from '@/contexts/SavedListContext';
import { useDestination, type PostalCodeOutcome } from '@/contexts/DestinationContext';
import { landedCostEnabled } from '@/lib/flags';
import Link from 'next/link';
import { Globe, ShieldCheck, ShoppingBag } from 'lucide-react';
import { PickLogo } from './PickLogo';
import InfoTip from './InfoTip';
import { normalizeZip } from '@/lib/landedCost/usZip';

// Destination + display currency for landed-cost estimates. Rendered only
// behind LANDED_COST_ENABLED; changing the country snaps the currency to
// that destination's own (the shopper can still override it, and totals for
// pairs with no FX data honestly show as unavailable rather than converted
// at a made-up rate).
//
// US ZIP (2026-10-23): typing a ZIP sets the delivery state (sales tax, and
// which stores' published shipping terms apply) without hunting through a
// 51-entry dropdown. The ZIP is resolved and kept in the browser only (see
// DestinationContext); the shield tip beside the field says exactly that,
// because a shopper typing an address detail deserves to know who can see
// it: nobody at Pick.
const CURRENCY_OPTIONS = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'JPY'];

const ZIP_PRIVACY_NOTE =
  "Your ZIP code stays in this browser. It picks the delivery state for the sales tax estimate and tells the estimate which stores' shipping terms apply at your address. It is never sent to Pick's servers, so we cannot see or store it. Clear the field to remove it.";

const ZIP_MESSAGES: Record<Exclude<PostalCodeOutcome, 'set' | 'cleared'>, string> = {
  invalid: 'Enter a 5-digit US ZIP code.',
  unsupported: 'Pick estimates delivery to the 50 states and DC only.',
};

const PICKER_SELECT_CLASS =
  'h-8 rounded-full bg-gray-100 px-2 text-xs font-medium text-neutral-700 hover:bg-gray-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20';

function DestinationPicker({ compact = false }: { compact?: boolean }) {
  const {
    destination,
    setCountry,
    setCurrency,
    setSubdivision,
    setPostalCode,
    countries,
    subdivisions,
  } = useDestination();
  const suffix = compact ? '-m' : '';
  const zipNoteId = useId();
  const zipStatusId = useId();

  // The ZIP field is a draft until it holds a whole ZIP, so partial input
  // never clears the stored ZIP or flashes an error per keystroke. When the
  // stored ZIP changes underneath (restored after mount, dropped by a state
  // or country change), the draft follows it: the "adjust state when a
  // prop changes" pattern, during render rather than in an effect.
  const [zipDraft, setZipDraft] = useState(destination.postalCode ?? '');
  const [zipSynced, setZipSynced] = useState(destination.postalCode);
  const [zipMessage, setZipMessage] = useState<string | null>(null);
  if (zipSynced !== destination.postalCode) {
    setZipSynced(destination.postalCode);
    setZipDraft(destination.postalCode ?? '');
  }

  const commitZip = (value: string) => {
    const outcome = setPostalCode(value);
    setZipMessage(outcome === 'set' || outcome === 'cleared' ? null : ZIP_MESSAGES[outcome]);
  };

  return (
    <div className={`relative flex items-center gap-1.5 ${compact ? 'flex-wrap py-2' : ''}`}>
      <Globe className="w-4 h-4 text-pick-muted" aria-hidden="true" />
      <label className="sr-only" htmlFor={`dest-country${suffix}`}>
        Delivery country
      </label>
      <select
        id={`dest-country${suffix}`}
        value={destination.country}
        title="Delivery country for cost estimates. Starts at your approximate location; your choice here always wins and is remembered."
        onChange={(e) => setCountry(e.target.value)}
        className={PICKER_SELECT_CLASS}
      >
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {subdivisions.length > 0 && (
        <>
          <InfoTip
            label="How your ZIP code is used"
            content={<span id={zipNoteId}>{ZIP_PRIVACY_NOTE}</span>}
            triggerClassName="inline-flex h-6 w-6 items-center justify-center rounded-full text-pick-muted hover:text-pick-teal transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          </InfoTip>
          {/* The shield sits BEFORE the field so the tab order runs
              shield -> ZIP -> state: tabbing out of a half-typed ZIP lands
              on the state select, not on a tooltip that would open over
              the field's own error message. */}
          <label className="sr-only" htmlFor={`dest-zip${suffix}`}>
            Delivery ZIP code, kept on this device
          </label>
          <input
            id={`dest-zip${suffix}`}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={10}
            placeholder="ZIP"
            value={zipDraft}
            onChange={(e) => {
              const next = e.target.value;
              setZipDraft(next);
              setZipMessage(null);
              // A whole ZIP applies as typed; an emptied field clears.
              if (next.trim() === '' || normalizeZip(next)) commitZip(next);
            }}
            onBlur={() => {
              if (zipDraft.trim() !== '' && !normalizeZip(zipDraft)) {
                setZipMessage(ZIP_MESSAGES.invalid);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitZip(zipDraft);
              }
            }}
            aria-describedby={zipMessage ? `${zipNoteId} ${zipStatusId}` : zipNoteId}
            aria-invalid={zipMessage ? true : undefined}
            title="Delivery ZIP code. Sets the state for the tax and shipping estimates. Stays on this device and is never sent to Pick."
            className="h-8 w-[4.25rem] rounded-full bg-gray-100 px-2.5 text-xs font-medium text-neutral-700 placeholder:text-neutral-400 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20"
          />
          <label className="sr-only" htmlFor={`dest-state${suffix}`}>
            Delivery state for the sales tax and shipping estimates
          </label>
          <select
            id={`dest-state${suffix}`}
            value={destination.subdivision ?? ''}
            title="Delivery state. Used on this device to estimate sales tax and to apply stores' published shipping terms. Without it the total shows tax as unresolved."
            onChange={(e) => setSubdivision(e.target.value)}
            className={PICKER_SELECT_CLASS}
          >
            <option value="">State…</option>
            {subdivisions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </>
      )}
      <label className="sr-only" htmlFor={`dest-currency${suffix}`}>
        Display currency
      </label>
      <select
        id={`dest-currency${suffix}`}
        value={destination.currency}
        onChange={(e) => setCurrency(e.target.value)}
        className={PICKER_SELECT_CLASS}
      >
        {CURRENCY_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {zipMessage && (
        <p
          id={zipStatusId}
          role="status"
          className="absolute left-0 top-full z-20 mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-800 shadow-sm"
        >
          {zipMessage}
        </p>
      )}
    </div>
  );
}

function SavedListButton() {
  const { items, total, openDrawer } = useSavedList();
  return (
    <button
      onClick={openDrawer}
      className="relative flex items-center gap-2 text-pick-muted hover:text-pick-teal transition-colors p-2"
      aria-label={`Saved items (${items.length})`}
    >
      <span className="relative">
        <ShoppingBag className="w-5 h-5" />
        {items.length > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-pick-teal text-white text-[10px] font-bold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </span>
      {items.length > 0 && (
        <span className="hidden lg:inline text-sm font-semibold text-black">
          ${total.toFixed(2)}
        </span>
      )}
    </button>
  );
}

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[72px]">
          {/* Logo. When already on the homepage a client-side Link to "/"
              is a no-op that leaves search results on screen — force a full
              navigation so the logo always returns to the clean home view. */}
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Pick home"
            onClick={(e) => {
              // Only intercept plain left-clicks — modified clicks (new
              // tab/window) keep native link behavior.
              const plainClick =
                e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
              if (plainClick && window.location.pathname === '/') {
                e.preventDefault();
                window.location.assign('/');
              }
            }}
          >
            <PickLogo size={28} />
            <span className="text-xl font-medium text-black">pick</span>
          </Link>

          {/* Desktop Navigation.

              Login / Sign Up were removed from the header on 2026-09-01.
              As of that date an account gives a shopper nothing an anonymous
              visitor lacks: /account shows name, email, and member-since
              and offers logout; the saved list is device-local
              (localStorage, see SavedListContext); there are no saved
              searches, watchlists, alerts, history, or preferences, and the
              Search/Product/Price Prisma models are unused. Putting a
              Sign Up button in the header with no stated benefit made the
              product look unfinished. The /login and /signup routes still
              work, and the logged-in branch below stays so existing accounts
              can reach /account and log out. Restore the two links here (and
              in the mobile menu) once there is a real reason to create an
              account, and say that reason next to the button. */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
            {landedCostEnabled() && <DestinationPicker />}
            <SavedListButton />

            {isAuthenticated && (
              <>
                <span className="text-sm text-neutral-600">{user?.name}</span>
                <Link
                  href="/account"
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Account
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </nav>

          {/* Mobile: saved list + menu button. The menu only exists when it
              has something to hold (the destination picker behind the
              landed-cost flag, or the logged-in links). */}
          <div className="md:hidden flex items-center gap-1">
          <SavedListButton />
          {(landedCostEnabled() || isAuthenticated) && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-pick-muted hover:text-pick-teal transition-colors p-2"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          )}
          </div>
        </div>

        {/* Mobile Menu. Login / Sign Up removed here too; see the note on
            the desktop nav above. */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-pick-border">
            <nav aria-label="Mobile navigation" className="flex flex-col space-y-3">
              {landedCostEnabled() && <DestinationPicker compact />}
              {isAuthenticated && (
                <>
                  <div className="py-2">
                    <span className="text-sm text-pick-muted">{user?.name}</span>
                  </div>
                  <Link
                    href="/account"
                    className="text-pick-muted hover:text-pick-teal transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-pick-muted hover:text-pick-teal transition-colors py-2 text-left"
                  >
                    Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
