import { redirect } from 'next/navigation';
import {
  Bell,
  Building2,
  CreditCard,
  KeyRound,
  Link2,
  Palette,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { getSessionContext } from '../../lib/auth/server';

const settingsSections = [
  {
    title: 'Barbearia e filiais',
    description: 'Dados da empresa, unidades, horários padrão e contexto operacional.',
    icon: Building2,
    status: 'Base configurada',
  },
  {
    title: 'Usuários e permissões',
    description: 'Convites, papéis, escopo por filial e acessos do time.',
    icon: Users,
    status: 'RBAC ativo',
  },
  {
    title: 'Segurança',
    description: 'Sessões, políticas de acesso, auditoria e proteção de dados.',
    icon: ShieldCheck,
    status: 'Obrigatório',
  },
  {
    title: 'Integrações',
    description: 'Supabase, WhatsApp, pagamentos, agenda externa e webhooks.',
    icon: Link2,
    status: 'Em preparação',
  },
  {
    title: 'Plano e cobrança',
    description: 'Assinatura SaaS, limites, entitlements e notas fiscais.',
    icon: CreditCard,
    status: 'Admin',
  },
  {
    title: 'Preferências',
    description: 'Tema, notificações, idioma, formato monetário e experiência.',
    icon: Palette,
    status: 'Por usuário',
  },
];

export default async function ConfiguracoesPage() {
  const session = await getSessionContext();
  if (!session) redirect('/login');
  if (!session.permissions.includes('settings.read')) redirect('/forbidden');

  return (
    <div className="settings-page">
      <header className="settings-heading">
        <div>
          <p className="eyebrow">Sistema</p>
          <h1>Configurações</h1>
          <p className="subheading">
            {session.tenantName} · Centralize usuários, filiais, segurança, integrações e
            preferências.
          </p>
        </div>
      </header>

      <section className="settings-summary" aria-label="Resumo do ambiente">
        <article>
          <Building2 size={18} aria-hidden="true" />
          <span>Workspace</span>
          <strong>{session.tenantName}</strong>
        </article>
        <article>
          <KeyRound size={18} aria-hidden="true" />
          <span>Perfil</span>
          <strong>{session.role}</strong>
        </article>
        <article>
          <Bell size={18} aria-hidden="true" />
          <span>Notificações</span>
          <strong>Operacionais</strong>
        </article>
      </section>

      <section className="settings-grid" aria-label="Áreas de configuração">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <article className="settings-card" key={section.title}>
              <div className="settings-card-icon">
                <Icon size={20} aria-hidden="true" />
              </div>
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <span>{section.status}</span>
            </article>
          );
        })}
      </section>
    </div>
  );
}
