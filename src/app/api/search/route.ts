import { NextRequest, NextResponse } from 'next/server';
import type { SearchResponse, ProductResult } from '@/lib/types';
import { generateFallbackProducts, SEARCH_INTENTS } from '@/lib/scrapers';

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

// Mock product database with 50+ products across multiple categories
const mockProducts: Record<string, ProductResult[]> = {
  headphones: [
    {
      id: '1',
      name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
      imageUrl: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 328.00, url: '' },
        { retailer: 'Best Buy', amount: 349.99, url: '' },
        { retailer: 'Walmart', amount: 348.00, url: '' },
        { retailer: 'Target', amount: 349.99, url: '' },
      ],
      lowestPrice: 328.00,
      highestPrice: 349.99,
    },
    {
      id: '2',
      name: 'Apple AirPods Max',
      imageUrl: 'https://images.unsplash.com/photo-1625245488600-f03fef636a3c?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 479.00, url: '' },
        { retailer: 'Best Buy', amount: 499.00, url: '' },
        { retailer: 'Target', amount: 549.00, url: '' },
      ],
      lowestPrice: 479.00,
      highestPrice: 549.00,
    },
    {
      id: '3',
      name: 'Bose QuietComfort Ultra Headphones',
      imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 379.00, url: '' },
        { retailer: 'Best Buy', amount: 429.00, url: '' },
        { retailer: 'Walmart', amount: 399.00, url: '' },
      ],
      lowestPrice: 379.00,
      highestPrice: 429.00,
    },
    {
      id: '14',
      name: 'Samsung Galaxy Buds 2 Pro',
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 179.99, url: '' },
        { retailer: 'Best Buy', amount: 199.99, url: '' },
        { retailer: 'Target', amount: 189.99, url: '' },
      ],
      lowestPrice: 179.99,
      highestPrice: 199.99,
    },
  ],
  laptop: [
    {
      id: '5',
      name: 'MacBook Air 15" M3 (2024)',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 1249.00, url: '' },
        { retailer: 'Best Buy', amount: 1299.00, url: '' },
        { retailer: 'Walmart', amount: 1299.00, url: '' },
      ],
      lowestPrice: 1249.00,
      highestPrice: 1299.00,
    },
    {
      id: '6',
      name: 'Dell XPS 15 (2024)',
      imageUrl: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 1399.00, url: '' },
        { retailer: 'Best Buy', amount: 1499.99, url: '' },
        { retailer: 'Walmart', amount: 1449.00, url: '' },
      ],
      lowestPrice: 1399.00,
      highestPrice: 1499.99,
    },
    {
      id: '7',
      name: 'Lenovo ThinkPad X1 Carbon Gen 11',
      imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 1329.00, url: '' },
        { retailer: 'Best Buy', amount: 1449.99, url: '' },
      ],
      lowestPrice: 1329.00,
      highestPrice: 1449.99,
    },
    {
      id: '15',
      name: 'HP Envy 17 Laptop',
      imageUrl: 'https://dummyimage.com/400x400/6B7280/fff&text=HP+Laptop',
      prices: [
        { retailer: 'Amazon', amount: 899.99, url: '' },
        { retailer: 'Best Buy', amount: 949.99, url: '' },
        { retailer: 'Walmart', amount: 929.00, url: '' },
      ],
      lowestPrice: 899.99,
      highestPrice: 949.99,
    },
  ],
  keyboard: [
    {
      id: '8',
      name: 'Keychron Q1 Pro Mechanical Keyboard',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 169.00, url: '' },
        { retailer: 'Best Buy', amount: 199.00, url: '' },
      ],
      lowestPrice: 169.00,
      highestPrice: 199.00,
    },
    {
      id: '9',
      name: 'Logitech MX Keys S Wireless Keyboard',
      imageUrl: 'https://images.unsplash.com/photo-1561241142-e3c8c25c8e01?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 99.99, url: '' },
        { retailer: 'Best Buy', amount: 109.99, url: '' },
        { retailer: 'Target', amount: 109.99, url: '' },
      ],
      lowestPrice: 99.99,
      highestPrice: 109.99,
    },
    {
      id: '13',
      name: 'Apple Magic Keyboard with Touch ID',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 179.00, url: '' },
        { retailer: 'Best Buy', amount: 199.00, url: '' },
        { retailer: 'Target', amount: 199.00, url: '' },
      ],
      lowestPrice: 179.00,
      highestPrice: 199.00,
    },
  ],
  monitor: [
    {
      id: '10',
      name: 'LG UltraGear 27" 4K 144Hz Gaming Monitor',
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 699.99, url: '' },
        { retailer: 'Best Buy', amount: 799.99, url: '' },
        { retailer: 'Walmart', amount: 749.00, url: '' },
      ],
      lowestPrice: 699.99,
      highestPrice: 799.99,
    },
    {
      id: '11',
      name: 'Samsung Odyssey G7 32" Curved Monitor',
      imageUrl: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 549.99, url: '' },
        { retailer: 'Best Buy', amount: 599.99, url: '' },
      ],
      lowestPrice: 549.99,
      highestPrice: 599.99,
    },
    {
      id: '12',
      name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 579.99, url: '' },
        { retailer: 'Best Buy', amount: 649.99, url: '' },
        { retailer: 'Walmart', amount: 599.00, url: '' },
      ],
      lowestPrice: 579.99,
      highestPrice: 649.99,
    },
  ],
  shoes: [
    {
      id: '16',
      name: 'Nike Air Max 270 Running Shoes',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 139.99, url: '' },
        { retailer: 'Target', amount: 149.99, url: '' },
        { retailer: 'Walmart', amount: 144.00, url: '' },
      ],
      lowestPrice: 139.99,
      highestPrice: 149.99,
    },
    {
      id: '17',
      name: 'Adidas Ultraboost 23 Sneakers',
      imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 179.95, url: '' },
        { retailer: 'Target', amount: 189.99, url: '' },
      ],
      lowestPrice: 179.95,
      highestPrice: 189.99,
    },
    {
      id: '18',
      name: 'New Balance 990v6 Made in USA',
      imageUrl: 'https://dummyimage.com/400x400/9CA3AF/fff&text=NB+Shoes',
      prices: [
        { retailer: 'Amazon', amount: 184.99, url: '' },
        { retailer: 'Walmart', amount: 199.99, url: '' },
      ],
      lowestPrice: 184.99,
      highestPrice: 199.99,
    },
    {
      id: '19',
      name: 'Converse Chuck Taylor All Star Classic',
      imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 54.99, url: '' },
        { retailer: 'Target', amount: 59.99, url: '' },
        { retailer: 'Walmart', amount: 57.00, url: '' },
      ],
      lowestPrice: 54.99,
      highestPrice: 59.99,
    },
  ],
  clothing: [
    {
      id: '20',
      name: 'Levi\'s 501 Original Fit Jeans',
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 59.50, url: '' },
        { retailer: 'Target', amount: 69.99, url: '' },
        { retailer: 'Walmart', amount: 64.00, url: '' },
      ],
      lowestPrice: 59.50,
      highestPrice: 69.99,
    },
    {
      id: '21',
      name: 'Champion Reverse Weave Hoodie',
      imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 48.00, url: '' },
        { retailer: 'Target', amount: 54.99, url: '' },
      ],
      lowestPrice: 48.00,
      highestPrice: 54.99,
    },
    {
      id: '22',
      name: 'Carhartt Men\'s Workwear Jacket',
      imageUrl: 'https://dummyimage.com/400x400/92400E/fff&text=Carhartt',
      prices: [
        { retailer: 'Amazon', amount: 79.99, url: '' },
        { retailer: 'Walmart', amount: 89.99, url: '' },
      ],
      lowestPrice: 79.99,
      highestPrice: 89.99,
    },
    {
      id: '23',
      name: 'North Face Denali Fleece Jacket',
      imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=NorthFace',
      prices: [
        { retailer: 'Amazon', amount: 149.00, url: '' },
        { retailer: 'Target', amount: 169.99, url: '' },
      ],
      lowestPrice: 149.00,
      highestPrice: 169.99,
    },
  ],
  kitchen: [
    {
      id: '24',
      name: 'Ninja Professional Blender 1000W',
      imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 89.99, url: '' },
        { retailer: 'Best Buy', amount: 99.99, url: '' },
        { retailer: 'Walmart', amount: 94.00, url: '' },
        { retailer: 'Target', amount: 99.99, url: '' },
      ],
      lowestPrice: 89.99,
      highestPrice: 99.99,
    },
    {
      id: '25',
      name: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker',
      imageUrl: 'https://dummyimage.com/400x400/DC2626/fff&text=InstantPot',
      prices: [
        { retailer: 'Amazon', amount: 79.00, url: '' },
        { retailer: 'Walmart', amount: 89.99, url: '' },
        { retailer: 'Target', amount: 84.99, url: '' },
      ],
      lowestPrice: 79.00,
      highestPrice: 89.99,
    },
    {
      id: '26',
      name: 'KitchenAid 5-Quart Stand Mixer',
      imageUrl: 'https://dummyimage.com/400x400/EC4899/fff&text=KitchenAid',
      prices: [
        { retailer: 'Amazon', amount: 329.99, url: '' },
        { retailer: 'Best Buy', amount: 349.99, url: '' },
        { retailer: 'Target', amount: 339.99, url: '' },
      ],
      lowestPrice: 329.99,
      highestPrice: 349.99,
    },
    {
      id: '27',
      name: 'Keurig K-Elite Coffee Maker',
      imageUrl: 'https://dummyimage.com/400x400/78350F/fff&text=Keurig',
      prices: [
        { retailer: 'Amazon', amount: 139.99, url: '' },
        { retailer: 'Walmart', amount: 159.00, url: '' },
        { retailer: 'Target', amount: 149.99, url: '' },
      ],
      lowestPrice: 139.99,
      highestPrice: 159.00,
    },
  ],
  furniture: [
    {
      id: '28',
      name: 'Herman Miller Aeron Office Chair',
      imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 1395.00, url: '' },
        { retailer: 'Walmart', amount: 1449.99, url: '' },
      ],
      lowestPrice: 1395.00,
      highestPrice: 1449.99,
    },
    {
      id: '29',
      name: 'IKEA Bekant Desk 47"',
      imageUrl: 'https://dummyimage.com/400x400/0284C7/fff&text=IKEA+Desk',
      prices: [
        { retailer: 'Amazon', amount: 229.00, url: '' },
        { retailer: 'Walmart', amount: 249.99, url: '' },
      ],
      lowestPrice: 229.00,
      highestPrice: 249.99,
    },
    {
      id: '30',
      name: 'Floyd Platform Bed Frame Queen',
      imageUrl: 'https://dummyimage.com/400x400/92400E/fff&text=Bed+Frame',
      prices: [
        { retailer: 'Amazon', amount: 595.00, url: '' },
        { retailer: 'Target', amount: 649.00, url: '' },
      ],
      lowestPrice: 595.00,
      highestPrice: 649.00,
    },
  ],
  beauty: [
    {
      id: '31',
      name: 'Dyson Airwrap Complete Hair Styler',
      imageUrl: 'https://dummyimage.com/400x400/A855F7/fff&text=Dyson',
      prices: [
        { retailer: 'Amazon', amount: 549.99, url: '' },
        { retailer: 'Target', amount: 599.99, url: '' },
      ],
      lowestPrice: 549.99,
      highestPrice: 599.99,
    },
    {
      id: '32',
      name: 'The Ordinary Niacinamide 10% + Zinc 1%',
      imageUrl: 'https://dummyimage.com/400x400/EC4899/fff&text=Ordinary',
      prices: [
        { retailer: 'Amazon', amount: 5.90, url: '' },
        { retailer: 'Target', amount: 6.70, url: '' },
      ],
      lowestPrice: 5.90,
      highestPrice: 6.70,
    },
    {
      id: '33',
      name: 'CeraVe Moisturizing Cream 19oz',
      imageUrl: 'https://dummyimage.com/400x400/3B82F6/fff&text=CeraVe',
      prices: [
        { retailer: 'Amazon', amount: 16.08, url: '' },
        { retailer: 'Walmart', amount: 18.97, url: '' },
        { retailer: 'Target', amount: 17.99, url: '' },
      ],
      lowestPrice: 16.08,
      highestPrice: 18.97,
    },
  ],
  fitness: [
    {
      id: '34',
      name: 'Bowflex SelectTech 552 Adjustable Dumbbells',
      imageUrl: 'https://dummyimage.com/400x400/475569/fff&text=Bowflex',
      prices: [
        { retailer: 'Amazon', amount: 349.00, url: '' },
        { retailer: 'Walmart', amount: 399.00, url: '' },
      ],
      lowestPrice: 349.00,
      highestPrice: 399.00,
    },
    {
      id: '35',
      name: 'Peloton Bike+ Indoor Cycling Bike',
      imageUrl: 'https://dummyimage.com/400x400/DC2626/fff&text=Peloton',
      prices: [
        { retailer: 'Amazon', amount: 2495.00, url: '' },
        { retailer: 'Best Buy', amount: 2495.00, url: '' },
      ],
      lowestPrice: 2495.00,
      highestPrice: 2495.00,
    },
    {
      id: '36',
      name: 'Manduka PRO Yoga Mat',
      imageUrl: 'https://dummyimage.com/400x400/8B5CF6/fff&text=Yoga+Mat',
      prices: [
        { retailer: 'Amazon', amount: 120.00, url: '' },
        { retailer: 'Target', amount: 132.00, url: '' },
      ],
      lowestPrice: 120.00,
      highestPrice: 132.00,
    },
  ],
  outdoor: [
    {
      id: '37',
      name: 'Yeti Rambler 30 oz Tumbler',
      imageUrl: 'https://dummyimage.com/400x400/0284C7/fff&text=YETI',
      prices: [
        { retailer: 'Amazon', amount: 37.99, url: '' },
        { retailer: 'Walmart', amount: 42.00, url: '' },
        { retailer: 'Target', amount: 39.99, url: '' },
      ],
      lowestPrice: 37.99,
      highestPrice: 42.00,
    },
    {
      id: '38',
      name: 'Coleman Sundome 4-Person Camping Tent',
      imageUrl: 'https://dummyimage.com/400x400/16A34A/fff&text=Tent',
      prices: [
        { retailer: 'Amazon', amount: 74.99, url: '' },
        { retailer: 'Walmart', amount: 79.99, url: '' },
      ],
      lowestPrice: 74.99,
      highestPrice: 79.99,
    },
    {
      id: '39',
      name: 'Patagonia Nano Puff Jacket',
      imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=Patagonia',
      prices: [
        { retailer: 'Amazon', amount: 249.00, url: '' },
        { retailer: 'Target', amount: 269.00, url: '' },
      ],
      lowestPrice: 249.00,
      highestPrice: 269.00,
    },
  ],
  accessories: [
    {
      id: '40',
      name: 'Ray-Ban Wayfarer Classic Sunglasses',
      imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=RayBan',
      prices: [
        { retailer: 'Amazon', amount: 154.00, url: '' },
        { retailer: 'Target', amount: 169.99, url: '' },
      ],
      lowestPrice: 154.00,
      highestPrice: 169.99,
    },
    {
      id: '41',
      name: 'Apple Watch Series 9 41mm',
      imageUrl: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 399.00, url: '' },
        { retailer: 'Best Buy', amount: 429.00, url: '' },
        { retailer: 'Target', amount: 429.00, url: '' },
      ],
      lowestPrice: 399.00,
      highestPrice: 429.00,
    },
    {
      id: '42',
      name: 'Fossil Gen 6 Smartwatch',
      imageUrl: 'https://dummyimage.com/400x400/78350F/fff&text=Fossil',
      prices: [
        { retailer: 'Amazon', amount: 219.00, url: '' },
        { retailer: 'Walmart', amount: 249.99, url: '' },
      ],
      lowestPrice: 219.00,
      highestPrice: 249.99,
    },
  ],
  phone: [
    {
      id: '43',
      name: 'iPhone 15 Pro 128GB',
      imageUrl: 'https://images.unsplash.com/photo-1592286927505-25f428820dc7?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 999.00, url: '' },
        { retailer: 'Best Buy', amount: 999.00, url: '' },
        { retailer: 'Walmart', amount: 999.00, url: '' },
        { retailer: 'Target', amount: 999.00, url: '' },
      ],
      lowestPrice: 999.00,
      highestPrice: 999.00,
    },
    {
      id: '44',
      name: 'Samsung Galaxy S24 Ultra 256GB',
      imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy',
      prices: [
        { retailer: 'Amazon', amount: 1199.99, url: '' },
        { retailer: 'Best Buy', amount: 1299.99, url: '' },
        { retailer: 'Walmart', amount: 1249.00, url: '' },
      ],
      lowestPrice: 1199.99,
      highestPrice: 1299.99,
    },
    {
      id: '45',
      name: 'Google Pixel 8 Pro 128GB',
      imageUrl: 'https://dummyimage.com/400x400/4285F4/fff&text=Pixel',
      prices: [
        { retailer: 'Amazon', amount: 899.00, url: '' },
        { retailer: 'Best Buy', amount: 999.00, url: '' },
      ],
      lowestPrice: 899.00,
      highestPrice: 999.00,
    },
  ],
  camera: [
    {
      id: '46',
      name: 'Canon EOS R6 Mark II Mirrorless Camera',
      imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 2499.00, url: '' },
        { retailer: 'Best Buy', amount: 2599.00, url: '' },
      ],
      lowestPrice: 2499.00,
      highestPrice: 2599.00,
    },
    {
      id: '47',
      name: 'GoPro HERO12 Black Action Camera',
      imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=GoPro',
      prices: [
        { retailer: 'Amazon', amount: 349.99, url: '' },
        { retailer: 'Best Buy', amount: 399.99, url: '' },
        { retailer: 'Walmart', amount: 379.00, url: '' },
      ],
      lowestPrice: 349.99,
      highestPrice: 399.99,
    },
  ],
  speaker: [
    {
      id: '48',
      name: 'Sonos One SL Wireless Speaker',
      imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Sonos',
      prices: [
        { retailer: 'Amazon', amount: 179.00, url: '' },
        { retailer: 'Best Buy', amount: 199.00, url: '' },
        { retailer: 'Target', amount: 189.99, url: '' },
      ],
      lowestPrice: 179.00,
      highestPrice: 199.00,
    },
    {
      id: '49',
      name: 'JBL Flip 6 Portable Bluetooth Speaker',
      imageUrl: 'https://dummyimage.com/400x400/DC2626/fff&text=JBL',
      prices: [
        { retailer: 'Amazon', amount: 99.95, url: '' },
        { retailer: 'Walmart', amount: 119.99, url: '' },
        { retailer: 'Target', amount: 109.99, url: '' },
      ],
      lowestPrice: 99.95,
      highestPrice: 119.99,
    },
  ],
  tablet: [
    {
      id: '50',
      name: 'iPad Air 11" M2 128GB',
      imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80',
      prices: [
        { retailer: 'Amazon', amount: 599.00, url: '' },
        { retailer: 'Best Buy', amount: 599.00, url: '' },
        { retailer: 'Walmart', amount: 599.00, url: '' },
        { retailer: 'Target', amount: 599.00, url: '' },
      ],
      lowestPrice: 599.00,
      highestPrice: 599.00,
    },
    {
      id: '51',
      name: 'Samsung Galaxy Tab S9 256GB',
      imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy+Tab',
      prices: [
        { retailer: 'Amazon', amount: 799.99, url: '' },
        { retailer: 'Best Buy', amount: 849.99, url: '' },
      ],
      lowestPrice: 799.99,
      highestPrice: 849.99,
    },
  ],
};

