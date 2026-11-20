'use client';

// Counts a visit once per browser per day as "new" or "returning", so Pick
// can see whether people come back (lib/dailyStats.ts has the full
// account of what is stored: a daily count and nothing else).
//
// The browser asks first whether it may keep a note of its own visit dates
// (GET /api/visit). Where it may not, nothing is read or written on the
// device and the page load is reported as "unmeasured". Where it may, the
// note lives in localStorage, never leaves the device, and only the word
// "new" or "returning" is sent.

import { useEffect } from 'react';
import { visitFromNote } from '@/lib/dailyStats.shared';

const NOTE_KEY = 'pick-visit';
// One report per full page load at most, whatever React does with effects.
let reported = false;

function localDay(): string {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

function send(kind: string) {
  fetch('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind }),
    keepalive: true,
  }).catch(() => {});
}

export default function VisitBeacon() {
  useEffect(() => {
    if (reported) return;
    reported = true;
    fetch('/api/visit')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { measure?: boolean } | null) => {
        if (!data) return;
        if (!data.measure) {
          send('visit_unmeasured');
          return;
        }
        let raw: string | null = null;
        try {
          raw = window.localStorage.getItem(NOTE_KEY);
        } catch {
          // Storage blocked: count the load without the returning question.
          send('visit_unmeasured');
          return;
        }
        const { kind, note } = visitFromNote(raw, localDay());
        if (!kind) return;
        try {
          window.localStorage.setItem(NOTE_KEY, note);
        } catch {
          // Could not keep the note: still a visit, but not one Pick can
          // recognise next time.
        }
        send(kind);
      })
      .catch(() => {});
  }, []);
  return null;
}
