import { redirect } from 'next/navigation';
import { ProfessionalWalletView } from '../../components/professional-wallet-view';
import { getSessionContext } from '../../lib/auth/server';
import { getProfessionalWalletViewModel } from '../../lib/professional-wallet-data';

type WalletSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MinhaCarteiraPage({
  searchParams,
}: {
  searchParams: WalletSearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect('/');

  const params = await searchParams;
  const branchId = singleValue(params.branchId);
  const professionalId = singleValue(params.professionalId);
  const state = singleValue(params.state);
  const model = await getProfessionalWalletViewModel(session, { branchId, professionalId, state });

  return <ProfessionalWalletView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
