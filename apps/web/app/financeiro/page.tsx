import { redirect } from 'next/navigation';
import { FinanceView } from '../../components/finance-view';
import { getSessionContext } from '../../lib/auth/server';
import { getFinanceViewModel } from '../../lib/finance-data';

type FinanceSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: FinanceSearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect('/login');

  const params = await searchParams;
  const branchId = singleValue(params.branchId);
  const state = singleValue(params.state);
  const model = await getFinanceViewModel(session, { branchId, state });

  return <FinanceView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
