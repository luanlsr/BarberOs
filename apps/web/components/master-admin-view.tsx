import type * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  CreditCard,
  Flag,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { MasterAdminData } from '../lib/master-admin-data';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('pt-BR');

export function MasterAdminView({ data }: Readonly<{ data: MasterAdminData }>) {
  return (
    <main className="master-admin-page">
      <section className="master-hero">
        <div>
          <p className="eyebrow">Platform Admin</p>
          <h1>Super Admin BarberOS</h1>
          <p>
            Visão global da plataforma: tenants, usuários, billing, IA, mensageria, incidentes,
            feature flags e auditoria.
          </p>
        </div>
        <div className="master-hero-status" aria-label="Status da plataforma">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Ambiente monitorado</span>
        </div>
      </section>

      <nav className="master-section-nav" aria-label="Visões do Super Admin">
        {[
          ['#tenants', 'Tenants'],
          ['#users', 'Usuários'],
          ['#subscriptions', 'Assinaturas'],
          ['#plans', 'Planos'],
          ['#ai-usage', 'AI Usage'],
          ['#messaging', 'Messaging'],
          ['#incidents', 'Incidentes'],
          ['#feature-flags', 'Flags'],
          ['#audit', 'Audit'],
        ].map(([href, label]) => (
          <a href={href} key={href}>
            {label}
          </a>
        ))}
      </nav>

      <section className="master-kpi-grid" aria-label="Indicadores globais">
        <MasterKpi
          icon={Building2}
          label="Tenants ativos"
          value={`${data.totals.activeTenants}/${data.totals.tenants}`}
        />
        <MasterKpi
          icon={CreditCard}
          label="MRR estimado"
          value={formatCurrency(data.totals.mrrCents)}
        />
        <MasterKpi
          icon={ReceiptText}
          label="Invoices em aberto"
          value={formatCurrency(data.totals.openInvoicesCents)}
        />
        <MasterKpi
          icon={Bot}
          label="AI requests"
          value={numberFormatter.format(data.totals.aiRequests)}
        />
        <MasterKpi
          icon={AlertTriangle}
          label="Incidentes abertos"
          value={numberFormatter.format(data.totals.incidentsOpen)}
        />
        <MasterKpi
          icon={ShieldCheck}
          label="Admins plataforma"
          value={numberFormatter.format(data.totals.platformUsers)}
        />
      </section>

      <section className="master-grid">
        <MasterPanel id="tenants" icon={Building2} title="Tenants">
          <div className="master-table" role="table" aria-label="Tenants">
            <MasterTableHeader columns={['Tenant', 'Status', 'Filiais', 'Usuários', 'Plano']} />
            {data.tenants.map((tenant) => (
              <div className="master-table-row" role="row" key={tenant.id}>
                <strong>{tenant.name}</strong>
                <StatusPill value={tenant.status} />
                <span>{tenant.branchCount}</span>
                <span>{tenant.userCount}</span>
                <span>{tenant.planName}</span>
              </div>
            ))}
          </div>
        </MasterPanel>

        <MasterPanel id="users" icon={Users} title="Usuários">
          <div className="master-list">
            {data.users.slice(0, 8).map((user) => (
              <article className="master-list-row" key={user.id}>
                <div>
                  <strong>{user.role}</strong>
                  <span>{user.scope === 'platform' ? 'Plataforma' : user.tenantName}</span>
                </div>
                <StatusPill value={user.status} />
              </article>
            ))}
          </div>
        </MasterPanel>

        <MasterPanel id="subscriptions" icon={CreditCard} title="Assinaturas">
          <div className="master-list">
            {data.subscriptions.map((subscription) => (
              <article className="master-list-row" key={subscription.id}>
                <div>
                  <strong>{subscription.tenantName}</strong>
                  <span>
                    {subscription.planName} · vence {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </div>
                <StatusPill value={subscription.status} />
              </article>
            ))}
          </div>
        </MasterPanel>

        <MasterPanel id="plans" icon={ReceiptText} title="Planos">
          <div className="master-card-grid">
            {data.plans.map((plan) => (
              <article className="master-mini-card" key={plan.id}>
                <span>{plan.code}</span>
                <strong>{plan.name}</strong>
                <p>
                  {formatCurrency(plan.priceAmountCents)} / {plan.billingInterval.toLowerCase()}
                </p>
                <StatusPill value={plan.status} />
              </article>
            ))}
          </div>
        </MasterPanel>

        <MasterPanel id="ai-usage" icon={Bot} title="AI Usage">
          <div className="master-list">
            {data.aiUsage.map((usage) => (
              <article className="master-list-row" key={`${usage.tenantName}-${usage.metric}`}>
                <div>
                  <strong>{usage.tenantName}</strong>
                  <span>{usage.metric}</span>
                </div>
                <b>{numberFormatter.format(usage.quantity)}</b>
              </article>
            ))}
          </div>
        </MasterPanel>

        <MasterPanel id="messaging" icon={MessageCircle} title="Messaging">
          <div className="master-list">
            {data.messaging.map((connection) => (
              <article className="master-list-row" key={connection.id}>
                <div>
                  <strong>{connection.tenantName}</strong>
                  <span>
                    {connection.provider} · {connection.channel}
                  </span>
                </div>
                <StatusPill value={connection.status} />
              </article>
            ))}
          </div>
        </MasterPanel>

        <MasterPanel id="incidents" icon={AlertTriangle} title="Incidentes">
          <div className="master-list">
            {data.incidents.map((incident) => (
              <article className="master-list-row" key={incident.id}>
                <div>
                  <strong>{incident.title}</strong>
                  <span>
                    {incident.affectedArea} · {formatDate(incident.startedAt)}
                  </span>
                </div>
                <StatusPill value={`${incident.severity} · ${incident.status}`} />
              </article>
            ))}
            {!data.incidents.length ? (
              <EmptyMasterState text="Nenhum incidente registrado." />
            ) : null}
          </div>
        </MasterPanel>

        <MasterPanel id="feature-flags" icon={Flag} title="Feature Flags">
          <div className="master-list">
            {data.featureFlags.map((flag) => (
              <article className="master-list-row" key={flag.id}>
                <div>
                  <strong>{flag.name}</strong>
                  <span>
                    {flag.key} · {flag.rollout}
                  </span>
                </div>
                <StatusPill value={flag.enabled ? flag.status : 'DISABLED'} />
              </article>
            ))}
          </div>
        </MasterPanel>

        <MasterPanel id="audit" icon={Activity} title="Audit">
          <div className="master-list">
            {data.audit.slice(0, 8).map((entry) => (
              <article className="master-list-row" key={entry.id}>
                <div>
                  <strong>{entry.action}</strong>
                  <span>
                    {entry.tenantName} · {entry.entityType ?? 'registro'}
                  </span>
                </div>
                <span>{entry.createdAt ? formatDate(entry.createdAt) : 'Agora'}</span>
              </article>
            ))}
            {!data.audit.length ? (
              <EmptyMasterState text="Nenhum evento de auditoria recente." />
            ) : null}
          </div>
        </MasterPanel>
      </section>
    </main>
  );
}

function MasterKpi({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: string;
}>) {
  return (
    <article className="master-kpi-card">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MasterPanel({
  children,
  icon: Icon,
  id,
  title,
}: Readonly<{
  children: React.ReactNode;
  icon: LucideIcon;
  id: string;
  title: string;
}>) {
  return (
    <section className="master-panel" id={id}>
      <header>
        <div>
          <Icon size={18} aria-hidden="true" />
          <h2>{title}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}

function MasterTableHeader({ columns }: Readonly<{ columns: string[] }>) {
  return (
    <div className="master-table-header" role="row">
      {columns.map((column) => (
        <span role="columnheader" key={column}>
          {column}
        </span>
      ))}
    </div>
  );
}

function StatusPill({ value }: Readonly<{ value: string }>) {
  return <span className="master-status-pill">{value.replaceAll('_', ' ')}</span>;
}

function EmptyMasterState({ text }: Readonly<{ text: string }>) {
  return <p className="master-empty-state">{text}</p>;
}

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}
