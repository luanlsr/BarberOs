import { redirect } from 'next/navigation';
import { CommissionView } from '../../../components/commission-view';
import { getSessionContext } from '../../../lib/auth/server';
import { getCommissionsViewModel } from '../../../lib/commission-data';

type CommissionsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: CommissionsSearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect('/login');

  const params = await searchParams;
  const branchId = singleValue(params.branchId);
  const scenario = singleValue(params.scenario);
  const state = singleValue(params.state);
  const model = await getCommissionsViewModel(session, { branchId, scenario, state });

  return <CommissionView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
