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
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--background)]">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-[var(--error)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-[var(--error)]" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-3">
          Oops! Something went wrong
        </h1>
        <p className="text-[var(--muted)] mb-2">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-sm text-[var(--muted)] mb-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 border border-[var(--border)] text-[var(--foreground)] font-medium rounded-lg hover:bg-[var(--subtle-warm)] transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
