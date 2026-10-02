import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PlatformAuditAction,
  PlatformAuditEntry,
  PlatformAuditFilter,
} from '@barberos/contracts';

import type { PlatformRequestContext } from '../domain';
import type { PlatformAuditRepository } from '../application/platform-audit-service';

type AuditRow = {
  id: string;
  tenant_id?: string | null;
  actor_id?: string | null;
  action: PlatformAuditAction;
  entity_type: string;
  entity_id?: string | null;
  result: string;
  request_id?: string | null;
  metadata?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  created_at: string;
};

const platformAuditActions = [
  'TENANT_SUSPENDED',
  'TENANT_RESTRICTED',
  'TENANT_REACTIVATED',
  'PLAN_CREATED',
  'PLAN_UPDATED',
  'PLAN_ARCHIVED',
  'SUBSCRIPTION_ASSIGNED',
  'SUBSCRIPTION_STATUS_CHANGED',
  'ENTITLEMENT_OVERRIDE_APPLIED',
  'SUPPORT_SCOPE_CREATED',
  'SUPPORT_SCOPE_DENIED',
  'SENSITIVE_ACTION_DENIED',
] as const satisfies readonly PlatformAuditAction[];

const auditSelect =
  'id, tenant_id, actor_id, action, entity_type, entity_id, result, request_id, metadata, after_state, created_at';

export class SupabasePlatformAuditRepository implements PlatformAuditRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listAuditEntries(
    context: PlatformRequestContext,
    filters: PlatformAuditFilter = {},
  ): Promise<PlatformAuditEntry[]> {
    let query = this.client
      .from('audit_logs')
      .select(auditSelect)
      .in('action', [...platformAuditActions])
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 25);

    if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);
    if (filters.actorUserId) query = query.eq('actor_id', filters.actorUserId);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.startsAt) query = query.gte('created_at', filters.startsAt);
    if (filters.endsAt) query = query.lte('created_at', filters.endsAt);
    if (filters.cursor) query = query.lt('created_at', filters.cursor);

    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as AuditRow[]).map((row) => toAuditEntry(row, context.userId));
  }
}

function toAuditEntry(row: AuditRow, fallbackActorUserId: string): PlatformAuditEntry {
  return {
    id: row.id,
    action: row.action,
    actorUserId: row.actor_id ?? fallbackActorUserId,
    tenantId: row.tenant_id ?? undefined,
    targetType: row.entity_type,
    targetId: row.entity_id ?? undefined,
    result: normalizeResult(row.result),
    requestId: row.request_id ?? undefined,
    reason: typeof row.metadata?.reason === 'string' ? row.metadata.reason : undefined,
    metadata: {
      ...(row.after_state ?? {}),
      ...(row.metadata ?? {}),
    },
    createdAt: toIsoDateTime(row.created_at),
  };
}

function normalizeResult(result: string): PlatformAuditEntry['result'] {
  if (result === 'SUCCESS' || result === 'DENIED' || result === 'FAILED') return result;
  return result === 'FAILURE' ? 'FAILED' : 'FAILED';
}

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
