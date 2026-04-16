import { NextRequest, NextResponse } from 'next/server';

// CORS headers for extension access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper to generate proper search URLs
function getSearchUrl(retailer: string, productName: string): string {
  const query = encodeURIComponent(productName);
  const urls: Record<string, string> = {
    'Amazon': `https://www.amazon.com/s?k=${query}`,
    'Walmart': `https://www.walmart.com/search?q=${query}`,
    'Target': `https://www.target.com/s?searchTerm=${query}`,
    'Best Buy': `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`,
    'Costco': `https://www.costco.com/CatalogSearch?keyword=${query}`,
    'eBay': `https://www.ebay.com/sch/i.html?_nkw=${query}`,
    'Nordstrom': `https://www.nordstrom.com/sr?keyword=${query}`,
  };
  return urls[retailer] || `https://www.google.com/search?q=${query}+${retailer}`;
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { similar: [], count: 0 },
        { status: 200, headers: corsHeaders }
      );
    }

    // Extract key terms from the query
    const searchTerms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 5);

    // Call internal search API to get products
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const searchUrl = `${baseUrl}/api/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      return NextResponse.json(
        { similar: [], count: 0 },
        { status: 200, headers: corsHeaders }
      );
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { similar: [], count: 0 },
        { status: 200, headers: corsHeaders }
      );
    }

    // Transform products into similar products format (4-8 items)
    const similar = data.results.slice(0, 8).map((product: any) => {
      // Calculate similarity score based on how many search terms match
      const nameLower = product.name.toLowerCase();
      const matchedTerms = searchTerms.filter(term => nameLower.includes(term));
      const similarityScore = matchedTerms.length / searchTerms.length;

      // Get the lowest price and its corresponding retailer
      const lowestPriceEntry = product.prices.find((p: any) => p.amount === product.lowestPrice) || product.prices[0];

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
    similar.sort((a: any, b: any) => b.similarityScore - a.similarityScore);

    return NextResponse.json(
      { similar, count: similar.length },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Similar products API error:', error);
    // NEVER throw 500 - always return graceful response with CORS
    return NextResponse.json(
      { similar: [], count: 0 },
      { status: 200, headers: corsHeaders }
    );
  }
}
