import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Permission } from '@barberos/contracts';
import { OperationsDirectoryView } from '../../components/operations-directory-view';
import { createPagePerformanceLogger } from '../../lib/page-performance';
import { getSessionContext } from '../../lib/auth/server';
import {
  getOperationsDirectoryModel,
  isOperationsDirectoryArea,
} from '../../lib/operations-directory-data';

const areas: Record<string, { label: string; permission: Permission }> = {
  financeiro: { label: 'Financeiro', permission: 'finance.read' },
  configuracoes: { label: 'Mais', permission: 'settings.read' },
};

type AreaPageParams = Promise<{ area: string }>;
type AreaSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AreaPage({
  params,
  searchParams,
}: {
  params: AreaPageParams;
  searchParams: AreaSearchParams;
}) {
  const logPagePhase = createPagePerformanceLogger('/[area]');
  logPagePhase('start');

  const { area } = await params;
  logPagePhase('params', { area });
  const session = await getSessionContext();
  logPagePhase('session', { area, hasSession: Boolean(session) });
  if (!session) redirect('/login');

  if (isOperationsDirectoryArea(area)) {
    const query = await searchParams;
    logPagePhase('searchParams', { area });
    const model = getOperationsDirectoryModel(session, area, {
      mode: singleValue(query.mode),
      state: singleValue(query.state),
    });
    logPagePhase('model', { area, modelState: model.state, items: model.items.length });
    logPagePhase('return', { area });
    return <OperationsDirectoryView model={model} />;
  }

  const target = areas[area] ?? { label: 'Area', permission: 'dashboard.read' as Permission };
  if (!session.permissions.includes(target.permission)) redirect('/forbidden');
  logPagePhase('placeholder', { area });
  return (
    <div className="placeholder-page">
      <div>
        <p className="eyebrow">Fundacao do produto</p>
        <h1>{target.label}</h1>
        <p>
          Esta area esta protegida pelo contexto autorizado do workspace. O fluxo de negocio entra
          em uma proxima mudanca OpenSpec.
        </p>
        <Link className="button button-secondary" href="/">
          Voltar para a visao geral
        </Link>
      </div>
    </div>
  );
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
