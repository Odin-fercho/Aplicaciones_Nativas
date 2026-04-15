type BaserowSelectLike = { id: number; value: string };

export type InteractionEventRow = {
  id: number;
  Tipo?: string | BaserowSelectLike;
  tipo?: string | BaserowSelectLike;
  Detalle?: string;
  detalle?: string;
  Total?: number | string;
  total?: number | string;
  Estado?: string | BaserowSelectLike;
  estado?: string | BaserowSelectLike;
  Cliente?: number | number[] | { id: number } | { id: number }[];
};

/** El link `Cliente` de la fila corresponde al tenant indicado. */
export function interactionEventBelongsToTenant(
  row: InteractionEventRow,
  tenantId: number,
): boolean {
  const c = row.Cliente;
  if (c === undefined || c === null) return false;
  const ids: number[] = [];
  if (typeof c === 'number' && Number.isFinite(c)) ids.push(c);
  else if (Array.isArray(c)) {
    for (const item of c) {
      if (typeof item === 'number' && Number.isFinite(item)) ids.push(item);
      else if (item && typeof item === 'object' && 'id' in item) {
        const id = (item as { id: number }).id;
        if (typeof id === 'number' && Number.isFinite(id)) ids.push(id);
      }
    }
  } else if (typeof c === 'object' && 'id' in c) {
    const id = (c as { id: number }).id;
    if (typeof id === 'number' && Number.isFinite(id)) ids.push(id);
  }
  return ids.includes(tenantId);
}

export type InteractionEventDto = {
  id: number;
  tipoLabel: string;
  tipoKind: 'pedido' | 'cita';
  detalle: string;
  total: number;
  estadoLabel: string;
  estadoKind: 'pendiente' | 'completado';
};

export type RegisterEventBody = {
  tipo: 'pedido' | 'cita';
  detalle: string;
  total: number;
  estado?: 'pendiente' | 'completado';
};

function fieldToLabel(raw: string | BaserowSelectLike | undefined): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && 'value' in raw && typeof raw.value === 'string') {
    return raw.value;
  }
  return '';
}

function parseTipoKind(label: string): 'pedido' | 'cita' {
  const v = label.trim().toLowerCase();
  if (v.includes('cita')) return 'cita';
  return 'pedido';
}

function parseEstadoKind(label: string): 'pendiente' | 'completado' {
  const v = label.trim().toLowerCase();
  if (v.includes('complet')) return 'completado';
  return 'pendiente';
}

export function mapInteractionRowToDto(row: InteractionEventRow): InteractionEventDto {
  const tipoRaw = fieldToLabel(row.Tipo ?? row.tipo);
  const estadoRaw = fieldToLabel(row.Estado ?? row.estado);
  const detalle = row.Detalle ?? row.detalle ?? '';
  const rawTotal = row.Total ?? row.total ?? 0;
  const totalNum =
    typeof rawTotal === 'number' ? rawTotal : Number.parseFloat(String(rawTotal));
  return {
    id: row.id,
    tipoLabel: tipoRaw || '—',
    tipoKind: parseTipoKind(tipoRaw),
    detalle: typeof detalle === 'string' ? detalle : '',
    total: Number.isFinite(totalNum) ? totalNum : 0,
    estadoLabel: estadoRaw || 'Pendiente',
    estadoKind: parseEstadoKind(estadoRaw),
  };
}

function selectValueOrString(optionIdEnv: string, fallbackLabel: string): string | number {
  const id = optionIdEnv.trim();
  if (id) {
    const n = Number.parseInt(id, 10);
    if (Number.isFinite(n)) return n;
  }
  return fallbackLabel;
}

/** Payload PATCH para marcar estado Completado (single select o texto). */
export function buildEstadoCompletadoPatch(estadoCompletadoOptionId: string): Record<string, unknown> {
  return {
    Estado: selectValueOrString(estadoCompletadoOptionId, 'Completado'),
  };
}

/**
 * Construye el cuerpo para crear fila en Baserow (user_field_names).
 * Campos: Tipo, Detalle, Total, Estado, Cliente.
 */
export function buildInteractionCreatePayload(
  body: RegisterEventBody,
  tenantId: number,
  env: {
    tipoPedidoOptionId: string;
    tipoCitaOptionId: string;
    estadoPendienteOptionId: string;
    estadoCompletadoOptionId: string;
  },
): Record<string, unknown> {
  const tipoBaserow = selectValueOrString(
    body.tipo === 'cita' ? env.tipoCitaOptionId : env.tipoPedidoOptionId,
    body.tipo === 'cita' ? 'Cita' : 'Pedido',
  );

  const estadoRaw = body.estado ?? 'pendiente';
  const estadoBaserow = selectValueOrString(
    estadoRaw === 'completado' ? env.estadoCompletadoOptionId : env.estadoPendienteOptionId,
    estadoRaw === 'completado' ? 'Completado' : 'Pendiente',
  );

  return {
    Tipo: tipoBaserow,
    Detalle: body.detalle.slice(0, 50000),
    Total: body.total,
    Estado: estadoBaserow,
    Cliente: [tenantId],
  };
}
