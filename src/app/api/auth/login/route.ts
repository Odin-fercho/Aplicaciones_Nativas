import { NextResponse } from 'next/server';

import { authenticateUser } from '@/lib/auth';
import { buildSessionCookieHeader, createSessionToken } from '@/lib/session';

export const runtime = 'nodejs';

type Body = {
  email?: string;
  password?: string;
};

function authFailureMessage(
  reason: 'invalid_credentials' | 'misconfigured_user' | 'upstream' | 'server_config',
): string {
  if (reason === 'upstream') {
    return 'No se pudo validar el acceso con Baserow. Intenta de nuevo en unos minutos.';
  }
  if (reason === 'server_config') {
    return 'El servidor no tiene bien configurado Baserow o la sesión (revisa .env.local: BASEROW_API_TOKEN, BASEROW_TABLE_USUARIOS_ACCESO, BASEROW_TABLE_CLIENTES, SESSION_SECRET).';
  }
  return 'Credenciales incorrectas o acceso no disponible';
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';

  try {
    const result = await authenticateUser(email, password);
    if (!result.ok) {
      const status =
        result.reason === 'upstream'
          ? 502
          : result.reason === 'server_config'
            ? 503
            : 401;
      return NextResponse.json(
        { ok: false, error: authFailureMessage(result.reason) },
        { status },
      );
    }

    let token: string;
    try {
      token = await createSessionToken(result.session);
    } catch (err) {
      console.error('[api/auth/login] Error al firmar la sesión (SESSION_SECRET / jose):', err);
      return NextResponse.json(
        {
          ok: false,
          error:
            'Error al crear la sesión. Comprueba SESSION_SECRET en .env.local (mínimo 32 caracteres).',
        },
        { status: 503 },
      );
    }

    const res = NextResponse.json({
      ok: true,
      user: {
        email: result.session.email,
        role: result.session.role,
        tenantId: result.session.tenantId,
      },
    });
    res.headers.append('Set-Cookie', buildSessionCookieHeader(token));
    return res;
  } catch (err) {
    console.error('[api/auth/login] Error no controlado:', err);
    const detail =
      process.env.NODE_ENV !== 'production' && err instanceof Error ? err.message : undefined;
    return NextResponse.json(
      {
        ok: false,
        error: 'Error interno al iniciar sesión',
        ...(detail ? { detail } : {}),
      },
      { status: 500 },
    );
  }
}
