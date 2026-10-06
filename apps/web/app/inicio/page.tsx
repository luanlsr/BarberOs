import * as React from 'react';
import { redirect } from 'next/navigation';
import { DashboardView } from '../../components/dashboard-view';
import { getSessionContext } from '../../lib/auth/server';
import { getDashboardViewModel } from '../../lib/dashboard-data';

export default async function InicioPage() {
  const session = await getSessionContext();
  if (!session) redirect('/');
  if (session.role === 'PLATFORM_MASTER') redirect('/master');
  const model = await getDashboardViewModel(session);
  return <DashboardView model={model} />;
}
