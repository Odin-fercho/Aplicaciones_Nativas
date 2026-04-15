import { extractRawSessionCookie, verifySessionToken } from './session';
import { resolveTenantRowIdBySlug } from './tenant-public';

/**
 * Resuelve `tenantId` para la app Expo o el panel:
 * 1) JWT en `Authorization: Bearer` o cookie `odenix_session`
 * 2) Query `slug` → resolución server-side en Baserow (sin `tenantId` arbitrario en cliente)
 */
export async function resolveTenantIdForRequest(req: Request): Promise<number | null> {
  const auth = req.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const cookieRaw = extractRawSessionCookie(req.headers.get('cookie'));
  const jwtRaw = bearer || cookieRaw;
  if (jwtRaw) {
    const session = await verifySessionToken(jwtRaw);
    if (session) return session.tenantId;
  }

  const slug = new URL(req.url).searchParams.get('slug')?.trim() ?? '';
  if (slug) {
    return resolveTenantRowIdBySlug(slug);
  }

  return null;
}

/** Solo JWT (Bearer o cookie); no usa `slug`. Para listados del dashboard. */
export async function resolveTenantIdFromSessionOnly(req: Request): Promise<number | null> {
  const auth = req.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const cookieRaw = extractRawSessionCookie(req.headers.get('cookie'));
  const jwtRaw = bearer || cookieRaw;
  if (!jwtRaw) return null;
  const session = await verifySessionToken(jwtRaw);
  return session?.tenantId ?? null;
}
