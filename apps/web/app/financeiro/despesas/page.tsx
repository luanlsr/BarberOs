import { redirect } from 'next/navigation';
import { ExpenseView } from '../../../components/expense-view';
import { createPagePerformanceLogger } from '../../../lib/page-performance';
import { getSessionContext } from '../../../lib/auth/server';
import { getExpensesViewModel } from '../../../lib/expense-data';

type ExpensesSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: ExpensesSearchParams;
}) {
  const logPagePhase = createPagePerformanceLogger('/financeiro/despesas');
  logPagePhase('start');

  const session = await getSessionContext();
  logPagePhase('session', { hasSession: Boolean(session) });
  if (!session) redirect('/login');

  const params = await searchParams;
  logPagePhase('params');
  const branchId = singleValue(params.branchId);
  const status = singleValue(params.status);
  const state = singleValue(params.state);
  const model = await getExpensesViewModel(session, { branchId, status, state });

  logPagePhase('model', { modelState: model.state, expenses: model.expenses.length });
  logPagePhase('return');

  return <ExpenseView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
