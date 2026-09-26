import { redirect } from 'next/navigation';
import { WorkerOperationsView } from '../../../components/worker-operations-view';
import { getSessionContext } from '../../../lib/auth/server';
import { getWorkerOperationsViewModel } from '../../../lib/worker-operations-data';

type WorkerOperationsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WorkerOperationsPage({
  searchParams,
}: Readonly<{ searchParams: WorkerOperationsSearchParams }>) {
  const session = await getSessionContext();
  if (!session) redirect('/');

  const params = await searchParams;
  const model = await getWorkerOperationsViewModel(session, {
    branchId: singleValue(params.branchId),
    state: singleValue(params.state),
  });

  return <WorkerOperationsView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
