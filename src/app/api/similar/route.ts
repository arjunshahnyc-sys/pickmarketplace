import { NextRequest, NextResponse } from 'next/server';
import { searchWithFallback } from '@/lib/searchService';
import { getSearchUrl } from '@/lib/retailerUrls';
import { extensionCorsHeaders } from '@/lib/cors';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rateLimit';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: extensionCorsHeaders(request.headers.get('origin')) });
}

export async function GET(request: NextRequest) {
  const corsHeaders = extensionCorsHeaders(request.headers.get('origin'));

  try {
    const query = request.nextUrl.searchParams.get('q');

    if (!query || query.length > 200) {
      return NextResponse.json(
        { similar: [], count: 0 },
        { status: 200, headers: corsHeaders }
      );
    }

    const rl = checkRateLimit(request, RATE_LIMITS.search);
    if (!rl.ok) {
      return rateLimitResponse(rl.retryAfterSeconds, corsHeaders);
    }

    // Extract key terms from the query
    const searchTerms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 5);

    const results = await searchWithFallback(query);

    if (results.length === 0) {
      return NextResponse.json(
        { similar: [], count: 0 },
        { status: 200, headers: corsHeaders }
      );
    }

    // Transform products into similar products format (4-8 items)
    const similar = results.slice(0, 8).map((product) => {
      // Calculate similarity score based on how many search terms match
      const nameLower = product.name.toLowerCase();
      const matchedTerms = searchTerms.filter(term => nameLower.includes(term));
      const similarityScore = searchTerms.length > 0 ? matchedTerms.length / searchTerms.length : 0;

      // Get the lowest price and its corresponding retailer
      const lowestPriceEntry = product.prices.find((p) => p.amount === product.lowestPrice) || product.prices[0];

      return {
        id: product.id,
        name: product.name,
        price: product.lowestPrice || lowestPriceEntry.amount,
        retailer: lowestPriceEntry.retailer,
        // ALWAYS ensure URL is populated - never return empty or "#"
        url: lowestPriceEntry.url || getSearchUrl(lowestPriceEntry.retailer, product.name || query),
        image: product.imageUrl,
        similarityScore: Math.round(similarityScore * 100)
      };
    });

    // Sort by similarity score (highest first)
    similar.sort((a, b) => b.similarityScore - a.similarityScore);

    return NextResponse.json(
      { similar, count: similar.length },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Similar products API error:', error);
    // NEVER throw 500 - always return graceful response with CORS
    return NextResponse.json(
      { similar: [], count: 0 },
      { status: 200, headers: extensionCorsHeaders(request.headers.get('origin')) }
    );
  }
}
