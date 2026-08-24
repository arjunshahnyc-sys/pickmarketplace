'use client';

// Saved-items list ("cart" without checkout): shoppers collect products from
// search results and see a running total, then buy on the retailer's site.
// Persisted per-device in localStorage.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface SavedItem {
  name: string;
  price: number;
  image?: string;
  retailer: string;
  url: string;
  savedAt: string;
}

interface SavedListContextType {
  items: SavedItem[];
  isSaved: (url: string) => boolean;
  toggleItem: (item: Omit<SavedItem, 'savedAt'>) => void;
  removeItem: (url: string) => void;
  clearAll: () => void;
  total: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const STORAGE_KEY = 'pick_saved_items';

// A try/catch around JSON.parse is not enough: `{}` is valid JSON, and
// setting it as state crashed every .some()/.reduce() over the list. Keep
// only entries that actually look like SavedItems.
function sanitizeStoredItems(raw: string | null): SavedItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is SavedItem =>
        !!i &&
        typeof i === 'object' &&
        typeof (i as SavedItem).name === 'string' &&
        typeof (i as SavedItem).price === 'number' &&
        typeof (i as SavedItem).retailer === 'string' &&
        typeof (i as SavedItem).url === 'string'
    );
  } catch {
    return [];
  }
}

const SavedListContext = createContext<SavedListContextType | undefined>(undefined);

export function SavedListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setItems(sanitizeStoredItems(localStorage.getItem(STORAGE_KEY)));
    } catch {
      // localStorage unavailable (private mode) — start fresh
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Quota exceeded / private mode: the in-memory list still works
      }
    }
  }, [items, hydrated]);

  // Keep tabs in sync: without this, the last tab to write clobbered saves
  // made in any other tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setItems(sanitizeStoredItems(e.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isSaved = (url: string) => items.some((i) => i.url === url);

  const toggleItem = (item: Omit<SavedItem, 'savedAt'>) => {
    setItems((prev) =>
      prev.some((i) => i.url === item.url)
        ? prev.filter((i) => i.url !== item.url)
        : [...prev, { ...item, savedAt: new Date().toISOString() }]
    );
  };

  const removeItem = (url: string) => {
    setItems((prev) => prev.filter((i) => i.url !== url));
  };

  const clearAll = () => setItems([]);

  const total = items.reduce((sum, i) => sum + (i.price || 0), 0);

  // Stable identities: the drawer keys effects off these
  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  return (
    <SavedListContext.Provider
      value={{
        items,
        isSaved,
        toggleItem,
        removeItem,
        clearAll,
        total,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </SavedListContext.Provider>
  );
}

export function useSavedList() {
  const context = useContext(SavedListContext);
  if (context === undefined) {
    throw new Error('useSavedList must be used within a SavedListProvider');
  }
  return context;
}
