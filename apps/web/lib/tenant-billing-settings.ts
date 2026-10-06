import type {
  BillingInterval,
  BillingInvoiceStatus,
  RequestContext,
  SaasPlanStatus,
  SessionContext,
  TenantSubscriptionStatus,
} from '@barberos/contracts';
import { createSupabaseServerClient } from './auth/server';

export type TenantBillingSubscription = {
  id: string;
  tenantId: string;
  planId: string;
  planName: string | null;
  planCode: string | null;
  provider: string | null;
  status: TenantSubscriptionStatus;
  currentPeriodEnd: string | null;
};

export type TenantBillingInvoice = {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  provider: string | null;
  externalReference: string | null;
  status: BillingInvoiceStatus;
  amountCents: number;
  dueDate: string | null;
  paidAt: string | null;
};

export type TenantBillingSettingsViewModel = {
  subscription: TenantBillingSubscription | null;
  invoices: readonly TenantBillingInvoice[];
  summaryItems: readonly [string, string][];
  operationalCards: readonly {
    title: string;
    body: string;
  }[];
};

type TenantSubscriptionRow = {
  id: string;
  tenant_id: string;
  plan_id: string;
  provider?: string | null;
  status: TenantSubscriptionStatus;
  current_period_end?: string | null;
  updated_at: string;
  saas_plan?: PlanRelation | PlanRelation[] | null;
};

type PlanRelation = {
  code?: string | null;
  name?: string | null;
  status?: SaasPlanStatus | null;
  billing_interval?: BillingInterval | null;
};

type BillingInvoiceRow = {
  id: string;
  tenant_id: string;
  subscription_id?: string | null;
  provider?: string | null;
  external_invoice_id?: string | null;
  status: BillingInvoiceStatus;
  amount_cents: number;
  due_at?: string | null;
  paid_at?: string | null;
  created_at: string;
};

export async function getTenantBillingSettingsViewModel(
  session: SessionContext,
): Promise<TenantBillingSettingsViewModel> {
  if (!session.permissions.includes('settings.read')) return buildTenantBillingViewModel(null, []);

  const client = await createSupabaseServerClient();
  if (!client) return buildTenantBillingViewModel(null, []);

  const context = toRequestContext(session);
  const [
    { data: subscriptionRows, error: subscriptionError },
    { data: invoiceRows, error: invoiceError },
  ] = await Promise.all([
    client
      .from('tenant_subscriptions')
      .select(
        'id, tenant_id, plan_id, provider, status, current_period_end, updated_at, saas_plan:saas_plans(code, name, status, billing_interval)',
      )
      .eq('tenant_id', context.tenantId)
      .order('updated_at', { ascending: false })
      .limit(1),
    client
      .from('billing_invoices')
      .select(
        'id, tenant_id, subscription_id, provider, external_invoice_id, status, amount_cents, due_at, paid_at, created_at',
      )
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  if (subscriptionError) throw subscriptionError;
  if (invoiceError) throw invoiceError;

  return buildTenantBillingViewModel(
    ((subscriptionRows ?? []) as TenantSubscriptionRow[]).map(toTenantBillingSubscription)[0] ??
      null,
    ((invoiceRows ?? []) as BillingInvoiceRow[]).map(toTenantBillingInvoice),
  );
}

export function buildTenantBillingViewModel(
  subscription: TenantBillingSubscription | null,
  invoices: readonly TenantBillingInvoice[],
): TenantBillingSettingsViewModel {
  const nextInvoice = invoices.find((invoice) => invoice.status === 'OPEN') ?? null;
  const paidInvoice = invoices.find((invoice) => invoice.status === 'PAID') ?? null;

  return {
    subscription,
    invoices,
    summaryItems: [
      ['Plano atual', subscription?.planName ?? 'Sem plano ativo'],
      [
        'Status da assinatura',
        subscription ? subscriptionStatusLabels[subscription.status] : 'Não configurado',
      ],
      [
        'Próxima cobrança',
        nextInvoice?.dueDate ? formatDate(nextInvoice.dueDate) : 'Sem cobrança em aberto',
      ],
      [
        'Comprovantes',
        paidInvoice ? 'Último pagamento registrado' : 'Nenhum comprovante disponível',
      ],
    ],
    operationalCards: [
      {
        title: 'Trocar plano',
        body: subscription
          ? 'Solicite uma nova sessão de checkout para alterar o plano atual com confirmação de pagamento.'
          : 'Nenhum plano SaaS está associado a este tenant. Inicie pelo checkout ou suporte da plataforma.',
      },
      {
        title: 'Comprovantes',
        body: paidInvoice
          ? `Último pagamento: ${formatCurrency(paidInvoice.amountCents)}.`
          : 'Ainda não há faturas pagas para download neste tenant.',
      },
      {
        title: 'Dados fiscais',
        body: 'Configure CNPJ, razão social e endereço fiscal para futura emissão de nota.',
      },
    ],
  };
}

function toTenantBillingSubscription(row: TenantSubscriptionRow): TenantBillingSubscription {
  const plan = Array.isArray(row.saas_plan) ? row.saas_plan[0] : row.saas_plan;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id,
    planName: plan?.name ?? null,
    planCode: plan?.code ?? null,
    provider: row.provider ?? null,
    status: row.status,
    currentPeriodEnd: toDate(row.current_period_end),
  };
}

function toTenantBillingInvoice(row: BillingInvoiceRow): TenantBillingInvoice {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    subscriptionId: row.subscription_id ?? null,
    provider: row.provider ?? null,
    externalReference: row.external_invoice_id ?? null,
    status: row.status,
    amountCents: row.amount_cents,
    dueDate: toDate(row.due_at),
    paidAt: row.paid_at ?? null,
  };
}

function toRequestContext(session: SessionContext): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    userId: session.userId,
    tenantId: session.tenantId,
    membershipId: session.membershipId,
    role: session.role,
    permissions: session.permissions,
    entitlements: session.entitlements ?? [],
    branchScope: session.branchScope,
  };
}

function toDate(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00-03:00`));
}

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amountCents / 100);
}

const subscriptionStatusLabels: Record<TenantSubscriptionStatus, string> = {
  TRIALING: 'Em teste',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento pendente',
  UNPAID: 'Inadimplente',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};
