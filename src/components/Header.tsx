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
          {/* Logo. When already on the homepage a client-side Link to "/"
              is a no-op that leaves search results on screen — force a full
              navigation so the logo always returns to the clean home view. */}
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Pick home"
            onClick={(e) => {
              // Only intercept plain left-clicks — modified clicks (new
              // tab/window) keep native link behavior.
              const plainClick =
                e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
              if (plainClick && window.location.pathname === '/') {
                e.preventDefault();
                window.location.assign('/');
              }
            }}
          >
            <PickLogo size={28} />
            <span className="text-xl font-medium text-black">pick</span>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
            <SavedListButton />

            {isAuthenticated ? (
              <>
                <span className="text-sm text-neutral-600">{user?.name}</span>
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
              {isAuthenticated ? (
                <>
                  <div className="py-2">
                    <span className="text-sm text-pick-muted">{user?.name}</span>
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
