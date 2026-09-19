import { redirect } from 'next/navigation';
import { ProductView } from '../../components/product-view';
import { getSessionContext } from '../../lib/auth/server';
import { getProductsViewModel } from '../../lib/product-data';

type ProdutosSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: ProdutosSearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect('/login');

  const params = await searchParams;
  const model = await getProductsViewModel(session, {
    branchId: singleValue(params.branchId),
    categoryId: singleValue(params.categoryId),
    search: singleValue(params.search),
    state: singleValue(params.state),
    status: singleValue(params.status),
  });

  return <ProductView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