// Search products by query
function searchProducts(query: string): ProductResult[] {
  const normalizedQuery = query.toLowerCase();
  const results: ProductResult[] = [];
  const addedIds = new Set<string>();

  // Check category matches
  for (const [category, products] of Object.entries(mockProducts)) {
    if (normalizedQuery.includes(category) || category.includes(normalizedQuery)) {
      for (const product of products) {
        if (!addedIds.has(product.id)) {
          results.push(product);
          addedIds.add(product.id);
        }
      }
    }
  }

  // Check product name matches
  for (const products of Object.values(mockProducts)) {
    for (const product of products) {
      if (!addedIds.has(product.id)) {
        const productNameLower = product.name.toLowerCase();
        const queryWords = normalizedQuery.split(' ');
        const hasMatch = queryWords.some(word =>
          word.length > 2 && productNameLower.includes(word)
        );
        if (hasMatch) {
          results.push(product);
          addedIds.add(product.id);
        }
      }
    }
  }

  // If still no results, return sample products
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

  try {
    const normalizedQuery = query.toLowerCase().trim();
    let allResults: ProductResult[] = [];

    // Check for intent-based searches
    let intentMatched = false;
    for (const [intent, categories] of Object.entries(SEARCH_INTENTS)) {
      if (normalizedQuery.includes(intent)) {
        intentMatched = true;
        console.log(`Intent matched: "${intent}" - searching multiple categories:`, categories);

        // Search each category in parallel
        const categorySearches = categories.map(async (category) => {
          try {
            const baseUrl = process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : 'http://localhost:3000';

            const liveSearchUrl = `${baseUrl}/api/search-live?q=${encodeURIComponent(category)}`;
            const response = await fetch(liveSearchUrl);

            if (response.ok) {
              const data = await response.json();
              return data.results || [];
            }
          } catch (err) {
            console.error(`Category search failed for ${category}:`, err);
          }
          return [];
        });

        const categoryResults = await Promise.all(categorySearches);
        const combinedResults = categoryResults.flat();

        // Transform and combine results
        allResults = combinedResults.map((product: any) => ({
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          prices: [{
            retailer: product.retailer,
            amount: product.price,
            url: product.url
          }],
          lowestPrice: product.price,
          highestPrice: product.price,
        }));

        break; // Stop after first intent match
      }
    }

    // If no intent matched, do regular search
    if (!intentMatched) {
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';

        const liveSearchUrl = `${baseUrl}/api/search-live?q=${encodeURIComponent(query)}`;
        const liveResponse = await fetch(liveSearchUrl);

        if (liveResponse.ok) {
          const liveData = await liveResponse.json();

          // Transform live search results to match the expected format
          allResults = liveData.results.map((product: any) => ({
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            prices: [{
              retailer: product.retailer,
              amount: product.price,
              url: product.url
            }],
            lowestPrice: product.price,
            highestPrice: product.price,
          }));
        }
      } catch (err) {
        console.error('Live search error:', err);
      }
    }

    // If we still don't have enough results, use comprehensive fallback
    if (allResults.length < 20) {
      console.log(`Only ${allResults.length} results from live search, using fallback products`);
      const fallbackProducts = generateFallbackProducts(query, 60);

      // Transform fallback products to match the expected format
      const fallbackResults = fallbackProducts.map((product: any) => ({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        prices: [{
          retailer: product.retailer,
          amount: product.price,
          url: product.url
        }],
        lowestPrice: product.price,
        highestPrice: product.price,
      }));

      // Combine with existing results (if any)
      const existingIds = new Set(allResults.map(r => r.id));
      const uniqueFallback = fallbackResults.filter(r => !existingIds.has(r.id));
      allResults = [...allResults, ...uniqueFallback];
    }

    const response: SearchResponse = {
      query,
      results: allResults,
      totalResults: allResults.length,
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error('Search API error:', error);

    // Ultimate fallback - always return products
    const fallbackProducts = generateFallbackProducts(query, 60);
    const fallbackResults = fallbackProducts.map((product: any) => ({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      prices: [{
        retailer: product.retailer,
        amount: product.price,
        url: product.url
      }],
      lowestPrice: product.price,
      highestPrice: product.price,
    }));

    const response: SearchResponse = {
      query,
      results: fallbackResults,
      totalResults: fallbackResults.length,
    };

    return NextResponse.json(response, { headers: corsHeaders });
  }
}
