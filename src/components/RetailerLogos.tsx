// Retailer wordmark logos, self-hosted under /public/logos (the old Clearbit
// logo API was sunset and failed intermittently on first load)

export interface RetailerLogo {
  name: string;
  domain: string;
  color: string;
  src: string;
}

export const retailerLogos: RetailerLogo[] = [
  { name: 'Amazon', domain: 'amazon.com', color: '#FF9900', src: '/logos/amazon.svg' },
  { name: 'Target', domain: 'target.com', color: '#CC0000', src: '/logos/target.svg' },
  { name: 'Best Buy', domain: 'bestbuy.com', color: '#0046BE', src: '/logos/bestbuy.svg' },
  { name: 'Walmart', domain: 'walmart.com', color: '#0071DC', src: '/logos/walmart.svg' },
  { name: "Macy's", domain: 'macys.com', color: '#E21A2C', src: '/logos/macys.svg' },
  { name: 'Nordstrom', domain: 'nordstrom.com', color: '#000000', src: '/logos/nordstrom.svg' },
  { name: 'Nike', domain: 'nike.com', color: '#111111', src: '/logos/nike.svg' },
  { name: 'Costco', domain: 'costco.com', color: '#E31837', src: '/logos/costco.svg' },
];

export const extendedRetailerLogos: RetailerLogo[] = [
  ...retailerLogos,
  { name: 'eBay', domain: 'ebay.com', color: '#E53238', src: '/logos/ebay.svg' },
  { name: 'Wayfair', domain: 'wayfair.com', color: '#7B189F', src: '/logos/wayfair.svg' },
  { name: "Kohl's", domain: 'kohls.com', color: '#0057A0', src: '/logos/kohls.svg' },
  { name: 'Home Depot', domain: 'homedepot.com', color: '#F96302', src: '/logos/homedepot.svg' },
];

// Map retailer names to domains for product cards
export const retailerDomains: Record<string, string> = {
  Amazon: 'amazon.com',
  Target: 'target.com',
  'Best Buy': 'bestbuy.com',
  Walmart: 'walmart.com',
  "Macy's": 'macys.com',
  Nordstrom: 'nordstrom.com',
  Nike: 'nike.com',
  Costco: 'costco.com',
  eBay: 'ebay.com',
  Wayfair: 'wayfair.com',
  "Kohl's": 'kohls.com',
  'Home Depot': 'homedepot.com',
  Adidas: 'adidas.com',
  Sephora: 'sephora.com',
  Apple: 'apple.com',
  "Lowe's": 'lowes.com',
  Kroger: 'kroger.com',
};

interface RetailerLogoImageProps {
  domain: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RetailerLogoImage({ domain, name, size = 'md', className = '' }: RetailerLogoImageProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${name} logo`}
      className={`${sizeClasses[size]} object-contain ${className}`}
      loading="lazy"
      onError={(e) => {
        // Fallback to Google Favicon if Clearbit fails
        const img = e.target as HTMLImageElement;
        if (!img.src.includes('google.com')) {
          img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } else {
          // If both fail, hide gracefully
          img.style.display = 'none';
        }
      }}
    />
  );
}

// Legacy exports for backward compatibility (now just return the logo component)
export const AmazonLogo = () => <RetailerLogoImage domain="amazon.com" name="Amazon" />;
export const TargetLogo = () => <RetailerLogoImage domain="target.com" name="Target" />;
export const BestBuyLogo = () => <RetailerLogoImage domain="bestbuy.com" name="Best Buy" />;
export const WalmartLogo = () => <RetailerLogoImage domain="walmart.com" name="Walmart" />;
export const MacysLogo = () => <RetailerLogoImage domain="macys.com" name="Macy's" />;
export const NordstromLogo = () => <RetailerLogoImage domain="nordstrom.com" name="Nordstrom" />;
export const NikeLogo = () => <RetailerLogoImage domain="nike.com" name="Nike" />;
export const CostcoLogo = () => <RetailerLogoImage domain="costco.com" name="Costco" />;
