import type { SupabaseClient } from '@supabase/supabase-js';
import {
  platformTenantSummarySchema,
  type PlatformAuditEntry,
  type PlatformTenantLifecycleStatus,
  type PlatformTenantSummary,
} from '@barberos/contracts';

import type { PlatformAuditSink, PlatformRequestContext, TenantOverviewFilters } from '../domain';
import type { TenantLifecycleRepository } from '../application/tenant-lifecycle-service';
import type { TenantOverviewReader } from '../application/tenant-overview-service';

type TenantRow = {
  id: string;
  name: string;
  status?: string | null;
  lifecycle_status?: PlatformTenantLifecycleStatus | null;
  created_at: string;
  updated_at: string;
};

type SubscriptionRow = {
  id: string;
  tenant_id: string;
  plan_id: string;
  status?: PlatformTenantSummary['subscriptionStatus'] | null;
  updated_at?: string | null;
};

type PlanRow = {
  id: string;
  code?: string | null;
  name?: string | null;
};

type InvoiceRow = {
  tenant_id: string;
  status?: string | null;
  amount_cents?: number | null;
};

type UsageRow = {
  tenant_id: string;
  metric?: string | null;
  quantity?: number | null;
};

export class SupabasePlatformTenantRepository
  implements TenantOverviewReader, TenantLifecycleRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async listTenants(
    _context: PlatformRequestContext,
    filters: TenantOverviewFilters = {},
  ): Promise<PlatformTenantSummary[]> {
    let query = this.client
      .from('tenants')
      .select('id, name, status, lifecycle_status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(filters.limit ?? 50);

    if (filters.status) query = query.eq('lifecycle_status', filters.status);
    if (filters.query) query = query.ilike('name', `%${filters.query}%`);
    if (filters.cursor) query = query.lt('updated_at', filters.cursor);

    const { data, error } = await query;
    if (error) throw error;

    const tenantRows = ((data ?? []) as TenantRow[]).filter((row) => row.id);
    return this.hydrateTenantSummaries(tenantRows, filters);
  }

  async findTenantById(
    _context: PlatformRequestContext,
    tenantId: string,
  ): Promise<PlatformTenantSummary | null> {
    const { data, error } = await this.client
      .from('tenants')
      .select('id, name, status, lifecycle_status, created_at, updated_at')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const [summary] = await this.hydrateTenantSummaries([data as TenantRow]);
    return summary ?? null;
  }

  async updateTenantLifecycle(
    context: PlatformRequestContext,
    input: {
      tenantId: string;
      nextStatus: PlatformTenantLifecycleStatus;
      reason: string;
    },
  ): Promise<PlatformTenantSummary> {
    const { data, error } = await this.client
      .from('tenants')
      .update({
        lifecycle_status: input.nextStatus,
        status: input.nextStatus,
        lifecycle_reason: input.reason,
        lifecycle_updated_by: context.userId,
        lifecycle_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.tenantId)
      .select('id, name, status, lifecycle_status, created_at, updated_at')
      .single();

    if (error) throw error;

    const [summary] = await this.hydrateTenantSummaries([data as TenantRow]);
    return summary;
  }

  private async hydrateTenantSummaries(
    tenantRows: readonly TenantRow[],
    filters: TenantOverviewFilters = {},
  ) {
    if (tenantRows.length === 0) return [];

    const tenantIds = tenantRows.map((row) => row.id);
    const [branchCounts, userCounts, subscriptions, plans, invoices, usage] = await Promise.all([
      countRowsByTenant(this.client, 'branches', tenantIds),
      countRowsByTenant(this.client, 'memberships', tenantIds, { status: 'ACTIVE' }),
      fetchSubscriptions(this.client, tenantIds),
      fetchPlans(this.client),
      fetchInvoices(this.client, tenantIds),
      fetchUsage(this.client, tenantIds),
    ]);

    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    const subscriptionsByTenant = newestByTenant(subscriptions);
    const openExposureByTenant = sumOpenBillingExposure(invoices);
    const usageByTenant = groupUsage(usage);

    return tenantRows
      .map((tenant) =>
        toTenantSummary({
          tenant,
          branchCount: branchCounts.get(tenant.id) ?? 0,
          userCount: userCounts.get(tenant.id) ?? 0,
          subscription: subscriptionsByTenant.get(tenant.id),
          plan: plansById.get(subscriptionsByTenant.get(tenant.id)?.plan_id ?? ''),
          openBillingExposureCents: openExposureByTenant.get(tenant.id) ?? 0,
          usage: usageByTenant.get(tenant.id) ?? {},
        }),
      )
      .filter((summary) => !filters.planCode || summary.planCode === filters.planCode);
  }
}

export class SupabasePlatformAuditSink implements PlatformAuditSink {
  constructor(private readonly client: SupabaseClient) {}

  async record(
    context: PlatformRequestContext,
    entry: Omit<PlatformAuditEntry, 'id' | 'actorUserId' | 'createdAt'>,
  ) {
    const { error } = await this.client.from('audit_logs').insert({
      tenant_id: entry.tenantId ?? null,
      actor_type: 'USER',
      actor_id: context.userId,
      action: entry.action,
      entity_type: entry.targetType,
      entity_id: entry.targetId ?? null,
      result: entry.result,
      after_state: entry.metadata ?? {},
      request_id: entry.requestId ?? context.requestId,
      metadata: {
        reason: entry.reason,
        ...entry.metadata,
      },
    });
    if (error) throw error;
  }
}

async function countRowsByTenant(
  client: SupabaseClient,
  table: string,
  tenantIds: readonly string[],
  eqFilters: Record<string, unknown> = {},
) {
  let query = client
    .from(table)
    .select('tenant_id')
    .in('tenant_id', [...tenantIds]);
  for (const [column, value] of Object.entries(eqFilters)) {
    query = query.eq(column, value);
  }

  const { data, error } = await query;
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ tenant_id: string }>) {
    counts.set(row.tenant_id, (counts.get(row.tenant_id) ?? 0) + 1);
  }
  return counts;
}

