import { baserowGetRow, baserowListRows } from '@/lib/baserow-server';
import { getBaserowConfig } from '@/lib/env';

type ClienteRow = {
  Nombre?: string;
  nombre?: string;
};

/**
 * Nombre comercial del tenant y métricas rápidas para el dashboard (solo servidor).
 */
export async function getTenantDashboardSnapshot(tenantId: number): Promise<{
  nombre: string;
  productosActivos: number;
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

  return { nombre, productosActivos };
}
