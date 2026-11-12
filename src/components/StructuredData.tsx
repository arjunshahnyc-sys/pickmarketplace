import { formatPrice } from '@/lib/formatters';

interface OrganizationSchemaProps {
  name: string;
  /** The short form people also use ("Pick" for "Pick Marketplace"). */
  alternateName?: string;
  url: string;
  logo: string;
  description: string;
}

export function OrganizationSchema({ name, alternateName, url, logo, description }: OrganizationSchemaProps) {
  // No sameAs links until real social profiles exist — pointing Google at
  // unregistered handles hurts rather than helps entity recognition.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    ...(alternateName ? { alternateName } : {}),
    url,
    logo,
    description,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@pickmarketplace.app',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ProductSchemaProps {
  name: string;
  description: string;
  image: string;
  price: number;
  currency: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  availability: 'InStock' | 'OutOfStock';
  url: string;
}

export function ProductSchema({
  name,
  description,
  image,
  price,
  currency,
  brand,
  rating,
  reviewCount,
  availability,
  url,
}: ProductSchemaProps) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    url,
    offers: {
      '@type': 'Offer',
      price: formatPrice(price),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url,
    },
  };

  if (brand) {
    schema.brand = {
      '@type': 'Brand',
      name: brand,
    };
  }

  if (rating && reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WebsiteSchemaProps {
  name: string;
  /** The short form of the site name, offered to Google as an alternate. */
  alternateName?: string;
  url: string;
  description: string;
}

export function WebsiteSchema({ name, alternateName, url, description }: WebsiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    ...(alternateName ? { alternateName } : {}),
    url,
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        // Search lives on the homepage as /?q=, not on a /search route
        urlTemplate: `${url}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
