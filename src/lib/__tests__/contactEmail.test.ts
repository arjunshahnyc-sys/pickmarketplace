import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTACT_LIMITS, sendContactEmail, validateContact } from '../contactEmail';

const GOOD = { name: 'Ada Lovelace', email: 'ada@example.com', subject: 'Wrong price', message: 'The XM6 price looks off.' };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockFetch(ok = true, status = 200) {
  const fetchMock = vi.fn(async (...args: [url: string, init: { headers: Record<string, string>; body: string }]) => {
    void args;
    return { ok, status };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('validateContact', () => {
  it('accepts a complete submission and trims it', () => {
    const r = validateContact({ ...GOOD, name: '  Ada Lovelace ', message: ' The XM6 price looks off.\n' });
    expect(r).toEqual({ ok: true, submission: GOOD });
  });

  it.each(['name', 'email', 'subject', 'message'])('rejects a missing or blank %s', (field) => {
    expect(validateContact({ ...GOOD, [field]: '   ' }).ok).toBe(false);
    const rest: Record<string, unknown> = { ...GOOD };
    delete rest[field];
    expect(validateContact(rest).ok).toBe(false);
  });

  it('rejects non-string fields and non-object bodies', () => {
    expect(validateContact({ ...GOOD, message: { $ne: '' } }).ok).toBe(false);
    expect(validateContact({ ...GOOD, name: ['a'] }).ok).toBe(false);
    expect(validateContact(null).ok).toBe(false);
    expect(validateContact('hello').ok).toBe(false);
  });

  it('rejects an invalid email address', () => {
    expect(validateContact({ ...GOOD, email: 'not-an-email' })).toEqual({ ok: false, error: 'Invalid email address' });
  });

  it.each(['name', 'subject', 'message'] as const)('rejects an over-long %s', (field) => {
    expect(validateContact({ ...GOOD, [field]: 'x'.repeat(CONTACT_LIMITS[field] + 1) }).ok).toBe(false);
    expect(validateContact({ ...GOOD, [field]: 'x'.repeat(CONTACT_LIMITS[field]) }).ok).toBe(true);
  });

  it('flattens line breaks in the name and subject, keeps them in the message', () => {
    const r = validateContact({ ...GOOD, name: 'Ada\r\nBcc: x@evil.test', subject: 'Hi\nthere', message: 'line one\nline two' });
    expect(r.ok && r.submission).toMatchObject({
      name: 'Ada Bcc: x@evil.test',
      subject: 'Hi there',
      message: 'line one\nline two',
    });
  });
});

describe('sendContactEmail', () => {
  it('reports not-configured and sends nothing without an API key', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const fetchMock = mockFetch();
    expect(await sendContactEmail(GOOD)).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a plain-text email to the support inbox with the sender as Reply-To', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('CONTACT_TO_EMAIL', '');
    vi.stubEnv('CONTACT_FROM_EMAIL', '');
    const fetchMock = mockFetch();

    expect(await sendContactEmail(GOOD)).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      to: ['support@pickmarketplace.app'],
      from: 'Pick Contact Form <onboarding@resend.dev>',
      reply_to: 'ada@example.com',
      subject: 'Pick contact form: Wrong price',
    });
    expect(body.text).toContain('From: Ada Lovelace <ada@example.com>');
    expect(body.text).toContain('The XM6 price looks off.');
    expect(body.html).toBeUndefined();
  });

  it('uses the configured recipient and sender', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('CONTACT_TO_EMAIL', 'owner@example.com');
    vi.stubEnv('CONTACT_FROM_EMAIL', 'Pick <contact@pickmarketplace.app>');
    const fetchMock = mockFetch();
    await sendContactEmail(GOOD);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      to: ['owner@example.com'],
      from: 'Pick <contact@pickmarketplace.app>',
    });
  });

  it('reports failed when the service rejects the send, without logging the submission', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    mockFetch(false, 403);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendContactEmail(GOOD)).toEqual({ ok: false, reason: 'failed' });
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain('403');
    expect(logged).not.toContain('ada@example.com');
    expect(logged).not.toContain('XM6');
    errorSpy.mockRestore();
  });

  it('reports failed when the request throws', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down: ada@example.com'); }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendContactEmail(GOOD)).toEqual({ ok: false, reason: 'failed' });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('ada@example.com');
    errorSpy.mockRestore();
  });
});
