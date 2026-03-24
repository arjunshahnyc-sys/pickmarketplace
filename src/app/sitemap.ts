import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pickmarketplace.com';
  const currentDate = new Date();

  // Static pages
  const staticPages = [
    '',
    '/pricing',
    '/how-it-works',
    '/about',
    '/contact',
    '/help',
    '/faq',
    '/blog',
    '/privacy',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Popular search categories (could be dynamic from database)
  const popularCategories = [
    'headphones',
    'laptops',
    'shoes',
    'skincare',
    'watches',
    'backpacks',
    'coffee-makers',
    'gaming-mice',
  ].map((category) => ({
    url: `${baseUrl}/search?q=${category}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...popularCategories];
}
