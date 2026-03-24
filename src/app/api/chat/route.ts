import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Analyze user intent
    const intent = analyzeIntent(message);

    let response: {
      message: string;
      products?: Array<{
        name: string;
        price: number;
        retailer: string;
        url: string;
        image?: string;
      }>;
    } = { message: '' };

    switch (intent.type) {
      case 'product_search':
        response = await handleProductSearch(intent.query);
        break;

      case 'price_comparison':
        response = await handlePriceComparison(intent.query);
        break;

      case 'recommendations':
        response = await handleRecommendations(intent.query, intent.priceRange);
        break;

      case 'similar_products':
        response = await handleSimilarProducts(intent.query);
        break;

      case 'general_question':
        response = handleGeneralQuestion(message);
        break;

      default:
        response = {
          message: "I can help you find products, compare prices, and discover deals! Try asking:\n\n• \"Find me wireless headphones under $200\"\n• \"What's the best laptop for students?\"\n• \"Show me deals on kitchen appliances\"\n• \"Compare prices for AirPods\""
        };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

// Analyze user intent from message
function analyzeIntent(message: string): {
  type: string;
  query: string;
  priceRange?: { min?: number; max?: number };
} {
  const lowerMessage = message.toLowerCase();

  // Extract price range if mentioned
  const priceMatch = lowerMessage.match(/under\s+\$?(\d+)|less\s+than\s+\$?(\d+)|below\s+\$?(\d+)/);
  const maxPrice = priceMatch ? parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]) : undefined;

  // Product search patterns
  if (
    lowerMessage.includes('find') ||
    lowerMessage.includes('looking for') ||
    lowerMessage.includes('search') ||
    lowerMessage.includes('show me')
  ) {
    return {
      type: 'product_search',
      query: extractProductQuery(message),
      priceRange: maxPrice ? { max: maxPrice } : undefined
    };
  }

  // Price comparison patterns
  if (
    lowerMessage.includes('compare') ||
    lowerMessage.includes('cheapest') ||
    lowerMessage.includes('best price')
  ) {
    return {
      type: 'price_comparison',
      query: extractProductQuery(message)
    };
  }

  // Recommendation patterns
  if (
    lowerMessage.includes('best') ||
    lowerMessage.includes('recommend') ||
    lowerMessage.includes('suggest') ||
    lowerMessage.includes('what should i')
  ) {
    return {
      type: 'recommendations',
      query: extractProductQuery(message),
      priceRange: maxPrice ? { max: maxPrice } : undefined
    };
  }

  // Similar products patterns
  if (
    lowerMessage.includes('similar') ||
    lowerMessage.includes('alternative') ||
    lowerMessage.includes('like')
  ) {
    return {
      type: 'similar_products',
      query: extractProductQuery(message)
    };
  }

  // General questions about Pick
  if (
    lowerMessage.includes('how does') ||
    lowerMessage.includes('what is') ||
    lowerMessage.includes('explain') ||
    lowerMessage.includes('help')
  ) {
    return {
      type: 'general_question',
      query: message
    };
  }

  // Default to product search
  return {
    type: 'product_search',
    query: message
  };
}

// Extract clean product query from message
function extractProductQuery(message: string): string {
  // Remove common phrases
  let query = message.toLowerCase()
    .replace(/^(find|show|search|looking for|i want|i need|get me|recommend|what's the best)/gi, '')
    .replace(/(please|under \$?\d+|less than \$?\d+|below \$?\d+)/gi, '')
    .trim();

  return query || message;
}

// Handle product search
async function handleProductSearch(query: string) {
  const searchTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2)
    .slice(0, 5);

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
    take: 5
  });

  if (products.length === 0) {
    return {
      message: `I couldn't find exact matches for "${query}", but I can help you search across Amazon, Walmart, Target, Best Buy, Costco, eBay, and Nordstrom. Try being more specific or use our search bar above!`
    };
  }

  const formattedProducts = products.map(product => {
    const sortedPrices = product.prices.sort((a, b) => a.amount - b.amount);
    const lowestPrice = sortedPrices[0];

    return {
      name: product.name,
      price: lowestPrice.amount,
      retailer: lowestPrice.retailer,
      url: lowestPrice.url,
      image: product.imageUrl
    };
  });

  return {
    message: `I found ${products.length} ${products.length === 1 ? 'product' : 'products'} for you! Here are the best deals:`,
    products: formattedProducts
  };
}

