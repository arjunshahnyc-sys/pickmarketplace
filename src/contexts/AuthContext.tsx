'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Server-backed sign-in identity via /api/auth/*. Only name and email live on
// the server; the saved list and delivery destination stay in localStorage on
// each device and are not tied to the account.
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  // Restore session from the server on mount (httpOnly cookie carries it)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.user) {
          setUser(data.user);
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
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authRequest('/api/auth/login', { email, password });
    if (!result.ok || !result.user) {
      return { success: false, error: result.error };
    }
    setUser(result.user);
    return { success: true };
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authRequest('/api/auth/signup', { name, email, password });
    if (!result.ok || !result.user) {
      return { success: false, error: result.error };
    }
    setUser(result.user);
    return { success: true };
  };

  // Awaited so the httpOnly cookie is actually cleared before navigation can
  // cancel the request; local state clears either way, matching user intent.
  const logout = async () => {
    await authRequest('/api/auth/logout');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
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
