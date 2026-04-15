import { redirect } from 'next/navigation';

import { DashboardSidebar } from '@/app/dashboard/DashboardSidebar';
import '@/app/dashboard/dashboard.css';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { getServerSession } from '@/lib/server-session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  let tenantName = `Tenant #${session.tenantId}`;
  try {
    const snap = await getTenantDashboardSnapshot(session.tenantId);
    tenantName = snap.nombre;
  } catch {
    /* fallback arriba */
  }

  return (
    <div className="odenix-dashboard-root">
      <DashboardSidebar tenantName={tenantName} userEmail={session.email} />
      <main className="odenix-main">{children}</main>
    </div>
  );
}
