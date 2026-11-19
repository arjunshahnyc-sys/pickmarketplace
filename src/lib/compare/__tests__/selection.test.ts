import { describe, expect, it } from 'vitest';
import {
  compareButtonState,
  parseStoredSelection,
  selectionAnnouncement,
  selectionKey,
  toggleSelection,
} from '../selection';

const a = { id: 'a', url: 'https://x.test/a', name: 'AirPods Pro' };
const b = { id: 'b', url: 'https://x.test/b', name: 'Sony WF-1000XM5' };
const c = { id: 'c', url: 'https://x.test/c', name: 'Beats Fit Pro' };

describe('selectionKey', () => {
  it('prefers the feed id and falls back to the url', () => {
    expect(selectionKey(a)).toBe('a');
    expect(selectionKey({ url: 'https://x.test/shared' })).toBe('https://x.test/shared');
  });

  it('two listings sharing a fallback url but with different ids stay distinct', () => {
    const p = { id: 'p', url: 'https://google.test/shop?q=x', name: 'P' };
    const q = { id: 'q', url: 'https://google.test/shop?q=x', name: 'Q' };
    expect(toggleSelection(toggleSelection([], p), q)).toEqual([p, q]);
  });
});

describe('toggleSelection', () => {
  it('adds, then removes on a second toggle', () => {
    expect(toggleSelection([], a)).toEqual([a]);
    expect(toggleSelection([a], a)).toEqual([]);
    expect(toggleSelection([a, b], a)).toEqual([b]);
  });

  it('a third pick replaces the oldest, keeping the newest', () => {
    expect(toggleSelection([a, b], c)).toEqual([b, c]);
  });

  it('never returns more than max', () => {
    expect(toggleSelection([a, b], c, 2)).toHaveLength(2);
    expect(toggleSelection([a, b, c], a, 3)).toHaveLength(2);
  });
});

describe('compareButtonState', () => {
  it('keeps one label shape and is ready only at two', () => {
    expect(compareButtonState(0)).toMatchObject({ label: 'Compare (0/2)', ready: false });
    expect(compareButtonState(1)).toMatchObject({ label: 'Compare (1/2)', ready: false });
    expect(compareButtonState(2)).toMatchObject({ label: 'Compare (2/2)', ready: true });
    expect(compareButtonState(1).hint).toContain('two product cards');
    expect(compareButtonState(2).hint).toContain('side-by-side');
  });
});

describe('selectionAnnouncement', () => {
  it('says nothing at rest and confirms a clear', () => {
    expect(selectionAnnouncement([], [])).toBe('');
    expect(selectionAnnouncement([a], [])).toBe('Selection cleared.');
  });

  it('counts picks and asks for one more', () => {
    expect(selectionAnnouncement([], [a])).toBe(
      '1 of 2 selected: AirPods Pro. Tick Compare on one more card.'
    );
    expect(selectionAnnouncement([a], [a, b])).toBe(
      '2 of 2 selected: AirPods Pro and Sony WF-1000XM5. Ready to compare.'
    );
  });

  it('names the replaced product when a third pick swaps the oldest', () => {
    expect(selectionAnnouncement([a, b], [b, c])).toBe(
      'Replaced AirPods Pro with Beats Fit Pro. 2 of 2 selected. Ready to compare.'
    );
  });

  it('shortens long feed names so the sentence stays readable', () => {
    const long = { id: 'l', url: 'https://x.test/l', name: 'Apple AirPods Pro Wireless In-Ear Headsets - White Sweat-Proof Bluetooth | MWP22TY/A' };
    const text = selectionAnnouncement([], [long]);
    expect(text.length).toBeLessThan(110);
    expect(text).toContain('Apple AirPods Pro Wireless In-Ear…');
  });

  it('no produced string contains an em dash', () => {
    for (const s of [
      selectionAnnouncement([], [a]),
      selectionAnnouncement([a, b], [b, c]),
      compareButtonState(0).hint,
      compareButtonState(2).hint,
    ]) {
      expect(s).not.toContain('—');
    }
  });
});

describe('picks kept across searches (stored for the tab)', () => {
  const sony = { id: 'serper:best buy:sony xm6', name: 'Sony WH-1000XM6', price: 459.99, image: '', retailer: 'Best Buy', url: 'https://www.bestbuy.com/x' };
  const bose = { id: 'serper:bose:qc ultra', name: 'Bose QC Ultra', price: 429, image: '', retailer: 'Bose', url: 'https://www.bose.com/y' };

  it('a pick from one search comes back intact for the next', () => {
    const stored = parseStoredSelection(JSON.stringify([sony]));
    expect(stored).toEqual([sony]);
    // ...and the product from the second search joins it.
    expect(toggleSelection(stored, bose).map((p) => p.name)).toEqual(['Sony WH-1000XM6', 'Bose QC Ultra']);
  });

  it('nothing stored, or storage holding junk, is an empty tray', () => {
    expect(parseStoredSelection(null)).toEqual([]);
    expect(parseStoredSelection('')).toEqual([]);
    expect(parseStoredSelection('{not json')).toEqual([]);
    expect(parseStoredSelection('{"a":1}')).toEqual([]);
  });

  it('drops entries that could not be shown or opened, duplicates, and anything past two', () => {
    const raw = JSON.stringify([
      { name: 'No price', retailer: 'X', url: 'https://x.test' },
      { ...sony, url: 'javascript:alert(1)' },
      sony,
      sony,
      bose,
      { ...bose, id: 'third', name: 'Third' },
    ]);
    expect(parseStoredSelection(raw).map((p) => p.name)).toEqual(['Sony WH-1000XM6', 'Bose QC Ultra']);
  });
});
