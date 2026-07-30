import { NextRequest, NextResponse } from 'next/server';
import type { SearchResponse } from '@/lib/types';
import { searchWithFallback } from '@/lib/searchService';
import { searchMockProducts } from '@/lib/mockProducts';
import { extensionCorsHeaders } from '@/lib/cors';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rateLimit';

// Handle CORS preflight (extension content scripts / service worker)
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: extensionCorsHeaders(request.headers.get('origin')) });
}

export async function GET(request: NextRequest) {
  const corsHeaders = extensionCorsHeaders(request.headers.get('origin'));
  const query = request.nextUrl.searchParams.get('q');

  if (!query || !query.trim() || query.length > 200) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required (max 200 characters)' },
      { status: 400, headers: corsHeaders }
    );
  }

  const rl = checkRateLimit(request, RATE_LIMITS.search);
  if (!rl.ok) {
    return rateLimitResponse(rl.retryAfterSeconds, corsHeaders);
  }

  try {
    const results = await searchWithFallback(query);

    const response: SearchResponse = {
      query,
      results,
      totalResults: results.length,
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error('Search API error:', error);

    // Ultimate fallback - use mock products (already has URLs populated)
    const mockResults = searchMockProducts(query);
    const response: SearchResponse = {
      query,
      results: mockResults,
      totalResults: mockResults.length,
    };

    return NextResponse.json(response, { headers: corsHeaders });
  }
}
