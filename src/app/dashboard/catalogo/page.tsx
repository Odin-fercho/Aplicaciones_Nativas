import { redirect } from 'next/navigation';

import { CatalogoManager } from '@/app/dashboard/catalogo/CatalogoManager';
import { getServerSession } from '@/lib/server-session';

export default async function CatalogoPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return <CatalogoManager />;
}
