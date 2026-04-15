import { NextResponse } from 'next/server';

import {
  FALLBACK_TENANT_DTO,
  fetchClienteRowBySlug,
  mapClienteRowToTenantDto,
} from '@/lib/tenant-public';

export const runtime = 'nodejs';

/** Datos públicos del tenant para la app (sin token Baserow en el cliente). */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug')?.trim() ?? '';
  if (!slug) {
    return NextResponse.json({ error: 'Falta slug' }, { status: 400 });
  }

  try {
    const row = await fetchClienteRowBySlug(slug);
    if (!row) {
      return NextResponse.json({ tenant: FALLBACK_TENANT_DTO });
    }
    const tenant = mapClienteRowToTenantDto(row, FALLBACK_TENANT_DTO);
    return NextResponse.json({ tenant });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
