'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag } from 'lucide-react';

export default function Header({ onInstallClick }: { onInstallClick?: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="border-b border-[var(--border)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <ShoppingBag size={22} strokeWidth={1.5} className="text-[var(--accent)]" />
          <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            pick
          </span>
        </a>
        <nav className="flex items-center gap-8">
          <a
            href="#how-it-works"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
          >
            How it works
          </a>

          {isAuthenticated ? (
            <>
              <a
                href="/pricing"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
              >
                Pricing
              </a>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--muted)]">{user?.name}</span>
                <span
                  className={`px-2.5 py-1 text-xs font-medium ${
                    user?.plan === 'premium'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-[var(--background)] text-[var(--muted)]'
                  }`}
                  style={{ borderRadius: '4px' }}
                >
                  {user?.plan === 'premium' ? 'Premium' : 'Basic'}
                </span>
              </div>
              <a
                href="/account"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
              >
                Account
              </a>
              <button
                onClick={logout}
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors btn"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <a
                href="/pricing"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
              >
                Pricing
              </a>
              <a
                href="/login"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
              >
                Login
              </a>
              <a
                href="/signup"
                className="btn-secondary text-sm px-4 py-2 border border-[var(--border)] hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-white"
                style={{ borderRadius: '6px' }}
              >
                Sign up
              </a>
            </>
          )}

          {onInstallClick && (
            <button
              onClick={onInstallClick}
              className="btn-secondary text-sm px-4 py-2 border border-[var(--border)] hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-white cursor-pointer"
              style={{ borderRadius: '6px' }}
            >
              Get extension
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
