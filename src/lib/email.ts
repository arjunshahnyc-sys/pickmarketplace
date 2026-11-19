// One transactional email through Resend's HTTP API. SERVER ONLY.
//
// Plain text only, so nothing a shopper typed is ever interpreted as
// markup. Never throws; the caller decides what a failure means. Nothing
// about the message is logged, only the HTTP status of a refused send.

const SEND_TIMEOUT_MS = 8000;

export type EmailSendResult = { ok: true } | { ok: false; reason: 'not-configured' | 'failed' };

export async function sendEmail(message: {
  from: string;
  to: string;
  subject: string;
  text: string;
  /** Extra headers, e.g. List-Unsubscribe. */
  headers?: Record<string, string>;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'not-configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.headers ? { headers: message.headers } : {}),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[email] send returned ${response.status}`);
      return { ok: false, reason: 'failed' };
    }
    return { ok: true };
  } catch (error) {
    console.error('[email] send failed:', error instanceof Error ? error.name : 'unknown error');
    return { ok: false, reason: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}
