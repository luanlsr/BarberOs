import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../auth/server';

const sensitiveKey = /password|secret|token|authorization|cookie|service.?role/i;
export type AuditResult = 'SUCCESS' | 'DENIED' | 'FAILURE';
export type AuditEvent = {
  tenantId?: string | null;
  actorType: 'USER' | 'SYSTEM' | 'SERVICE';
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  result: AuditResult;
  beforeState?: unknown;
  afterState?: unknown;
  requestId?: string | null;
};

export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitiveKey.test(key))
      .map(([key, entry]) => [key, sanitizeAuditValue(entry)]),
  );
}

export async function recordAuditEvent(
  event: AuditEvent,
  client?: SupabaseClient | null,
): Promise<{ persisted: boolean }> {
  const supabase = client === undefined ? await createSupabaseServerClient() : client;
  if (!supabase) return { persisted: false };
  const { error } = await supabase.from('audit_logs').insert({
    tenant_id: event.tenantId ?? null,
    actor_type: event.actorType,
    actor_id: event.actorId ?? null,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    result: event.result,
    before_state: sanitizeAuditValue(event.beforeState),
    after_state: sanitizeAuditValue(event.afterState),
    request_id: event.requestId ?? null,
  });
  if (error) throw new Error(`AUDIT_WRITE_FAILED: ${error.message}`);
  return { persisted: true };
}
