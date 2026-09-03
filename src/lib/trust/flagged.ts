// Marketplaces Pick warns about, as data rather than bare string lists, so
// the card's tooltip can say which marketplace and why. Kept OUTSIDE the
// merchant registry on purpose: REGISTRY feeds badge logos, the logo sync
// test, and the landed-cost merchant config, none of which should ever
// see these names.
//
// Matching must stay byte-identical to the historical lists:
//   token      the key must be a whole token of the name ("Temu Store")
//   substring  a whole token OR anywhere inside the collapsed name
//              ("DHgate Official Store", "AliExpress US Store")
//   exact      only when the key IS the collapsed name ("Wish", "Wish.com";
//              never "Wishlist Gifts")
//
// Copy rules: every reason is the evidence-neutral sentence below until the
// owner attaches a checked source URL to a dated evidence entry; a specific
// legal claim (an FTC penalty, a state attorney-general suit) must never
// reach the page unsourced. Evidence entries render as one extra sentence.

import { collapse, tokens } from './identity';

export interface FlaggedEvidence {
  /** YYYY-MM-DD */
  date: string;
  summary: string;
  sourceUrl: string;
}

export interface FlaggedMerchant {
  key: string;
  displayName: string;
  match: 'token' | 'substring' | 'exact';
  /** Completes "<displayName> ...": the reason for the warning. */
  reason: string;
  evidence: ReadonlyArray<FlaggedEvidence>;
}

const REPORTS =
  'has widespread shopper reports of counterfeits, undelivered orders, and refund problems.';

export const FLAGGED_MERCHANTS: ReadonlyArray<FlaggedMerchant> = [
  { key: 'temu', displayName: 'Temu', match: 'token', reason: REPORTS, evidence: [] },
  { key: 'dhgate', displayName: 'DHgate', match: 'substring', reason: REPORTS, evidence: [] },
  { key: 'aliexpress', displayName: 'AliExpress', match: 'substring', reason: REPORTS, evidence: [] },
  { key: 'alibaba', displayName: 'Alibaba', match: 'token', reason: REPORTS, evidence: [] },
  { key: 'shein', displayName: 'Shein', match: 'token', reason: REPORTS, evidence: [] },
  { key: 'banggood', displayName: 'Banggood', match: 'substring', reason: REPORTS, evidence: [] },
  { key: 'joom', displayName: 'Joom', match: 'token', reason: REPORTS, evidence: [] },
  { key: 'lightinthebox', displayName: 'LightInTheBox', match: 'substring', reason: REPORTS, evidence: [] },
  { key: 'fruugo', displayName: 'Fruugo', match: 'substring', reason: REPORTS, evidence: [] },
  { key: 'desertcart', displayName: 'Desertcart', match: 'substring', reason: REPORTS, evidence: [] },
  { key: 'wish', displayName: 'Wish', match: 'exact', reason: REPORTS, evidence: [] },
];

/** The flagged marketplace a feed name resolves to, or null. */
export function findFlagged(retailer: string): FlaggedMerchant | null {
  const collapsed = collapse(retailer);
  const parts = tokens(retailer);
  for (const m of FLAGGED_MERCHANTS) {
    const hit =
      m.match === 'exact'
        ? collapsed === m.key
        : parts.includes(m.key) || (m.match === 'substring' && collapsed.includes(m.key));
    if (hit) return m;
  }
  return null;
}
