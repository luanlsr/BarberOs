import type {
  BillingInvoiceSummary,
  Entitlement,
  EntitlementDecision,
  PlatformAuditEntry,
  PlatformTenantSummary,
  SaasPlan,
  SessionContext,
  SupportScope,
  TenantSubscription,
} from '@barberos/contracts';
import { createSupabaseServerClient } from './auth/server';
import {
  EntitlementResolutionService,
  PlatformAuditService,
  SaasPlanService,
  SubscriptionBillingService,
  SupportScopeService,
  TenantOverviewService,
} from '../src/modules/platform-admin/application';
import type { PlatformRequestContext } from '../src/modules/platform-admin/domain';
import {
  SupabasePlatformAuditSink,
  SupabasePlatformAuditRepository,
  SupabasePlatformBillingRepository,
  SupabasePlatformEntitlementRepository,
  SupabasePlatformPlanRepository,
  SupabasePlatformSupportScopeRepository,
  SupabasePlatformTenantRepository,
} from '../src/modules/platform-admin/infrastructure';

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

export type MasterEntitlementRow = {
  id: string;
  tenantName: string;
  entitlement: string;
  allowed: boolean;
  source: string;
  limit?: number;
  reason?: string;
};

export type MasterSupportScopeRow = {
  id: string;
  tenantName: string;
  actorUserId: string;
  purpose: string;
  operationClass: string;
  status: string;
  expiresAt: string;
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
  entitlements: MasterEntitlementRow[];
  supportScopes: MasterSupportScopeRow[];
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

export async function getMasterAdminData(
  session: Pick<SessionContext, 'userId' | 'role' | 'permissions'>,
): Promise<MasterAdminData> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return buildDemoMasterData();

  const context = toPlatformRequestContext(session);
  const tenantRepository = new SupabasePlatformTenantRepository(supabase);
  const planRepository = new SupabasePlatformPlanRepository(supabase);
  const billingRepository = new SupabasePlatformBillingRepository(supabase);
  const entitlementRepository = new SupabasePlatformEntitlementRepository(supabase);
  const supportRepository = new SupabasePlatformSupportScopeRepository(supabase);
  const auditRepository = new SupabasePlatformAuditRepository(supabase);
  const auditSink = new SupabasePlatformAuditSink(supabase);

  const tenants = new TenantOverviewService(tenantRepository);
  const plans = new SaasPlanService({ repository: planRepository, auditSink });
  const billing = new SubscriptionBillingService({ repository: billingRepository, auditSink });
  const entitlements = new EntitlementResolutionService({
    repository: entitlementRepository,
    auditSink,
  });
  const support = new SupportScopeService({ repository: supportRepository, auditSink });
  const audit = new PlatformAuditService(auditRepository);

  try {
    const [tenantSummaries, saasPlans, subscriptionResults, invoices, supportScopes, auditEntries] =
      await Promise.all([
        tenants.listTenants(context, { limit: 100 }),
        plans.listPlans(context),
        billing.listSubscriptions(context),
        billing.listInvoices(context),
        support.listSupportScopes(context),
        audit.listAuditEntries(context, { limit: 50 }),
      ]);
    const entitlementDecisions = await resolveMasterEntitlements(
      entitlements,
      context,
      tenantSummaries,
    );

    return normalizePlatformAdminData({
      tenantSummaries,
      plans: saasPlans,
      subscriptions: subscriptionResults.map((result) => result.subscription),
      invoices,
      entitlementDecisions,
      supportScopes,
      auditEntries,
      fallback: buildDemoMasterData(),
    });
  } catch (error) {
    console.error('[BarberOS master] Falling back to demo platform admin data:', error);
    return buildDemoMasterData();
  }
}

function toPlatformRequestContext(
  session: Pick<SessionContext, 'userId' | 'role' | 'permissions'>,
): PlatformRequestContext {
  return {
    requestId: crypto.randomUUID(),
    userId: session.userId,
    role: session.role,
    permissions: [...session.permissions],
  };
}

