'use client';

// Saved-items list ("cart" without checkout): shoppers collect products from
// search results and see a running total, then buy on the retailer's site.
// Persisted per-device in localStorage.

import React, { createContext, useContext, useEffect, useState } from 'react';

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

const SavedListContext = createContext<SavedListContextType | undefined>(undefined);

export function SavedListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // Corrupt data — start fresh
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

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
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
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
