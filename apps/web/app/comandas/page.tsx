import { redirect } from 'next/navigation';
import { OrderView } from '../../components/order-view';
import { getComandaViewModel } from '../../lib/order-data';
import { createPagePerformanceLogger } from '../../lib/page-performance';
import { getSessionContext } from '../../lib/auth/server';

type ComandasSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ComandasPage({
  searchParams,
}: {
  searchParams: ComandasSearchParams;
}) {
  const logPagePhase = createPagePerformanceLogger('/comandas');
  logPagePhase('start');

  const session = await getSessionContext();
  logPagePhase('session', { hasSession: Boolean(session) });
  if (!session) redirect('/login');

  const params = await searchParams;
  logPagePhase('params');
  const orderId = singleValue(params.orderId);
  const mode = singleValue(params.mode);
  const state = singleValue(params.state);
  const model = await getComandaViewModel(session, { orderId, state });

  logPagePhase('model', { modelState: model.state, openOrders: model.openOrders.length });
  logPagePhase('return');

  return <OrderView autoOpenWalkIn={mode === 'walk-in'} model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
