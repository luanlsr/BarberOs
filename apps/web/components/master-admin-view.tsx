'use client';

import * as React from 'react';
import type { TenantLifecycleAction } from '@barberos/contracts';
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

export type MasterAdminViewState = 'ready' | 'loading' | 'empty' | 'error' | 'permission-denied';
type PlanDialogMode = 'create' | 'edit' | 'archive';
type PlanFormValues = {
  code: string;
  name: string;
  description: string;
  priceAmount: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  status: string;
  entitlement: string;
  entitlementEnabled: boolean;
  entitlementLimit: string;
  reason: string;
};

export function MasterAdminView({
  data,
  message,
  state = 'ready',
}: Readonly<{ data: MasterAdminData; message?: string; state?: MasterAdminViewState }>) {
  const [tenants, setTenants] = React.useState(data.tenants);
  const [plans, setPlans] = React.useState(data.plans);
  const [entitlements, setEntitlements] = React.useState(data.entitlements);
  const [dialog, setDialog] = React.useState<{
    action: TenantLifecycleAction;
    tenant: MasterAdminData['tenants'][number];
  } | null>(null);
  const [planDialog, setPlanDialog] = React.useState<{
    mode: PlanDialogMode;
    plan?: MasterAdminData['plans'][number];
  } | null>(null);
  const [entitlementDialog, setEntitlementDialog] = React.useState<
    MasterAdminData['entitlements'][number] | null
  >(null);
  const [reason, setReason] = React.useState('');
  const [planForm, setPlanForm] = React.useState<PlanFormValues>(emptyPlanForm());
  const [entitlementForm, setEntitlementForm] = React.useState({
    enabled: true,
    limit: '',
    reason: '',
  });
  const [supportQuery, setSupportQuery] = React.useState('');
  const [auditActionFilter, setAuditActionFilter] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ kind: 'success' | 'error'; text: string }>();

  if (state !== 'ready') {
    return <MasterAdminState state={state} message={message} />;
  }

  if (!hasOperationalData(data)) {
    return <MasterAdminState state="empty" message="Nenhum dado operacional encontrado." />;
  }

  const filteredSupportScopes = data.supportScopes.filter((scope) =>
    `${scope.tenantName} ${scope.operationClass} ${scope.status} ${scope.purpose}`
      .toLowerCase()
      .includes(supportQuery.trim().toLowerCase()),
  );
  const filteredAudit = data.audit.filter(
    (entry) => !auditActionFilter || entry.action === auditActionFilter,
  );
  const auditActions = Array.from(new Set(data.audit.map((entry) => entry.action))).sort();

  return (
    <main className="master-admin-page" data-density="responsive">
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
          ['#invoices', 'Invoices'],
          ['#plans', 'Planos'],
          ['#entitlements', 'Entitlements'],
          ['#support', 'Suporte'],
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
            {tenants.map((tenant) => (
              <div className="master-table-row" role="row" key={tenant.id}>
                <strong>{tenant.name}</strong>
                <StatusPill value={tenant.status} />
                <span>{tenant.branchCount}</span>
                <span>{tenant.userCount}</span>
                <span>{tenant.planName}</span>
                <div className="master-action-row">
                  <button type="button" onClick={() => openDialog(tenant, 'RESTRICT')}>
                    Restringir
                  </button>
                  <button type="button" onClick={() => openDialog(tenant, 'SUSPEND')}>
                    Suspender
                  </button>
                  <button type="button" onClick={() => openDialog(tenant, 'REACTIVATE')}>
                    Reativar
                  </button>
                </div>
              </div>
            ))}
            {!tenants.length ? <EmptyMasterState text="Nenhum tenant encontrado." /> : null}
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
            {!data.users.length ? <EmptyMasterState text="Nenhum usuário listado." /> : null}
          </div>
        </MasterPanel>

        <MasterPanel id="subscriptions" icon={CreditCard} title="Assinaturas">
          <BillingStatusSummary invoices={data.invoices} subscriptions={data.subscriptions} />
          <div className="master-list">
            {data.subscriptions.map((subscription) => (
              <article className="master-list-row" key={subscription.id}>
                <div>
                  <strong>{subscription.tenantName}</strong>
                  <span>
                    {subscription.planName} · vence {formatDate(subscription.currentPeriodEnd)}
                  </span>
                  <div className="master-tag-row">
                    <span>{subscription.tenantName}</span>
                    <span>{formatCurrency(subscription.monthlyValueCents)}</span>
                  </div>
                </div>
                <StatusPill value={subscription.status} />
              </article>
            ))}
            {!data.subscriptions.length ? (
              <EmptyMasterState text="Nenhuma assinatura registrada." />
            ) : null}
          </div>
        </MasterPanel>

        <MasterPanel id="invoices" icon={ReceiptText} title="Invoices">
          <InvoiceStatusSummary invoices={data.invoices} />
          <div className="master-list">
            {data.invoices.map((invoice) => (
              <article className="master-list-row" key={invoice.id}>
                <div>
                  <strong>{invoice.tenantName}</strong>
                  <span>
                    {formatCurrency(invoice.amountCents)}
                    {invoice.dueAt ? ` · vence ${formatDate(invoice.dueAt)}` : ''}
                  </span>
                </div>
                <StatusPill value={invoice.status} />
              </article>
            ))}
            {!data.invoices.length ? <EmptyMasterState text="Nenhuma invoice recente." /> : null}
          </div>
        </MasterPanel>

        <MasterPanel
          action={
            <button type="button" onClick={() => openPlanDialog('create')}>
              Novo plano
            </button>
          }
          id="plans"
          icon={ReceiptText}
          title="Planos"
        >
          <div className="master-card-grid">
            {plans.map((plan) => (
              <article className="master-mini-card" key={plan.id}>
                <span>{plan.code}</span>
                <strong>{plan.name}</strong>
                <p>
                  {formatCurrency(plan.priceAmountCents)} / {plan.billingInterval.toLowerCase()}
                </p>
                <StatusPill value={plan.status} />
                <div className="master-action-row">
                  <button type="button" onClick={() => openPlanDialog('edit', plan)}>
                    Editar
                  </button>
                  <button
                    disabled={plan.status === 'ARCHIVED'}
                    type="button"
                    onClick={() => openPlanDialog('archive', plan)}
                  >
                    Arquivar
                  </button>
                </div>
              </article>
            ))}
            {!plans.length ? <EmptyMasterState text="Nenhum plano configurado." /> : null}
          </div>
        </MasterPanel>

        <MasterPanel id="entitlements" icon={ShieldCheck} title="Entitlements">
          <div className="master-list">
            {entitlements.slice(0, 12).map((entitlement) => (
              <article className="master-list-row" key={entitlement.id}>
                <div>
                  <strong>{entitlement.tenantName}</strong>
                  <span>
                    {entitlement.entitlement} · {entitlement.source}
                    {entitlement.limit !== undefined ? ` · limite ${entitlement.limit}` : ''}
                  </span>
                </div>
                <StatusPill value={entitlement.allowed ? 'ALLOW' : 'DENY'} />
                <button type="button" onClick={() => openEntitlementDialog(entitlement)}>
                  Override
                </button>
              </article>
            ))}
            {!entitlements.length ? (
              <EmptyMasterState text="Nenhum entitlement resolvido." />
            ) : null}
          </div>
        </MasterPanel>

        <MasterPanel id="support" icon={ShieldCheck} title="Suporte">
          <div className="master-filter-row">
            <label>
              Buscar suporte
              <input
                onChange={(event) => setSupportQuery(event.target.value)}
                placeholder="Tenant, classe ou status"
                value={supportQuery}
              />
            </label>
          </div>
          <div className="master-list">
            {filteredSupportScopes.map((scope) => (
              <article className="master-list-row" key={scope.id}>
                <div>
                  <strong>{scope.tenantName}</strong>
                  <span>
                    {scope.operationClass} · expira {formatDate(scope.expiresAt)}
                  </span>
                  <div className="master-tag-row">
                    <span>{scope.purpose}</span>
                    {scope.status === 'EXPIRED' ? <span>Expirado</span> : null}
                  </div>
                </div>
                <StatusPill value={scope.status} />
              </article>
            ))}
            {!filteredSupportScopes.length ? (
              <EmptyMasterState text="Nenhum escopo de suporte encontrado." />
            ) : null}
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
          <div className="master-filter-row">
            <label>
              Ação
              <select
                onChange={(event) => setAuditActionFilter(event.target.value)}
                value={auditActionFilter}
              >
                <option value="">Todas</option>
                {auditActions.map((action) => (
                  <option key={action} value={action}>
                    {action.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="master-list">
            {filteredAudit.slice(0, 8).map((entry) => (
              <article className="master-list-row" key={entry.id}>
                <div>
                  <strong>{entry.action}</strong>
                  <span>
                    {entry.tenantName} · {entry.entityType ?? 'registro'}
                  </span>
                  {hasRedactedMetadata(entry.metadata) ? (
                    <div className="master-tag-row">
                      <span>Metadata redigida</span>
                    </div>
                  ) : null}
                </div>
                <span>{entry.createdAt ? formatDate(entry.createdAt) : 'Agora'}</span>
              </article>
            ))}
            {!filteredAudit.length ? (
              <EmptyMasterState text="Nenhum evento de auditoria recente." />
            ) : null}
          </div>
        </MasterPanel>
      </section>
      {feedback ? (
        <p className={`master-feedback master-feedback-${feedback.kind}`}>{feedback.text}</p>
      ) : null}
      {dialog ? (
        <TenantLifecycleDialog
          action={dialog.action}
          isSubmitting={isSubmitting}
          onClose={closeDialog}
          onReasonChange={setReason}
          onSubmit={submitLifecycleAction}
          reason={reason}
          tenantName={dialog.tenant.name}
        />
      ) : null}
      {planDialog ? (
        <PlanManagementDialog
          form={planForm}
          isSubmitting={isSubmitting}
          mode={planDialog.mode}
          onChange={updatePlanForm}
          onClose={closePlanDialog}
          onSubmit={submitPlanDialog}
          planName={planDialog.plan?.name}
        />
      ) : null}
      {entitlementDialog ? (
        <EntitlementOverrideDialog
          entitlement={entitlementDialog}
          form={entitlementForm}
          isSubmitting={isSubmitting}
          onChange={updateEntitlementForm}
          onClose={closeEntitlementDialog}
          onSubmit={submitEntitlementOverride}
        />
      ) : null}
    </main>
  );

  function openDialog(tenant: MasterAdminData['tenants'][number], action: TenantLifecycleAction) {
    setDialog({ action, tenant });
    setReason('');
    setFeedback(undefined);
  }

  function closeDialog() {
    if (!isSubmitting) {
      setDialog(null);
      setReason('');
    }
  }

  async function submitLifecycleAction() {
    if (!dialog || reason.trim().length < 3) return;
    setIsSubmitting(true);
    setFeedback(undefined);
    try {
      const response = await fetch(`/api/v1/platform/tenants?action=${dialog.action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: dialog.tenant.id,
          action: dialog.action,
          reason: reason.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: {
          tenantId?: string;
          tenantName?: string;
          lifecycleStatus?: string;
          branchCount?: number;
          userCount?: number;
          planName?: string;
          subscriptionStatus?: string;
        };
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Não foi possível aplicar a ação.');
      }
      setTenants((current) =>
        current.map((tenant) =>
          tenant.id === payload.data?.tenantId
            ? {
                ...tenant,
                name: payload.data.tenantName ?? tenant.name,
                status: payload.data.lifecycleStatus ?? tenant.status,
                branchCount: payload.data.branchCount ?? tenant.branchCount,
                userCount: payload.data.userCount ?? tenant.userCount,
                planName: payload.data.planName ?? tenant.planName,
                subscriptionStatus: payload.data.subscriptionStatus ?? tenant.subscriptionStatus,
              }
            : tenant,
        ),
      );
      setDialog(null);
      setReason('');
      setFeedback({ kind: 'success', text: 'Ação aplicada com sucesso.' });
    } catch (error) {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível aplicar a ação.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function openPlanDialog(mode: PlanDialogMode, plan?: MasterAdminData['plans'][number]) {
    setPlanDialog({ mode, plan });
    setPlanForm(plan ? planFormFromPlan(plan) : emptyPlanForm());
    setFeedback(undefined);
  }

  function closePlanDialog() {
    if (!isSubmitting) {
      setPlanDialog(null);
      setPlanForm(emptyPlanForm());
    }
  }

  function updatePlanForm(patch: Partial<PlanFormValues>) {
    setPlanForm((current) => ({ ...current, ...patch }));
  }

  async function submitPlanDialog() {
    if (!planDialog || !isPlanFormValid(planDialog.mode, planForm)) return;
    setIsSubmitting(true);
    setFeedback(undefined);
    try {
      const request = planRequestFromDialog(planDialog, planForm);
      const response = await fetch('/api/v1/platform/plans', request);
      const payload = (await response.json().catch(() => null)) as {
        data?: {
          id: string;
          code: string;
          name: string;
          description?: string;
          priceAmountCents: number;
          billingInterval: string;
          status: string;
        };
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Não foi possível salvar o plano.');
      }
      const nextPlan = planRowFromPayload(payload.data);
      setPlans((current) =>
        current.some((plan) => plan.id === nextPlan.id)
          ? current.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan))
          : [...current, nextPlan],
      );
      setPlanDialog(null);
      setPlanForm(emptyPlanForm());
      setFeedback({
        kind: 'success',
        text: planDialog.mode === 'archive' ? 'Plano arquivado.' : 'Plano salvo com sucesso.',
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível salvar o plano.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEntitlementDialog(entitlement: MasterAdminData['entitlements'][number]) {
    setEntitlementDialog(entitlement);
    setEntitlementForm({
      enabled: entitlement.allowed,
      limit: entitlement.limit === undefined ? '' : String(entitlement.limit),
      reason: '',
    });
    setFeedback(undefined);
  }

  function closeEntitlementDialog() {
    if (!isSubmitting) {
      setEntitlementDialog(null);
      setEntitlementForm({ enabled: true, limit: '', reason: '' });
    }
  }

  function updateEntitlementForm(patch: Partial<typeof entitlementForm>) {
    setEntitlementForm((current) => ({ ...current, ...patch }));
  }

  async function submitEntitlementOverride() {
    if (!entitlementDialog || !isEntitlementFormValid(entitlementForm)) return;
    const tenantId = entitlementDialog.id.split(':')[0];
    setIsSubmitting(true);
    setFeedback(undefined);
    try {
      const response = await fetch('/api/v1/platform/entitlements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          entitlement: entitlementDialog.entitlement,
          enabled: entitlementForm.enabled,
          limit: entitlementForm.limit.trim() ? Number(entitlementForm.limit) : undefined,
          reason: entitlementForm.reason.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: {
          tenantId: string;
          entitlement: string;
          allowed: boolean;
          source: string;
          limit?: number;
          reason?: string;
        };
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Não foi possível aplicar o override.');
      }
      setEntitlements((current) =>
        current.map((item) =>
          item.id === entitlementDialog.id
            ? {
                ...item,
                allowed: payload.data?.allowed ?? item.allowed,
                source: payload.data?.source ?? 'OVERRIDE',
                limit: payload.data?.limit,
                reason: payload.data?.reason,
              }
            : item,
        ),
      );
      setEntitlementDialog(null);
      setEntitlementForm({ enabled: true, limit: '', reason: '' });
      setFeedback({ kind: 'success', text: 'Override aplicado com sucesso.' });
    } catch (error) {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível aplicar o override.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
}

function MasterAdminState({
  message,
  state,
}: Readonly<{ message?: string; state: Exclude<MasterAdminViewState, 'ready'> }>) {
  const content = {
    loading: {
      title: 'Carregando console',
      body: message ?? 'Buscando dados operacionais da plataforma.',
    },
    empty: {
      title: 'Nenhum dado encontrado',
      body: message ?? 'A plataforma ainda não possui registros para esta visão.',
    },
    error: {
      title: 'Não foi possível carregar',
      body: message ?? 'Tente novamente em instantes.',
    },
    'permission-denied': {
      title: 'Acesso restrito',
      body: message ?? 'Esta visão exige permissão de plataforma.',
    },
  }[state];

  return (
    <main className="master-admin-page" data-density="responsive">
      <section className="master-hero">
        <div>
          <p className="eyebrow">Platform Admin</p>
          <h1>Super Admin BarberOS</h1>
          <p>{content.body}</p>
        </div>
      </section>
      <section className="master-state" aria-live={state === 'loading' ? 'polite' : undefined}>
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <h2>{content.title}</h2>
          <p>{content.body}</p>
        </div>
      </section>
    </main>
  );
}

function hasOperationalData(data: MasterAdminData) {
  return Boolean(
    data.tenants.length ||
    data.plans.length ||
    data.subscriptions.length ||
    data.invoices.length ||
    data.entitlements.length ||
    data.supportScopes.length ||
    data.audit.length,
  );
}

function TenantLifecycleDialog({
  action,
  isSubmitting,
  onClose,
  onReasonChange,
  onSubmit,
  reason,
  tenantName,
}: Readonly<{
  action: TenantLifecycleAction;
  isSubmitting: boolean;
  onClose(): void;
  onReasonChange(value: string): void;
  onSubmit(): void;
  reason: string;
  tenantName: string;
}>) {
  const title = {
    RESTRICT: 'Restringir tenant',
    SUSPEND: 'Suspender tenant',
    REACTIVATE: 'Reativar tenant',
  }[action];

  return (
    <div
      className="master-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section aria-modal="true" className="master-modal" role="dialog">
        <header>
          <h2>{title}</h2>
          <button aria-label="Fechar modal" type="button" onClick={onClose}>
            Fechar
          </button>
        </header>
        <p>{tenantName}</p>
        <label>
          Motivo
          <textarea
            autoFocus
            disabled={isSubmitting}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Descreva o motivo operacional ou financeiro."
            value={reason}
          />
        </label>
        <footer>
          <button disabled={isSubmitting} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            disabled={reason.trim().length < 3 || isSubmitting}
            type="button"
            onClick={onSubmit}
          >
            {isSubmitting ? 'Aplicando' : 'Confirmar'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function BillingStatusSummary({
  invoices,
  subscriptions,
}: Readonly<{
  invoices: MasterAdminData['invoices'];
  subscriptions: MasterAdminData['subscriptions'];
}>) {
  const counts = countByStatus(subscriptions);
  const invoiceTotals = sumInvoicesByStatus(invoices);
  return (
    <div className="master-billing-summary" aria-label="Resumo de billing">
      {['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED'].map((status) => (
        <article key={status}>
          <span>{status.replaceAll('_', ' ')}</span>
          <strong>{numberFormatter.format(counts.get(status) ?? 0)}</strong>
        </article>
      ))}
      <article>
        <span>Open invoices</span>
        <strong>{formatCurrency(invoiceTotals.get('OPEN') ?? 0)}</strong>
      </article>
    </div>
  );
}

function InvoiceStatusSummary({ invoices }: Readonly<{ invoices: MasterAdminData['invoices'] }>) {
  const totals = sumInvoicesByStatus(invoices);
  return (
    <div className="master-billing-summary" aria-label="Totais de invoices">
      {['OPEN', 'PAID', 'OVERDUE', 'UNCOLLECTIBLE'].map((status) => (
        <article key={status}>
          <span>{status}</span>
          <strong>{formatCurrency(totals.get(status) ?? 0)}</strong>
        </article>
      ))}
    </div>
  );
}

function PlanManagementDialog({
  form,
  isSubmitting,
  mode,
  onChange,
  onClose,
  onSubmit,
  planName,
}: Readonly<{
  form: PlanFormValues;
  isSubmitting: boolean;
  mode: PlanDialogMode;
  onChange(patch: Partial<PlanFormValues>): void;
  onClose(): void;
  onSubmit(): void;
  planName?: string;
}>) {
  const title = {
    create: 'Novo plano',
    edit: 'Editar plano',
    archive: 'Arquivar plano',
  }[mode];
  const valid = isPlanFormValid(mode, form);

  return (
    <div
      className="master-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section aria-modal="true" className="master-modal master-modal-wide" role="dialog">
        <header>
          <h2>{title}</h2>
          <button aria-label="Fechar modal" type="button" onClick={onClose}>
            Fechar
          </button>
        </header>
        {mode === 'archive' ? (
          <>
            <p>{planName}</p>
            <label>
              Motivo
              <textarea
                disabled={isSubmitting}
                onChange={(event) => onChange({ reason: event.target.value })}
                placeholder="Descreva por que este plano será arquivado."
                value={form.reason}
              />
            </label>
          </>
        ) : (
          <div className="master-form-grid">
            <label>
              Código
              <input
                disabled={isSubmitting || mode === 'edit'}
                onChange={(event) => onChange({ code: event.target.value })}
                value={form.code}
              />
            </label>
            <label>
              Nome
              <input
                disabled={isSubmitting}
                onChange={(event) => onChange({ name: event.target.value })}
                value={form.name}
              />
            </label>
            <label>
              Preço mensal
              <input
                disabled={isSubmitting}
                inputMode="decimal"
                onChange={(event) => onChange({ priceAmount: event.target.value })}
                value={form.priceAmount}
              />
            </label>
            <label>
              Intervalo
              <select
                disabled={isSubmitting}
                onChange={(event) =>
                  onChange({ billingInterval: event.target.value as 'MONTHLY' | 'YEARLY' })
                }
                value={form.billingInterval}
              >
                <option value="MONTHLY">Mensal</option>
                <option value="YEARLY">Anual</option>
              </select>
            </label>
            <label>
              Status
              <select
                disabled={isSubmitting}
                onChange={(event) => onChange({ status: event.target.value })}
                value={form.status}
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="ARCHIVED">Arquivado</option>
              </select>
            </label>
            <label>
              Entitlement
              <select
                disabled={isSubmitting}
                onChange={(event) => onChange({ entitlement: event.target.value })}
                value={form.entitlement}
              >
                {['core.operations', 'finance', 'inventory', 'messaging', 'campaigns', 'ai'].map(
                  (item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Limite
              <input
                disabled={isSubmitting}
                inputMode="numeric"
                onChange={(event) => onChange({ entitlementLimit: event.target.value })}
                value={form.entitlementLimit}
              />
            </label>
            <label>
              Descrição
              <textarea
                disabled={isSubmitting}
                onChange={(event) => onChange({ description: event.target.value })}
                value={form.description}
              />
            </label>
            <label className="master-checkbox-row">
              <input
                checked={form.entitlementEnabled}
                disabled={isSubmitting}
                onChange={(event) => onChange({ entitlementEnabled: event.target.checked })}
                type="checkbox"
              />
              Entitlement habilitado
            </label>
          </div>
        )}
        <footer>
          <button disabled={isSubmitting} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button disabled={!valid || isSubmitting} type="button" onClick={onSubmit}>
            {isSubmitting ? 'Salvando' : mode === 'archive' ? 'Arquivar' : 'Salvar'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function EntitlementOverrideDialog({
  entitlement,
  form,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: Readonly<{
  entitlement: MasterAdminData['entitlements'][number];
  form: { enabled: boolean; limit: string; reason: string };
  isSubmitting: boolean;
  onChange(patch: Partial<{ enabled: boolean; limit: string; reason: string }>): void;
  onClose(): void;
  onSubmit(): void;
}>) {
  return (
    <div
      className="master-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section aria-modal="true" className="master-modal" role="dialog">
        <header>
          <h2>Override de entitlement</h2>
          <button aria-label="Fechar modal" type="button" onClick={onClose}>
            Fechar
          </button>
        </header>
        <p>
          {entitlement.tenantName} · {entitlement.entitlement}
        </p>
        <label className="master-checkbox-row">
          <input
            checked={form.enabled}
            disabled={isSubmitting}
            onChange={(event) => onChange({ enabled: event.target.checked })}
            type="checkbox"
          />
          Permitir entitlement
        </label>
        <label>
          Limite
          <input
            disabled={isSubmitting}
            inputMode="numeric"
            onChange={(event) => onChange({ limit: event.target.value })}
            value={form.limit}
          />
        </label>
        <label>
          Motivo
          <textarea
            disabled={isSubmitting}
            onChange={(event) => onChange({ reason: event.target.value })}
            placeholder="Descreva a exceção comercial ou operacional."
            value={form.reason}
          />
        </label>
        <footer>
          <button disabled={isSubmitting} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            disabled={!isEntitlementFormValid(form) || isSubmitting}
            type="button"
            onClick={onSubmit}
          >
            {isSubmitting ? 'Aplicando' : 'Aplicar override'}
          </button>
        </footer>
      </section>
    </div>
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
  action,
  children,
  icon: Icon,
  id,
  title,
}: Readonly<{
  action?: React.ReactNode;
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
        {action ? <div className="master-panel-actions">{action}</div> : null}
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

function emptyPlanForm(): PlanFormValues {
  return {
    code: '',
    name: '',
    description: '',
    priceAmount: '',
    billingInterval: 'MONTHLY',
    status: 'ACTIVE',
    entitlement: 'core.operations',
    entitlementEnabled: true,
    entitlementLimit: '',
    reason: '',
  };
}

function planFormFromPlan(plan: MasterAdminData['plans'][number]): PlanFormValues {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    priceAmount: String(plan.priceAmountCents / 100),
    billingInterval: plan.billingInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
    status: plan.status,
    entitlement: 'core.operations',
    entitlementEnabled: true,
    entitlementLimit: '',
    reason: '',
  };
}

function isPlanFormValid(mode: PlanDialogMode, form: PlanFormValues) {
  if (mode === 'archive') return form.reason.trim().length >= 3;
  return (
    form.code.trim().length >= 2 &&
    form.name.trim().length >= 2 &&
    moneyToCents(form.priceAmount) >= 0 &&
    isOptionalNonNegativeInteger(form.entitlementLimit)
  );
}

function isEntitlementFormValid(form: { limit: string; reason: string }) {
  return form.reason.trim().length >= 3 && isOptionalNonNegativeInteger(form.limit);
}

function planRequestFromDialog(
  dialog: { mode: PlanDialogMode; plan?: MasterAdminData['plans'][number] },
  form: PlanFormValues,
): RequestInit {
  if (dialog.mode === 'archive') {
    return {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        planId: dialog.plan?.id,
        reason: form.reason.trim(),
      }),
    };
  }

  const payload = {
    ...(dialog.mode === 'edit' ? { id: dialog.plan?.id } : {}),
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    priceAmountCents: moneyToCents(form.priceAmount),
    billingInterval: form.billingInterval,
    status: form.status,
    entitlements: [
      {
        entitlement: form.entitlement,
        enabled: form.entitlementEnabled,
        limit: form.entitlementLimit.trim() ? Number(form.entitlementLimit) : undefined,
      },
    ],
  };

  return {
    method: dialog.mode === 'edit' ? 'PATCH' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

function planRowFromPayload(input: {
  id: string;
  code: string;
  name: string;
  description?: string;
  priceAmountCents: number;
  billingInterval: string;
  status: string;
}): MasterAdminData['plans'][number] {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    description: input.description,
    priceAmountCents: input.priceAmountCents,
    billingInterval: input.billingInterval,
    status: input.status,
  };
}

function moneyToCents(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : -1;
}

function isOptionalNonNegativeInteger(value: string) {
  if (!value.trim()) return true;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0;
}

function countByStatus(rows: readonly { status: string }[]) {
  return rows.reduce(
    (totals, row) => totals.set(row.status, (totals.get(row.status) ?? 0) + 1),
    new Map<string, number>(),
  );
}

function sumInvoicesByStatus(rows: readonly { amountCents: number; status: string }[]) {
  return rows.reduce(
    (totals, row) => totals.set(row.status, (totals.get(row.status) ?? 0) + row.amountCents),
    new Map<string, number>(),
  );
}

function hasRedactedMetadata(value: unknown): boolean {
  if (value === '[redacted]') return true;
  if (Array.isArray(value)) return value.some((item) => hasRedactedMetadata(item));
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some((item) => hasRedactedMetadata(item));
}
