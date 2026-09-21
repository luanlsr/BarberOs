import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './auth/server';

type Row = Record<string, unknown>;

export type MasterTenantRow = {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
  branchCount: number;
  userCount: number;
  subscriptionStatus: string;
  planName: string;
  monthlyValueCents: number;
};

export type MasterUserRow = {
  id: string;
  tenantId?: string;
  tenantName?: string;
  userId?: string;
  role: string;
  status: string;
  createdAt?: string;
  scope: 'tenant' | 'platform';
};

export type MasterPlanRow = {
  id: string;
  code: string;
  name: string;
  description?: string;
  priceAmountCents: number;
  billingInterval: string;
  status: string;
};

export type MasterSubscriptionRow = {
  id: string;
  tenantName: string;
  planName: string;
  status: string;
  currentPeriodEnd: string;
  monthlyValueCents: number;
};

export type MasterInvoiceRow = {
  id: string;
  tenantName: string;
  status: string;
  amountCents: number;
  dueAt?: string;
  paidAt?: string;
};

export type MasterUsageRow = {
  tenantName: string;
  metric: string;
  quantity: number;
  periodStart?: string;
};

export type MasterMessagingRow = {
  id: string;
  tenantName: string;
  provider: string;
  channel: string;
  status: string;
  updatedAt?: string;
};

export type MasterIncidentRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  affectedArea: string;
  startedAt: string;
};

export type MasterFeatureFlagRow = {
  id: string;
  key: string;
  name: string;
  status: string;
  rollout: string;
  enabled: boolean;
};

export type MasterAuditRow = {
  id: string;
  tenantName: string;
  action: string;
  entityType?: string;
  createdAt?: string;
};

export type MasterAdminData = {
  generatedAt: string;
  tenants: MasterTenantRow[];
  users: MasterUserRow[];
  plans: MasterPlanRow[];
  subscriptions: MasterSubscriptionRow[];
  invoices: MasterInvoiceRow[];
  aiUsage: MasterUsageRow[];
  messaging: MasterMessagingRow[];
  incidents: MasterIncidentRow[];
  featureFlags: MasterFeatureFlagRow[];
  audit: MasterAuditRow[];
  totals: {
    tenants: number;
    activeTenants: number;
    platformUsers: number;
    mrrCents: number;
    openInvoicesCents: number;
    aiRequests: number;
    incidentsOpen: number;
  };
};

export async function getMasterAdminData(): Promise<MasterAdminData> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return buildDemoMasterData();

  const [
    tenants,
    branches,
    memberships,
    platformMemberships,
    plans,
    subscriptions,
    invoices,
    aiUsage,
    messaging,
    incidents,
    featureFlags,
    audit,
  ] = await Promise.all([
    selectTable(supabase, 'tenants'),
    selectTable(supabase, 'branches'),
    selectTable(supabase, 'memberships'),
    selectTable(supabase, 'platform_memberships'),
    selectTable(supabase, 'saas_plans'),
    selectTable(supabase, 'tenant_subscriptions'),
    selectTable(supabase, 'billing_invoices'),
    selectTable(supabase, 'ai_usage'),
    selectTable(supabase, 'messaging_connections'),
    selectTable(supabase, 'platform_incidents'),
    selectTable(supabase, 'platform_feature_flags'),
    selectTable(supabase, 'audit_logs'),
  ]);

  return normalizeMasterData({
    tenants,
    branches,
    memberships,
    platformMemberships,
    plans,
    subscriptions,
    invoices,
    aiUsage,
    messaging,
    incidents,
    featureFlags,
    audit,
  });
}

async function selectTable(client: SupabaseClient, table: string): Promise<Row[]> {
  const { data, error } = await client.from(table).select('*').limit(500);
  if (error) return [];
  return (data ?? []) as Row[];
}

