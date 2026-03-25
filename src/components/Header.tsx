'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-white border-b border-pick-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-pick-teal font-heading tracking-tight">
            Pick
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-pick-muted hover:text-pick-teal transition-colors">
              Pricing
            </Link>

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{user?.name}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                      user?.plan === 'premium'
                        ? 'bg-pick-teal text-white'
                        : 'bg-pick-border text-pick-muted'
                    }`}
                  >
                    {user?.plan === 'premium' ? 'PREMIUM' : 'BASIC'}
                  </span>
                </div>
                <Link
                  href="/account"
                  className="text-pick-muted hover:text-pick-teal transition-colors"
                >
                  Account
                </Link>
                <button
                  onClick={logout}
                  className="text-pick-muted hover:text-pick-teal transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-pick-muted hover:text-pick-teal transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-pick-teal text-white px-5 py-2 rounded-lg hover:opacity-90 transition-all font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
