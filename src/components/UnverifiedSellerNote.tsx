import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { UNVERIFIED_DISCLOSURE } from '@/lib/trust/explain';

/**
 * Standing disclosure under a results grid that contains at least one
 * Unverified seller badge: the amber label means "not reviewed by Pick",
 * never a scam warning (that is the red Possible scam label). One line,
 * below the grid, so it never competes with the results; each card's badge
 * tooltip still says why THAT seller carries the label. No hooks, so both
 * the live search page and the prerendered category island can render it.
 * Callers show it only when hasUnverifiedSeller() is true for the cards
 * in view, so it never explains a badge the shopper cannot see.
 */
export default function UnverifiedSellerNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-[11px] leading-snug text-neutral-500 ${className}`}>
      <HelpCircle className="mt-px h-3 w-3 shrink-0 text-amber-600" aria-hidden="true" />
      <span>
        <span className="font-medium text-neutral-600">Unverified seller badge:</span> {UNVERIFIED_DISCLOSURE}{' '}
        <Link
          href="/faq#unverified-seller"
          className="underline decoration-dotted underline-offset-2 hover:text-pick-teal"
        >
          Learn more
        </Link>
      </span>
    </p>
  );
}