// Handle price comparison
async function handlePriceComparison(query: string) {
  const result = await handleProductSearch(query);

  if (result.products && result.products.length > 0) {
    const prices = result.products.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const savings = maxPrice - minPrice;

    return {
      message: `I compared prices across retailers. The best price is $${minPrice.toFixed(2)}, saving you $${savings.toFixed(2)} compared to the highest price! Check these options:`,
      products: result.products
    };
  }

  return result;
}

// Handle recommendations
async function handleRecommendations(query: string, priceRange?: { max?: number }) {
  let products = await prisma.product.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive' as const
      }
    },
    include: {
      prices: true
    },
    take: 5
  });

  // Filter by price range if specified
  if (priceRange?.max) {
    products = products.filter(product => {
      const minPrice = Math.min(...product.prices.map(p => p.amount));
      return minPrice <= priceRange.max!;
    });
  }

  if (products.length === 0) {
    return {
      message: priceRange?.max
        ? `I couldn't find products matching "${query}" under $${priceRange.max}. Try increasing your budget or searching for similar items!`
        : `I couldn't find matches for "${query}". Try describing what you're looking for differently!`
    };
  }

  const formattedProducts = products.map(product => {
    const sortedPrices = product.prices.sort((a, b) => a.amount - b.amount);
    const lowestPrice = sortedPrices[0];

    return {
      name: product.name,
      price: lowestPrice.amount,
      retailer: lowestPrice.retailer,
      url: lowestPrice.url,
      image: product.imageUrl
    };
  });

  const priceInfo = priceRange?.max ? ` under $${priceRange.max}` : '';
  return {
    message: `Based on your criteria${priceInfo}, I recommend these ${products.length} options. They offer the best value:`,
    products: formattedProducts
  };
}

// Handle similar products
async function handleSimilarProducts(query: string) {
  const result = await handleProductSearch(query);

  if (result.products) {
    return {
      message: `Here are similar products to "${query}" with great reviews and competitive prices:`,
      products: result.products
    };
  }

  return result;
}

// Handle general questions
function handleGeneralQuestion(question: string): { message: string } {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('how') && (lowerQuestion.includes('work') || lowerQuestion.includes('pick'))) {
    return {
      message: "Pick helps you save money in 3 ways:\n\n1. **Price Comparison** - We search 7 major retailers (Amazon, Walmart, Target, Best Buy, Costco, eBay, Nordstrom) to find the lowest price\n\n2. **Similar Products** - We find alternative products with comparable reviews that might be better deals\n\n3. **Smart Search** - Just tell me what you're looking for, and I'll find the best options!\n\nTry asking me to find a product!"
    };
  }

  if (lowerQuestion.includes('retailers') || lowerQuestion.includes('stores')) {
    return {
      message: "We search across 7 major retailers:\n\n• Amazon\n• Walmart\n• Target\n• Best Buy\n• Costco\n• eBay\n• Nordstrom\n\nWe compare prices in real-time to find you the best deal!"
    };
  }

  if (lowerQuestion.includes('free') || lowerQuestion.includes('cost') || lowerQuestion.includes('price')) {
    return {
      message: "Pick is completely free! No subscriptions, no hidden fees. We make money through affiliate commissions when you purchase through our links, but it never costs you extra. You always get the same price or better!"
    };
  }

  return {
    message: "I'm here to help you find the best deals! I can:\n\n• Find products across 7 retailers\n• Compare prices instantly\n• Recommend similar products\n• Find items within your budget\n\nWhat are you shopping for today?"
  };
}
