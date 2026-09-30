import { redirect } from 'next/navigation';
import { CampaignsView } from '../../components/campaigns-view';
import { getSessionContext } from '../../lib/auth/server';
import { getCampaignsViewModel } from '../../lib/campaigns-view-data';

type CampanhasSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: CampanhasSearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect('/');

  const params = await searchParams;
  const model = await getCampaignsViewModel(session, {
    branchId: singleValue(params.branchId),
    campaignId: singleValue(params.campaignId),
    state: singleValue(params.state),
  });

  return <CampaignsView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
