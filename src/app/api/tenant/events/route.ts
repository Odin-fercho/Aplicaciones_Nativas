import { NextResponse } from 'next/server';

import {
  baserowCreateRow,
  baserowGetRow,
  baserowListRows,
  baserowPatchRow,
} from '@/lib/baserow-server';
import { getBaserowConfig } from '@/lib/env';
import { enqueueN8nOrderWebhook } from '@/lib/n8n-webhook';
import {
  buildEstadoCompletadoPatch,
  buildInteractionCreatePayload,
  interactionEventBelongsToTenant,
  mapInteractionRowToDto,
  type InteractionEventRow,
  type RegisterEventBody,
} from '@/lib/interaction-events';
import {
  resolveTenantIdForRequest,
  resolveTenantIdFromSessionOnly,
} from '@/lib/request-tenant';
import {
  FALLBACK_TENANT_DTO,
  mapClienteRowToTenantDto,
  type ClienteRow,
} from '@/lib/tenant-public';

export const runtime = 'nodejs';

async function notifyN8nAfterEvent(args: {
  tableClientes: string;
  tenantId: number;
  eventId: number;
  tipo: 'pedido' | 'cita';
  detalle: string;
  total: number;
}): Promise<void> {
  let nombreCliente = `Negocio #${args.tenantId}`;
  let emailNotificaciones = '';
  let telefonoAlerta = '';
  try {
    const clienteRow = await baserowGetRow<ClienteRow>(args.tableClientes, args.tenantId);
    if (clienteRow) {
      nombreCliente = mapClienteRowToTenantDto(clienteRow, FALLBACK_TENANT_DTO).nombre;
      emailNotificaciones =
        typeof clienteRow.Email_Notificaciones === 'string'
          ? clienteRow.Email_Notificaciones.trim()
          : typeof clienteRow.email_notificaciones === 'string'
            ? clienteRow.email_notificaciones.trim()
            : '';
      telefonoAlerta =
        typeof clienteRow.Telefono_Alerta === 'string'
          ? clienteRow.Telefono_Alerta.trim()
          : typeof clienteRow.telefono_alerta === 'string'
            ? clienteRow.telefono_alerta.trim()
            : '';
    }
  } catch {
    /* defaults */
  }

  enqueueN8nOrderWebhook({
    eventId: args.eventId,
    tenantId: args.tenantId,
    nombreCliente,
    tipo: args.tipo,
    detalle: args.detalle,
    total: args.total,
    emailNotificaciones,
    telefonoAlerta,
  });
}

function parseRegisterBody(raw: unknown): RegisterEventBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const tipoRaw = o.tipo;
  const tipo = tipoRaw === 'cita' ? 'cita' : tipoRaw === 'pedido' ? 'pedido' : null;
  if (!tipo) return null;
  const detalle = typeof o.detalle === 'string' ? o.detalle : '';
  if (!detalle.trim()) return null;
  const totalRaw = o.total;
  const total =
    typeof totalRaw === 'number'
      ? totalRaw
      : typeof totalRaw === 'string'
        ? Number.parseFloat(totalRaw)
        : NaN;
  if (!Number.isFinite(total) || total < 0) return null;
  const estadoRaw = o.estado;
  const estado =
    estadoRaw === 'completado'
      ? 'completado'
      : estadoRaw === 'pendiente'
        ? 'pendiente'
        : undefined;
  return { tipo, detalle: detalle.trim(), total, estado };
}

/**
 * POST: registro público por `?slug=` (app Expo) o sesión portal.
 * GET: listado para dashboard (solo cookie / Bearer del tenant).
 */
export async function POST(req: Request) {
  const tenantId = await resolveTenantIdForRequest(req);
  if (tenantId === null) {
    return NextResponse.json(
      { error: 'Autenticación requerida o slug inválido' },
      { status: 401 },
    );
  }

  const {
    tableClientes,
    tableEventosInteraccion,
    eventoTipoPedidoOptionId,
    eventoTipoCitaOptionId,
    eventoEstadoPendienteOptionId,
    eventoEstadoCompletadoOptionId,
  } = getBaserowConfig();

  if (!tableEventosInteraccion) {
    return NextResponse.json(
      { error: 'Falta BASEROW_TABLE_EVENTOS_INTERACCION en el servidor' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = parseRegisterBody(body);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Body inválido: tipo (pedido|cita), detalle (texto) y total (≥ 0)' },
      { status: 400 },
    );
  }

  const payload = buildInteractionCreatePayload(parsed, tenantId, {
    tipoPedidoOptionId: eventoTipoPedidoOptionId,
    tipoCitaOptionId: eventoTipoCitaOptionId,
    estadoPendienteOptionId: eventoEstadoPendienteOptionId,
    estadoCompletadoOptionId: eventoEstadoCompletadoOptionId,
  });

  try {
    const created = await baserowCreateRow<InteractionEventRow>(tableEventosInteraccion, payload);

    void notifyN8nAfterEvent({
      tableClientes,
      tenantId,
      eventId: created.id,
      tipo: parsed.tipo,
      detalle: parsed.detalle,
      total: parsed.total,
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * PATCH: marca un evento como Completado (solo sesión del tenant dueño de la fila).
 */
export async function PATCH(req: Request) {
  const tenantId = await resolveTenantIdFromSessionOnly(req);
  if (tenantId === null) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
  }

  const { tableEventosInteraccion, eventoEstadoCompletadoOptionId } = getBaserowConfig();
  if (!tableEventosInteraccion) {
    return NextResponse.json(
      { error: 'Falta BASEROW_TABLE_EVENTOS_INTERACCION' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const o = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const idRaw = o.id;
  const id =
    typeof idRaw === 'number' && Number.isFinite(idRaw)
      ? idRaw
      : Number.parseInt(String(idRaw ?? ''), 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'id de evento inválido' }, { status: 400 });
  }

  let existing: InteractionEventRow | null;
  try {
    existing = await baserowGetRow<InteractionEventRow>(tableEventosInteraccion, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
  }

  if (!interactionEventBelongsToTenant(existing, tenantId)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const patchPayload = buildEstadoCompletadoPatch(eventoEstadoCompletadoOptionId);

  try {
    const updated = await baserowPatchRow<InteractionEventRow>(
      tableEventosInteraccion,
      id,
      patchPayload,
    );
    return NextResponse.json({ ok: true, item: mapInteractionRowToDto(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const tenantId = await resolveTenantIdFromSessionOnly(req);
  if (tenantId === null) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
  }

  const { tableEventosInteraccion } = getBaserowConfig();
  if (!tableEventosInteraccion) {
    return NextResponse.json(
      { error: 'Falta BASEROW_TABLE_EVENTOS_INTERACCION' },
      { status: 503 },
    );
  }

  const params = new URLSearchParams({
    user_field_names: 'true',
    size: '100',
    order_by: '-id',
    filter__Cliente__link_row_has: String(tenantId),
  });

  try {
    const data = await baserowListRows<InteractionEventRow>(tableEventosInteraccion, params);
    const items = data.results.map((row) => mapInteractionRowToDto(row));
    return NextResponse.json({ tenantId, count: items.length, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error Baserow';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
