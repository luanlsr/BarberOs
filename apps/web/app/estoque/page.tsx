import { redirect } from 'next/navigation';
import { InventoryView } from '../../components/inventory-view';
import { createPagePerformanceLogger } from '../../lib/page-performance';
import { getSessionContext } from '../../lib/auth/server';
import { getInventoryViewModel } from '../../lib/inventory-data';

type EstoqueSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EstoquePage({ searchParams }: { searchParams: EstoqueSearchParams }) {
  const logPagePhase = createPagePerformanceLogger('/estoque');
  logPagePhase('start');

  const session = await getSessionContext();
  logPagePhase('session', { hasSession: Boolean(session) });
  if (!session) redirect('/login');

  const params = await searchParams;
  logPagePhase('params');
  const model = await getInventoryViewModel(session, {
    branchId: singleValue(params.branchId),
    state: singleValue(params.state),
  });

  logPagePhase('model', { modelState: model.state, balances: model.balances.length });
  logPagePhase('return');

  return <InventoryView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
