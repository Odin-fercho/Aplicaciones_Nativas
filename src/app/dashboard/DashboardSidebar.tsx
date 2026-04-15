'use client';

import {
  Home,
  Images,
  LayoutGrid,
  LogOut,
  Package,
  Settings,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/dashboard/catalogo', label: 'Catálogo', icon: LayoutGrid },
  { href: '/dashboard/banners', label: 'Banners', icon: Images },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: Package },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings },
] as const;

type Props = {
  tenantName: string;
  userEmail: string;
};

export function DashboardSidebar({ tenantName, userEmail }: Props) {
  const pathname = usePathname();

  return (
    <aside className="odenix-sidebar">
      <div className="odenix-sidebar-brand">
        <div className="odenix-sidebar-brand-mark" aria-hidden />
        <div>
          <div className="odenix-sidebar-brand-text">Odenix</div>
          <div className="odenix-sidebar-brand-sub">Portal Maestro</div>
        </div>
      </div>

      <nav className="odenix-nav" aria-label="Principal">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`odenix-nav-link${active ? ' odenix-nav-link--active' : ''}`}
              prefetch={false}
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/api/auth/logout"
        prefetch={false}
        className="odenix-nav-link"
        style={{ marginTop: '0.5rem' }}
      >
        <LogOut size={20} strokeWidth={2} />
        Cerrar sesión
      </Link>

      <div className="odenix-sidebar-footer">
        <strong>
          <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          {tenantName}
        </strong>
        <span>{userEmail}</span>
      </div>
    </aside>
  );
}