function normalizeMasterData(source: {
  tenants: Row[];
  branches: Row[];
  memberships: Row[];
  platformMemberships: Row[];
  plans: Row[];
  subscriptions: Row[];
  invoices: Row[];
  aiUsage: Row[];
  messaging: Row[];
  incidents: Row[];
  featureFlags: Row[];
  audit: Row[];
}): MasterAdminData {
  const tenantNames = new Map(source.tenants.map((row) => [text(row.id), text(row.name)]));
  const planNames = new Map(source.plans.map((row) => [text(row.id), text(row.name)]));
  const planPrices = new Map(
    source.plans.map((row) => [text(row.id), number(row.price_amount_cents)]),
  );

  const tenants = source.tenants.map((row) => {
    const subscription = source.subscriptions.find(
      (candidate) => text(candidate.tenant_id) === text(row.id),
    );
    const planId = text(subscription?.plan_id);
    return {
      id: text(row.id),
      name: text(row.name, 'Tenant sem nome'),
      status: text(row.status, 'UNKNOWN'),
      createdAt: optionalText(row.created_at),
      branchCount: source.branches.filter((branch) => text(branch.tenant_id) === text(row.id))
        .length,
      userCount: source.memberships.filter(
        (membership) => text(membership.tenant_id) === text(row.id),
      ).length,
      subscriptionStatus: text(subscription?.status, 'SEM_ASSINATURA'),
      planName: planNames.get(planId) ?? 'Sem plano',
      monthlyValueCents: planPrices.get(planId) ?? 0,
    };
  });

  const users: MasterUserRow[] = [
    ...source.platformMemberships.map((row) => ({
      id: text(row.id),
      userId: optionalText(row.user_id),
      role: text(row.role),
      status: text(row.status),
      createdAt: optionalText(row.created_at),
      scope: 'platform' as const,
    })),
    ...source.memberships.map((row) => ({
      id: text(row.id),
      tenantId: optionalText(row.tenant_id),
      tenantName: tenantNames.get(text(row.tenant_id)) ?? 'Tenant',
      userId: optionalText(row.user_id),
      role: text(row.role),
      status: text(row.status),
      createdAt: optionalText(row.created_at),
      scope: 'tenant' as const,
    })),
  ];

  const plans = source.plans.map((row) => ({
    id: text(row.id),
    code: text(row.code),
    name: text(row.name),
    description: optionalText(row.description),
    priceAmountCents: number(row.price_amount_cents),
    billingInterval: text(row.billing_interval),
    status: text(row.status),
  }));

  const subscriptions = source.subscriptions.map((row) => {
    const planId = text(row.plan_id);
    return {
      id: text(row.id),
      tenantName: tenantNames.get(text(row.tenant_id)) ?? 'Tenant',
      planName: planNames.get(planId) ?? 'Sem plano',
      status: text(row.status),
      currentPeriodEnd: text(row.current_period_end),
      monthlyValueCents: planPrices.get(planId) ?? 0,
    };
  });

  const invoices = source.invoices.map((row) => ({
    id: text(row.id),
    tenantName: tenantNames.get(text(row.tenant_id)) ?? 'Tenant',
    status: text(row.status),
    amountCents: number(row.amount_cents),
    dueAt: optionalText(row.due_at),
    paidAt: optionalText(row.paid_at),
  }));

  const aiUsage = source.aiUsage.map((row) => ({
    tenantName: tenantNames.get(text(row.tenant_id)) ?? 'Tenant',
    metric: text(row.metric),
    quantity: number(row.quantity),
    periodStart: optionalText(row.period_start),
  }));

  const messaging = source.messaging.map((row) => ({
    id: text(row.id),
    tenantName: tenantNames.get(text(row.tenant_id)) ?? 'Tenant',
    provider: text(row.provider, 'Provider'),
    channel: text(row.channel, 'WHATSAPP'),
    status: text(row.status),
    updatedAt: optionalText(row.updated_at),
  }));

  const incidents = source.incidents.map((row) => ({
    id: text(row.id),
    title: text(row.title),
    severity: text(row.severity),
    status: text(row.status),
    affectedArea: text(row.affected_area),
    startedAt: text(row.started_at),
  }));

  const featureFlags = source.featureFlags.map((row) => ({
    id: text(row.id),
    key: text(row.key),
    name: text(row.name),
    status: text(row.status),
    rollout: text(row.rollout_strategy),
    enabled: Boolean(row.enabled),
  }));

  const audit = source.audit.map((row) => ({
    id: text(row.id),
    tenantName: row.tenant_id ? (tenantNames.get(text(row.tenant_id)) ?? 'Tenant') : 'Plataforma',
    action: text(row.action),
    entityType: optionalText(row.entity_type),
    createdAt: optionalText(row.created_at),
  }));

  return {
    generatedAt: new Date().toISOString(),
    tenants,
    users,
    plans,
    subscriptions,
    invoices,
    aiUsage,
    messaging,
    incidents,
    featureFlags,
    audit,
    totals: {
      tenants: tenants.length,
      activeTenants: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
      platformUsers: users.filter((user) => user.scope === 'platform' && user.status === 'ACTIVE')
        .length,
      mrrCents: subscriptions
        .filter(
          (subscription) => subscription.status === 'ACTIVE' || subscription.status === 'TRIALING',
        )
        .reduce((total, subscription) => total + subscription.monthlyValueCents, 0),
      openInvoicesCents: invoices
        .filter((invoice) => invoice.status === 'OPEN')
        .reduce((total, invoice) => total + invoice.amountCents, 0),
      aiRequests: aiUsage
        .filter((usage) => usage.metric === 'AI_REQUESTS')
        .reduce((total, usage) => total + usage.quantity, 0),
      incidentsOpen: incidents.filter((incident) => incident.status !== 'RESOLVED').length,
    },
  };
}

