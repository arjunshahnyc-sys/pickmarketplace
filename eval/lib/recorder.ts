// Record and replay the HTTP responses Pick's search pipeline receives.
//
// The harness swaps globalThis.fetch for a wrapper while one query runs.
// Recording passes every request through to the real source and keeps a
// copy of the response; replaying answers the same requests from that copy
// without touching the network. Pick's own code (src/lib/scrapers.ts and
// everything after it) runs unmodified in both modes, so a replayed run is
// the pipeline's real behavior on the recorded data, free and repeatable.
// That is also what makes before/after comparisons fair: a matching or
// ranking change can be replayed against the exact listings the baseline
// saw, with no price drift in between.
//
// Nothing secret is written: request headers (where the Serper key lives)
// are never recorded, and key-like query parameters (Target's key) are
// replaced before a URL is stored.

export type ExchangeSource = 'serper' | 'target' | 'other';

export interface Exchange {
  source: ExchangeSource;
  /** Request identity used to find the response again on replay. */
  key: string;
  /** Request URL with secrets removed. */
  url: string;
  status?: number;
  /** Parsed JSON body (or {nonJsonBody} for anything else). */
  body?: unknown;
  /** Network failure message, when the request never produced a response. */
  error?: string;
  /** How long the request took. */
  ms: number;
}

/** The scrapers give up on a source after 8 seconds (withTimeout in scrapers.ts). */
const SCRAPER_TIMEOUT_MS = 8000;

/** Marks a request still in flight; saved as a timeout if it never settles. */
const PENDING = 'timeout';

const SECRET_PARAMS = /([?&](?:key|api_key|apikey|token|access_token)=)[^&]*/gi;

export function redactUrl(url: string): string {
  return url.replace(SECRET_PARAMS, '$1REDACTED');
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function describe(url: string, init?: RequestInit): { source: ExchangeSource; key: string } {
  if (url.startsWith('https://google.serper.dev/')) {
    let q = '';
    let gl = '';
    if (typeof init?.body === 'string') {
      try {
        const parsed = JSON.parse(init.body) as { q?: unknown; gl?: unknown };
        q = typeof parsed.q === 'string' ? parsed.q : '';
        gl = typeof parsed.gl === 'string' ? parsed.gl : '';
      } catch {
        // Not JSON: fall through with an empty identity.
      }
    }
    return { source: 'serper', key: `serper|${new URL(url).pathname}|${gl}|${q}` };
  }
  if (url.startsWith('https://redsky.target.com/')) {
    const keyword = new URL(url).searchParams.get('keyword') ?? '';
    return { source: 'target', key: `target|${keyword}` };
  }
  return { source: 'other', key: `other|${init?.method ?? 'GET'}|${redactUrl(url)}` };
}

/**
 * Route every fetch through the recorder until the returned function is
 * called. In 'record' mode responses are appended to `exchanges`; in
 * 'replay' mode they are served from it and a request that was never
 * recorded fails loudly rather than reaching the network.
 */
export function installFetchRecorder(mode: 'record' | 'replay', exchanges: Exchange[]): () => void {
  const realFetch = globalThis.fetch;

  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    const { source, key } = describe(url, init);

    if (mode === 'replay') {
      const recorded = exchanges.find((e) => e.key === key);
      if (!recorded) throw new Error(`[eval] no recorded response for ${key}`);
      // A recorded timeout or network failure replays as the same failure.
      if (recorded.error) throw new Error(recorded.error);
      if (recorded.ms >= SCRAPER_TIMEOUT_MS) throw new Error('timeout');
      return new Response(JSON.stringify(recorded.body ?? null), {
        status: recorded.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    // The entry is written before the request settles: if the scraper's
    // timeout abandons it and the snapshot is saved first, it stays a
    // timeout on replay instead of going missing.
    const started = Date.now();
    const entry: Exchange = { source, key, url: redactUrl(url), error: PENDING, ms: 0 };
    exchanges.push(entry);
    try {
      const response = await realFetch(input, init);
      const text = await response.clone().text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        body = { nonJsonBody: text.slice(0, 2000) };
      }
      delete entry.error;
      entry.status = response.status;
      entry.body = body;
      entry.ms = Date.now() - started;
      return response;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      entry.ms = Date.now() - started;
      throw error;
    }
  };

  globalThis.fetch = wrapped as typeof fetch;
  return () => {
    globalThis.fetch = realFetch;
  };
}

/** One line per source for the report: "ok 200 (30 items)", "HTTP 403", "timeout". */
export function sourceStatus(exchanges: Exchange[], source: ExchangeSource): string {
  const ex = exchanges.find((e) => e.source === source);
  if (!ex) return 'not called';
  if (ex.error) return `failed: ${ex.error}`;
  if (ex.ms >= SCRAPER_TIMEOUT_MS) return 'timeout';
  if (ex.status && ex.status >= 400) return `HTTP ${ex.status}`;
  return `ok ${ex.status ?? ''}`.trim();
}
