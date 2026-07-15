'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedList } from '@/contexts/SavedListContext';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { PickLogo } from './PickLogo';

function SavedListButton() {
  const { items, total, openDrawer } = useSavedList();
  return (
    <button
      onClick={openDrawer}
      className="relative flex items-center gap-2 text-pick-muted hover:text-pick-teal transition-colors p-2"
      aria-label={`Saved items (${items.length})`}
    >
      <span className="relative">
        <ShoppingBag className="w-5 h-5" />
        {items.length > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-pick-teal text-white text-[10px] font-bold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </span>
      {items.length > 0 && (
        <span className="hidden lg:inline text-sm font-semibold text-black">
          ${total.toFixed(2)}
        </span>
      )}
    </button>
  );
}

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <PickLogo size={28} />
            <span className="text-xl font-medium text-black">pick</span>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
            <SavedListButton />
            <Link href="/pricing" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              Pricing
            </Link>

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600">{user?.name}</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-neutral-500">
                    {user?.plan === 'premium' ? 'Premium' : 'Basic'}
                  </span>
                </div>
                <Link
                  href="/account"
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Account
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full h-10 px-5 bg-[#2A9D8F] hover:bg-[#21867A] text-white text-sm font-semibold inline-flex items-center transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile: saved list + menu button */}
          <div className="md:hidden flex items-center gap-1">
          <SavedListButton />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-pick-muted hover:text-pick-teal transition-colors p-2"
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
