import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Orígenes permitidos para la app web (CORS). Por defecto incluye https://go.odenix.shop. */
const DEFAULT_ALLOWED = ['https://go.odenix.shop'];

function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (raw) {
    const fromEnv = raw
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean);
    if (fromEnv.length > 0) return fromEnv;
  }
  const list = [...DEFAULT_ALLOWED];
  if (process.env.NODE_ENV !== 'production') {
    list.push(
      'http://localhost:8081',
      'http://127.0.0.1:8081',
      'http://localhost:19006',
      'http://127.0.0.1:19006',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    );
  }
  return list;
}

function pickAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  const normalized = requestOrigin.replace(/\/$/, '');
  return parseAllowedOrigins().includes(normalized) ? normalized : null;
}

function corsHeaders(origin: string): Headers {
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', origin);
  h.set('Access-Control-Allow-Credentials', 'true');
  h.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD');
  h.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept, Cookie, X-Requested-With',
  );
  h.set('Access-Control-Max-Age', '86400');
  h.set('Vary', 'Origin');
  return h;
}

export function middleware(request: NextRequest) {
  const origin = pickAllowedOrigin(request.headers.get('origin'));

  if (request.method === 'OPTIONS') {
    if (!origin) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const res = NextResponse.next();
  if (origin) {
    const ch = corsHeaders(origin);
    ch.forEach((value, key) => {
      res.headers.set(key, value);
    });
  }
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
