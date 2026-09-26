import { redirect } from 'next/navigation';
import { CashRegisterView } from '../../components/cash-register-view';
import { getCashRegisterViewModel } from '../../lib/cash-register-data';
import { getSessionContext } from '../../lib/auth/server';

type CashRegisterSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CashRegisterPage({
  searchParams,
}: {
  searchParams: CashRegisterSearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect('/');

  const params = await searchParams;
  const state = singleValue(params.state);
  const model = await getCashRegisterViewModel(session, { state });

  return <CashRegisterView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