function normalizePlatformAdminData(source: {
  tenantSummaries: PlatformTenantSummary[];
  plans: SaasPlan[];
  subscriptions: TenantSubscription[];
  invoices: BillingInvoiceSummary[];
  entitlementDecisions: EntitlementDecision[];
  supportScopes: SupportScope[];
  auditEntries: PlatformAuditEntry[];
  fallback: MasterAdminData;
}): MasterAdminData {
  const tenantNames = new Map(
    source.tenantSummaries.map((tenant) => [tenant.tenantId, tenant.tenantName]),
  );
  const plansById = new Map(source.plans.map((plan) => [plan.id, plan]));

  const tenants = source.tenantSummaries.map((tenant) => ({
    id: tenant.tenantId,
    name: tenant.tenantName,
    status: tenant.lifecycleStatus,
    createdAt: tenant.createdAt,
    branchCount: tenant.branchCount,
    userCount: tenant.userCount,
    subscriptionStatus: tenant.subscriptionStatus ?? 'SEM_ASSINATURA',
    planName: tenant.planName ?? 'Sem plano',
    monthlyValueCents: tenant.planId ? monthlyValueForPlan(plansById.get(tenant.planId)) : 0,
  }));

  const plans = source.plans.map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    priceAmountCents: plan.priceAmountCents,
    billingInterval: plan.billingInterval,
    status: plan.status,
  }));

  const subscriptions = source.subscriptions.map((subscription) => {
    const plan = plansById.get(subscription.planId);
    return {
      id: subscription.id,
      tenantName: tenantNames.get(subscription.tenantId) ?? 'Tenant',
      planName: plan?.name ?? 'Sem plano',
      status: subscription.status,
      currentPeriodEnd:
        subscription.currentPeriodEnd ?? subscription.updatedAt ?? new Date().toISOString(),
      monthlyValueCents: monthlyValueForPlan(plan),
    };
  });

  const invoices = source.invoices.map((invoice) => ({
    id: invoice.id,
    tenantName: tenantNames.get(invoice.tenantId) ?? 'Tenant',
    status: invoice.status,
    amountCents: invoice.amountCents,
    dueAt: invoice.dueDate,
    paidAt: invoice.paidAt,
  }));

  const entitlements = source.entitlementDecisions.map((decision) => ({
    id: `${decision.tenantId}:${decision.entitlement}`,
    tenantName: tenantNames.get(decision.tenantId) ?? 'Tenant',
    entitlement: decision.entitlement,
    allowed: decision.allowed,
    source: decision.source,
    limit: decision.limit,
    reason: decision.reason,
  }));

  const supportScopes = source.supportScopes.map((scope) => ({
    id: scope.id,
    tenantName: tenantNames.get(scope.tenantId) ?? 'Tenant',
    actorUserId: scope.actorUserId,
    purpose: scope.purpose,
    operationClass: scope.operationClass,
    status: scope.status,
    expiresAt: scope.expiresAt,
  }));

  const audit = source.auditEntries.map((entry) => ({
    id: entry.id,
    tenantName: entry.tenantId ? (tenantNames.get(entry.tenantId) ?? 'Tenant') : 'Plataforma',
    action: entry.action,
    entityType: entry.targetType,
    createdAt: entry.createdAt,
  }));

  const aiUsage = source.fallback.aiUsage;
  const messaging = source.fallback.messaging;
  const incidents = source.fallback.incidents;
  const featureFlags = source.fallback.featureFlags;
  const users = source.fallback.users;

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
    entitlements,
    supportScopes,
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

function monthlyValueForPlan(plan?: SaasPlan) {
  if (!plan) return 0;
  return plan.billingInterval === 'YEARLY'
    ? Math.round(plan.priceAmountCents / 12)
    : plan.priceAmountCents;
}

async function resolveMasterEntitlements(
  service: EntitlementResolutionService,
  context: PlatformRequestContext,
  tenants: readonly PlatformTenantSummary[],
) {
  const visibleTenants = tenants.slice(0, 12);
  const entitlements: Entitlement[] = ['core.operations', 'finance', 'ai'];
  const decisions = await Promise.all(
    visibleTenants.flatMap((tenant) =>
      entitlements.map((entitlement) =>
        service.resolveEntitlement(context, { tenantId: tenant.tenantId, entitlement }),
      ),
    ),
  );
  return decisions;
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

  const entitlements = source.subscriptions.flatMap((subscription) => {
    const tenantId = text(subscription.tenant_id);
    const planId = text(subscription.plan_id);
    const planName = planNames.get(planId) ?? 'Sem plano';
    return ['core.operations', 'finance', 'ai'].map((entitlement) => ({
      id: `${tenantId}:${entitlement}`,
      tenantName: tenantNames.get(tenantId) ?? 'Tenant',
      entitlement,
      allowed: text(subscription.status) === 'ACTIVE' || text(subscription.status) === 'TRIALING',
      source: 'PLAN',
      limit: entitlement === 'ai' && planName.toLowerCase().includes('ai') ? 1000 : undefined,
    }));
  });

  const supportScopes: MasterSupportScopeRow[] = [
    {
      id: 'support-demo-1',
      tenantName: 'Barbearia Modelo',
      actorUserId: 'platform-user-demo',
      purpose: 'Verificação de cobrança e saúde do tenant',
      operationClass: 'BILLING_SUPPORT',
      status: 'ACTIVE',
      expiresAt: '2026-10-02T18:00:00.000Z',
    },
  ];

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
    entitlements,
    supportScopes,
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
