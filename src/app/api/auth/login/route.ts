import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession, normalizeEmail, toPublicUser } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rateLimit';

// Valid hash of a throwaway string. The unknown-email path compares against
// this so it does the same bcrypt work as the wrong-password path; skipping
// the compare made the 401 measurably faster and leaked account existence.
const TIMING_EQUALIZER_HASH = '$2b$10$jjiYBKIXC3eD5EgE7/af2eIvXl/oMl4rTCkuRwEwpedt0OgGezGCW';

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, RATE_LIMITS.login);
    if (!rl.ok) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Same error for unknown email and wrong password — don't leak which one it was.
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? TIMING_EQUALIZER_HASH);
    if (!user || !passwordMatches) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await createSession(user.id, user.passwordHash);
    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong signing you in. Please try again.' },
      { status: 500 }
    );
  }
}
