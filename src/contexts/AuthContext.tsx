'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getSearchCount,
  incrementSearchCount as incrementSearchCountStorage,
} from '@/lib/storage';

// Server-backed user (accounts sync across devices via /api/auth/*)
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'premium';
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  upgradeToPremium: () => Promise<{ success: boolean; error?: string }>;
  downgradToFree: () => Promise<{ success: boolean; error?: string }>;
  canUseFeature: (feature: string) => boolean;
  searchesRemaining: number;
  incrementSearchCount: () => void;
  getFeatureLimit: (feature: string) => number | 'unlimited';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Feature limits configuration
const FEATURE_LIMITS = {
  free: {
    searchesPerDay: 5,
    resultsPerSearch: 10,
    priceComparison: false,
    priceHistory: false,
    priceAlerts: false,
    similarProducts: false,
  },
  premium: {
    searchesPerDay: Infinity,
    resultsPerSearch: 100,
    priceComparison: true,
    priceHistory: true,
    priceAlerts: true,
    similarProducts: true,
  },
};

async function authRequest(
  path: string,
  body?: object
): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Something went wrong. Please try again.' };
    }
    return { ok: true, user: data.user };
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchesRemaining, setSearchesRemaining] = useState(0);

  // Update searches remaining (search counting stays per-device for now).
  // Declared before the mount effect that calls it.
  const updateSearchesRemaining = (plan: 'free' | 'premium') => {
    if (plan === 'premium') {
      setSearchesRemaining(Infinity);
    } else {
      const { count } = getSearchCount();
      const limit = FEATURE_LIMITS.free.searchesPerDay;
      setSearchesRemaining(Math.max(0, limit - count));
    }
  };

  // Restore session from the server on mount (httpOnly cookie carries it)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.user) {
          setUser(data.user);
          updateSearchesRemaining(data.user.plan);
        }
      })
      .catch(() => {
        // Treat a failed session lookup as logged out
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authRequest('/api/auth/login', { email, password });
    if (!result.ok || !result.user) {
      return { success: false, error: result.error };
    }
    setUser(result.user);
    updateSearchesRemaining(result.user.plan);
    return { success: true };
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authRequest('/api/auth/signup', { name, email, password });
    if (!result.ok || !result.user) {
      return { success: false, error: result.error };
    }
    setUser(result.user);
    updateSearchesRemaining(result.user.plan);
    return { success: true };
  };

  // Awaited so the httpOnly cookie is actually cleared before navigation can
  // cancel the request; local state clears either way, matching user intent.
  const logout = async () => {
    await authRequest('/api/auth/logout');
    setUser(null);
    setSearchesRemaining(0);
  };

  // Server-first, not optimistic: a rejected plan change (expired session,
  // rate limit) must not leave the UI celebrating a premium upgrade that
  // /api/auth/me will silently revert on the next load.
  const setPlan = async (plan: 'free' | 'premium'): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'You need to be logged in.' };
    const result = await authRequest('/api/auth/plan', { plan });
    if (result.ok && result.user) {
      setUser(result.user);
      updateSearchesRemaining(result.user.plan);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const upgradeToPremium = () => setPlan('premium');

  const downgradToFree = () => setPlan('free');

  const canUseFeature = (feature: string): boolean => {
    if (!user) return false;

    const limits = user.plan === 'premium' ? FEATURE_LIMITS.premium : FEATURE_LIMITS.free;

    switch (feature) {
      case 'priceComparison':
        return limits.priceComparison;
      case 'priceHistory':
        return limits.priceHistory;
      case 'priceAlerts':
        return limits.priceAlerts;
      case 'similarProducts':
        return limits.similarProducts;
      default:
        return true;
    }
  };

  const incrementSearchCount = () => {
    if (user && user.plan === 'free') {
      incrementSearchCountStorage();
      updateSearchesRemaining('free');
    }
  };

  const getFeatureLimit = (feature: string): number | 'unlimited' => {
    if (!user) return 0;

    const limits = user.plan === 'premium' ? FEATURE_LIMITS.premium : FEATURE_LIMITS.free;

    switch (feature) {
      case 'searchesPerDay':
        return limits.searchesPerDay === Infinity ? 'unlimited' : limits.searchesPerDay;
      case 'resultsPerSearch':
        return limits.resultsPerSearch;
      default:
        return 0;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    upgradeToPremium,
    downgradToFree,
    canUseFeature,
    searchesRemaining,
    incrementSearchCount,
    getFeatureLimit,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
