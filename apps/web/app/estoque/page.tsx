import { redirect } from 'next/navigation';
import { InventoryView } from '../../components/inventory-view';
import { getSessionContext } from '../../lib/auth/server';
import { getInventoryViewModel } from '../../lib/inventory-data';

type EstoqueSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EstoquePage({ searchParams }: { searchParams: EstoqueSearchParams }) {
  const session = await getSessionContext();
  if (!session) redirect('/login');

  const params = await searchParams;
  const model = await getInventoryViewModel(session, {
    branchId: singleValue(params.branchId),
    state: singleValue(params.state),
  });

  return <InventoryView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
