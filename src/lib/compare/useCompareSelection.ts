'use client';

// Owns the compare selection for one results surface. Every callback is
// referentially stable so memoized cards do not re-render on unrelated
// selection changes; the only per-card input is the isSelected boolean.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '../types';
import {
  COMPARE_MAX,
  selectionAnnouncement,
  selectionKey,
  toggleSelection,
} from './selection';

export function useCompareSelection(max = COMPARE_MAX) {
  const [selected, setSelected] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Announce each change against the previous selection (live region).
  const prevRef = useRef<Product[]>(selected);
  useEffect(() => {
    const prev = prevRef.current;
    if (prev === selected) return;
    setAnnouncement(selectionAnnouncement(prev, selected, max));
    prevRef.current = selected;
  }, [selected, max]);

  const ready = selected.length >= max;

  const toggle = useCallback(
    (product: Product) => setSelected((prev) => toggleSelection(prev, product, max)),
    [max]
  );
  const remove = useCallback(
    (key: string) => setSelected((prev) => prev.filter((p) => selectionKey(p) !== key)),
    []
  );
  const clear = useCallback(() => {
    setSelected([]);
    setShowModal(false);
  }, []);
  const openModal = useCallback(() => {
    if (ready) setShowModal(true);
  }, [ready]);
  const closeModal = useCallback(() => setShowModal(false), []);

  // Escape closes the comparison first, then clears the selection. Only
  // listening while there is something to close keeps the page's key
  // handling free otherwise; an open InfoTip stops the event before it
  // reaches here.
  useEffect(() => {
    if (!showModal && selected.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showModal) {
        setShowModal(false);
        return;
      }
      setSelected([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal, selected.length]);

  const selectedKeys = useMemo(() => new Set(selected.map(selectionKey)), [selected]);
  const isSelected = useCallback(
    (product: Pick<Product, 'id' | 'url'>) => selectedKeys.has(selectionKey(product)),
    [selectedKeys]
  );

  return {
    selected,
    isSelected,
    toggle,
    remove,
    clear,
    ready,
    showModal,
    openModal,
    closeModal,
    announcement,
  };
}
