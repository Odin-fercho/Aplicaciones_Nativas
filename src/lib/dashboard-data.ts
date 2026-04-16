import { baserowGetRow, baserowListRows } from '@/lib/baserow-server';
import { getBaserowConfig } from '@/lib/env';
import {
  mapInteractionRowToDto,
  type InteractionEventRow,
} from '@/lib/interaction-events';

type ClienteRow = {
  Nombre?: string;
  nombre?: string;
};

function ymdInTimeZone(isoOrDate: string | Date, timeZone: string): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

async function fetchInteractionMetrics(tenantId: number): Promise<{
  pedidosHoy: number;
  solicitudesHoy: number;
  pendientesGestion: number;
}> {
  const { tableEventosInteraccion } = getBaserowConfig();
  if (!tableEventosInteraccion) {
    return { pedidosHoy: 0, solicitudesHoy: 0, pendientesGestion: 0 };
  }

  const params = new URLSearchParams({
    user_field_names: 'true',
    size: '150',
    order_by: '-id',
    filter__Cliente__link_row_has: String(tenantId),
  });

  try {
    const data = await baserowListRows<InteractionEventRow>(tableEventosInteraccion, params);
    const todayYmd = ymdInTimeZone(new Date(), 'America/Bogota');
    let pedidosHoy = 0;
    let solicitudesHoy = 0;
    let pendientesGestion = 0;

    for (const row of data.results) {
      const dto = mapInteractionRowToDto(row);
      if (dto.estadoKind === 'pendiente') {
        pendientesGestion += 1;
      }
      const createdRaw = row.created_on;
      if (typeof createdRaw !== 'string' || !createdRaw.trim()) {
        continue;
      }
      const rowDay = ymdInTimeZone(createdRaw, 'America/Bogota');
      if (rowDay !== todayYmd) {
        continue;
      }
      solicitudesHoy += 1;
      if (dto.tipoKind === 'pedido') {
        pedidosHoy += 1;
      }
    }

    return { pedidosHoy, solicitudesHoy, pendientesGestion };
  } catch {
    return { pedidosHoy: 0, solicitudesHoy: 0, pendientesGestion: 0 };
  }
}

/**
 * Nombre comercial del tenant y métricas rápidas para el dashboard (solo servidor).
 */
export async function getTenantDashboardSnapshot(tenantId: number): Promise<{
  nombre: string;
  productosActivos: number;
  pedidosHoy: number;
  solicitudesHoy: number;
  pendientesGestion: number;
}> {
  const { tableClientes, tableProductos } = getBaserowConfig();
  let nombre = `Negocio #${tenantId}`;

  try {
    const row = await baserowGetRow<ClienteRow>(tableClientes, tenantId);
    if (row) {
      nombre = row.Nombre ?? row.nombre ?? nombre;
    }
  } catch {
    /* nombre por defecto */
  }

  let productosActivos = 0;
  try {
    const params = new URLSearchParams({
      user_field_names: 'true',
      size: '1',
      filter__Cliente__link_row_has: String(tenantId),
    });
    const data = await baserowListRows<unknown>(tableProductos, params);
    productosActivos = typeof data.count === 'number' ? data.count : data.results.length;
  } catch {
    productosActivos = 0;
  }

  const { pedidosHoy, solicitudesHoy, pendientesGestion } =
    await fetchInteractionMetrics(tenantId);

  return {
    nombre,
    productosActivos,
    pedidosHoy,
    solicitudesHoy,
    pendientesGestion,
  };
}
