// Shapes shared by Pick's product page (/item), its details endpoint
// (/api/item) and the client view. Types only, safe to import anywhere.

import type { SizeCheckResult, SizeKind } from './sizeSearch';
import type { TrustLevel } from './retailerTrust';

/** What the page can show at once, from the signed link alone. */
export interface ItemBase {
  title: string;
  retailer: string;
  market: string;
  price: number;
  currency: string;
  image: string;
  /** Where the store button goes until (or unless) the lookup refines it. */
  storeUrl: string;
  /** Whether that link carries commission tracking (rel=sponsored). */
  sponsored: boolean;
  trust: TrustLevel;
  size?: { kind: SizeKind; size: string };
}

export interface ItemOffer {
  store: string;
  title: string;
  price?: string;
  originalPrice?: string;
  details: string[];
  url: string;
  sponsored: boolean;
  trust: TrustLevel;
}

export type ItemDetails =
  | { ok: false }
  | {
      ok: true;
      title: string;
      description: string;
      images: string[];
      /** The clicked store's own offer; null when the lookup does not list that store. */
      seller: (ItemOffer & { host: string }) | null;
      storeUrl: string;
      others: ItemOffer[];
      size?: SizeCheckResult;
    };
