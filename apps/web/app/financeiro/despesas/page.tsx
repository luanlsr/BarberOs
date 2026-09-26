import { redirect } from 'next/navigation';
import { ExpenseView } from '../../../components/expense-view';
import { getSessionContext } from '../../../lib/auth/server';
import { getExpensesViewModel } from '../../../lib/expense-data';

type ExpensesSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: ExpensesSearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect('/');

  const params = await searchParams;
  const branchId = singleValue(params.branchId);
  const status = singleValue(params.status);
  const state = singleValue(params.state);
  const modal = singleValue(params.modal);
  const model = await getExpensesViewModel(session, { branchId, status, state });

  return <ExpenseView initialModal={modal === 'create' ? 'create' : undefined} model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
