import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Permission } from '@barberos/contracts';
import { OperationsDirectoryView } from '../../components/operations-directory-view';
import { getSessionContext } from '../../lib/auth/server';
import {
  getOperationsDirectoryModel,
  isOperationsDirectoryArea,
} from '../../lib/operations-directory-data';

const areas: Record<string, { label: string; permission: Permission }> = {
  financeiro: { label: 'Financeiro', permission: 'finance.read' },
  configuracoes: { label: 'Configurações', permission: 'settings.read' },
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
  const { area } = await params;
  const session = await getSessionContext();
  if (!session) redirect('/login');

  if (isOperationsDirectoryArea(area)) {
    const query = await searchParams;
    const model = getOperationsDirectoryModel(session, area, {
      mode: singleValue(query.mode),
      state: singleValue(query.state),
    });
    return <OperationsDirectoryView model={model} />;
  }

  const target = areas[area] ?? { label: 'Área', permission: 'dashboard.read' as Permission };
  if (!session.permissions.includes(target.permission)) redirect('/forbidden');
  return (
    <div className="placeholder-page">
      <div>
        <p className="eyebrow">Fundacao do produto</p>
        <h1>{target.label}</h1>
        <p>
          Esta área está protegida pelo contexto autorizado do workspace. O fluxo de negócio entra
          em uma próxima mudanca OpenSpec.
        </p>
        <Link className="button button-secondary" href="/">
          Voltar para a visão geral
        </Link>
      </div>
    </div>
  );
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
