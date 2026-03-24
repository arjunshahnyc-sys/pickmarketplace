'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search, User, LogOut, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onSearch?: (query: string) => void;
  showSearch?: boolean;
  sticky?: boolean;
  onInstallClick?: () => void;
}

export default function Header({ onSearch, showSearch = false, sticky = true, onInstallClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
      setMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`bg-white/80 backdrop-blur-sm border-b border-[var(--border)] z-50 ${sticky ? 'sticky top-0' : ''}`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Pick Marketplace Home">
            <ShoppingBag size={22} strokeWidth={1.5} className="text-[var(--accent)] group-hover:scale-110 transition-transform" aria-hidden="true" />
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              pick
            </span>
          </Link>

          {/* Desktop Search Bar */}
          {showSearch && (
            <div className="hidden md:block flex-1 max-w-xl mx-8">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products..."
                  className="w-full px-4 py-2.5 pl-10 border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                  aria-label="Search for products"
                />
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]"
                  aria-hidden="true"
                />
                {searchQuery && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--accent)] text-white text-sm font-medium rounded hover:bg-[var(--accent-hover)] transition-colors"
                    aria-label="Search"
                  >
                    Search
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4" aria-label="Main navigation">
            <ThemeToggle />
            <Link
              href="#how-it-works"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
            >
              How it works
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
            >
              Pricing
            </Link>
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--muted)]">{user?.name}</span>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium ${
                      user?.plan === 'premium'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-[var(--background)] text-[var(--muted)]'
                    }`}
                    style={{ borderRadius: '4px' }}
                    aria-label={`Current plan: ${user?.plan === 'premium' ? 'Premium' : 'Basic'}`}
                  >
                    {user?.plan === 'premium' ? 'Premium' : 'Basic'}
                  </span>
                </div>
                {user?.plan === 'free' && (
                  <Link
                    href="/pricing"
                    className="text-sm px-4 py-2 border-2 border-[#2A9D8F] text-[#2A9D8F] rounded-lg font-medium hover:bg-[#2A9D8F] hover:text-white transition-all"
                  >
                    ⭐ Upgrade
                  </Link>
                )}
                <Link
                  href="/account"
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors link-underline"
                >
                  Account
                </Link>
                <button
                  onClick={logout}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors btn"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#2A9D8F] dark:hover:text-[#2A9D8F] font-medium transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="text-sm px-5 py-2 bg-[#2A9D8F] text-white rounded-lg font-medium hover:bg-[#238B7E] transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                >
                  Sign Up
                </Link>
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden py-4 border-t border-[var(--border)]"
            role="navigation"
            aria-label="Mobile navigation"
          >
            {/* Mobile Search */}
            {showSearch && (
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for products..."
                    className="w-full px-4 py-2.5 pl-10 border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    aria-label="Search for products"
                  />
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]"
                    aria-hidden="true"
                  />
                  {searchQuery && (
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--accent)] text-white text-sm font-medium rounded hover:bg-[var(--accent-hover)]"
                      aria-label="Search"
                    >
                      Go
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Mobile Navigation Links */}
            <nav className="space-y-3">
              <div className="flex items-center gap-2 py-2">
                <span className="text-sm text-[var(--muted)]">Theme:</span>
                <ThemeToggle />
              </div>
              <Link
                href="#how-it-works"
                className="block py-2 text-base font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </Link>
              <Link
                href="/pricing"
                className="block py-2 text-base font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 py-2">
                    <User className="w-5 h-5 text-[var(--muted)]" aria-hidden="true" />
                    <span className="text-base font-medium">{user?.name}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium ${
                        user?.plan === 'premium'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-[var(--background)] text-[var(--muted)]'
                      }`}
                      style={{ borderRadius: '4px' }}
                    >
                      {user?.plan === 'premium' ? 'Premium' : 'Basic'}
                    </span>
                  </div>
                  <Link
                    href="/account"
                    className="block py-2 text-base font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 py-2 text-base font-medium text-[var(--error)] hover:text-[var(--error)]/80 transition-colors w-full text-left"
                  >
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block py-2 text-base font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="block py-2 px-4 bg-[var(--accent)] text-white text-base font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up free
                  </Link>
                </>
              )}
              {onInstallClick && (
                <button
                  onClick={() => {
                    onInstallClick();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full py-2 px-4 bg-[var(--foreground)] text-white text-base font-medium rounded-lg hover:bg-[var(--foreground)]/90 transition-colors text-center"
                >
                  Get extension
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
