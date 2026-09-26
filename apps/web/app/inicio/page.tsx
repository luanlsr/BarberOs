import { redirect } from 'next/navigation';
import { DashboardView } from '../../components/dashboard-view';
import { getSessionContext } from '../../lib/auth/server';

export default async function InicioPage() {
  const session = await getSessionContext();
  if (!session) redirect('/');
  if (session.role === 'PLATFORM_MASTER') redirect('/master');
  return <DashboardView session={session} />;
}
