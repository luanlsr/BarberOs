import { redirect } from 'next/navigation';
import { DashboardView } from '../components/dashboard-view';
import { getSessionContext } from '../lib/auth/server';

export default async function HomePage() {
  if (!(await getSessionContext())) redirect('/login');
  return <DashboardView />;
}
