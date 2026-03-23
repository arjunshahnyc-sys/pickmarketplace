import { NextRequest, NextResponse } from 'next/server';
import type { SearchResponse, ProductResult } from '@/lib/types';

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
  };
  return urls[retailer] || `https://www.google.com/search?q=${query}+${retailer}`;
}

// Mock product data - in production this would query real retailer APIs
const mockProducts: Record<string, ProductResult[]> = {
  headphones: [
    {
      id: '1',
      name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
      imageUrl: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 328.00, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 349.99, url: 'https://bestbuy.com' },
        { retailer: 'Walmart', amount: 348.00, url: 'https://walmart.com' },
        { retailer: 'Target', amount: 349.99, url: 'https://target.com' },
      ],
      lowestPrice: 328.00,
      highestPrice: 349.99,
    },
    {
      id: '2',
      name: 'Apple AirPods Max',
      imageUrl: 'https://images.unsplash.com/photo-1625245488600-f03fef636a3c?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 479.00, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 499.00, url: 'https://bestbuy.com' },
        { retailer: 'Target', amount: 549.00, url: 'https://target.com' },
      ],
      lowestPrice: 479.00,
      highestPrice: 549.00,
    },
    {
      id: '3',
      name: 'Bose QuietComfort Ultra Headphones',
      imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 379.00, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 429.00, url: 'https://bestbuy.com' },
        { retailer: 'Walmart', amount: 399.00, url: 'https://walmart.com' },
      ],
      lowestPrice: 379.00,
      highestPrice: 429.00,
    },
    {
      id: '4',
      name: 'Sennheiser Momentum 4 Wireless',
      imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 299.95, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 349.95, url: 'https://bestbuy.com' },
      ],
      lowestPrice: 299.95,
      highestPrice: 349.95,
    },
  ],
  laptop: [
    {
      id: '5',
      name: 'MacBook Air 15" M3 (2024)',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 1249.00, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 1299.00, url: 'https://bestbuy.com' },
        { retailer: 'Walmart', amount: 1299.00, url: 'https://walmart.com' },
      ],
      lowestPrice: 1249.00,
      highestPrice: 1299.00,
    },
    {
      id: '6',
      name: 'Dell XPS 15 (2024)',
      imageUrl: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 1399.00, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 1499.99, url: 'https://bestbuy.com' },
        { retailer: 'Walmart', amount: 1449.00, url: 'https://walmart.com' },
      ],
      lowestPrice: 1399.00,
      highestPrice: 1499.99,
    },
    {
      id: '7',
      name: 'Lenovo ThinkPad X1 Carbon Gen 11',
      imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 1329.00, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 1449.99, url: 'https://bestbuy.com' },
      ],
      lowestPrice: 1329.00,
      highestPrice: 1449.99,
    },
  ],
  keyboard: [
    {
      id: '8',
      name: 'Keychron Q1 Pro Mechanical Keyboard',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 169.00, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 199.00, url: 'https://bestbuy.com' },
      ],
      lowestPrice: 169.00,
      highestPrice: 199.00,
    },
    {
      id: '9',
      name: 'Logitech MX Keys S',
      imageUrl: 'https://images.unsplash.com/photo-1561241142-e3c8c25c8e01?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 99.99, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 109.99, url: 'https://bestbuy.com' },
        { retailer: 'Target', amount: 109.99, url: 'https://target.com' },
      ],
      lowestPrice: 99.99,
      highestPrice: 109.99,
    },
  ],
  monitor: [
    {
      id: '10',
      name: 'LG UltraGear 27" 4K 144Hz Gaming Monitor',
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 699.99, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 799.99, url: 'https://bestbuy.com' },
        { retailer: 'Walmart', amount: 749.00, url: 'https://walmart.com' },
      ],
      lowestPrice: 699.99,
      highestPrice: 799.99,
    },
    {
      id: '11',
      name: 'Samsung Odyssey G7 32" Curved',
      imageUrl: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 549.99, url: 'https://amazon.com' },
        { retailer: 'Best Buy', amount: 599.99, url: 'https://bestbuy.com' },
      ],
      lowestPrice: 549.99,
      highestPrice: 599.99,
    },
  ],
};

// Generate results based on query matching
function searchProducts(query: string): ProductResult[] {
  const normalizedQuery = query.toLowerCase();
  const results: ProductResult[] = [];

  for (const [category, products] of Object.entries(mockProducts)) {
    if (category.includes(normalizedQuery) || normalizedQuery.includes(category)) {
      results.push(...products);
    } else {
      // Also check product names
      for (const product of products) {
        if (product.name.toLowerCase().includes(normalizedQuery)) {
          results.push(product);
        }
      }
    }
  }

  // If no specific matches, return a sample of products
  if (results.length === 0) {
    const allProducts = Object.values(mockProducts).flat();
    return allProducts.slice(0, 4);
  }

  return results;
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400, headers: corsHeaders }
    );
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const results = searchProducts(query);

  // Update URLs to be proper search URLs
  const resultsWithUrls = results.map(product => ({
    ...product,
    prices: product.prices.map(price => ({
      ...price,
      url: getSearchUrl(price.retailer, product.name)
    }))
  }));

  const response: SearchResponse = {
    query,
    results: resultsWithUrls,
    totalResults: resultsWithUrls.length,
  };

  return NextResponse.json(response, { headers: corsHeaders });
}
