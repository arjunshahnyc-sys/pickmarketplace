import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { ComparisonShareCard } from '@/components/ShareCard';
import { loadComparison } from '@/lib/comparisonData';
import type { Comparison } from '@/lib/comparisonPage';
import { getComparison } from '@/lib/comparisons';
import { shareFonts, shareImageContent } from '@/lib/shareImage';

// The preview a phone or a feed shows for a comparison page link: the
// product, its lowest confirmed price and the cheaper match, dated.
//
// It costs no searches of its own. loadComparison reads the same cached
// searches and offer lists the page render paid for (lib/comparisonData.ts);
// only an image asked for before its page was ever rendered pays, and the
// page then reuses that. Generated on first request and kept as long as the
// page is. twitter-image.tsx serves the same picture.
export const alt = 'The lowest confirmed price and a cheaper alternative, from Pick';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// Must be a literal (statically analyzable): 3 days, like the page.
export const revalidate = 259200;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getComparison(slug);
  // Before any paid search: an unknown slug is a 404, not a query.
  if (!entry) notFound();

  // A failed search must not leave a link with no preview at all: the card
  // then names the product and states no price.
  let comparison: Comparison | null = null;
  try {
    comparison = await loadComparison(entry);
  } catch (error) {
    console.error(`[share image] ${entry.slug}:`, error instanceof Error ? error.message : String(error));
  }

  return new ImageResponse(<ComparisonShareCard content={shareImageContent(entry, comparison)} />, {
    ...size,
    fonts: await shareFonts([500, 700, 900]),
  });
}
