// Retailer wordmark logos, self-hosted under /public/logos (the old Clearbit
// logo API was sunset and failed intermittently on first load)

import { collapse } from '@/lib/retailerTrust';

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

// Product-card badge logos: one asset per VERIFIED retailer brand (see
// retailerTrust.ts), keyed by the same collapse the trust check uses so the
// two can never disagree about identity. A test
// (src/lib/__tests__/retailerLogos.test.ts) keeps this map in sync with
// VERIFIED_RETAILERS and with the files under public/logos. Unverified
// merchants intentionally have no entry — their cards keep the text badge.
export interface BadgeLogo {
  name: string;
  src: string;
}

const badgeLogos: Record<string, BadgeLogo> = {
  // US majors
  amazon: { name: 'Amazon', src: '/logos/amazon.svg' },
  walmart: { name: 'Walmart', src: '/logos/walmart.svg' },
  target: { name: 'Target', src: '/logos/target.svg' },
  bestbuy: { name: 'Best Buy', src: '/logos/bestbuy.svg' },
  costco: { name: 'Costco', src: '/logos/costco.svg' },
  ebay: { name: 'eBay', src: '/logos/ebay.svg' },
  homedepot: { name: 'Home Depot', src: '/logos/homedepot.svg' },
  lowes: { name: "Lowe's", src: '/logos/lowes.svg' },
  macys: { name: "Macy's", src: '/logos/macys.svg' },
  nordstrom: { name: 'Nordstrom', src: '/logos/nordstrom.svg' },
  wayfair: { name: 'Wayfair', src: '/logos/wayfair.svg' },
  kroger: { name: 'Kroger', src: '/logos/kroger.svg' },
  kohls: { name: "Kohl's", src: '/logos/kohls.svg' },
  samsclub: { name: "Sam's Club", src: '/logos/samsclub.svg' },
  bhphoto: { name: 'B&H Photo Video', src: '/logos/bhphoto.svg' },
  adorama: { name: 'Adorama', src: '/logos/adorama.svg' },
  newegg: { name: 'Newegg', src: '/logos/newegg.svg' },
  staples: { name: 'Staples', src: '/logos/staples.svg' },
  officedepot: { name: 'Office Depot', src: '/logos/officedepot.svg' },
  rei: { name: 'REI', src: '/logos/rei.svg' },
  chewy: { name: 'Chewy', src: '/logos/chewy.svg' },
  gamestop: { name: 'GameStop', src: '/logos/gamestop.svg' },
  microcenter: { name: 'Micro Center', src: '/logos/microcenter.svg' },
  dickssportinggoods: { name: "Dick's Sporting Goods", src: '/logos/dickssportinggoods.svg' },
  apple: { name: 'Apple', src: '/logos/apple.svg' },
  nike: { name: 'Nike', src: '/logos/nike.svg' },
  // US chains from the merchant harvest
  academysportsoutdoors: { name: 'Academy Sports + Outdoors', src: '/logos/academysportsoutdoors.svg' },
  golfgalaxy: { name: 'Golf Galaxy', src: '/logos/golfgalaxy.svg' },
  stanley1913: { name: 'Stanley 1913', src: '/logos/stanley1913.svg' },
  zumiez: { name: 'Zumiez', src: '/logos/zumiez.svg' },
  petco: { name: 'Petco', src: '/logos/petco.svg' },
  petsmart: { name: 'PetSmart', src: '/logos/petsmart.svg' },
  ulta: { name: 'Ulta Beauty', src: '/logos/ulta.svg' },
  sephora: { name: 'Sephora', src: '/logos/sephora.svg' },
  bathbodyworks: { name: 'Bath & Body Works', src: '/logos/bathbodyworks.svg' },
  footlocker: { name: 'Foot Locker', src: '/logos/footlocker.svg' },
  finishline: { name: 'Finish Line', src: '/logos/finishline.svg' },
  jcpenney: { name: 'JCPenney', src: '/logos/jcpenney.svg' },
  dillards: { name: "Dillard's", src: '/logos/dillards.svg' },
  belk: { name: 'Belk', src: '/logos/belk.svg' },
  crateandbarrel: { name: 'Crate & Barrel', src: '/logos/crateandbarrel.svg' },
  williamssonoma: { name: 'Williams Sonoma', src: '/logos/williamssonoma.svg' },
  potterybarn: { name: 'Pottery Barn', src: '/logos/potterybarn.svg' },
  // GB majors
  currys: { name: 'Currys', src: '/logos/currys.svg' },
  argos: { name: 'Argos', src: '/logos/argos.svg' },
  johnlewis: { name: 'John Lewis', src: '/logos/johnlewis.svg' },
  ao: { name: 'AO', src: '/logos/ao.svg' },
  boots: { name: 'Boots', src: '/logos/boots.svg' },
  screwfix: { name: 'Screwfix', src: '/logos/screwfix.svg' },
  very: { name: 'Very', src: '/logos/very.svg' },
  // DE/FR/NL majors
  otto: { name: 'Otto', src: '/logos/otto.svg' },
  mediamarkt: { name: 'MediaMarkt', src: '/logos/mediamarkt.svg' },
  saturn: { name: 'Saturn', src: '/logos/saturn.svg' },
  zalando: { name: 'Zalando', src: '/logos/zalando.svg' },
  fnac: { name: 'Fnac', src: '/logos/fnac.svg' },
  darty: { name: 'Darty', src: '/logos/darty.svg' },
  boulanger: { name: 'Boulanger', src: '/logos/boulanger.svg' },
  coolblue: { name: 'Coolblue', src: '/logos/coolblue.svg' },
  // CA majors
  canadiantire: { name: 'Canadian Tire', src: '/logos/canadiantire.svg' },
  londondrugs: { name: 'London Drugs', src: '/logos/londondrugs.svg' },
  // AU majors
  jbhifi: { name: 'JB Hi-Fi', src: '/logos/jbhifi.svg' },
  harveynorman: { name: 'Harvey Norman', src: '/logos/harveynorman.svg' },
  thegoodguys: { name: 'The Good Guys', src: '/logos/thegoodguys.svg' },
  bigw: { name: 'Big W', src: '/logos/bigw.svg' },
  officeworks: { name: 'Officeworks', src: '/logos/officeworks.svg' },
  myer: { name: 'Myer', src: '/logos/myer.svg' },
  davidjones: { name: 'David Jones', src: '/logos/davidjones.svg' },
  // JP majors
  rakuten: { name: 'Rakuten', src: '/logos/rakuten.svg' },
  yodobashi: { name: 'Yodobashi Camera', src: '/logos/yodobashi.svg' },
  biccamera: { name: 'Bic Camera', src: '/logos/biccamera.svg' },
};

// Collapsed names that share another brand's asset: regional Amazon
// domains, binational banners, and legal-name collapses Serper reports.
const badgeAliases: Record<string, string> = {
  amazoncouk: 'amazon',
  amazonde: 'amazon',
  amazonfr: 'amazon',
  amazonca: 'amazon',
  amazonau: 'amazon',
  amazoncomau: 'amazon',
  amazoncojp: 'amazon',
  walmartca: 'walmart',
  bestbuycanada: 'bestbuy',
  costcowholesaleuk: 'costco',
  bhphotovideo: 'bhphoto',
  bhphotovideoaudio: 'bhphoto',
  officedepotofficemax: 'officedepot',
  ultabeauty: 'ulta',
  bathandbodyworks: 'bathbodyworks',
  curryspcworld: 'currys',
  coolbluede: 'coolblue',
};

export function getRetailerLogo(name: string): BadgeLogo | undefined {
  const key = collapse(name);
  return badgeLogos[key] ?? badgeLogos[badgeAliases[key] ?? ''];
}

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
