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
    <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-black dark:text-white">Daily Searches</span>
        <span className="text-sm text-black/60 dark:text-white/60">
          {searchesRemaining} / {limit} remaining
        </span>
      </div>
      <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            percentage > 80 ? 'bg-[#EF4444]' : percentage > 50 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {searchesRemaining === 0 && (
        <div className="mt-3 p-3 bg-[#EF4444]/10 rounded-lg border border-[#EF4444]/20">
          <p className="text-sm text-[#EF4444] mb-2">
            You've reached your daily search limit.
          </p>
          <Link
            href="/pricing"
            className="text-sm text-red-600 hover:text-[#EF4444] font-medium underline"
          >
            Upgrade to Premium for unlimited searches
          </Link>
        </div>
      )}
    </div>
  );
}
