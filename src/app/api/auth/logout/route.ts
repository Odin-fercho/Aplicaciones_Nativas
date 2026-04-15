import { NextResponse } from 'next/server';

import { buildClearSessionCookieHeader } from '@/lib/session';

export async function GET(request: Request) {
  const url = new URL('/login', request.url);
  const res = NextResponse.redirect(url);
  res.headers.append('Set-Cookie', buildClearSessionCookieHeader());
  return res;
}
