import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
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
      throw new Error('Search failed');
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({
        similar: [],
        count: 0
      });
    }

    // Transform products into similar products format
    const similar = data.results.slice(0, 12).map((product: any) => {
      // Calculate similarity score based on how many search terms match
      const nameLower = product.name.toLowerCase();
      const matchedTerms = searchTerms.filter(term => nameLower.includes(term));
      const similarityScore = matchedTerms.length / searchTerms.length;

      return {
        id: product.id,
        name: product.name,
        price: product.lowestPrice,
        retailer: product.prices.find((p: any) => p.amount === product.lowestPrice)?.retailer || 'Amazon',
        url: product.prices.find((p: any) => p.amount === product.lowestPrice)?.url || '#',
        image: product.imageUrl,
        similarityScore: Math.round(similarityScore * 100)
      };
    }) as Array<{ id: string; name: string; price: number; retailer: string; url: string; image: string | null; similarityScore: number }>;

    // Sort by similarity score (highest first)
    similar.sort((a, b) => b.similarityScore - a.similarityScore);

    return NextResponse.json({
      similar,
      count: similar.length
    });

  } catch (error) {
    console.error('Similar products API error:', error);
    return NextResponse.json(
      { error: 'Failed to find similar products' },
      { status: 500 }
    );
  }
}
