import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, image } = body;

    if (!query && !image) {
      return NextResponse.json(
        { error: 'Either query or image is required' },
        { status: 400 }
      );
    }

    // For now, we'll process text queries
    // In the future, this can be enhanced with AI vision API for image analysis
    let searchTerms: string[] = [];
    let matchReason = '';

    if (image) {
      // TODO: Integrate with AI Vision API (OpenAI GPT-4 Vision, Claude, etc.)
      // For now, return a helpful message
      return NextResponse.json(
        {
          error: 'Image analysis coming soon! For now, please describe what you\'re looking for in the text box.',
          products: []
        },
        { status: 200 }
      );
    }

    if (query) {
      // Extract search terms from natural language query
      searchTerms = extractSearchTerms(query);
      matchReason = 'Based on your search';
    }

    if (searchTerms.length === 0) {
      return NextResponse.json({
        products: [],
        message: 'Could not understand your request. Try being more specific.'
      });
    }

    // Search for products matching the extracted terms
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
      take: 12
    });

    // Transform products into response format
    const matchedProducts = products.map(product => {
      const sortedPrices = product.prices.sort((a, b) => a.amount - b.amount);
      const lowestPrice = sortedPrices[0];

      // Calculate match confidence
      const nameLower = product.name.toLowerCase();
      const matchedTerms = searchTerms.filter(term => nameLower.includes(term));
      const confidence = Math.round((matchedTerms.length / searchTerms.length) * 100);

      return {
        id: product.id,
        name: product.name,
        price: lowestPrice.amount,
        retailer: lowestPrice.retailer,
        url: lowestPrice.url,
        image: product.imageUrl,
        matchReason: `${confidence}% match - ${matchedTerms.join(', ')}`,
        confidence
      };
    });

    // Sort by confidence (highest first)
    matchedProducts.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      products: matchedProducts,
      searchTerms,
      count: matchedProducts.length
    });

  } catch (error) {
    console.error('Ask Pick API error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
}

// Helper function to extract meaningful search terms from natural language
function extractSearchTerms(query: string): string[] {
  // Remove common stop words and extract key terms
  const stopWords = new Set([
    'i', 'am', 'looking', 'for', 'find', 'me', 'a', 'an', 'the', 'this', 'that',
    'these', 'those', 'want', 'need', 'like', 'similar', 'to', 'can', 'you',
    'show', 'get', 'something', 'anything', 'under', 'over', 'about', 'around',
    'with', 'without', 'in', 'on', 'at', 'from', 'of', 'by'
  ]);

  // Extract price range if mentioned
  const priceMatch = query.match(/\$?\d+/);

  // Extract product category keywords
  const categories = [
    'headphones', 'earbuds', 'laptop', 'phone', 'tablet', 'watch',
    'shoes', 'dress', 'shirt', 'pants', 'jacket', 'coat',
    'furniture', 'desk', 'chair', 'lamp', 'table',
    'kitchen', 'appliance', 'mixer', 'blender', 'coffee',
    'camera', 'speaker', 'monitor', 'keyboard', 'mouse'
  ];

  // Extract adjectives (brand names, colors, styles)
  const adjectives = [
    'wireless', 'bluetooth', 'noise', 'canceling', 'active',
    'black', 'white', 'blue', 'red', 'green', 'silver', 'gold',
    'sony', 'apple', 'samsung', 'lg', 'dell', 'hp', 'lenovo',
    'nike', 'adidas', 'leather', 'cotton', 'wood', 'metal'
  ];

  const queryLower = query.toLowerCase();
  const words = queryLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Prioritize category and adjective matches
  const terms = words.filter(word =>
    categories.includes(word) ||
    adjectives.includes(word) ||
    word.length > 4
  );

  return [...new Set(terms)].slice(0, 6); // Return unique terms, max 6
}
