import type {
  CreateMessagingConnectionCommand,
  MessagingConnection,
  MessagingConsentRecord,
  MessagingConversation,
  MessagingMessage,
  RawMessagingProviderEvent,
  RequestContext,
} from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import { MessagingApplicationService } from './messaging-service';
import type {
  ConversationLookup,
  MessagingConnectionFilters,
  MessagingConversationFilters,
  MessagingMessageFilters,
  MessagingAuditSink,
  MessagingOperationalIssue,
  MessagingOperationalStatusQuery,
  MessagingRepository,
  RecordConsentCommand,
  RecordConversationCommand,
  RecordMessageCommand,
  RecordProviderEventCommand,
} from '../domain';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['messaging.read', 'messaging.manage'],
  entitlements: ['messaging'],
  branchScope: ['branch-1'],
};

const now = '2026-09-23T12:00:00.000Z';

describe('MessagingApplicationService', () => {
  it('creates connections with server-side authorization and branch scope', async () => {
    const repository = new MemoryMessagingRepository();
    const service = new MessagingApplicationService(repository);
    const command: CreateMessagingConnectionCommand = {
      branchId: 'branch-1',
      provider: 'LOCAL',
      displayName: 'WhatsApp Centro',
      displayPhoneNumber: '+5511999999999',
      allowTenantFallback: false,
    };

    const created = await service.createConnection(context, command);

    expect(created).toMatchObject({ tenantId: 'tenant-1', branchId: 'branch-1', status: 'ACTIVE' });
    await expect(
      service.createConnection({ ...context, permissions: ['messaging.read'] }, command),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(
      service.createConnection(context, { ...command, branchId: 'branch-2' }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });
  });

  it('audits connection creation and provider credential reference changes without raw secrets', async () => {
    const repository = new MemoryMessagingRepository();
    const audit = new FakeMessagingAuditSink();
    const service = new MessagingApplicationService(repository, audit);

    await service.createConnection(context, {
      branchId: 'branch-1',
      provider: 'META_WHATSAPP_CLOUD',
      displayName: 'WhatsApp Seguro',
      displayPhoneNumber: '+5511999999999',
      providerPhoneNumberId: 'phone-number-1',
      credentialReference: 'vault:messaging/raw-secret-reference',
      webhookSecretReference: 'vault:messaging/raw-webhook-secret',
      allowTenantFallback: false,
    });

    expect(audit.contexts.at(-1)).toMatchObject({ tenantId: 'tenant-1', userId: 'user-1' });
    expect(audit.events.map((event) => event.action)).toEqual([
      'MESSAGING_CONNECTION_CREATED',
      'MESSAGING_CONNECTION_CREDENTIAL_REFERENCE_CHANGED',
    ]);
    expect(audit.events[0]).toMatchObject({
      entityType: 'MESSAGING_CONNECTION',
      entityId: 'connection-1',
      result: 'SUCCESS',
      afterState: expect.objectContaining({ provider: 'META_WHATSAPP_CLOUD' }),
    });
    expect(audit.events[1]).toMatchObject({
      afterState: {
        connectionId: 'connection-1',
        provider: 'META_WHATSAPP_CLOUD',
        branchId: 'branch-1',
        credentialReferenceChanged: true,
        webhookSecretReferenceChanged: true,
        providerPhoneNumberIdChanged: true,
      },
    });
    expect(JSON.stringify(audit.events)).not.toContain('raw-secret-reference');
    expect(JSON.stringify(audit.events)).not.toContain('raw-webhook-secret');
  });

  it('selects branch connection before tenant fallback', async () => {
    const repository = new MemoryMessagingRepository([
      connection({ id: 'tenant-connection', branchId: undefined, allowTenantFallback: true }),
      connection({ id: 'branch-connection', branchId: 'branch-1', allowTenantFallback: false }),
    ]);
    const service = new MessagingApplicationService(repository);

    await expect(
      service.selectConnection(context, { branchId: 'branch-1' }),
    ).resolves.toMatchObject({ id: 'branch-connection' });
    await expect(service.selectConnection(context, {})).resolves.toMatchObject({
      id: 'tenant-connection',
    });
  });

  it('persists raw provider events idempotently', async () => {
    const repository = new MemoryMessagingRepository([connection({ id: 'connection-1' })]);
    const service = new MessagingApplicationService(repository);
    const event: RecordProviderEventCommand = {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      connectionId: 'connection-1',
      provider: 'LOCAL',
      providerEventId: 'provider-event-1',
      eventKind: 'INBOUND_MESSAGE',
      receivedAt: now,
      idempotencyKey: 'provider-event-1-key',
      payload: { text: 'Oi' },
      signatureValid: true,
    };

    const first = await service.recordProviderEvent(context, event);
    const second = await service.recordProviderEvent(context, event);

    expect(first).toEqual(second);
    expect(repository.providerEvents).toHaveLength(1);
    await expect(
      service.recordProviderEvent(context, { ...event, tenantId: 'tenant-2' }),
    ).rejects.toThrow('Cross-tenant');
  });

  it('records inbound messages and converts opt-out keywords into consent records', async () => {
    const repository = new MemoryMessagingRepository([connection({ id: 'connection-1' })]);
    const service = new MessagingApplicationService(repository);

    const result = await service.recordInboundMessage(context, {
      rawText: 'SAIR',
      conversation: {
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        connectionId: 'connection-1',
        customerId: 'customer-1',
        contactPhoneHash: 'hash-customer-phone-1',
        status: 'OPEN',
        lastMessageAt: now,
      },
      message: {
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        conversationId: 'conversation-placeholder',
        connectionId: 'connection-1',
        customerId: 'customer-1',
        direction: 'INBOUND',
        channel: 'WHATSAPP',
        deliveryState: 'RECEIVED',
        providerMessageId: 'wamid-1',
        bodyPreview: 'SAIR',
        payload: { contactPhoneHash: 'hash-customer-phone-1' },
        receivedAt: now,
      },
    });

    expect(result.conversation.contactPhoneHash).toBe('hash-customer-phone-1');
    expect(result.message.conversationId).toBe(result.conversation.id);
    expect(repository.consents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          purpose: 'WHATSAPP_MARKETING',
          state: 'OPTED_OUT',
          source: 'CUSTOMER_MESSAGE',
          reason: 'SAIR',
        }),
      ]),
    );
  });

  it('evaluates transactional and marketing consent separately', async () => {
    const repository = new MemoryMessagingRepository();
    const service = new MessagingApplicationService(repository);
    await service.recordConsent(context, {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      contactPhoneHash: 'hash-customer-phone-1',
      purpose: 'WHATSAPP_TRANSACTIONAL',
      state: 'OPTED_IN',
      source: 'OPERATOR',
    });

    await expect(
      service.evaluateEligibility(context, {
        contactPhoneHash: 'hash-customer-phone-1',
        purpose: 'WHATSAPP_TRANSACTIONAL',
        hasReachableDestination: true,
      }),
    ).resolves.toEqual({ allowed: true });
    await expect(
      service.evaluateEligibility(context, {
        contactPhoneHash: 'hash-customer-phone-1',
        purpose: 'WHATSAPP_MARKETING',
        hasReachableDestination: true,
      }),
    ).resolves.toEqual({ allowed: false, reason: 'UNKNOWN_CONSENT' });
  });

  it('audits consent changes with before and after snapshots', async () => {
    const repository = new MemoryMessagingRepository();
    const audit = new FakeMessagingAuditSink();
    const service = new MessagingApplicationService(repository, audit);

    await service.recordConsent(context, {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      customerId: 'customer-1',
      contactPhoneHash: 'hash-customer-phone-1',
      purpose: 'WHATSAPP_MARKETING',
      state: 'OPTED_IN',
      source: 'OPERATOR',
    });
    await service.recordConsent(context, {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      customerId: 'customer-1',
      contactPhoneHash: 'hash-customer-phone-1',
      purpose: 'WHATSAPP_MARKETING',
      state: 'OPTED_OUT',
      source: 'CUSTOMER_MESSAGE',
      reason: 'SAIR',
    });

    expect(audit.events.map((event) => event.action)).toEqual([
      'MESSAGING_CONSENT_CHANGED',
      'MESSAGING_CONSENT_CHANGED',
    ]);
    expect(audit.events[1]).toMatchObject({
      entityType: 'MESSAGING_CONSENT',
      entityId: 'consent-2',
      beforeState: expect.objectContaining({ state: 'OPTED_IN' }),
      afterState: expect.objectContaining({ state: 'OPTED_OUT', reason: 'SAIR' }),
    });
  });

  it('returns scoped operational status for delivery, webhook and campaign issues without raw payloads', async () => {
    const repository = new MemoryMessagingRepository();
    repository.operationalIssues.push(
      operationalIssue({
        id: 'delivery-attempt:failed-1',
        kind: 'FAILED_DELIVERY',
        sourceId: 'notification-1',
        status: 'DEAD_LETTERED',
        severity: 'critical',
        reason: 'WORKER_RETRY_EXHAUSTED',
      }),
      operationalIssue({
        id: 'delivery-attempt:blocked-1',
        kind: 'BLOCKED_SEND',
        sourceId: 'notification-2',
        status: 'BLOCKED_BY_CONSENT',
      }),
      operationalIssue({
        id: 'provider-event:raw-1',
        kind: 'DELAYED_WEBHOOK',
        sourceType: 'MESSAGING_PROVIDER_EVENT',
        sourceId: 'raw-event-1',
        status: 'UNPROCESSED',
        metadata: { provider: 'LOCAL', rawBody: undefined },
      }),
      operationalIssue({
        id: 'campaign-run:partial-1',
        kind: 'CAMPAIGN_PARTIAL_FAILURE',
        sourceType: 'CAMPAIGN_RUN',
        sourceId: 'campaign-run-1',
        status: 'PARTIALLY_FAILED',
      }),
      operationalIssue({
        id: 'delivery-attempt:other-branch',
        kind: 'FAILED_DELIVERY',
        branchId: 'branch-2',
      }),
      operationalIssue({
        id: 'delivery-attempt:other-tenant',
        kind: 'FAILED_DELIVERY',
        tenantId: 'tenant-2',
      }),
    );
    const service = new MessagingApplicationService(repository);

    const summary = await service.getOperationalStatus(context, {
      branchId: 'branch-1',
      limit: 50,
      delayedWebhookMs: 60_000,
    });

    expect(repository.lastOperationalFilters).toEqual({
      branchId: 'branch-1',
      limit: 50,
      delayedWebhookMs: 60_000,
    });
    expect(summary.metrics).toEqual([
      { key: 'failedDeliveries', label: 'Entregas com falha', value: 1 },
      { key: 'blockedSends', label: 'Envios bloqueados', value: 1 },
      { key: 'delayedWebhooks', label: 'Webhooks atrasados', value: 1 },
      {
        key: 'campaignPartialFailures',
        label: 'Campanhas parcialmente falhas',
        value: 1,
      },
    ]);
    expect(summary.issues.map((issue) => issue.id)).toEqual([
      'delivery-attempt:failed-1',
      'delivery-attempt:blocked-1',
      'provider-event:raw-1',
      'campaign-run:partial-1',
    ]);
    expect(JSON.stringify(summary)).not.toContain('provider payload');
    expect(JSON.stringify(summary)).not.toContain('bodyPreview');
    await expect(
      service.getOperationalStatus({ ...context, permissions: [] }, {}),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

function connection(overrides: Partial<MessagingConnection> = {}): MessagingConnection {
  return {
    id: overrides.id ?? 'connection-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
    branchId: Object.hasOwn(overrides, 'branchId') ? overrides.branchId : 'branch-1',
    provider: overrides.provider ?? 'LOCAL',
    status: overrides.status ?? 'ACTIVE',
    displayName: overrides.displayName ?? 'WhatsApp Local',
    displayPhoneNumber: overrides.displayPhoneNumber ?? '+5511999999999',
    providerPhoneNumberId: overrides.providerPhoneNumberId,
    credentialReference: overrides.credentialReference,
    webhookSecretReference: overrides.webhookSecretReference,
    allowTenantFallback: overrides.allowTenantFallback ?? false,
    metadata: overrides.metadata ?? {},
    createdBy: overrides.createdBy ?? 'user-1',
    updatedBy: overrides.updatedBy ?? 'user-1',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

class MemoryMessagingRepository implements MessagingRepository {
  readonly connections: MessagingConnection[];
  readonly providerEvents: RawMessagingProviderEvent[] = [];
  readonly conversations: MessagingConversation[] = [];
  readonly messages: MessagingMessage[] = [];
  readonly consents: MessagingConsentRecord[] = [];
  readonly operationalIssues: MessagingOperationalIssue[] = [];
  lastOperationalFilters?: MessagingOperationalStatusQuery;

  constructor(connections: readonly MessagingConnection[] = []) {
    this.connections = [...connections];
  }

  async createConnection(context: RequestContext, command: CreateMessagingConnectionCommand) {
    const created = connection({
      id: 'connection-' + (this.connections.length + 1),
      tenantId: context.tenantId,
      branchId: command.branchId,
      provider: command.provider,
      displayName: command.displayName,
      displayPhoneNumber: command.displayPhoneNumber,
      providerPhoneNumberId: command.providerPhoneNumberId,
      credentialReference: command.credentialReference,
      webhookSecretReference: command.webhookSecretReference,
      allowTenantFallback: command.allowTenantFallback,
    });
    this.connections.push(created);
    return created;
  }

  async findConnectionById(_context: RequestContext, connectionId: string) {
    return this.connections.find((candidate) => candidate.id === connectionId) ?? null;
  }

  async listConnections(_context: RequestContext, filters: MessagingConnectionFilters = {}) {
    return this.connections.filter(
      (connection) =>
        (!filters.branchId || connection.branchId === filters.branchId) &&
        (!filters.status || connection.status === filters.status) &&
        (!filters.provider || connection.provider === filters.provider),
    );
  }

  async findActiveConnectionForBranch(context: RequestContext, branchId?: string) {
    const connections = await this.listConnections(context, { status: 'ACTIVE' });
    return connections.find((candidate) => candidate.branchId === branchId) ?? null;
  }

  async listConversations(_context: RequestContext, filters: MessagingConversationFilters = {}) {
    return this.conversations.filter(
      (conversation) =>
        (!filters.branchId || conversation.branchId === filters.branchId) &&
        (!filters.status || conversation.status === filters.status) &&
        (!filters.customerId || conversation.customerId === filters.customerId) &&
        (!filters.connectionId || conversation.connectionId === filters.connectionId),
    );
  }

  async listMessages(_context: RequestContext, filters: MessagingMessageFilters) {
    return this.messages.filter((message) => message.conversationId === filters.conversationId);
  }

  async listOperationalIssues(_context: RequestContext, filters: MessagingOperationalStatusQuery) {
    this.lastOperationalFilters = filters;
    return this.operationalIssues.filter(
      (issue) => !filters.branchId || issue.branchId === filters.branchId,
    );
  }

  async findProviderEventByIdempotencyKey(_context: RequestContext, idempotencyKey: string) {
    return this.providerEvents.find((event) => event.idempotencyKey === idempotencyKey) ?? null;
  }

  async recordProviderEvent(_context: RequestContext, command: RecordProviderEventCommand) {
    const created: RawMessagingProviderEvent = {
      id: command.id ?? 'provider-event-' + (this.providerEvents.length + 1),
      tenantId: command.tenantId,
      branchId: command.branchId,
      connectionId: command.connectionId,
      provider: command.provider,
      providerEventId: command.providerEventId,
      eventKind: command.eventKind,
      receivedAt: command.receivedAt,
      idempotencyKey: command.idempotencyKey,
      payload: command.payload,
      signatureValid: command.signatureValid,
    };
    this.providerEvents.push(created);
    return created;
  }

  async findConversation(_context: RequestContext, lookup: ConversationLookup) {
    return (
      this.conversations.find(
        (conversation) =>
          conversation.tenantId === lookup.tenantId &&
          conversation.connectionId === lookup.connectionId &&
          conversation.contactPhoneHash === lookup.contactPhoneHash,
      ) ?? null
    );
  }

  async upsertConversation(context: RequestContext, command: RecordConversationCommand) {
    const existing = await this.findConversation(context, command);
    if (existing) {
      existing.status = command.status;
      existing.lastMessageAt = command.lastMessageAt;
      existing.customerId = command.customerId;
      existing.updatedAt = now;
      return existing;
    }
    const created: MessagingConversation = {
      id: command.id ?? 'conversation-' + (this.conversations.length + 1),
      tenantId: command.tenantId,
      branchId: command.branchId,
      connectionId: command.connectionId,
      customerId: command.customerId,
      contactPhoneHash: command.contactPhoneHash,
      status: command.status,
      lastMessageAt: command.lastMessageAt,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.push(created);
    return created;
  }

  async recordMessage(_context: RequestContext, command: RecordMessageCommand) {
    const created: MessagingMessage = {
      id: command.id ?? 'message-' + (this.messages.length + 1),
      tenantId: command.tenantId,
      branchId: command.branchId,
      conversationId: command.conversationId,
      connectionId: command.connectionId,
      customerId: command.customerId,
      direction: command.direction,
      channel: command.channel,
      deliveryState: command.deliveryState,
      providerMessageId: command.providerMessageId,
      notificationIntentId: command.notificationIntentId,
      campaignRunId: command.campaignRunId,
      bodyPreview: command.bodyPreview,
      payload: command.payload,
      sentAt: command.sentAt,
      receivedAt: command.receivedAt,
      createdAt: now,
      updatedAt: now,
    };
    this.messages.push(created);
    return created;
  }

  async recordConsent(_context: RequestContext, command: RecordConsentCommand) {
    const created: MessagingConsentRecord = {
      id: 'consent-' + (this.consents.length + 1),
      tenantId: command.tenantId,
      branchId: command.branchId,
      customerId: command.customerId,
      contactPhoneHash: command.contactPhoneHash,
      purpose: command.purpose,
      state: command.state,
      source: command.source,
      actorId: command.actorId,
      providerMessageId: command.providerMessageId,
      reason: command.reason,
      createdAt: now,
    };
    this.consents.push(created);
    return created;
  }

  async findLatestConsent(
    _context: RequestContext,
    input: {
      contactPhoneHash: string;
      purpose: MessagingConsentRecord['purpose'];
      customerId?: string;
    },
  ) {
    return (
      [...this.consents]
        .reverse()
        .find(
          (consent) =>
            consent.contactPhoneHash === input.contactPhoneHash &&
            consent.purpose === input.purpose &&
            (!input.customerId || consent.customerId === input.customerId),
        ) ?? null
    );
  }
}

class FakeMessagingAuditSink implements MessagingAuditSink {
  readonly contexts: RequestContext[] = [];
  readonly events: Array<Parameters<MessagingAuditSink['record']>[1]> = [];

  async record(context: RequestContext, event: Parameters<MessagingAuditSink['record']>[1]) {
    this.contexts.push(context);
    this.events.push(event);
  }
}

function operationalIssue(
  overrides: Partial<MessagingOperationalIssue> = {},
): MessagingOperationalIssue {
  return {
    id: overrides.id ?? 'delivery-attempt:issue-1',
    kind: overrides.kind ?? 'FAILED_DELIVERY',
    tenantId: overrides.tenantId ?? 'tenant-1',
    branchId: Object.hasOwn(overrides, 'branchId') ? overrides.branchId : 'branch-1',
    severity: overrides.severity ?? 'warning',
    occurredAt: overrides.occurredAt ?? now,
    sourceType: overrides.sourceType ?? 'NOTIFICATION_DELIVERY',
    sourceId: overrides.sourceId ?? 'notification-1',
    status: overrides.status ?? 'FAILED',
    reason: overrides.reason,
    correlationId: overrides.correlationId ?? 'correlation-1',
    metadata: overrides.metadata,
  };
}
