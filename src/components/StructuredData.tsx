import { formatPrice } from '@/lib/formatters';

interface OrganizationSchemaProps {
  name: string;
  url: string;
  logo: string;
  description: string;
}

export function OrganizationSchema({ name, url, logo, description }: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    description,
    sameAs: [
      'https://twitter.com/pickmarketplace',
      'https://facebook.com/pickmarketplace',
      'https://instagram.com/pickmarketplace',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@pickmarketplace.com',
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
  url: string;
  description: string;
}

export function WebsiteSchema({ name, url, description }: WebsiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
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
