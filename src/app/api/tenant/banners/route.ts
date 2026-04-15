import { NextResponse } from 'next/server';

import { baserowFileCellToPublicUrl, parseImagenArchivoBody } from '@/lib/baserow-files';
import { bannerRowBelongsToTenant } from '@/lib/banner-tenant';
import type { BannerRow } from '@/lib/banner-types';
import {
  baserowCreateRow,
  baserowGetRow,
  baserowListRows,
  baserowPatchRow,
} from '@/lib/baserow-server';
import { getBaserowConfig } from '@/lib/env';
import { resolveTenantIdForRequest, resolveTenantIdFromSessionOnly } from '@/lib/request-tenant';

export const runtime = 'nodejs';

export type BannerDto = {
  id: number;
  titulo: string;
  subtitulo: string;
  imagenUrl: string;
  ctaTexto: string;
  ctaTipo: 'whatsapp' | 'url' | 'none';
  ctaValor: string;
  orden: number;
  activo: boolean;
};

function mapBanner(row: BannerRow): BannerDto {
  const rawOrder = row.Orden ?? row.orden ?? 0;
  const parsedOrder = typeof rawOrder === 'number' ? rawOrder : Number.parseInt(String(rawOrder), 10);
  const rawType = (row.CTA_Tipo ?? row.cta_tipo ?? 'none').toLowerCase();
  const ctaTipo = rawType === 'whatsapp' || rawType === 'url' ? rawType : 'none';
  const imgRaw = row.Imagen_URL ?? row.imagen_url;
  return {
    id: row.id,
    titulo: row.Titulo ?? row.titulo ?? '',
    subtitulo: row.Subtitulo ?? row.subtitulo ?? '',
    imagenUrl: baserowFileCellToPublicUrl(imgRaw),
    ctaTexto: row.CTA_Texto ?? row.cta_texto ?? 'Ver más',
    ctaTipo,
    ctaValor: row.CTA_Valor ?? row.cta_valor ?? '',
    orden: Number.isFinite(parsedOrder) ? parsedOrder : 0,
    activo: row.Activo ?? row.activo ?? true,
  };
}

type WriteBody = {
  id?: number;
  titulo?: string;
  subtitulo?: string;
  orden?: unknown;
  activo?: unknown;
  ctaTexto?: string;
  ctaTipo?: string;
  ctaValor?: string;
  imagenUrl?: string;
  imagenArchivo?: unknown;
};

function parseCtaTipo(raw: unknown): 'whatsapp' | 'url' | 'none' {
  const s = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  if (s === 'whatsapp' || s === 'url') return s;
  return 'none';
}

function parseWriteBody(raw: WriteBody): {
  titulo: string;
  subtitulo: string;
  orden: number;
  activo: boolean;
  ctaTexto: string;
  ctaTipo: 'whatsapp' | 'url' | 'none';
  ctaValor: string;
  imagenUrl: string;
} | null {
  const titulo = typeof raw.titulo === 'string' ? raw.titulo.trim() : '';
  if (!titulo) return null;
  const subtitulo = typeof raw.subtitulo === 'string' ? raw.subtitulo.trim() : '';
  const ordenRaw = raw.orden;
  const ordenNum =
    typeof ordenRaw === 'number' && Number.isFinite(ordenRaw)
      ? ordenRaw
      : Number.parseInt(String(ordenRaw ?? '0'), 10);
  const orden = Number.isFinite(ordenNum) ? ordenNum : 0;
  const activo = raw.activo === false ? false : true;
  const ctaTexto =
    typeof raw.ctaTexto === 'string' && raw.ctaTexto.trim()
      ? raw.ctaTexto.trim()
      : 'Ver más';
  const ctaTipo = parseCtaTipo(raw.ctaTipo);
  const ctaValor = typeof raw.ctaValor === 'string' ? raw.ctaValor.trim() : '';
  const imagenUrl = typeof raw.imagenUrl === 'string' ? raw.imagenUrl : '';
  return { titulo, subtitulo, orden, activo, ctaTexto, ctaTipo, ctaValor, imagenUrl };
}

