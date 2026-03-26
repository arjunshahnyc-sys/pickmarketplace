'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-pick-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <ShoppingBag size={24} strokeWidth={1.5} className="text-[#2A9D8F]" />
            <span className="text-xl font-medium text-black">pick</span>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-pick-muted hover:text-pick-teal transition-colors">
              Pricing
            </Link>

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-pick-muted">{user?.name}</span>
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-pick-muted hover:text-pick-teal transition-colors p-2"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-pick-border">
            <nav aria-label="Mobile navigation" className="flex flex-col space-y-3">
              <Link
                href="/pricing"
                className="text-pick-muted hover:text-pick-teal transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>

              {isAuthenticated ? (
                <>
                  <div className="py-2 flex items-center gap-2">
                    <span className="text-sm text-pick-muted">{user?.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
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
                    className="text-pick-muted hover:text-pick-teal transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-pick-muted hover:text-pick-teal transition-colors py-2 text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-pick-muted hover:text-pick-teal transition-colors py-2 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-pick-teal text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all font-medium text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
