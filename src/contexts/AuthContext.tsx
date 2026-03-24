'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  Session,
  getUser,
  saveUser,
  getSession,
  saveSession,
  clearSession,
  updateUserPlan,
  getSearchCount,
  incrementSearchCount as incrementSearchCountStorage,
  hashPassword
} from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  upgradeToPremium: () => void;
  downgradToFree: () => void;
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
    retailers: ['amazon', 'target'],
    chatbot: 'limited',
    priceComparison: false,
    priceHistory: false,
    priceAlerts: false,
    similarProducts: false,
  },
  premium: {
    searchesPerDay: Infinity,
    resultsPerSearch: 100,
    retailers: 'all',
    chatbot: 'full',
    priceComparison: true,
    priceHistory: true,
    priceAlerts: true,
    similarProducts: true,
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchesRemaining, setSearchesRemaining] = useState(0);

  // Load session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      const userData = getUser(session.email);
      if (userData) {
        setUser(userData);
        updateSearchesRemaining(userData.plan);
      }
    }
    setIsLoading(false);
  }, []);

  // Update searches remaining
  const updateSearchesRemaining = (plan: 'free' | 'premium') => {
    if (plan === 'premium') {
      setSearchesRemaining(Infinity);
    } else {
      const { count } = getSearchCount();
      const limit = FEATURE_LIMITS.free.searchesPerDay;
      setSearchesRemaining(Math.max(0, limit - count));
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const userData = getUser(email);

    if (!userData) {
      return { success: false, error: 'Invalid email or password' };
    }

    const passwordHash = hashPassword(password);
    if (userData.passwordHash !== passwordHash) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Create session (expires in 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session: Session = {
      userId: userData.id,
      email: userData.email,
      expiresAt: expiresAt.toISOString(),
    };

    saveSession(session);
    setUser(userData);
    updateSearchesRemaining(userData.plan);

    return { success: true };
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Check if user already exists
    const existingUser = getUser(email);
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Create new user
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 15),
      name,
      email,
      passwordHash: hashPassword(password),
      plan: 'free',
      createdAt: new Date().toISOString(),
    };

    saveUser(newUser);

    // Auto-login
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session: Session = {
      userId: newUser.id,
      email: newUser.email,
      expiresAt: expiresAt.toISOString(),
    };

    saveSession(session);
    setUser(newUser);
    updateSearchesRemaining('free');

    return { success: true };
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setSearchesRemaining(0);
  };

  const upgradeToPremium = () => {
    if (user) {
      updateUserPlan(user.email, 'premium');
      const updatedUser = { ...user, plan: 'premium' as const };
      setUser(updatedUser);
      updateSearchesRemaining('premium');
    }
  };

  const downgradToFree = () => {
    if (user) {
      updateUserPlan(user.email, 'free');
      const updatedUser = { ...user, plan: 'free' as const };
      setUser(updatedUser);
      updateSearchesRemaining('free');
    }
  };

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
      case 'fullChatbot':
        return limits.chatbot === 'full';
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
