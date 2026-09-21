import { redirect } from 'next/navigation';
import { DashboardView } from '../components/dashboard-view';
import { getSessionContext } from '../lib/auth/server';

export default async function HomePage() {
  const session = await getSessionContext();
  if (!session) redirect('/login');
  if (session.role === 'PLATFORM_MASTER') redirect('/master');
  return <DashboardView session={session} />;
}
