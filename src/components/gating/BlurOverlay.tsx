'use client';

import Link from 'next/link';

interface BlurOverlayProps {
  message?: string;
}

export default function BlurOverlay({ message = 'Upgrade to Premium to see more results' }: BlurOverlayProps) {
  return (
    <div className="absolute inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center z-10">
      <div className="bg-white dark:bg-black p-6 rounded-lg shadow-xl text-center max-w-sm border border-black/10 dark:border-white/10">
        <div className="w-12 h-12 bg-[#2A9D8F] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Premium Feature</h3>
        <p className="text-black/60 dark:text-white/60 mb-4">{message}</p>
        <Link
          href="/pricing"
          className="inline-block bg-[#2A9D8F] text-white px-6 py-2 rounded-lg hover:bg-[#238B7E] transition-colors"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}
