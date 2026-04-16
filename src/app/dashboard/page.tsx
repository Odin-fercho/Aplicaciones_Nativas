import { ClipboardList, Inbox, Package, ShoppingBag } from 'lucide-react';
import { redirect } from 'next/navigation';

import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { getServerSession } from '@/lib/server-session';

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  let nombre = `Negocio #${session.tenantId}`;
  let productosActivos = 0;
  let pedidosHoy = 0;
  let solicitudesHoy = 0;
  let pendientesGestion = 0;
  try {
    const snap = await getTenantDashboardSnapshot(session.tenantId);
    nombre = snap.nombre;
    productosActivos = snap.productosActivos;
    pedidosHoy = snap.pedidosHoy;
    solicitudesHoy = snap.solicitudesHoy;
    pendientesGestion = snap.pendientesGestion;
  } catch {
    /* valores por defecto */
  }

  return (
    <div>
      <header className="odenix-welcome">
        <h1>
          Hola, <span>{nombre}</span>
        </h1>
        <p>
          Tu panel en vivo: catálogo, pedidos y citas registrados desde la app. Métricas rápidas
          para que sientas el control total de tu operación.
        </p>
      </header>

      <h2 className="odenix-metrics-section-title">Métricas rápidas</h2>
      <section className="odenix-stats-grid" aria-label="Métricas rápidas del negocio">
        <div className="odenix-stat-card">
          <div className="odenix-stat-card-inner">
            <div className="odenix-stat-label">
              <Package size={18} />
              Total de productos
            </div>
            <div className="odenix-stat-value">{productosActivos.toLocaleString('es-CO')}</div>
            <p className="odenix-stat-hint">Filas enlazadas a tu tenant en Baserow (catálogo).</p>
          </div>
        </div>

        <div className="odenix-stat-card">
          <div className="odenix-stat-card-inner">
            <div className="odenix-stat-label">
              <ShoppingBag size={18} />
              Pedidos hoy
            </div>
            <div className="odenix-stat-value">{pedidosHoy.toLocaleString('es-CO')}</div>
            <p className="odenix-stat-hint">
              Eventos tipo pedido creados hoy (zona horaria Bogotá), según la tabla de interacciones.
            </p>
          </div>
        </div>

        <div className="odenix-stat-card">
          <div className="odenix-stat-card-inner">
            <div className="odenix-stat-label">
              <ClipboardList size={18} />
              Solicitudes hoy
            </div>
            <div className="odenix-stat-value">{solicitudesHoy.toLocaleString('es-CO')}</div>
            <p className="odenix-stat-hint">Pedidos y citas registrados desde la app el día de hoy.</p>
          </div>
        </div>

        <div className="odenix-stat-card">
          <div className="odenix-stat-card-inner">
            <div className="odenix-stat-label">
              <Inbox size={18} />
              Pendientes de gestión
            </div>
            <div className="odenix-stat-value">{pendientesGestion.toLocaleString('es-CO')}</div>
            <p className="odenix-stat-hint">
              Últimas 150 interacciones: cuántas siguen en estado pendiente. Revisa Pedidos para
              completarlas.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
