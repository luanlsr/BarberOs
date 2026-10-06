import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  KeyRound,
  Link2,
  Palette,
  ShieldCheck,
  Smartphone,
  Users,
  WalletCards,
} from 'lucide-react';
import { BusinessHoursSettingsPanel } from '../../../components/business-hours-settings-panel';
import { TenantPreferencesPanel } from '../../../components/tenant-preferences-panel';
import { getSessionContext } from '../../../lib/auth/server';
import { getAgendaViewModel } from '../../../lib/agenda-data';
import { getTenantVisualPreferences } from '../../../lib/settings-preferences';
import { getPersistentStoreOperationsSettings } from '../../../lib/store-operations-settings-server';
import { getTenantBillingSettingsViewModel } from '../../../lib/tenant-billing-settings';
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
  if (!session) redirect('/');
  if (!session.permissions.includes('settings.read')) redirect('/forbidden');
  if (!canAccessSettingsSection(section, session)) redirect('/forbidden');

  const Icon = sectionIcons[section.icon];
  const visibleSections = settingsSections.filter((candidate) =>
    canAccessSettingsSection(candidate, session),
  );
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const storeOperationsSettings =
    section.key === 'barbearia-filiais'
      ? await getPersistentStoreOperationsSettings(session, branchId)
      : null;
  const agendaModel =
    section.key === 'barbearia-filiais'
      ? await getAgendaViewModel(session, {
          operationsSettings: storeOperationsSettings ?? undefined,
        })
      : null;
  const tenantVisualPreferences =
    section.key === 'preferencias' ? await getTenantVisualPreferences(session.tenantId) : null;
  const tenantBilling =
    section.key === 'plano-cobranca' ? await getTenantBillingSettingsViewModel(session) : null;

  return (
    <div className="settings-page settings-section-page">
      <header className="settings-heading">
        <div>
          <p className="eyebrow">Sistema</p>
          <h1>{section.title}</h1>
          <p className="subheading">
            {session.tenantName} · {section.description}
          </p>
        </div>
        <span className="settings-section-status">{section.status}</span>
      </header>

      <nav className="settings-section-nav" aria-label="Submenus de configurações">
        {visibleSections.map((candidate) => {
          const CandidateIcon = sectionIcons[candidate.icon];
          return (
            <Link
              aria-current={candidate.key === section.key ? 'page' : undefined}
              className="settings-section-tab"
              href={candidate.href}
              key={candidate.key}
            >
              <CandidateIcon size={16} aria-hidden="true" />
              <span>{candidate.title}</span>
            </Link>
          );
        })}
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

          {section.key === 'barbearia-filiais' ? (
            <>
              <SettingsFormGrid
                items={[
                  ['Nome da barbearia', session.tenantName],
                  ['Unidade atual', session.branchName],
                  ['Documento', 'CNPJ pendente'],
                  ['Telefone comercial', 'Não informado'],
                ]}
              />
              <BusinessHoursSettingsPanel
                branchName={session.branchName}
                professionals={agendaModel?.professionals ?? []}
                settings={storeOperationsSettings!}
              />
            </>
          ) : null}

          {section.key === 'usuarios-permissoes' ? (
            <SettingsOperationalPanel
              cards={[
                {
                  icon: Users,
                  title: 'Convites do time',
                  body: 'Inclua usuários por filial e defina se serão owner, gerente, recepção, financeiro ou profissional.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Permissões por papel',
                  body: 'Libere agenda, caixa, financeiro, estoque e campanhas de acordo com a função operacional.',
                },
                {
                  icon: Building2,
                  title: 'Escopo por filial',
                  body: 'Recepcionistas e barbeiros podem ser limitados apenas às filiais em que atuam.',
                },
              ]}
            />
          ) : null}

          {section.key === 'seguranca' ? (
            <SettingsOperationalPanel
              cards={[
                {
                  icon: KeyRound,
                  title: 'Política de senha',
                  body: 'Defina tamanho mínimo, expiração opcional e exigência de redefinição no próximo login.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Bloqueios e sessões',
                  body: 'Bloqueie usuários do tenant, encerre sessões suspeitas e revise acessos ativos.',
                },
                {
                  icon: Bell,
                  title: 'Alertas sensíveis',
                  body: 'Receba avisos de acesso, falhas de pagamento, fim de plano e ações críticas.',
                },
              ]}
            />
          ) : null}

          {section.key === 'integracoes' ? (
            <SettingsOperationalPanel
              cards={[
                {
                  icon: Smartphone,
                  title: 'WhatsApp com IA',
                  body: 'Conecte o número de atendimento para conversas, lembretes e campanhas assistidas pelo Barber AI.',
                },
                {
                  icon: CalendarDays,
                  title: 'Google Calendar',
                  body: 'Sincronize agenda por filial ou profissional para evitar conflitos fora do BarberOS.',
                },
                {
                  icon: FileText,
                  title: 'Google Drive',
                  body: 'Defina a pasta para comprovantes, anexos de despesas e documentos fiscais.',
                },
              ]}
            />
          ) : null}

          {section.key === 'plano-cobranca' ? (
            <>
              <SettingsFormGrid items={tenantBilling?.summaryItems ?? []} />
              <SettingsOperationalPanel
                cards={(tenantBilling?.operationalCards ?? []).map((card, index) => ({
                  icon: [CreditCard, WalletCards, FileText][index] ?? FileText,
                  title: card.title,
                  body: card.body,
                }))}
              />
            </>
          ) : null}

          {section.key === 'preferencias' ? (
            <>
              <TenantPreferencesPanel
                canManage={session.permissions.includes('settings.manage')}
                initialPreferences={tenantVisualPreferences}
              />
              <SettingsOperationalPanel
                cards={[
                  {
                    icon: Palette,
                    title: 'Identidade visual',
                    body: 'Aplique logo, cor da fonte e destaque respeitando contraste e acessibilidade.',
                  },
                  {
                    icon: Bell,
                    title: 'Preferências de notificação',
                    body: 'Escolha alertas de estoque, cobranças, pagamentos de equipe e fim de plano.',
                  },
                ]}
              />
            </>
          ) : null}
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

function SettingsFormGrid({ items }: Readonly<{ items: readonly [string, string][] }>) {
  return (
    <div className="settings-form-grid">
      {items.map(([label, value]) => (
        <label key={label}>
          {label}
          <input defaultValue={value} />
        </label>
      ))}
    </div>
  );
}

function SettingsOperationalPanel({
  cards,
}: Readonly<{
  cards: readonly {
    icon: typeof Building2;
    title: string;
    body: string;
  }[];
}>) {
  return (
    <div className="settings-operational-grid">
      {cards.map((card) => {
        const CardIcon = card.icon;
        return (
          <article key={card.title}>
            <CardIcon size={18} aria-hidden="true" />
            <div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