function applyImagenBanner(
  payload: Record<string, unknown>,
  archivo: ReturnType<typeof parseImagenArchivoBody>,
  imagenUrl: string,
  mode: 'create' | 'update',
): void {
  if (archivo) {
    payload.Imagen_URL = archivo;
    return;
  }
  const url = imagenUrl.trim();
  if (/^https?:\/\//i.test(url)) {
    payload.Imagen_URL = url;
    return;
  }
  if (mode === 'create') {
    /* Sin imagen: omitimos Imagen_URL. */
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const manage = url.searchParams.get('scope') === 'manage';
  let tenantId: number | null;
  if (manage) {
    tenantId = await resolveTenantIdFromSessionOnly(req);
    if (tenantId === null) {
      return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
    }
  } else {
    tenantId = await resolveTenantIdForRequest(req);
    if (tenantId === null) {
      return NextResponse.json(
        { error: 'Autenticación requerida o slug inválido' },
        { status: 401 },
      );
    }
  }

  const { tableBanners } = getBaserowConfig();
  const params = new URLSearchParams({
    user_field_names: 'true',
    size: '50',
    filter__Cliente__link_row_has: String(tenantId),
  });

  try {
    const data = await baserowListRows<BannerRow>(tableBanners, params);
    const mapped = data.results.map(mapBanner);
    const items = manage ? mapped : mapped.filter((b) => b.activo);
    return NextResponse.json({ tenantId, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const tenantId = await resolveTenantIdFromSessionOnly(req);
  if (tenantId === null) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
  }

  let body: WriteBody;
  try {
    body = (await req.json()) as WriteBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = parseWriteBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Título obligatorio.' }, { status: 400 });
  }

  const archivo = parseImagenArchivoBody(body.imagenArchivo);
  const payload: Record<string, unknown> = {
    Titulo: parsed.titulo,
    Subtitulo: parsed.subtitulo,
    Orden: parsed.orden,
    Activo: parsed.activo,
    CTA_Texto: parsed.ctaTexto,
    CTA_Tipo: parsed.ctaTipo,
    CTA_Valor: parsed.ctaValor,
    Cliente: [tenantId],
  };
  applyImagenBanner(payload, archivo, parsed.imagenUrl, 'create');

  const { tableBanners } = getBaserowConfig();
  try {
    const created = await baserowCreateRow<BannerRow>(tableBanners, payload);
    return NextResponse.json({ ok: true, item: mapBanner(created) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(req: Request) {
  const tenantId = await resolveTenantIdFromSessionOnly(req);
  if (tenantId === null) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
  }

  let body: WriteBody;
  try {
    body = (await req.json()) as WriteBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const idRaw = body.id;
  const id =
    typeof idRaw === 'number' && Number.isFinite(idRaw)
      ? idRaw
      : Number.parseInt(String(idRaw ?? ''), 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'id de banner inválido' }, { status: 400 });
  }

  const parsed = parseWriteBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Título obligatorio.' }, { status: 400 });
  }

  const { tableBanners } = getBaserowConfig();
  let existing: BannerRow | null;
  try {
    existing = await baserowGetRow<BannerRow>(tableBanners, id);
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el banner' }, { status: 502 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Banner no encontrado' }, { status: 404 });
  }

  if (!bannerRowBelongsToTenant(existing, tenantId)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const archivo = parseImagenArchivoBody(body.imagenArchivo);
  const payload: Record<string, unknown> = {
    Titulo: parsed.titulo,
    Subtitulo: parsed.subtitulo,
    Orden: parsed.orden,
    Activo: parsed.activo,
    CTA_Texto: parsed.ctaTexto,
    CTA_Tipo: parsed.ctaTipo,
    CTA_Valor: parsed.ctaValor,
  };
  applyImagenBanner(payload, archivo, parsed.imagenUrl, 'update');

  try {
    const updated = await baserowPatchRow<BannerRow>(tableBanners, id, payload);
    return NextResponse.json({ ok: true, item: mapBanner(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
