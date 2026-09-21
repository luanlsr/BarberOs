import { redirect } from 'next/navigation';
import { getSessionContext } from '../../lib/auth/server';

const masterSections = [
  {
    title: 'Tenants',
    description: 'Visao dos tenants, status operacional, filiais e limites contratados.',
  },
  {
    title: 'Usuarios',
    description: 'Administracao de acessos da plataforma e suporte aos usuarios dos tenants.',
  },
  {
    title: 'Assinaturas',
    description: 'Planos SaaS, assinaturas, invoices, pagamentos e inadimplencia.',
  },
  {
    title: 'Operacao SaaS',
    description: 'Auditoria, incidentes, uso de IA, integracoes e feature flags.',
  },
] as const;

export default async function MasterAdminPage() {
  const session = await getSessionContext();
  if (!session) redirect('/login');
  if (session.role !== 'PLATFORM_MASTER') redirect('/forbidden');

  return (
    <main className="page-shell page-shell-narrow">
      <section className="hero-panel">
        <p className="eyebrow">Plataforma BarberOS</p>
        <h1>Master Admin</h1>
        <p>
          Area separada para administracao global do SaaS: tenants, usuarios, assinaturas,
          pagamentos, suporte, auditoria e operacao da plataforma.
        </p>
      </section>

      <section className="summary-grid" aria-label="Areas administrativas da plataforma">
        {masterSections.map((section) => (
          <article className="summary-card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
