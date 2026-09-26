import { redirect } from 'next/navigation';
import { MasterAdminView } from '../../components/master-admin-view';
import { getSessionContext } from '../../lib/auth/server';
import { getMasterAdminData } from '../../lib/master-admin-data';

export default async function MasterAdminPage() {
  const session = await getSessionContext();
  if (!session) redirect('/');
  if (session.role !== 'PLATFORM_MASTER') redirect('/forbidden');
  const data = await getMasterAdminData();

  return <MasterAdminView data={data} />;
}
