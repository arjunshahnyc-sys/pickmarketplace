import { NextRequest, NextResponse } from 'next/server';
import { sendContactEmail, validateContact, SUPPORT_EMAIL } from '@/lib/contactEmail';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rateLimit';

// Contact form submissions are emailed to the support inbox (see
// lib/contactEmail.ts). Success is returned only when the email service
// accepted the message; every other outcome is an error the form shows with
// the direct address, so a shopper is never told a lost message was sent.
// Nothing about the submission is logged: no name, email or message.
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, RATE_LIMITS.contact);
  if (!rl.ok) {
    return rateLimitResponse(rl.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const checked = validateContact(body);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  const sent = await sendContactEmail(checked.submission);
  if (!sent.ok) {
    return NextResponse.json(
      {
        error:
          sent.reason === 'not-configured'
            ? 'The contact form is not available right now.'
            : 'Your message could not be sent.',
        fallbackEmail: SUPPORT_EMAIL,
      },
      // 503: this deployment cannot send. 502: the email service refused or timed out.
      { status: sent.reason === 'not-configured' ? 503 : 502 }
    );
  }

  return NextResponse.json({ success: true, message: 'Message sent' }, { status: 200 });
}
