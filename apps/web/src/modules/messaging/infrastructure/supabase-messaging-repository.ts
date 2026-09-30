import type { SupabaseClient } from '@supabase/supabase-js';
import {
  messagingConnectionSchema,
  messagingConsentRecordSchema,
  messagingConversationSchema,
  messagingMessageSchema,
  rawMessagingProviderEventSchema,
  type CreateMessagingConnectionCommand,
  type MessagingConnection,
  type MessagingConsentRecord,
  type MessagingConversation,
  type MessagingMessage,
  type RawMessagingProviderEvent,
  type RequestContext,
} from '@barberos/contracts';

import type {
  ConversationLookup,
  MessagingConnectionFilters,
  MessagingConversationFilters,
  MessagingMessageFilters,
  MessagingOperationalIssue,
  MessagingOperationalStatusQuery,
  MessagingRepository,
  RecordConsentCommand,
  RecordConversationCommand,
  RecordMessageCommand,
  RecordProviderEventCommand,
} from '../domain';

type BranchScopedQuery<T> = {
  eq(column: string, value: unknown): T;
  in(column: string, values: readonly unknown[]): T;
};

const connectionSelect =
  'id, tenant_id, branch_id, provider, status, display_name, display_phone_number, provider_phone_number_id, credential_reference, webhook_secret_reference, allow_tenant_fallback, metadata, created_by, updated_by, created_at, updated_at';
const conversationSelect =
  'id, tenant_id, branch_id, connection_id, customer_id, contact_phone_hash, status, last_message_at, created_at, updated_at';
const messageSelect =
  'id, tenant_id, branch_id, conversation_id, connection_id, customer_id, direction, channel, delivery_state, provider_message_id, notification_intent_id, campaign_run_id, body_preview, payload, sent_at, received_at, created_at, updated_at';
const eventSelect =
  'id, tenant_id, branch_id, connection_id, provider, provider_event_id, event_kind, received_at, processed_at, idempotency_key, payload, signature_valid';
const consentSelect =
  'id, tenant_id, branch_id, customer_id, contact_phone_hash, purpose, state, source, actor_id, provider_message_id, reason, created_at';
const deliveryAttemptOperationalSelect =
  'id, tenant_id, branch_id, notification_intent_id, channel, status, attempt_number, provider, error_code, error_retryable, created_at';
const campaignRunOperationalSelect =
  'id, tenant_id, branch_id, campaign_id, status, eligible_count, updated_at';

export class SupabaseMessagingRepository implements MessagingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createConnection(context: RequestContext, command: CreateMessagingConnectionCommand) {
    assertTenant(context, context.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client
      .from('messaging_connections')
      .insert({
        tenant_id: context.tenantId,
        branch_id: command.branchId,
        provider: command.provider,
        status: 'INACTIVE',
        display_name: command.displayName,
        display_phone_number: command.displayPhoneNumber,
        provider_phone_number_id: command.providerPhoneNumberId,
        credential_reference: command.credentialReference,
        webhook_secret_reference: command.webhookSecretReference,
        allow_tenant_fallback: command.allowTenantFallback ?? false,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select(connectionSelect)
      .single();
    if (error) throw error;
    return toConnection(data);
  }

  async findConnectionById(context: RequestContext, connectionId: string) {
    const { data, error } = await this.client
      .from('messaging_connections')
      .select(connectionSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', connectionId)
      .maybeSingle();
    if (error) throw error;
    return data ? toConnection(data) : null;
  }

  async listConnections(context: RequestContext, filters: MessagingConnectionFilters = {}) {
    let query = this.client
      .from('messaging_connections')
      .select(connectionSelect)
      .eq('tenant_id', context.tenantId)
      .order('updated_at', { ascending: false });
    query = applyBranchScope(query, context, filters.branchId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.provider) query = query.eq('provider', filters.provider);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toConnection);
  }

  async listConversations(context: RequestContext, filters: MessagingConversationFilters = {}) {
    let query = this.client
      .from('messaging_conversations')
      .select(conversationSelect)
      .eq('tenant_id', context.tenantId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(filters.limit ?? 50);
    query = applyBranchScope(query, context, filters.branchId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters.connectionId) query = query.eq('connection_id', filters.connectionId);
    if (filters.cursor) query = query.lt('last_message_at', filters.cursor);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toConversation);
  }

  async listMessages(context: RequestContext, filters: MessagingMessageFilters) {
    let query = this.client
      .from('messaging_messages')
      .select(messageSelect)
      .eq('tenant_id', context.tenantId)
      .eq('conversation_id', filters.conversationId)
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 50);
    query = applyBranchScope(query, context);
    if (filters.cursor) query = query.lt('created_at', filters.cursor);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toMessage);
  }

