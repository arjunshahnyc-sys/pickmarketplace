import { NextRequest, NextResponse } from 'next/server';
import { searchWithFallback } from '@/lib/searchService';
import { getSearchUrl } from '@/lib/retailerUrls';
import { extensionCorsHeaders } from '@/lib/cors';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rateLimit';

// Helper function to extract meaningful search terms from natural language
function extractSearchTerms(query: string): string[] {
  // Remove common stop words and extract key terms
  const stopWords = new Set([
    'i', 'am', 'looking', 'for', 'find', 'me', 'a', 'an', 'the', 'this', 'that',
    'these', 'those', 'want', 'need', 'like', 'similar', 'to', 'can', 'you',
    'show', 'get', 'something', 'anything', 'under', 'over', 'about', 'around',
    'with', 'without', 'in', 'on', 'at', 'from', 'of', 'by'
  ]);

  const queryLower = query.toLowerCase();
  const words = queryLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)].slice(0, 6); // Return unique terms, max 6
}

// Trending products for graceful fallback
const trendingProducts = [
  { name: 'Sony WH-1000XM5 Headphones', image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80', price: 328.00, retailer: 'Amazon', url: 'https://www.amazon.com/s?k=Sony+WH-1000XM5' },
  { name: 'Apple AirPods Pro', image: 'https://images.unsplash.com/photo-1625245488600-f03fef636a3c?w=400&q=80', price: 249.00, retailer: 'Best Buy', url: 'https://www.bestbuy.com/site/searchpage.jsp?st=AirPods+Pro' },
  { name: 'Samsung Galaxy Watch 6', image: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&q=80', price: 299.99, retailer: 'Amazon', url: 'https://www.amazon.com/s?k=Galaxy+Watch+6' },
  { name: 'iPad Air M2', image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80', price: 599.00, retailer: 'Best Buy', url: 'https://www.bestbuy.com/site/searchpage.jsp?st=iPad+Air' },
];

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: extensionCorsHeaders(request.headers.get('origin')) });
}

export async function POST(request: NextRequest) {
  const corsHeaders = extensionCorsHeaders(request.headers.get('origin'));

  try {
    const rl = checkRateLimit(request, RATE_LIMITS.search);
    if (!rl.ok) {
      return rateLimitResponse(rl.retryAfterSeconds, corsHeaders);
    }

    const body = await request.json();
    const { query, image } = body;

    if (!query && !image) {
      return NextResponse.json(
        { products: [], message: 'Please provide a search query or image.' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle image search - graceful "coming soon" response
    if (image) {
      // TODO: Integrate with AI Vision API (OpenAI GPT-4 Vision, Claude, etc.)
      return NextResponse.json(
        {
          products: trendingProducts.map(p => ({
            ...p,
            matchReason: 'Trending product - Image search coming soon!'
          })),
          message: 'Image search is coming soon! For now, here are some trending products.',
          count: trendingProducts.length
        },
        { status: 200, headers: corsHeaders }
      );
    }

    if (typeof query === 'string' && query.length > 200) {
      return NextResponse.json(
        { products: [], message: 'Search query is too long (max 200 characters).', count: 0 },
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle text search
    if (typeof query === 'string') {
      const searchTerms = extractSearchTerms(query);

      if (searchTerms.length === 0) {
        return NextResponse.json(
          { products: [], message: 'Could not understand your request. Try being more specific.', count: 0 },
          { status: 200, headers: corsHeaders }
        );
      }

      const results = await searchWithFallback(query);

      if (results.length === 0) {
        return NextResponse.json(
          { products: [], searchTerms, count: 0, message: 'No products found matching your request.' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Transform products into response format (3-8 results)
      const matchedProducts = results.slice(0, 8).map((product) => {
        // Calculate match confidence
        const nameLower = product.name.toLowerCase();
        const matchedTerms = searchTerms.filter(term => nameLower.includes(term));
        const confidence = Math.round((matchedTerms.length / searchTerms.length) * 100);

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
          matchReason: matchedTerms.length > 0 ? `Matches: ${matchedTerms.join(', ')}` : 'Related product',
          confidence
        };
      });

      // Sort by confidence (highest first)
      matchedProducts.sort((a, b) => b.confidence - a.confidence);

      return NextResponse.json(
        { products: matchedProducts, searchTerms, count: matchedProducts.length },
        { headers: corsHeaders }
      );
    }

    // Fallback if neither a valid query nor image
    return NextResponse.json(
      { products: [], message: 'Please provide a search query or image.', count: 0 },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Ask Pick API error:', error);
    // NEVER throw 500 - always return graceful response with CORS
    return NextResponse.json(
      { products: [], message: 'Service temporarily unavailable. Please try again.', count: 0 },
      { status: 200, headers: corsHeaders }
    );
  }
}
