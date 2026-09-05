import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Permission } from '@barberos/contracts';
import { getSessionContext } from '../../lib/auth/server';

const areas: Record<string, { label: string; permission: Permission }> = {
  agenda: { label: 'Agenda', permission: 'appointments.read' },
  clientes: { label: 'Clientes', permission: 'customers.read' },
  financeiro: { label: 'Financeiro', permission: 'finance.read' },
  configuracoes: { label: 'Mais', permission: 'settings.read' },
};

export default async function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const session = await getSessionContext();
  if (!session) redirect('/login');
  const target = areas[area] ?? { label: 'Area', permission: 'dashboard.read' as Permission };
  if (!session.permissions.includes(target.permission)) redirect('/forbidden');
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
