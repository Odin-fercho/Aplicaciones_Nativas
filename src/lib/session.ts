import { SignJWT, jwtVerify } from 'jose';

import type { SessionPayload, UserRole } from '@/types/session';
import { getSessionSecret } from './env';

const COOKIE_NAME = 'odenix_session';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 7;

export { COOKIE_NAME, COOKIE_MAX_AGE_S };

function isUserRole(v: string): v is UserRole {
  return v === 'ADMIN' || v === 'OWNER' || v === 'STAFF';
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getSessionSecret();
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_S}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    const roleRaw = typeof payload.role === 'string' ? payload.role : '';
    const tenantId =
      typeof payload.tenantId === 'number'
        ? payload.tenantId
        : typeof payload.tenantId === 'string'
          ? Number.parseInt(payload.tenantId, 10)
          : NaN;
    if (!sub || !email || !Number.isFinite(tenantId) || !isUserRole(roleRaw)) {
      return null;
    }
    return { sub, email, role: roleRaw, tenantId };
  } catch {
    return null;
  }
}

/** Lee el valor crudo de la cookie `odenix_session`. */
export function extractRawSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((c) => c.trim());
  const pair = parts.find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!pair) return null;
  return pair.slice(COOKIE_NAME.length + 1) || null;
}

export function buildSessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_S}${secure}`;
}

export function buildClearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
