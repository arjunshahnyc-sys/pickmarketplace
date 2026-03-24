import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Search for similar products in the database
    // This searches product names that contain any of the search terms
    const products = await prisma.product.findMany({
      where: {
        OR: searchTerms.map(term => ({
          name: {
            contains: term,
            mode: 'insensitive' as const
          }
        }))
      },
      include: {
        prices: true
      },
      take: 12 // Return up to 12 similar products
    });

    // Transform products into similar products format
    const similar = products.map(product => {
      // Get the lowest price for this product
      const sortedPrices = product.prices.sort((a, b) => a.amount - b.amount);
      const lowestPrice = sortedPrices[0];

      // Calculate similarity score based on how many search terms match
      const nameLower = product.name.toLowerCase();
      const matchedTerms = searchTerms.filter(term => nameLower.includes(term));
      const similarityScore = matchedTerms.length / searchTerms.length;

      return {
        id: product.id,
        name: product.name,
        price: lowestPrice.amount,
        retailer: lowestPrice.retailer,
        url: lowestPrice.url,
        image: product.imageUrl,
        similarityScore: Math.round(similarityScore * 100)
      };
    });

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
