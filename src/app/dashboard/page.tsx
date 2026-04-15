import { Eye, Package, ShoppingBag } from 'lucide-react';
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
  try {
    const snap = await getTenantDashboardSnapshot(session.tenantId);
    nombre = snap.nombre;
    productosActivos = snap.productosActivos;
  } catch {
    /* valores por defecto */
  }

  const vistasApp = 0;
  const pedidosMes = 0;

  return (
    <div>
      <header className="odenix-welcome">
        <h1>
          Hola, <span>{nombre}</span>
        </h1>
        <p>
          Así va tu operación hoy. Métricas en vivo y control del catálogo desde un solo lugar —
          diseñado para escalar como una plataforma SaaS premium.
        </p>
      </header>

      <section className="odenix-stats-grid" aria-label="Resumen rápido">
        <div className="odenix-stat-card">
          <div className="odenix-stat-card-inner">
            <div className="odenix-stat-label">
              <Eye size={18} />
              Vistas de la App
            </div>
            <div className="odenix-stat-value">{vistasApp.toLocaleString('es-CO')}</div>
            <p className="odenix-stat-hint">Integración de analíticas en roadmap (Fase 4).</p>
          </div>
        </div>

        <div className="odenix-stat-card">
          <div className="odenix-stat-card-inner">
            <div className="odenix-stat-label">
              <ShoppingBag size={18} />
              Pedidos del mes
            </div>
            <div className="odenix-stat-value">{pedidosMes.toLocaleString('es-CO')}</div>
            <p className="odenix-stat-hint">Conecta pedidos desde WhatsApp / n8n para llenar este KPI.</p>
          </div>
        </div>

        <div className="odenix-stat-card">
          <div className="odenix-stat-card-inner">
            <div className="odenix-stat-label">
              <Package size={18} />
              Productos activos
            </div>
            <div className="odenix-stat-value">{productosActivos.toLocaleString('es-CO')}</div>
            <p className="odenix-stat-hint">Enlazados a tu tenant en Baserow (catálogo actual).</p>
          </div>
        </div>
      </section>
    </div>
  );
}
