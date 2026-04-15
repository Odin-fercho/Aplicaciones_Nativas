import { NextResponse } from 'next/server';

import { getBaserowConfig } from '@/lib/env';
import { resolveTenantIdFromSessionOnly } from '@/lib/request-tenant';

export const runtime = 'nodejs';

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Proxy de subida a Baserow (`POST .../user-files/upload-file/`).
 * Solo sesión portal; el token Baserow nunca sale al cliente.
 */
export async function POST(req: Request) {
  const tenantId = await resolveTenantIdFromSessionOnly(req);
  if (tenantId === null) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Formulario multipart inválido' }, { status: 400 });
  }

  const entry = formData.get('file');
  if (!(entry instanceof File)) {
    return NextResponse.json(
      { error: 'Falta el archivo en el campo "file"' },
      { status: 400 },
    );
  }

  if (entry.size <= 0) {
    return NextResponse.json({ error: 'Archivo vacío' }, { status: 400 });
  }
  if (entry.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `El archivo supera el máximo permitido (${MAX_BYTES / (1024 * 1024)} MB)` },
      { status: 400 },
    );
  }

  const mime = entry.type || 'application/octet-stream';
  if (!mime.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
  }

  const { apiUrl, token } = getBaserowConfig();
  const uploadUrl = `${apiUrl}/user-files/upload-file/`;

  const outbound = new FormData();
  outbound.append('file', entry, entry.name || 'upload');

  let upstream: Response;
  try {
    upstream = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
      body: outbound,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo contactar a Baserow' }, { status: 502 });
  }

  const text = await upstream.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    return NextResponse.json(
      { error: 'Respuesta inválida de Baserow', status: upstream.status, body: text.slice(0, 200) },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      typeof json === 'object' && json !== null ? json : { error: text.slice(0, 300) },
      { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 },
    );
  }

  return NextResponse.json(json);
}
