import Link from 'next/link';
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
import {
  canAccessSettingsSection,
  settingsSections,
  type SettingsSectionIcon,
} from '../../lib/settings-sections';

const sectionIcons = {
  building: Building2,
  users: Users,
  shield: ShieldCheck,
  link: Link2,
  'credit-card': CreditCard,
  palette: Palette,
} satisfies Record<SettingsSectionIcon, typeof Building2>;

export default async function ConfiguracoesPage() {
  const session = await getSessionContext();
  if (!session) redirect('/login');
  if (!session.permissions.includes('settings.read')) redirect('/forbidden');

  const visibleSections = settingsSections.filter((section) =>
    canAccessSettingsSection(section, session),
  );

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
        {visibleSections.map((section) => {
          const Icon = sectionIcons[section.icon];
          return (
            <Link
              className="settings-card settings-card-link"
              href={section.href}
              key={section.key}
            >
              <div className="settings-card-icon">
                <Icon size={20} aria-hidden="true" />
              </div>
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <span>{section.status}</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
