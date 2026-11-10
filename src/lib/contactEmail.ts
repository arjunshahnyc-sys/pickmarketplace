// Delivery of contact-form submissions by email, through Resend's HTTP API.
//
// Until 2026-11 the contact route only logged that a submission arrived and
// returned success, so messages reached no one. This module sends them, and
// reports plainly when it cannot, so the form never claims a delivery that
// did not happen.
//
// Configuration (server env, all read at call time):
//   RESEND_API_KEY      required. Without it nothing can be sent.
//   CONTACT_TO_EMAIL    where submissions go. Defaults to the support
//                       address printed across the site.
//   CONTACT_FROM_EMAIL  the From header. Defaults to Resend's shared
//                       sender, which needs no DNS setup but can only
//                       deliver to the Resend account owner's own address;
//                       verify pickmarketplace.app in Resend and set this
//                       to an address on it to deliver anywhere.
//
// No SDK: one POST. SERVER ONLY.

export const SUPPORT_EMAIL = 'support@pickmarketplace.app';
const DEFAULT_FROM = 'Pick Contact Form <onboarding@resend.dev>';
const SEND_TIMEOUT_MS = 8000;

export const CONTACT_LIMITS = { name: 100, email: 254, subject: 200, message: 5000 } as const;

export interface ContactSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type ContactValidation =
  | { ok: true; submission: ContactSubmission }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Header fields must stay on one line; the JSON API already prevents header
// injection, this keeps the delivered subject and sender name readable.
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, ' ').trim();

/** Validates and normalizes an untrusted request body. */
export function validateContact(body: unknown): ContactValidation {
  const b = (body ?? {}) as Record<string, unknown>;
  const fields = ['name', 'email', 'subject', 'message'] as const;
  if (fields.some((f) => typeof b[f] !== 'string' || !(b[f] as string).trim())) {
    return { ok: false, error: 'All fields are required' };
  }
  const submission: ContactSubmission = {
    name: oneLine(b.name as string),
    email: (b.email as string).trim(),
    subject: oneLine(b.subject as string),
    message: (b.message as string).trim(),
  };
  if (!EMAIL_RE.test(submission.email)) return { ok: false, error: 'Invalid email address' };
  for (const f of fields) {
    if (submission[f].length > CONTACT_LIMITS[f]) {
      return { ok: false, error: `The ${f} is too long (max ${CONTACT_LIMITS[f]} characters)` };
    }
  }
  return { ok: true, submission };
}

export type ContactSendResult =
  | { ok: true }
  /** not-configured: no API key in this deployment. failed: the send errored. */
  | { ok: false; reason: 'not-configured' | 'failed' };

/**
 * Emails one submission to the support inbox. Plain text only, so user
 * input is never interpreted as markup. Reply-To is the sender, so a reply
 * from the inbox goes straight back to them. Never throws.
 */
export async function sendContactEmail(s: ContactSubmission): Promise<ContactSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'not-configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
        to: [process.env.CONTACT_TO_EMAIL || SUPPORT_EMAIL],
        reply_to: s.email,
        subject: `Pick contact form: ${s.subject}`,
        text: `From: ${s.name} <${s.email}>\nSubject: ${s.subject}\n\n${s.message}\n`,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Status only: the response body can echo the submission back.
      console.error(`[contact] email send returned ${response.status}`);
      return { ok: false, reason: 'failed' };
    }
    return { ok: true };
  } catch (error) {
    console.error('[contact] email send failed:', error instanceof Error ? error.name : 'unknown error');
    return { ok: false, reason: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}
