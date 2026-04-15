import { redirect } from 'next/navigation';

import { PedidosLista } from '@/app/dashboard/pedidos/PedidosLista';
import { getServerSession } from '@/lib/server-session';

export default async function PedidosPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return <PedidosLista />;
}