  async findActiveConnectionForBranch(context: RequestContext, branchId?: string) {
    const connections = await this.listConnections(context, { status: 'ACTIVE' });
    return (
      connections.find((connection) => connection.branchId === branchId) ??
      connections.find((connection) => !connection.branchId && connection.allowTenantFallback) ??
      null
    );
  }

  async listOperationalIssues(context: RequestContext, filters: MessagingOperationalStatusQuery) {
    const delayedBefore = new Date(Date.now() - filters.delayedWebhookMs).toISOString();
    const [failedDeliveries, blockedSends, delayedWebhooks, partialCampaigns] = await Promise.all([
      this.listDeliveryAttemptIssues(context, filters, ['FAILED', 'DEAD_LETTERED']),
      this.listDeliveryAttemptIssues(context, filters, ['BLOCKED_BY_CONSENT']),
      this.listDelayedWebhookIssues(context, filters, delayedBefore),
      this.listPartialCampaignIssues(context, filters),
    ]);

    return [...failedDeliveries, ...blockedSends, ...delayedWebhooks, ...partialCampaigns]
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, filters.limit);
  }

  async findProviderEventByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client
      .from('messaging_provider_events')
      .select(eventSelect)
      .eq('tenant_id', context.tenantId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (error) throw error;
    return data ? toProviderEvent(data) : null;
  }

  async recordProviderEvent(context: RequestContext, command: RecordProviderEventCommand) {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client
      .from('messaging_provider_events')
      .insert({
        id: command.id,
        tenant_id: command.tenantId,
        branch_id: command.branchId,
        connection_id: command.connectionId,
        provider: command.provider,
        provider_event_id: command.providerEventId,
        event_kind: command.eventKind,
        received_at: command.receivedAt,
        idempotency_key: command.idempotencyKey,
        payload: command.payload,
        signature_valid: command.signatureValid,
      })
      .select(eventSelect)
      .single();
    if (error) throw error;
    return toProviderEvent(data);
  }

  async findConversation(context: RequestContext, lookup: ConversationLookup) {
    assertTenant(context, lookup.tenantId);
    assertBranch(context, lookup.branchId);
    const { data, error } = await this.client
      .from('messaging_conversations')
      .select(conversationSelect)
      .eq('tenant_id', lookup.tenantId)
      .eq('connection_id', lookup.connectionId)
      .eq('contact_phone_hash', lookup.contactPhoneHash)
      .maybeSingle();
    if (error) throw error;
    return data ? toConversation(data) : null;
  }

  async upsertConversation(context: RequestContext, command: RecordConversationCommand) {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client
      .from('messaging_conversations')
      .upsert(
        {
          id: command.id,
          tenant_id: command.tenantId,
          branch_id: command.branchId,
          connection_id: command.connectionId,
          customer_id: command.customerId,
          contact_phone_hash: command.contactPhoneHash,
          status: command.status,
          last_message_at: command.lastMessageAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,connection_id,contact_phone_hash' },
      )
      .select(conversationSelect)
      .single();
    if (error) throw error;
    return toConversation(data);
  }

  async recordMessage(context: RequestContext, command: RecordMessageCommand) {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client
      .from('messaging_messages')
      .insert({
        id: command.id,
        tenant_id: command.tenantId,
        branch_id: command.branchId,
        conversation_id: command.conversationId,
        connection_id: command.connectionId,
        customer_id: command.customerId,
        direction: command.direction,
        channel: command.channel,
        delivery_state: command.deliveryState,
        provider_message_id: command.providerMessageId,
        notification_intent_id: command.notificationIntentId,
        campaign_run_id: command.campaignRunId,
        body_preview: command.bodyPreview,
        payload: command.payload,
        sent_at: command.sentAt,
        received_at: command.receivedAt,
      })
      .select(messageSelect)
      .single();
    if (error) throw error;
    return toMessage(data);
  }

  async recordConsent(context: RequestContext, command: RecordConsentCommand) {
    assertTenant(context, command.tenantId);
    assertBranch(context, command.branchId);
    const { data, error } = await this.client
      .from('messaging_consent_records')
      .insert({
        tenant_id: command.tenantId,
        branch_id: command.branchId,
        customer_id: command.customerId,
        contact_phone_hash: command.contactPhoneHash,
        purpose: command.purpose,
        state: command.state,
        source: command.source,
        actor_id: command.actorId,
        provider_message_id: command.providerMessageId,
        reason: command.reason,
      })
      .select(consentSelect)
      .single();
    if (error) throw error;
    return toConsent(data);
  }

  async findLatestConsent(
    context: RequestContext,
    input: {
      contactPhoneHash: string;
      purpose: MessagingConsentRecord['purpose'];
      customerId?: string;
    },
  ) {
    let query = this.client
      .from('messaging_consent_records')
      .select(consentSelect)
      .eq('tenant_id', context.tenantId)
      .eq('contact_phone_hash', input.contactPhoneHash)
      .eq('purpose', input.purpose)
      .order('created_at', { ascending: false })
      .limit(1);
    if (input.customerId) query = query.eq('customer_id', input.customerId);
    const { data, error } = await query;
    if (error) throw error;
    return data?.[0] ? toConsent(data[0]) : null;
  }

  private async listDeliveryAttemptIssues(
    context: RequestContext,
    filters: MessagingOperationalStatusQuery,
    statuses: readonly string[],
  ): Promise<MessagingOperationalIssue[]> {
    let query = this.client
      .from('notification_delivery_attempts')
      .select(deliveryAttemptOperationalSelect)
      .eq('tenant_id', context.tenantId)
      .in('status', statuses)
      .order('created_at', { ascending: false })
      .limit(filters.limit);
    query = applyBranchScope(query, context, filters.branchId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: `delivery-attempt:${String(row.id)}`,
      kind: row.status === 'BLOCKED_BY_CONSENT' ? 'BLOCKED_SEND' : 'FAILED_DELIVERY',
      tenantId: String(row.tenant_id),
      branchId: typeof row.branch_id === 'string' ? row.branch_id : undefined,
      severity: row.status === 'DEAD_LETTERED' ? 'critical' : 'warning',
      occurredAt: String(row.created_at),
      sourceType: 'NOTIFICATION_DELIVERY',
      sourceId: String(row.notification_intent_id),
      status: String(row.status),
      reason: typeof row.error_code === 'string' ? row.error_code : undefined,
      metadata: {
        channel: String(row.channel),
        attemptNumber: Number(row.attempt_number ?? 0),
        provider: typeof row.provider === 'string' ? row.provider : undefined,
        retryable: typeof row.error_retryable === 'boolean' ? row.error_retryable : undefined,
      },
    }));
  }

  private async listDelayedWebhookIssues(
    context: RequestContext,
    filters: MessagingOperationalStatusQuery,
    delayedBefore: string,
  ): Promise<MessagingOperationalIssue[]> {
    let query = this.client
      .from('messaging_provider_events')
      .select(eventSelect)
      .eq('tenant_id', context.tenantId)
      .is('processed_at', null)
      .lt('received_at', delayedBefore)
      .order('received_at', { ascending: true })
      .limit(filters.limit);
    query = applyBranchScope(query, context, filters.branchId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: `provider-event:${String(row.id)}`,
      kind: 'DELAYED_WEBHOOK',
      tenantId: String(row.tenant_id),
      branchId: typeof row.branch_id === 'string' ? row.branch_id : undefined,
      severity: 'warning',
      occurredAt: String(row.received_at),
      sourceType: 'MESSAGING_PROVIDER_EVENT',
      sourceId: String(row.id),
      status: 'UNPROCESSED',
      reason: String(row.event_kind),
      metadata: {
        provider: String(row.provider),
        connectionId: String(row.connection_id),
        signatureValid: Boolean(row.signature_valid),
      },
    }));
  }

  private async listPartialCampaignIssues(
    context: RequestContext,
    filters: MessagingOperationalStatusQuery,
  ): Promise<MessagingOperationalIssue[]> {
    let query = this.client
      .from('campaign_runs')
      .select(campaignRunOperationalSelect)
      .eq('tenant_id', context.tenantId)
      .eq('status', 'PARTIALLY_FAILED')
      .order('updated_at', { ascending: false })
      .limit(filters.limit);
    query = applyBranchScope(query, context, filters.branchId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: `campaign-run:${String(row.id)}`,
      kind: 'CAMPAIGN_PARTIAL_FAILURE',
      tenantId: String(row.tenant_id),
      branchId: typeof row.branch_id === 'string' ? row.branch_id : undefined,
      severity: 'warning',
      occurredAt: String(row.updated_at),
      sourceType: 'CAMPAIGN_RUN',
      sourceId: String(row.id),
      status: String(row.status),
      reason: 'PARTIALLY_FAILED',
      metadata: {
        campaignId: String(row.campaign_id),
        eligibleCount: Number(row.eligible_count ?? 0),
      },
    }));
  }
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

