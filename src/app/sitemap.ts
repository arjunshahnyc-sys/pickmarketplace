import { MetadataRoute } from 'next';
import { SEARCH_CATEGORIES } from '@/lib/searchCategories';
import { COMPARISONS } from '@/lib/comparisons';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pickmarketplace.app';
  const currentDate = new Date();

  // Static pages — keep in sync with real routes in src/app/
  const staticPages = [
    '',
    '/how-it-works',
    '/about',
    '/contact',
    '/help',
    '/faq',
    '/supported-retailers',
    '/privacy',
    '/terms',
    '/cookie-policy',
    '/compliance',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Popular categories — server-rendered landing pages at /search/[slug]
  const popularCategories = SEARCH_CATEGORIES.map((category) => ({
    url: `${baseUrl}/search/${category.slug}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  // Cheaper-twin comparison pages at /compare/[slug] (lib/comparisons.ts),
  // regenerated every 3 days at most, plus their index.
  const comparisons = [
    {
      url: `${baseUrl}/compare`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    ...COMPARISONS.map((c) => ({
      url: `${baseUrl}/compare/${c.slug}`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];

  return [...staticPages, ...popularCategories, ...comparisons];
}
