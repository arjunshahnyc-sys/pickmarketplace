'use client';

import Link from 'next/link';

interface LockedFeatureProps {
  featureName: string;
  compact?: boolean;
}

export default function LockedFeature({ featureName, compact = false }: LockedFeatureProps) {
  if (compact) {
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">Premium</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-700">
          <span className="font-medium">{featureName}</span> is a Premium feature
        </p>
      </div>
      <Link
        href="/pricing"
        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
      >
        Upgrade
      </Link>
    </div>
  );
}
