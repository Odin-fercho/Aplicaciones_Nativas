import { NextResponse } from 'next/server';

import { parseImagenArchivoBody } from '@/lib/baserow-files';
import { mapProductRowToDto, type ProductRow } from '@/lib/catalog-map';
import {
  baserowCreateRow,
  baserowGetRow,
  baserowListRows,
  baserowPatchRow,
} from '@/lib/baserow-server';
import { getBaserowConfig } from '@/lib/env';
import { productRowBelongsToTenant } from '@/lib/product-tenant';
import { resolveTenantIdForRequest } from '@/lib/request-tenant';

export const runtime = 'nodejs';

type WriteBody = {
  id?: number;
  nombre?: string;
  descripcion?: string;
  precio?: unknown;
  categoria?: string;
  imagenUrl?: string;
  /** Referencia a archivo ya subido vía `POST /api/tenant/upload` (campo File en Baserow). */
  imagenArchivo?: unknown;
};

function parseWriteBody(raw: WriteBody): {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagenUrl: string;
} | null {
  const nombre = typeof raw.nombre === 'string' ? raw.nombre.trim() : '';
  if (!nombre) return null;
  const descripcion = typeof raw.descripcion === 'string' ? raw.descripcion : '';
  const precioNum =
    typeof raw.precio === 'number'
      ? raw.precio
      : Number.parseFloat(String(raw.precio ?? ''));
  if (!Number.isFinite(precioNum) || precioNum < 0) return null;
  const categoria = typeof raw.categoria === 'string' ? raw.categoria : '';
  const imagenUrl = typeof raw.imagenUrl === 'string' ? raw.imagenUrl : '';
  return { nombre, descripcion, precio: precioNum, categoria, imagenUrl };
}

function applyImagenToPayload(
  payload: Record<string, unknown>,
  opts: {
    archivo: ReturnType<typeof parseImagenArchivoBody>;
    imagenUrl: string;
    mode: 'create' | 'update';
  },
): void {
  if (opts.archivo) {
    payload.Imagen_URL = opts.archivo;
    return;
  }
  const url = opts.imagenUrl.trim();
  if (/^https?:\/\//i.test(url)) {
    payload.Imagen_URL = url;
    return;
  }
  if (opts.mode === 'create') {
    /* Sin archivo ni URL: omitimos Imagen_URL para dejar la celda vacía en Baserow. */
  }
}

function buildCreatePayload(
  input: {
    nombre: string;
    descripcion: string;
    precio: number;
    categoria: string;
    imagenUrl: string;
  },
  tenantId: number,
  archivo: ReturnType<typeof parseImagenArchivoBody>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    Nombre: input.nombre,
    Descripcion_Corta: input.descripcion.trim() || 'Sin descripción disponible.',
    Precio: input.precio,
    Cliente: [tenantId],
    Categoria: input.categoria.trim(),
  };
  applyImagenToPayload(payload, { archivo, imagenUrl: input.imagenUrl, mode: 'create' });
  return payload;
}

function buildUpdatePayload(
  input: {
    nombre: string;
    descripcion: string;
    precio: number;
    categoria: string;
    imagenUrl: string;
  },
  archivo: ReturnType<typeof parseImagenArchivoBody>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    Nombre: input.nombre,
    Descripcion_Corta: input.descripcion.trim() || 'Sin descripción disponible.',
    Precio: input.precio,
    Categoria: input.categoria.trim(),
  };
  applyImagenToPayload(payload, { archivo, imagenUrl: input.imagenUrl, mode: 'update' });
  return payload;
}

/**
 * Catálogo del tenant: `tenantId` solo desde sesión JWT **o** resolución server-side por `?slug=`.
 * POST/PATCH requieren sesión (cookie o Bearer); el `Cliente` se fija en servidor.
 */
export async function GET(req: Request) {
  const tenantId = await resolveTenantIdForRequest(req);
  if (tenantId === null) {
    return NextResponse.json(
      { error: 'Autenticación requerida o slug inválido' },
      { status: 401 },
    );
  }

  const { tableProductos } = getBaserowConfig();
  const params = new URLSearchParams({
    user_field_names: 'true',
    size: '200',
    filter__Cliente__link_row_has: String(tenantId),
  });

  try {
    const data = await baserowListRows<ProductRow>(tableProductos, params);
    const items = data.results.map((row) => mapProductRowToDto(row));
    return NextResponse.json({ tenantId, count: items.length, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const tenantId = await resolveTenantIdForRequest(req);
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
    return NextResponse.json(
      { error: 'Datos inválidos: nombre obligatorio y precio numérico ≥ 0.' },
      { status: 400 },
    );
  }

  const { tableProductos } = getBaserowConfig();
  const archivo = parseImagenArchivoBody(body.imagenArchivo);
  const payload = buildCreatePayload(parsed, tenantId, archivo);

  try {
    const created = await baserowCreateRow<ProductRow>(tableProductos, payload);
    return NextResponse.json({ ok: true, item: mapProductRowToDto(created) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(req: Request) {
  const tenantId = await resolveTenantIdForRequest(req);
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
    return NextResponse.json({ error: 'id de producto inválido' }, { status: 400 });
  }

  const parsed = parseWriteBody(body);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Datos inválidos: nombre obligatorio y precio numérico ≥ 0.' },
      { status: 400 },
    );
  }

  const { tableProductos } = getBaserowConfig();

  let existing: ProductRow | null;
  try {
    existing = await baserowGetRow<ProductRow>(tableProductos, id);
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el producto' }, { status: 502 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  if (!productRowBelongsToTenant(existing, tenantId)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const archivo = parseImagenArchivoBody(body.imagenArchivo);
  const payload = buildUpdatePayload(parsed, archivo);

  try {
    const updated = await baserowPatchRow<ProductRow>(tableProductos, id, payload);
    return NextResponse.json({ ok: true, item: mapProductRowToDto(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
