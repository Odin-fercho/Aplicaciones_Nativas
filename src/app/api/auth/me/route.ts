import { NextResponse } from 'next/server';

import { extractRawSessionCookie, verifySessionToken } from '@/lib/session';

export async function GET(request: Request) {
  const raw = extractRawSessionCookie(request.headers.get('cookie'));
  if (!raw) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const session = await verifySessionToken(raw);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      email: session.email,
      role: session.role,
      tenantId: session.tenantId,
    },
  });
}
