import type { SupabaseClient } from '@supabase/supabase-js';
import { supportScopeSchema, type CreateSupportScopeCommand } from '@barberos/contracts';

import type { PlatformRequestContext } from '../domain';
import type { SupportScopeRepository } from '../application/support-scope-service';

type SupportScopeRow = {
  id: string;
  tenant_id: string;
  platform_membership_id?: string | null;
  platform_membership?: { user_id?: string | null } | Array<{ user_id?: string | null }> | null;
  purpose?: string | null;
  reason?: string | null;
  operation_class: string;
  status: string;
  expires_at: string;
  created_at: string;
  revoked_at?: string | null;
};

const scopeSelect =
  'id, tenant_id, platform_membership_id, platform_membership:platform_memberships(user_id), purpose, reason, operation_class, status, expires_at, created_at, revoked_at';

export class SupabasePlatformSupportScopeRepository implements SupportScopeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listSupportScopes(context: PlatformRequestContext, tenantId?: string) {
    let query = this.client
      .from('support_access_sessions')
      .select(scopeSelect)
      .order('created_at', { ascending: false })
      .limit(100);
    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as SupportScopeRow[]).map((row) => toSupportScope(row, context.userId));
  }

  async createSupportScope(context: PlatformRequestContext, command: CreateSupportScopeCommand) {
    const platformMembershipId =
      (await this.findPlatformMembershipId(command.actorUserId)) ??
      (await this.findPlatformMembershipId(context.userId));

    if (!platformMembershipId) {
      throw Object.assign(new Error('Platform membership was not found.'), {
        code: 'PLATFORM_ACCESS_DENIED',
      });
    }

    const { data, error } = await this.client
      .from('support_access_sessions')
      .insert({
        platform_membership_id: platformMembershipId,
        tenant_id: command.tenantId,
        reason: command.purpose,
        purpose: command.purpose,
        operation_class: command.operationClass,
        status: 'ACTIVE',
        starts_at: new Date().toISOString(),
        expires_at: command.expiresAt,
        request_id: context.requestId,
        created_by: context.userId,
      })
      .select(scopeSelect)
      .single();
    if (error) throw error;
    return toSupportScope(data as SupportScopeRow, command.actorUserId);
  }

  async findActiveScope(
    context: PlatformRequestContext,
    input: Parameters<SupportScopeRepository['findActiveScope']>[1],
  ) {
    const platformMembershipId =
      (await this.findPlatformMembershipId(input.actorUserId)) ??
      (input.actorUserId === context.userId
        ? await this.findPlatformMembershipId(context.userId)
        : undefined);
    if (!platformMembershipId) return null;

    const { data, error } = await this.client
      .from('support_access_sessions')
      .select(scopeSelect)
      .eq('tenant_id', input.tenantId)
      .eq('platform_membership_id', platformMembershipId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toSupportScope(data as SupportScopeRow, input.actorUserId) : null;
  }

  private async findPlatformMembershipId(userId: string) {
    const { data, error } = await this.client
      .from('platform_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle();
    if (error) throw error;
    return typeof data?.id === 'string' ? data.id : null;
  }
}

function toSupportScope(row: SupportScopeRow, fallbackActorUserId: string) {
  const membership = Array.isArray(row.platform_membership)
    ? row.platform_membership[0]
    : row.platform_membership;

  return supportScopeSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    actorUserId: membership?.user_id ?? fallbackActorUserId,
    purpose: row.purpose ?? row.reason ?? 'Support access',
    operationClass: row.operation_class,
    status: normalizeSupportScopeStatus(row.status, row.expires_at),
    expiresAt: toIsoDateTime(row.expires_at),
    createdAt: toIsoDateTime(row.created_at),
    revokedAt: row.revoked_at ? toIsoDateTime(row.revoked_at) : undefined,
  });
}

function normalizeSupportScopeStatus(status: string, expiresAt: string) {
  if (status === 'REVOKED') return 'REVOKED';
  if (Date.parse(expiresAt) <= Date.now()) return 'EXPIRED';
  return 'ACTIVE';
}

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
