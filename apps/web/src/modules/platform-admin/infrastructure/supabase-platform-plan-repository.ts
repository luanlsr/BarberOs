import type { SupabaseClient } from '@supabase/supabase-js';
import {
  saasPlanSchema,
  type CreateSaasPlanCommand,
  type SaasPlan,
  type SaasPlanStatus,
  type UpdateSaasPlanCommand,
} from '@barberos/contracts';

import type { PlatformRequestContext } from '../domain';
import type { SaasPlanRepository } from '../application/saas-plan-service';

type PlanRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price_amount_cents: number;
  billing_interval: SaasPlan['billingInterval'];
  status: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PlanEntitlementRow = {
  plan_id: string;
  entitlement_code: SaasPlan['entitlements'][number]['entitlement'];
  enabled: boolean;
  limit_value?: number | null;
  metadata?: Record<string, unknown> | null;
};

const planSelect =
  'id, code, name, description, price_amount_cents, billing_interval, status, metadata, created_at, updated_at';
const entitlementSelect = 'plan_id, entitlement_code, enabled, limit_value, metadata';

export class SupabasePlatformPlanRepository implements SaasPlanRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listPlans(_context: PlatformRequestContext): Promise<SaasPlan[]> {
    const { data, error } = await this.client
      .from('saas_plans')
      .select(planSelect)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return this.attachEntitlements((data ?? []) as PlanRow[]);
  }

  async findPlanById(_context: PlatformRequestContext, planId: string): Promise<SaasPlan | null> {
    const { data, error } = await this.client
      .from('saas_plans')
      .select(planSelect)
      .eq('id', planId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const [plan] = await this.attachEntitlements([data as PlanRow]);
    return plan ?? null;
  }

  async findPlanByCode(_context: PlatformRequestContext, code: string): Promise<SaasPlan | null> {
    const { data, error } = await this.client
      .from('saas_plans')
      .select(planSelect)
      .ilike('code', code)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const [plan] = await this.attachEntitlements([data as PlanRow]);
    return plan ?? null;
  }

  async createPlan(
    _context: PlatformRequestContext,
    command: CreateSaasPlanCommand,
  ): Promise<SaasPlan> {
    const { data, error } = await this.client
      .from('saas_plans')
      .insert({
        code: command.code,
        name: command.name,
        description: command.description ?? null,
        price_amount_cents: command.priceAmountCents,
        billing_interval: command.billingInterval,
        status: command.status ?? 'ACTIVE',
        metadata: command.metadata ?? {},
      })
      .select(planSelect)
      .single();
    if (error) throw error;

    await this.replaceEntitlements((data as PlanRow).id, command.entitlements ?? []);
    return (await this.findPlanById(_context, (data as PlanRow).id)) as SaasPlan;
  }

  async updatePlan(
    context: PlatformRequestContext,
    planId: string,
    command: UpdateSaasPlanCommand,
  ): Promise<SaasPlan> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (command.code !== undefined) payload.code = command.code;
    if (command.name !== undefined) payload.name = command.name;
    if (command.description !== undefined) payload.description = command.description ?? null;
    if (command.priceAmountCents !== undefined)
      payload.price_amount_cents = command.priceAmountCents;
    if (command.billingInterval !== undefined) payload.billing_interval = command.billingInterval;
    if (command.status !== undefined) payload.status = command.status;
    if (command.metadata !== undefined) payload.metadata = command.metadata;

    const { error } = await this.client.from('saas_plans').update(payload).eq('id', planId);
    if (error) throw error;

    if (command.entitlements !== undefined) {
      await this.replaceEntitlements(planId, command.entitlements);
    }

    return (await this.findPlanById(context, planId)) as SaasPlan;
  }

  private async attachEntitlements(plans: readonly PlanRow[]) {
    if (plans.length === 0) return [];

    const planIds = plans.map((plan) => plan.id);
    const { data, error } = await this.client
      .from('plan_entitlements')
      .select(entitlementSelect)
      .in('plan_id', planIds);
    if (error) throw error;

    const entitlements = ((data ?? []) as PlanEntitlementRow[]).reduce(
      (grouped, row) => grouped.set(row.plan_id, [...(grouped.get(row.plan_id) ?? []), row]),
      new Map<string, PlanEntitlementRow[]>(),
    );

    return plans.map((plan) => toSaasPlan(plan, entitlements.get(plan.id) ?? []));
  }

  private async replaceEntitlements(
    planId: string,
    entitlements: NonNullable<CreateSaasPlanCommand['entitlements']>,
  ) {
    const { error: deleteError } = await this.client
      .from('plan_entitlements')
      .delete()
      .eq('plan_id', planId);
    if (deleteError) throw deleteError;

    if (entitlements.length === 0) return;

    const { error: insertError } = await this.client.from('plan_entitlements').insert(
      entitlements.map((entitlement) => ({
        plan_id: planId,
        entitlement_code: entitlement.entitlement,
        enabled: entitlement.enabled ?? true,
        limit_value: entitlement.limit ?? null,
        metadata: entitlement.metadata ?? {},
      })),
    );
    if (insertError) throw insertError;
  }
}

function toSaasPlan(row: PlanRow, entitlements: readonly PlanEntitlementRow[]) {
  return saasPlanSchema.parse({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    priceAmountCents: row.price_amount_cents,
    billingInterval: row.billing_interval,
    status: normalizePlanStatus(row.status),
    entitlements: entitlements.map((entitlement) => ({
      id: `${entitlement.plan_id}:${entitlement.entitlement_code}`,
      planId: entitlement.plan_id,
      entitlement: entitlement.entitlement_code,
      enabled: entitlement.enabled,
      limit: entitlement.limit_value ?? undefined,
      metadata: entitlement.metadata ?? {},
    })),
    metadata: row.metadata ?? {},
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

function normalizePlanStatus(status: string): SaasPlanStatus {
  switch (status) {
    case 'ACTIVE':
    case 'INACTIVE':
    case 'ARCHIVED':
      return status;
    default:
      return 'INACTIVE';
  }
}

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
