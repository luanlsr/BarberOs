import { redirect } from 'next/navigation';
import { MessagingStatusView } from '../../components/messaging-status-view';
import { getSessionContext } from '../../lib/auth/server';
import { getMessagingStatusViewModel } from '../../lib/messaging-status-data';

type MensagensSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MensagensPage({
  searchParams,
}: {
  searchParams: MensagensSearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect('/');

  const params = await searchParams;
  const model = await getMessagingStatusViewModel(session, {
    branchId: singleValue(params.branchId),
    state: singleValue(params.state),
  });

  return <MessagingStatusView model={model} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
