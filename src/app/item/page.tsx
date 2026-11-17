import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ItemView from '@/components/ItemView';
import { isAffiliateUrl, toAffiliateUrl } from '@/lib/affiliate';
import { buildClickUrl, verifyItemParams } from '@/lib/outbound';
import { getRetailerTrust } from '@/lib/retailerTrust';
import type { ItemBase } from '@/lib/itemView';
import type { Product } from '@/lib/types';

// Pick's own page for one search result: the shopper lands here from a
// result card, sees the product, the store's price and stock, the size when
// the search had one, and the other stores selling it, then goes on to the
// store. The link is signed (lib/outbound.ts), so the title, price and image
// shown here are always ones Pick issued. The paid details are fetched by
// the client view from /api/item, so rendering this page costs nothing.
//
// Not indexed: the product ids behind these links stop resolving within
// hours, so there is no lasting page to index.

export const metadata: Metadata = {
  title: 'Product - Pick Marketplace',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ItemPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') query.set(key, value);
  }
  const params = verifyItemParams(query);

  if (!params) {
    return (
      <>
        <Header />
        <main id="main-content" className="min-h-[60vh] max-w-5xl mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">This product link has expired</h1>
          <p className="text-neutral-600 mb-6">Search for it again to see current prices.</p>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-[#2A9D8F] px-6 text-sm font-medium text-white hover:bg-[#21867A] transition-colors">
            Search Pick
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const source = { retailer: params.retailer, market: params.market };
  const clickUrl = buildClickUrl({
    googleProductId: params.pid,
    retailer: params.retailer,
    sourceMarket: params.market,
    url: params.fallback,
    name: params.title,
  } as Product);
  const tagged = toAffiliateUrl(params.fallback, source);
  const base: ItemBase = {
    title: params.title,
    retailer: params.retailer,
    market: params.market,
    price: Number(params.price),
    currency: params.currency,
    image: params.image,
    storeUrl: clickUrl ?? tagged,
    sponsored: isAffiliateUrl(tagged),
    trust: getRetailerTrust(params.retailer, { market: params.market }).level,
    ...(params.kind && params.size ? { size: { kind: params.kind, size: params.size } } : {}),
  };

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-white">
        <ItemView base={base} detailsUrl={`/api/item?${query.toString()}`} backQuery={query.get('q') ?? ''} />
      </main>
      <Footer />
    </>
  );
}
