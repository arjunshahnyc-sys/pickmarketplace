'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-black">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-[#EF4444]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-[#EF4444]" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold text-black dark:text-white mb-3">
          Oops! Something went wrong
        </h1>
        <p className="text-black/60 dark:text-white/60 mb-2">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-sm text-black/60 dark:text-white/60 mb-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-[#2A9D8F] text-white font-medium rounded-lg hover:bg-[#238B7E] transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 border border-black/10 dark:border-white/10 text-black dark:text-white font-medium rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
