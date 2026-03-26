'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-pick-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="#14b8a6"/>
              <path d="M17 9H7C6.44772 9 6 9.44772 6 10V18C6 18.5523 6.44772 19 7 19H17C17.5523 19 18 18.5523 18 18V10C18 9.44772 17.5523 9 17 9Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M9 9V7C9 6.46957 9.21071 5.96086 9.58579 5.58579C9.96086 5.21071 10.4696 5 11 5H13C13.5304 5 14.0391 5.21071 14.4142 5.58579C14.7893 5.96086 15 6.46957 15 7V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span className="text-2xl font-bold text-pick-teal font-heading tracking-tight">pick</span>
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
