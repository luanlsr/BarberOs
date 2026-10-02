import type { SupabaseClient } from '@supabase/supabase-js';
import type { EntitlementOverrideCommand } from '@barberos/contracts';

import type { PlatformRequestContext } from '../domain';
import type {
  EntitlementResolutionRepository,
  LegacyTenantEntitlementRecord,
  PlanEntitlementRecord,
  TenantEntitlementOverrideRecord,
} from '../application/entitlement-resolution-service';

type OverrideRow = {
  id: string;
  tenant_id: string;
  entitlement_code: TenantEntitlementOverrideRecord['entitlement'];
  enabled: boolean;
  limit_value?: number | null;
  reason?: string | null;
  expires_at?: string | null;
};

type PlanEntitlementRow = {
  plan_id: string;
  entitlement_code: PlanEntitlementRecord['entitlement'];
  enabled: boolean;
  limit_value?: number | null;
};

type LegacyEntitlementRow = {
  tenant_id: string;
  entitlement_code: LegacyTenantEntitlementRecord['entitlement'];
  enabled: boolean;
  limit_value?: number | null;
};

const overrideSelect = 'id, tenant_id, entitlement_code, enabled, limit_value, reason, expires_at';
const planEntitlementSelect = 'plan_id, entitlement_code, enabled, limit_value';
const legacyEntitlementSelect = 'tenant_id, entitlement_code, enabled, limit_value';

export class SupabasePlatformEntitlementRepository implements EntitlementResolutionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async applyOverride(
    context: PlatformRequestContext,
    command: EntitlementOverrideCommand,
  ): Promise<TenantEntitlementOverrideRecord> {
    const now = new Date().toISOString();
    const { error: revokeError } = await this.client
      .from('tenant_entitlement_overrides')
      .update({
        revoked_by: context.userId,
        revoked_at: now,
        updated_at: now,
      })
      .eq('tenant_id', command.tenantId)
      .eq('entitlement_code', command.entitlement)
      .is('revoked_at', null);
    if (revokeError) throw revokeError;

    const { data, error } = await this.client
      .from('tenant_entitlement_overrides')
      .insert({
        tenant_id: command.tenantId,
        entitlement_code: command.entitlement,
        enabled: command.enabled,
        limit_value: command.limit ?? null,
        reason: command.reason,
        expires_at: command.expiresAt ?? null,
        created_by: context.userId,
      })
      .select(overrideSelect)
      .single();
    if (error) throw error;
    return toOverrideRecord(data as OverrideRow);
  }

  async findActiveOverride(
    _context: PlatformRequestContext,
    tenantId: string,
    entitlement: TenantEntitlementOverrideRecord['entitlement'],
  ): Promise<TenantEntitlementOverrideRecord | null> {
    const { data, error } = await this.client
      .from('tenant_entitlement_overrides')
      .select(overrideSelect)
      .eq('tenant_id', tenantId)
      .eq('entitlement_code', entitlement)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toOverrideRecord(data as OverrideRow) : null;
  }

  async findActivePlanEntitlement(
    _context: PlatformRequestContext,
    tenantId: string,
    entitlement: PlanEntitlementRecord['entitlement'],
  ): Promise<PlanEntitlementRecord | null> {
    const { data: subscription, error: subscriptionError } = await this.client
      .from('tenant_subscriptions')
      .select('plan_id, status, updated_at')
      .eq('tenant_id', tenantId)
      .in('status', ['TRIALING', 'ACTIVE'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription?.plan_id) return null;

    const { data, error } = await this.client
      .from('plan_entitlements')
      .select(planEntitlementSelect)
      .eq('plan_id', subscription.plan_id)
      .eq('entitlement_code', entitlement)
      .maybeSingle();
    if (error) throw error;
    return data ? toPlanEntitlementRecord(data as PlanEntitlementRow) : null;
  }

  async findLegacyTenantEntitlement(
    _context: PlatformRequestContext,
    tenantId: string,
    entitlement: LegacyTenantEntitlementRecord['entitlement'],
  ): Promise<LegacyTenantEntitlementRecord | null> {
    const { data, error } = await this.client
      .from('tenant_entitlements')
      .select(legacyEntitlementSelect)
      .eq('tenant_id', tenantId)
      .eq('entitlement_code', entitlement)
      .maybeSingle();
    if (error) throw error;
    return data ? toLegacyEntitlementRecord(data as LegacyEntitlementRow) : null;
  }
}

function toOverrideRecord(row: OverrideRow): TenantEntitlementOverrideRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    entitlement: row.entitlement_code,
    enabled: row.enabled,
    limit: row.limit_value ?? undefined,
    reason: row.reason ?? undefined,
    expiresAt: row.expires_at ?? undefined,
  };
}

function toPlanEntitlementRecord(row: PlanEntitlementRow): PlanEntitlementRecord {
  return {
    planId: row.plan_id,
    entitlement: row.entitlement_code,
    enabled: row.enabled,
    limit: row.limit_value ?? undefined,
  };
}

function toLegacyEntitlementRecord(row: LegacyEntitlementRow): LegacyTenantEntitlementRecord {
  return {
    tenantId: row.tenant_id,
    entitlement: row.entitlement_code,
    enabled: row.enabled,
    limit: row.limit_value ?? undefined,
  };
}
