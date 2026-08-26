// Server-side auth: session cookies (JWT via jose) + user shape shared with the client.
// Only import from server code (route handlers / server components).

import { createHash } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export const SESSION_COOKIE = 'pick_session';
const SESSION_DAYS = 30;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET env var is not set');
  }
  return new TextEncoder().encode(secret);
}

export function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Sessions are bound to the password hash: the token carries a short digest
 * of it, so changing the password (including a manual reset by support)
 * immediately invalidates every outstanding session for that account.
 * The digest reveals nothing about the hash itself.
 */
function passwordVersion(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

export async function createSession(userId: string, passwordHash: string): Promise<void> {
  const token = await new SignJWT({ sub: userId, pv: passwordVersion(passwordHash) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Returns the logged-in user for the current request, or null. */
export async function getSessionUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub;
    if (!userId) return null;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    // Reject tokens minted before a password change (or before this check
    // existed) — see passwordVersion above.
    if (payload.pv !== passwordVersion(user.passwordHash)) return null;

    return toPublicUser(user);
  } catch {
    // Expired or tampered token — treat as logged out.
    return null;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
