import type { SupabaseClient } from '@supabase/supabase-js';
import {
  billingInvoiceSummarySchema,
  tenantSubscriptionSchema,
  type AssignTenantSubscriptionCommand,
  type BillingInvoiceSummary,
  type TenantSubscription,
} from '@barberos/contracts';

import type { PlatformRequestContext } from '../domain';
import type {
  SubscriptionBillingRepository,
  UpdateSubscriptionStatusCommand,
} from '../application/subscription-billing-service';

type SubscriptionRow = {
  id: string;
  tenant_id: string;
  plan_id: string;
  provider?: string | null;
  external_subscription_id?: string | null;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_starts_at?: string | null;
  trial_ends_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
};

type InvoiceRow = {
  id: string;
  tenant_id: string;
  subscription_id?: string | null;
  provider?: string | null;
  external_invoice_id?: string | null;
  status: string;
  amount_cents: number;
  due_at?: string | null;
  paid_at?: string | null;
  created_at: string;
};

const subscriptionSelect =
  'id, tenant_id, plan_id, provider, external_subscription_id, status, current_period_start, current_period_end, trial_starts_at, trial_ends_at, cancelled_at, cancellation_reason, created_at, updated_at';
const invoiceSelect =
  'id, tenant_id, subscription_id, provider, external_invoice_id, status, amount_cents, due_at, paid_at, created_at';

export class SupabasePlatformBillingRepository implements SubscriptionBillingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listSubscriptions(_context: PlatformRequestContext): Promise<TenantSubscription[]> {
    const { data, error } = await this.client
      .from('tenant_subscriptions')
      .select(subscriptionSelect)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as SubscriptionRow[]).map(toTenantSubscription);
  }

  async findSubscriptionById(
    _context: PlatformRequestContext,
    subscriptionId: string,
  ): Promise<TenantSubscription | null> {
    const { data, error } = await this.client
      .from('tenant_subscriptions')
      .select(subscriptionSelect)
      .eq('id', subscriptionId)
      .maybeSingle();
    if (error) throw error;
    return data ? toTenantSubscription(data as SubscriptionRow) : null;
  }

  async assignSubscription(
    context: PlatformRequestContext,
    command: AssignTenantSubscriptionCommand,
  ): Promise<TenantSubscription> {
    const { data, error } = await this.client
      .from('tenant_subscriptions')
      .insert({
        tenant_id: command.tenantId,
        plan_id: command.planId,
        provider: command.provider,
        external_subscription_id: command.externalReference ?? null,
        status: command.status ?? 'ACTIVE',
        current_period_start: command.currentPeriodStart ?? null,
        current_period_end: command.currentPeriodEnd ?? null,
        updated_by: context.userId,
        status_reason: command.reason,
      })
      .select(subscriptionSelect)
      .single();
    if (error) throw error;
    return toTenantSubscription(data as SubscriptionRow);
  }

  async updateSubscriptionStatus(
    context: PlatformRequestContext,
    command: UpdateSubscriptionStatusCommand,
  ): Promise<TenantSubscription> {
    const payload: Record<string, unknown> = {
      status: command.status,
      status_reason: command.reason,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };
    if (command.status === 'CANCELLED') {
      payload.cancelled_at = new Date().toISOString();
      payload.cancellation_reason = command.reason;
    }

    const { data, error } = await this.client
      .from('tenant_subscriptions')
      .update(payload)
      .eq('id', command.subscriptionId)
      .select(subscriptionSelect)
      .single();
    if (error) throw error;
    return toTenantSubscription(data as SubscriptionRow);
  }

  async listInvoices(_context: PlatformRequestContext): Promise<BillingInvoiceSummary[]> {
    const { data, error } = await this.client
      .from('billing_invoices')
      .select(invoiceSelect)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as InvoiceRow[]).map(toInvoiceSummary);
  }
}

function toTenantSubscription(row: SubscriptionRow) {
  return tenantSubscriptionSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id,
    provider: row.provider ?? 'UNKNOWN',
    externalReference: row.external_subscription_id ?? undefined,
    status: row.status,
    currentPeriodStart: toDate(row.current_period_start),
    currentPeriodEnd: toDate(row.current_period_end),
    trialStartsOn: toDate(row.trial_starts_at),
    trialEndsOn: toDate(row.trial_ends_at),
    cancelledAt: row.cancelled_at ? toIsoDateTime(row.cancelled_at) : undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

function toInvoiceSummary(row: InvoiceRow) {
  return billingInvoiceSummarySchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    subscriptionId: row.subscription_id ?? undefined,
    provider: row.provider ?? 'UNKNOWN',
    externalReference: row.external_invoice_id ?? undefined,
    status: row.status,
    amountCents: row.amount_cents,
    dueDate: toDate(row.due_at),
    paidAt: row.paid_at ? toIsoDateTime(row.paid_at) : undefined,
    createdAt: toIsoDateTime(row.created_at),
  });
}

function toDate(value?: string | null) {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
