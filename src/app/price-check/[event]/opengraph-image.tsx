import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { PriceCheckShareCard } from '@/components/ShareCard';
import { getPriceCheckEvent } from '@/lib/priceCheck';
import { shareFonts } from '@/lib/shareImage';

// The preview for a price-check page link: the page's headline. It states
// no prices, so it runs no searches. twitter-image.tsx serves the same one.
export const alt = 'Black Friday price check: find the true cheapest price, from Pick';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ event: string }> }) {
  const { event: slug } = await params;
  const event = getPriceCheckEvent(slug);
  if (!event) notFound();
  return new ImageResponse(<PriceCheckShareCard eventName={event.name} />, {
    ...size,
    fonts: await shareFonts([500, 700, 900]),
  });
}
