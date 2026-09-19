import { redirect } from 'next/navigation';
import { AgendaView } from '../../components/agenda-view';
import { getAgendaViewModel } from '../../lib/agenda-data';
import { getSessionContext } from '../../lib/auth/server';

type AgendaSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AgendaPage({ searchParams }: { searchParams: AgendaSearchParams }) {
  const session = await getSessionContext();
  if (!session) redirect('/login');
  if (
    !session.permissions.includes('appointments.read') ||
    !(session.entitlements ?? []).includes('core.operations')
  ) {
    redirect('/forbidden');
  }

  const params = await searchParams;
  const date = singleValue(params.date);
  const professionalId = singleValue(params.professionalId);
  const appointmentId = singleValue(params.appointmentId);
  const mode = singleValue(params.mode);
  const view = singleValue(params.view);
  const time = singleValue(params.time);
  const agenda = getAgendaViewModel(session, {
    date,
    professionalId,
    appointmentId,
    mode,
    view,
    time,
  });

  return <AgendaView agenda={agenda} />;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
