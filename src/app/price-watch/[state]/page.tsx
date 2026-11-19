import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Where the links in a price alert email end up (see
// api/price-watch/[action]): one short page per outcome.
const STATES: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: 'Your price alert is on',
    body: 'Pick will email you when the price drops. Every alert has a link to stop them.',
  },
  unsubscribed: {
    title: 'Your price alert is off',
    body: 'Pick will not email you about this product again.',
  },
  invalid: {
    title: 'That link is not valid',
    body: 'It may have been replaced by a newer one. You can set the alert again from the product page.',
  },
};

export const metadata: Metadata = {
  title: 'Price alert - Pick Marketplace',
  robots: { index: false, follow: false },
};

export function generateStaticParams(): Array<{ state: string }> {
  return Object.keys(STATES).map((state) => ({ state }));
}

export default async function PriceWatchStatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const copy = STATES[state];
  if (!copy) notFound();
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{copy.title}</h1>
      <p className="mt-3 text-neutral-600">{copy.body}</p>
      <Link
        href="/compare"
        prefetch={false}
        className="mt-8 inline-block rounded-xl border border-[#2A9D8F] px-4 py-2 text-sm font-medium text-[#1F7A6F] transition hover:bg-teal-50"
      >
        Back to price comparisons
      </Link>
    </main>
  );
}
