'use client';

import { X, ExternalLink, Trophy } from 'lucide-react';
import { Product } from '@/lib/types';

interface CompareModalProps {
  products: [Product, Product];
  onClose: () => void;
}

export default function CompareModal({ products, onClose }: CompareModalProps) {
  const [product1, product2] = products;

  // Calculate savings
  const getSavings = (product: Product) => {
    if (!product.originalPrice || product.originalPrice <= product.price) return null;
    const amount = product.originalPrice - product.price;
    const percentage = Math.round((amount / product.originalPrice) * 100);
    return { amount, percentage };
  };

  const savings1 = getSavings(product1);
  const savings2 = getSavings(product2);

  // Determine which is the better deal
  const getBetterDeal = () => {
    // If both have no discount, cheapest wins
    if (!savings1 && !savings2) {
      return product1.price < product2.price ? 'product1' : 'product2';
    }
    // If only one has a discount, it wins
    if (savings1 && !savings2) return 'product1';
    if (savings2 && !savings1) return 'product2';
    // If both have discounts, compare final prices
    return product1.price < product2.price ? 'product1' : 'product2';
  };

  const betterDeal = getBetterDeal();

  const ComparisonRow = ({
    label,
    value1,
    value2,
    highlight1,
    highlight2,
  }: {
    label: string;
    value1: React.ReactNode;
    value2: React.ReactNode;
    highlight1?: boolean;
    highlight2?: boolean;
  }) => (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-black/5">
      <div className="text-sm font-medium text-black/60">{label}</div>
      <div
        className={`text-sm font-medium ${
          highlight1 ? 'text-[#2A9D8F]' : 'text-black'
        }`}
      >
        {value1}
      </div>
      <div
        className={`text-sm font-medium ${
          highlight2 ? 'text-[#2A9D8F]' : 'text-black'
        }`}
      >
        {value2}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-black/10 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-black">Compare Products</h2>
          <button
            onClick={onClose}
            className="p-2 text-black/60 hover:text-black hover:bg-black/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Product Images and Names */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Product 1 */}
            <div className="relative">
              {betterDeal === 'product1' && (
                <div className="absolute -top-2 -right-2 z-10 bg-[#2A9D8F] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                  <Trophy size={12} />
                  Best Deal
                </div>
              )}
              <div className="aspect-square bg-black/5 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                <img
                  src={product1.image}
                  alt={product1.name}
                  className="w-full h-full object-contain p-6"
                />
              </div>
              <h3 className="text-base font-semibold text-black line-clamp-2 mb-2">
                {product1.name}
              </h3>
            </div>

            {/* Product 2 */}
            <div className="relative">
              {betterDeal === 'product2' && (
                <div className="absolute -top-2 -right-2 z-10 bg-[#2A9D8F] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                  <Trophy size={12} />
                  Best Deal
                </div>
              )}
              <div className="aspect-square bg-black/5 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                <img
                  src={product2.image}
                  alt={product2.name}
                  className="w-full h-full object-contain p-6"
                />
              </div>
              <h3 className="text-base font-semibold text-black line-clamp-2 mb-2">
                {product2.name}
              </h3>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white border border-black/10 rounded-lg p-4">
            <ComparisonRow
              label="Current Price"
              value1={`$${product1.price.toFixed(2)}`}
              value2={`$${product2.price.toFixed(2)}`}
              highlight1={betterDeal === 'product1'}
              highlight2={betterDeal === 'product2'}
            />

            <ComparisonRow
              label="Original Price"
              value1={
                product1.originalPrice
                  ? `$${product1.originalPrice.toFixed(2)}`
                  : 'N/A'
              }
              value2={
                product2.originalPrice
                  ? `$${product2.originalPrice.toFixed(2)}`
                  : 'N/A'
              }
            />

            <ComparisonRow
              label="Savings"
              value1={
                savings1 ? (
                  <span className="text-[#2A9D8F]">
                    ${savings1.amount.toFixed(2)} ({savings1.percentage}% off)
                  </span>
                ) : (
                  'No discount'
                )
              }
              value2={
                savings2 ? (
                  <span className="text-[#2A9D8F]">
                    ${savings2.amount.toFixed(2)} ({savings2.percentage}% off)
                  </span>
                ) : (
                  'No discount'
                )
              }
            />

            <ComparisonRow
              label="Retailer"
              value1={product1.retailer}
              value2={product2.retailer}
            />

            <ComparisonRow
              label="Rating"
              value1={
                product1.rating ? (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span>{product1.rating.toFixed(1)}</span>
                  </div>
                ) : (
                  'N/A'
                )
              }
              value2={
                product2.rating ? (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span>{product2.rating.toFixed(1)}</span>
                  </div>
                ) : (
                  'N/A'
                )
              }
            />

            <ComparisonRow
              label="Reviews"
              value1={
                product1.reviewCount
                  ? product1.reviewCount.toLocaleString()
                  : 'N/A'
              }
              value2={
                product2.reviewCount
                  ? product2.reviewCount.toLocaleString()
                  : 'N/A'
              }
            />
          </div>

          {/* View Deal Buttons */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <a
              href={product1.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#238B7E] transition-colors font-medium"
            >
              View on {product1.retailer}
              <ExternalLink size={16} />
            </a>
            <a
              href={product2.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#238B7E] transition-colors font-medium"
            >
              View on {product2.retailer}
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
