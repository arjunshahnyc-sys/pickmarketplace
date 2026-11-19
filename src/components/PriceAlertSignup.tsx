'use client';

// "Tell me when this drops" on a compare page. Rendered only when the
// deployment can really send email (the page checks alertsConfigured), so
// the box never collects an address Pick cannot write to.

import { useId, useState } from 'react';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

export default function PriceAlertSignup({ slug, name, priceLabel }: { slug: string; name: string; priceLabel: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const fieldId = useId();
  const noteId = useId();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status.kind === 'sending') return;
    setStatus({ kind: 'sending' });
    try {
      const response = await fetch('/api/price-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email }),
      });
      const data: { message?: string; error?: string } = await response.json().catch(() => ({}));
      if (response.ok) {
        setStatus({ kind: 'done', message: data.message ?? 'Check your inbox to confirm.' });
      } else {
        setStatus({ kind: 'error', message: data.error ?? 'That did not work. Try again later.' });
      }
    } catch {
      setStatus({ kind: 'error', message: 'That did not work. Check your connection and try again.' });
    }
  }

  if (status.kind === 'done') {
    return (
      <div className="mt-5 rounded-xl border border-[#2A9D8F]/30 bg-teal-50/60 p-4" role="status">
        <p className="text-sm font-medium text-[#1F7A6F]">Almost done.</p>
        <p className="mt-1 text-sm text-neutral-700">{status.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
      <label htmlFor={fieldId} className="block text-sm font-medium text-neutral-900">
        Get an email if the {name} drops below {priceLabel}
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          id={fieldId}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={noteId}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 outline-none focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/30"
        />
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="rounded-lg bg-[#1F7A6F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#14524B] disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'Sending…' : 'Tell me'}
        </button>
      </div>
      <p id={noteId} className="mt-2 text-xs text-neutral-500">
        One email to confirm, then only when the price falls. Used for nothing else, and every email has a link to stop.
      </p>
      {status.kind === 'error' && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {status.message}
        </p>
      )}
    </form>
  );
}
