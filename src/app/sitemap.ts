import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pickmarketplace.app';
  const currentDate = new Date();

  // Static pages — keep in sync with real routes in src/app/
  const staticPages = [
    '',
    '/pricing',
    '/how-it-works',
    '/about',
    '/contact',
    '/help',
    '/faq',
    '/supported-retailers',
    '/privacy',
    '/terms',
    '/cookie-policy',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Popular search categories — search lives at /?q=, not /search
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
    url: `${baseUrl}/?q=${category}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...popularCategories];
}
