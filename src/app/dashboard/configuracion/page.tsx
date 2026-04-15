import { redirect } from 'next/navigation';

import { ConfigBranding } from '@/app/dashboard/configuracion/ConfigBranding';
import { getServerSession } from '@/lib/server-session';

export default async function ConfiguracionPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return <ConfigBranding />;
}