async function fetchSubscriptions(client: SupabaseClient, tenantIds: readonly string[]) {
  const { data, error } = await client
    .from('tenant_subscriptions')
    .select('id, tenant_id, plan_id, status, updated_at')
    .in('tenant_id', [...tenantIds])
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubscriptionRow[];
}

async function fetchPlans(client: SupabaseClient) {
  const { data, error } = await client.from('saas_plans').select('id, code, name');
  if (error) throw error;
  return (data ?? []) as PlanRow[];
}

async function fetchInvoices(client: SupabaseClient, tenantIds: readonly string[]) {
  const { data, error } = await client
    .from('billing_invoices')
    .select('tenant_id, status, amount_cents')
    .in('tenant_id', [...tenantIds])
    .in('status', ['OPEN', 'OVERDUE', 'UNCOLLECTIBLE']);
  if (error) throw error;
  return (data ?? []) as InvoiceRow[];
}

async function fetchUsage(client: SupabaseClient, tenantIds: readonly string[]) {
  const { data, error } = await client
    .from('usage_counters')
    .select('tenant_id, metric, quantity')
    .in('tenant_id', [...tenantIds]);
  if (error) throw error;
  return (data ?? []) as UsageRow[];
}

function newestByTenant(rows: readonly SubscriptionRow[]) {
  const grouped = new Map<string, SubscriptionRow>();
  for (const row of rows) {
    if (!grouped.has(row.tenant_id)) {
      grouped.set(row.tenant_id, row);
    }
  }
  return grouped;
}

function sumOpenBillingExposure(rows: readonly InvoiceRow[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.tenant_id, (totals.get(row.tenant_id) ?? 0) + Number(row.amount_cents ?? 0));
  }
  return totals;
}

function groupUsage(rows: readonly UsageRow[]) {
  const grouped = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const usage = grouped.get(row.tenant_id) ?? {};
    if (row.metric) usage[row.metric] = Number(row.quantity ?? 0);
    grouped.set(row.tenant_id, usage);
  }
  return grouped;
}

function toTenantSummary(input: {
  tenant: TenantRow;
  branchCount: number;
  userCount: number;
  subscription?: SubscriptionRow;
  plan?: PlanRow;
  openBillingExposureCents: number;
  usage: Record<string, number>;
}) {
  const lifecycleStatus =
    input.tenant.lifecycle_status ?? normalizeTenantStatus(input.tenant.status);
  const healthSignals = healthSignalsFor({
    lifecycleStatus,
    subscriptionStatus: input.subscription?.status,
    openBillingExposureCents: input.openBillingExposureCents,
  });

  return platformTenantSummarySchema.parse({
    tenantId: input.tenant.id,
    tenantName: input.tenant.name,
    lifecycleStatus,
    branchCount: input.branchCount,
    userCount: input.userCount,
    planId: input.plan?.id,
    planCode: input.plan?.code ?? undefined,
    planName: input.plan?.name ?? undefined,
    subscriptionStatus: input.subscription?.status ?? undefined,
    openBillingExposureCents: input.openBillingExposureCents,
    usage: input.usage,
    health: healthSignals.includes('billing_unpaid')
      ? 'CRITICAL'
      : healthSignals.length
        ? 'ATTENTION'
        : 'OK',
    healthSignals,
    createdAt: toIsoDateTime(input.tenant.created_at),
    updatedAt: toIsoDateTime(input.tenant.updated_at),
  });
}

function normalizeTenantStatus(status?: string | null): PlatformTenantLifecycleStatus {
  switch (status) {
    case 'TRIALING':
    case 'ACTIVE':
    case 'RESTRICTED':
    case 'SUSPENDED':
    case 'CANCELLED':
      return status;
    default:
      return 'ACTIVE';
  }
}

function healthSignalsFor(input: {
  lifecycleStatus: PlatformTenantLifecycleStatus;
  subscriptionStatus?: PlatformTenantSummary['subscriptionStatus'] | null;
  openBillingExposureCents: number;
}) {
  const signals: string[] = [];
  if (input.lifecycleStatus === 'RESTRICTED') signals.push('tenant_restricted');
  if (input.lifecycleStatus === 'SUSPENDED') signals.push('tenant_suspended');
  if (input.subscriptionStatus === 'PAST_DUE') signals.push('billing_past_due');
  if (input.subscriptionStatus === 'UNPAID') signals.push('billing_unpaid');
  if (input.openBillingExposureCents > 0) signals.push('open_billing_exposure');
  return signals;
}

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