function assertTenant(context: RequestContext, tenantId: string) {
  if (context.tenantId !== tenantId)
    throw new Error('Cross-tenant messaging write is not allowed.');
}

function assertBranch(context: RequestContext, branchId?: string) {
  if (branchId && !context.branchScope.includes(branchId)) {
    throw new Error('Messaging branch is outside request scope.');
  }
}

function toConnection(row: Record<string, unknown>): MessagingConnection {
  return messagingConnectionSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    provider: row.provider,
    status: row.status,
    displayName: row.display_name,
    displayPhoneNumber: row.display_phone_number,
    providerPhoneNumberId: row.provider_phone_number_id ?? undefined,
    credentialReference: row.credential_reference ?? undefined,
    webhookSecretReference: row.webhook_secret_reference ?? undefined,
    allowTenantFallback: row.allow_tenant_fallback,
    metadata: row.metadata,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toConversation(row: Record<string, unknown>): MessagingConversation {
  return messagingConversationSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    connectionId: row.connection_id,
    customerId: row.customer_id ?? undefined,
    contactPhoneHash: row.contact_phone_hash,
    status: row.status,
    lastMessageAt: row.last_message_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toMessage(row: Record<string, unknown>): MessagingMessage {
  return messagingMessageSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    conversationId: row.conversation_id,
    connectionId: row.connection_id,
    customerId: row.customer_id ?? undefined,
    direction: row.direction,
    channel: row.channel,
    deliveryState: row.delivery_state,
    providerMessageId: row.provider_message_id ?? undefined,
    notificationIntentId: row.notification_intent_id ?? undefined,
    campaignRunId: row.campaign_run_id ?? undefined,
    bodyPreview: row.body_preview ?? undefined,
    payload: row.payload,
    sentAt: row.sent_at ?? undefined,
    receivedAt: row.received_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toProviderEvent(row: Record<string, unknown>): RawMessagingProviderEvent {
  return rawMessagingProviderEventSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    connectionId: row.connection_id,
    provider: row.provider,
    providerEventId: row.provider_event_id,
    eventKind: row.event_kind,
    receivedAt: row.received_at,
    processedAt: row.processed_at ?? undefined,
    idempotencyKey: row.idempotency_key,
    payload: row.payload,
    signatureValid: row.signature_valid,
  });
}

function toConsent(row: Record<string, unknown>): MessagingConsentRecord {
  return messagingConsentRecordSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    contactPhoneHash: row.contact_phone_hash,
    purpose: row.purpose,
    state: row.state,
    source: row.source,
    actorId: row.actor_id ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
    reason: row.reason ?? undefined,
    createdAt: row.created_at,
  });
}
