import { NextResponse } from 'next/server';

import { baserowGetRow, baserowPatchRow } from '@/lib/baserow-server';
import { getBaserowConfig } from '@/lib/env';
import {
  FALLBACK_TENANT_DTO,
  fetchClienteRowBySlug,
  mapClienteRowToBrandingDto,
  mapClienteRowToProfileDto,
  type ClienteRow,
} from '@/lib/tenant-public';
import { resolveTenantIdForRequest } from '@/lib/request-tenant';
import type { TenantPlantilla } from '@/lib/tenantPlantilla';

export const runtime = 'nodejs';

type PatchBody = {
  nombreComercial?: string;
  logoUrl?: string;
  colorPrimario?: string;
  colorSecundario?: string;
  plantilla?: TenantPlantilla;
  emailNotificaciones?: string;
  telefonoAlerta?: string;
};

function isPlantilla(v: unknown): v is TenantPlantilla {
  return v === 'catalogo' || v === 'citas';
}

function buildBaserowPlantillaValue(
  plantilla: TenantPlantilla,
  catalogoId: string,
  citasId: string,
): number | string {
  if (catalogoId && citasId) {
    const raw = plantilla === 'citas' ? citasId : catalogoId;
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return plantilla === 'citas' ? 'Citas' : 'Catálogo';
}

/** Perfil / contacto por `slug` (público lectura) o branding por sesión (sin slug). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug')?.trim() ?? '';
  const sessionTenantId = await resolveTenantIdForRequest(req);

  if (sessionTenantId !== null && !slug) {
    try {
      const { tableClientes } = getBaserowConfig();
      const row = await baserowGetRow<ClienteRow>(tableClientes, sessionTenantId);
      const branding = mapClienteRowToBrandingDto(row, FALLBACK_TENANT_DTO);
      return NextResponse.json({ branding });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error Baserow';
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (!slug) {
    return NextResponse.json({ error: 'Falta slug o sesión válida' }, { status: 400 });
  }

  try {
    const row = await fetchClienteRowBySlug(slug);
    const profile = mapClienteRowToProfileDto(row);
    return NextResponse.json({ profile });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * Actualiza la fila del tenant en Clientes (solo sesión). Campos Baserow:
 * Nombre_Comercial, Logo_URL, Color_Primario, Color_Secundario, Tipo_de_Plantilla.
 */
export async function PATCH(req: Request) {
  const tenantId = await resolveTenantIdForRequest(req);
  if (tenantId === null) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { tableClientes, plantillaOptionCatalogoId, plantillaOptionCitasId } = getBaserowConfig();

  let existing: ClienteRow | null;
  try {
    existing = await baserowGetRow<ClienteRow>(tableClientes, tenantId);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const payload: Record<string, unknown> = {};

  if (typeof body.nombreComercial === 'string') {
    const t = body.nombreComercial.trim();
    if (!t) {
      return NextResponse.json({ error: 'Nombre comercial no puede estar vacío' }, { status: 400 });
    }
    payload.Nombre_Comercial = t;
  }
  if (typeof body.logoUrl === 'string') {
    payload.Logo_URL = body.logoUrl.trim();
  }
  if (typeof body.colorPrimario === 'string' && body.colorPrimario.trim()) {
    const c = body.colorPrimario.trim();
    payload.Color_Primario = c.startsWith('#') ? c : `#${c}`;
  }
  if (typeof body.colorSecundario === 'string' && body.colorSecundario.trim()) {
    const c = body.colorSecundario.trim();
    payload.Color_Secundario = c.startsWith('#') ? c : `#${c}`;
  }
  if (body.plantilla !== undefined) {
    if (!isPlantilla(body.plantilla)) {
      return NextResponse.json({ error: 'plantilla debe ser catalogo o citas' }, { status: 400 });
    }
    payload.Tipo_de_Plantilla = buildBaserowPlantillaValue(
      body.plantilla,
      plantillaOptionCatalogoId,
      plantillaOptionCitasId,
    );
  }
  if (typeof body.emailNotificaciones === 'string') {
    payload.Email_Notificaciones = body.emailNotificaciones.trim();
  }
  if (typeof body.telefonoAlerta === 'string') {
    payload.Telefono_Alerta = body.telefonoAlerta.trim();
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  try {
    const updated = await baserowPatchRow<ClienteRow>(tableClientes, tenantId, payload);
    const branding = mapClienteRowToBrandingDto(updated, FALLBACK_TENANT_DTO);
    return NextResponse.json({ ok: true, branding });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