function buildDemoMasterData(): MasterAdminData {
  return normalizeMasterData({
    tenants: [
      {
        id: 'tenant-1',
        name: 'Barbearia Modelo',
        status: 'ACTIVE',
        created_at: '2026-09-01T10:00:00Z',
      },
      {
        id: 'tenant-2',
        name: 'Barbearia Premium Sul',
        status: 'TRIALING',
        created_at: '2026-09-12T10:00:00Z',
      },
      {
        id: 'tenant-3',
        name: 'Rede Navalha Urbana',
        status: 'ACTIVE',
        created_at: '2026-09-15T10:00:00Z',
      },
    ],
    branches: [
      { id: 'branch-1', tenant_id: 'tenant-1' },
      { id: 'branch-2', tenant_id: 'tenant-1' },
      { id: 'branch-3', tenant_id: 'tenant-2' },
      { id: 'branch-4', tenant_id: 'tenant-3' },
    ],
    memberships: [
      { id: 'm-1', tenant_id: 'tenant-1', role: 'OWNER', status: 'ACTIVE' },
      { id: 'm-2', tenant_id: 'tenant-1', role: 'RECEPTIONIST', status: 'ACTIVE' },
      { id: 'm-3', tenant_id: 'tenant-1', role: 'PROFESSIONAL', status: 'ACTIVE' },
      { id: 'm-4', tenant_id: 'tenant-2', role: 'OWNER', status: 'ACTIVE' },
      { id: 'm-5', tenant_id: 'tenant-3', role: 'OWNER', status: 'ACTIVE' },
    ],
    platformMemberships: [
      { id: 'pm-1', role: 'PLATFORM_MASTER', status: 'ACTIVE', created_at: '2026-09-01T09:00:00Z' },
    ],
    plans: [
      {
        id: 'plan-1',
        code: 'starter',
        name: 'Starter',
        price_amount_cents: 9900,
        billing_interval: 'MONTHLY',
        status: 'ACTIVE',
      },
      {
        id: 'plan-2',
        code: 'pro-ai',
        name: 'Pro AI',
        price_amount_cents: 19900,
        billing_interval: 'MONTHLY',
        status: 'ACTIVE',
      },
    ],
    subscriptions: [
      {
        id: 'sub-1',
        tenant_id: 'tenant-1',
        plan_id: 'plan-2',
        status: 'ACTIVE',
        current_period_end: '2026-10-20T00:00:00Z',
      },
      {
        id: 'sub-2',
        tenant_id: 'tenant-2',
        plan_id: 'plan-1',
        status: 'TRIALING',
        current_period_end: '2026-10-05T00:00:00Z',
      },
      {
        id: 'sub-3',
        tenant_id: 'tenant-3',
        plan_id: 'plan-2',
        status: 'ACTIVE',
        current_period_end: '2026-10-12T00:00:00Z',
      },
    ],
    invoices: [
      {
        id: 'inv-1',
        tenant_id: 'tenant-1',
        status: 'PAID',
        amount_cents: 19900,
        paid_at: '2026-09-20T12:00:00Z',
      },
      {
        id: 'inv-2',
        tenant_id: 'tenant-3',
        status: 'OPEN',
        amount_cents: 19900,
        due_at: '2026-09-25T12:00:00Z',
      },
    ],
    aiUsage: [
      { tenant_id: 'tenant-1', metric: 'AI_REQUESTS', quantity: 482, period_start: '2026-09-01' },
      { tenant_id: 'tenant-3', metric: 'AI_REQUESTS', quantity: 920, period_start: '2026-09-01' },
      { tenant_id: 'tenant-3', metric: 'TOOL_CALLS', quantity: 214, period_start: '2026-09-01' },
    ],
    messaging: [
      {
        id: 'msg-1',
        tenant_id: 'tenant-1',
        provider: 'WHATSAPP_CLOUD',
        channel: 'WHATSAPP',
        status: 'CONNECTED',
      },
      {
        id: 'msg-2',
        tenant_id: 'tenant-3',
        provider: 'WHATSAPP_CLOUD',
        channel: 'WHATSAPP',
        status: 'PENDING_SETUP',
      },
    ],
    incidents: [
      {
        id: 'inc-1',
        title: 'Fila de notificações com atraso',
        severity: 'MEDIUM',
        status: 'INVESTIGATING',
        affected_area: 'Worker',
        started_at: '2026-09-21T08:30:00Z',
      },
    ],
    featureFlags: [
      {
        id: 'flag-1',
        key: 'ai.finance.insights',
        name: 'Insights financeiros por IA',
        enabled: true,
        status: 'BETA',
        rollout_strategy: 'TENANT_ALLOWLIST',
      },
      {
        id: 'flag-2',
        key: 'support.impersonation',
        name: 'Acesso temporário de suporte',
        enabled: false,
        status: 'INTERNAL',
        rollout_strategy: 'PLATFORM_ONLY',
      },
    ],
    audit: [
      {
        id: 'audit-1',
        tenant_id: null,
        action: 'platform.seeded',
        entity_type: 'platform',
        created_at: '2026-09-21T09:00:00Z',
      },
    ],
  });
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function number(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}
