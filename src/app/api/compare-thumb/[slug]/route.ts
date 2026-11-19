import { NextRequest, NextResponse } from 'next/server';
import { getComparison } from '@/lib/comparisons';
import { loadComparison } from '@/lib/comparisonData';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

// The photo on a product's tile in the /compare picture grid.
//
// The grid itself is a static page (the catalog only), so it costs nothing
// to build or serve. Each tile's <img> points here and loads lazily, so a
// photo is looked up only for a tile a shopper actually scrolls to. The
// lookup is loadComparison, the same 3-day data the product's own page
// uses: a tile whose page was visited recently costs nothing, and a cold
// one warms that page's data for the visit that follows the click.
//
// The answer is a redirect to the store photo Google serves for the
// product, cached for a day by the browser and three by the CDN. Anything
// that goes wrong (unknown product, search paused or down, no photo, too
// many requests) gets a neutral placeholder instead of a broken image, and
// that is not cached, so the photo appears once it can.
const PLACEHOLDER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="No photo yet">' +
  '<rect width="120" height="120" fill="#f3f4f6"/>' +
  '<path d="M44 50h32l3 34H41l3-34Zm8 0v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

function placeholder(): NextResponse {
  return new NextResponse(PLACEHOLDER, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const entry = getComparison(slug);
  if (!entry) return placeholder();
  if (!checkRateLimit(request, RATE_LIMITS.compareThumb).ok) return placeholder();

  try {
    const comparison = await loadComparison(entry);
    const image = comparison.item.top?.image || comparison.item.rows.find((r) => r.image)?.image;
    if (!image || !/^https:\/\//.test(image)) return placeholder();
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: image,
        'Cache-Control': 'public, max-age=86400, s-maxage=259200',
      },
    });
  } catch {
    return placeholder();
  }
}
