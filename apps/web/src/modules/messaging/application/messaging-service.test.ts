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
