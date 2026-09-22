import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Link2,
  Palette,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { getSessionContext } from '../../../lib/auth/server';
import {
  canAccessSettingsSection,
  getSettingsSection,
  settingsSections,
  type SettingsSectionIcon,
} from '../../../lib/settings-sections';

const sectionIcons = {
  building: Building2,
  users: Users,
  shield: ShieldCheck,
  link: Link2,
  'credit-card': CreditCard,
  palette: Palette,
} satisfies Record<SettingsSectionIcon, typeof Building2>;

type SettingsSectionPageParams = Promise<{ section: string }>;

export default async function SettingsSectionPage({
  params,
}: Readonly<{ params: SettingsSectionPageParams }>) {
  const { section: sectionKey } = await params;
  const section = getSettingsSection(sectionKey);
  if (!section) notFound();

  const session = await getSessionContext();
  if (!session) redirect('/login');
  if (!session.permissions.includes('settings.read')) redirect('/forbidden');
  if (!canAccessSettingsSection(section, session)) redirect('/forbidden');

  const Icon = sectionIcons[section.icon];
  const visibleSections = settingsSections.filter((candidate) =>
    canAccessSettingsSection(candidate, session),
  );

  return (
    <div className="settings-page settings-section-page">
      <header className="settings-heading">
        <div>
          <Link className="settings-back-link" href="/configuracoes">
            <ArrowLeft size={16} aria-hidden="true" />
            Configurações
          </Link>
          <p className="eyebrow">Sistema</p>
          <h1>{section.title}</h1>
          <p className="subheading">{section.description}</p>
        </div>
        <span className="settings-section-status">{section.status}</span>
      </header>

      <nav className="settings-section-nav" aria-label="Submenus de configurações">
        {visibleSections.map((candidate) => (
          <Link
            aria-current={candidate.key === section.key ? 'page' : undefined}
            className="settings-section-tab"
            href={candidate.href}
            key={candidate.key}
          >
            {candidate.title}
          </Link>
        ))}
      </nav>

      <section className="settings-section-layout" aria-label="Detalhes da configuração">
        <article className="settings-detail-panel">
          <div className="settings-detail-head">
            <div className="settings-card-icon">
              <Icon size={22} aria-hidden="true" />
            </div>
            <div>
              <h2>{section.title}</h2>
              <p>{section.summary}</p>
            </div>
          </div>

          <div className="settings-highlight-grid" aria-label="Resumo do submenu">
            {section.highlights.map((highlight) => (
              <div key={highlight.label}>
                <span>{highlight.label}</span>
                <strong>{highlight.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <aside className="settings-action-panel" aria-label="Próximas ações">
          <h2>Fluxo esperado</h2>
          <ul className="settings-task-list">
            {section.tasks.map((task) => (
              <li key={task}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
