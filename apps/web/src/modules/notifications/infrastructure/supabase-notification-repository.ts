import type { SupabaseClient } from '@supabase/supabase-js';
import {
  notificationDeliveryAttemptSchema,
  notificationIntentSchema,
  type CreateNotificationIntentCommand,
  type NotificationDeliveryAttempt,
  type NotificationIntent,
  type RecordNotificationDeliveryAttemptCommand,
  type RequestContext,
} from '@barberos/contracts';
import type {
  NotificationDeliveryAttemptFilters,
  NotificationIntentFilters,
  NotificationRepository,
} from '../domain';
type BranchScopedQuery<T> = {
  eq(column: string, value: unknown): T;
  in(column: string, values: readonly unknown[]): T;
};

const intentSelect =
  'id, tenant_id, branch_id, recipient_type, recipient_id, channel, template_key, source_type, source_id, payload, status, idempotency_key, correlation_id, created_at, updated_at';
const attemptSelect =
  'id, tenant_id, branch_id, notification_intent_id, channel, status, attempt_number, provider, provider_message_id, error, sent_at, created_at';

export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createIntent(context: RequestContext, command: CreateNotificationIntentCommand) {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client
      .from('notification_intents')
      .insert({
        tenant_id: command.tenantId,
        branch_id: command.branchId,
        recipient_type: command.recipientType,
        recipient_id: command.recipientId,
        channel: command.channel,
        template_key: command.templateKey,
        source_type: command.sourceType,
        source_id: command.sourceId,
        payload: command.payload,
        idempotency_key: command.idempotencyKey,
        correlation_id: command.correlationId,
        status: 'PENDING',
      })
      .select(intentSelect)
      .single();
    if (error) throw error;
    return toNotificationIntent(data);
  }

  async findIntentById(context: RequestContext, intentId: string) {
    const { data, error } = await this.client
      .from('notification_intents')
      .select(intentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', intentId)
      .maybeSingle();
    if (error) throw error;
    return data ? toNotificationIntent(data) : null;
  }

  async findIntentByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client
      .from('notification_intents')
      .select(intentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (error) throw error;
    return data ? toNotificationIntent(data) : null;
  }

  async listIntents(context: RequestContext, filters: NotificationIntentFilters = {}) {
    let query = this.client
      .from('notification_intents')
      .select(intentSelect)
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100);
    query = applyBranchScope(query, context, filters.branchId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.channel) query = query.eq('channel', filters.channel);
    if (filters.sourceType) query = query.eq('source_type', filters.sourceType);
    if (filters.sourceId) query = query.eq('source_id', filters.sourceId);
    if (filters.recipientType) query = query.eq('recipient_type', filters.recipientType);
    if (filters.recipientId) query = query.eq('recipient_id', filters.recipientId);
    if (filters.cursor) query = query.lt('created_at', filters.cursor);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toNotificationIntent);
  }

  async recordDeliveryAttempt(
    context: RequestContext,
    command: RecordNotificationDeliveryAttemptCommand,
  ) {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client
      .from('notification_delivery_attempts')
      .insert({
        tenant_id: command.tenantId,
        branch_id: command.branchId,
        notification_intent_id: command.notificationIntentId,
        channel: command.channel,
        status: command.status,
        attempt_number: command.attemptNumber,
        provider: command.provider,
        provider_message_id: command.providerMessageId,
        error: command.error,
        sent_at: command.sentAt,
      })
      .select(attemptSelect)
      .single();
    if (error) throw error;
    return toDeliveryAttempt(data);
  }

  async listDeliveryAttempts(
    context: RequestContext,
    filters: NotificationDeliveryAttemptFilters = {},
  ) {
    let query = this.client
      .from('notification_delivery_attempts')
      .select(attemptSelect)
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100);
    query = applyBranchScope(query, context, filters.branchId);
    if (filters.notificationIntentId)
      query = query.eq('notification_intent_id', filters.notificationIntentId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.channel) query = query.eq('channel', filters.channel);
    if (filters.cursor) query = query.lt('created_at', filters.cursor);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toDeliveryAttempt);
  }
}

function assertTenant(context: RequestContext, tenantId: string) {
  if (context.tenantId !== tenantId) throw new Error('Cross-tenant write is not allowed.');
}

function assertBranch(context: RequestContext, branchId?: string) {
  if (branchId && !context.branchScope.includes(branchId))
    throw new Error('Branch is outside request scope.');
}

function applyBranchScope<T extends BranchScopedQuery<T>>(
  query: T,
  context: RequestContext,
  branchId?: string,
) {
  if (branchId) {
    assertBranch(context, branchId);
    return query.eq('branch_id', branchId);
  }
  return context.branchScope.length ? query.in('branch_id', [...context.branchScope]) : query;
}

export function toNotificationIntent(row: Record<string, unknown>): NotificationIntent {
  return notificationIntentSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    recipientType: row.recipient_type,
    recipientId: row.recipient_id,
    channel: row.channel,
    templateKey: row.template_key,
    sourceType: row.source_type,
    sourceId: row.source_id,
    payload: row.payload,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    correlationId: row.correlation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function toDeliveryAttempt(row: Record<string, unknown>): NotificationDeliveryAttempt {
  return notificationDeliveryAttemptSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    notificationIntentId: row.notification_intent_id,
    channel: row.channel,
    status: row.status,
    attemptNumber: row.attempt_number,
    provider: row.provider ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
    error: row.error ?? undefined,
    sentAt: row.sent_at ?? undefined,
    createdAt: row.created_at,
  });
}
