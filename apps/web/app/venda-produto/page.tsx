import { redirect } from 'next/navigation';
import { ProductSaleView } from '../../components/order-view';
import { getSessionContext } from '../../lib/auth/server';
import { getComandaViewModel } from '../../lib/order-data';

type VendaProdutoSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VendaProdutoPage({
  searchParams,
}: {
  searchParams: VendaProdutoSearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect('/');

  const params = await searchParams;
  const model = await getComandaViewModel(session, {
    orderId: singleValue(params.orderId),
    state: singleValue(params.state),
  });

  return <ProductSaleView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
