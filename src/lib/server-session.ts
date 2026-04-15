import { cookies } from 'next/headers';

import { COOKIE_NAME, verifySessionToken } from '@/lib/session';
import type { SessionPayload } from '@/types/session';

export async function getServerSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}
