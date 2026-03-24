'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function UsageMeter() {
  const { user, searchesRemaining, getFeatureLimit } = useAuth();

  if (!user || user.plan === 'premium') return null;

  const limit = getFeatureLimit('searchesPerDay');
  const used = typeof limit === 'number' ? limit - searchesRemaining : 0;
  const percentage = typeof limit === 'number' ? (used / limit) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Daily Searches</span>
        <span className="text-sm text-gray-600">
          {searchesRemaining} / {limit} remaining
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {searchesRemaining === 0 && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-700 mb-2">
            You've reached your daily search limit.
          </p>
          <Link
            href="/pricing"
            className="text-sm text-red-600 hover:text-red-700 font-medium underline"
          >
            Upgrade to Premium for unlimited searches
          </Link>
        </div>
      )}
    </div>
  );
}
