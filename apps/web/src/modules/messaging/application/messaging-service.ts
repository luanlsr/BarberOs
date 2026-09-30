import {
  createMessagingConnectionCommandSchema,
  messagingConnectionSchema,
  messagingConversationSchema,
  messagingMessageSchema,
  rawMessagingProviderEventSchema,
  updateMessagingConsentCommandSchema,
  type MessagingConsentRecord,
  type RequestContext,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import {
  assertMessagingScope,
  chooseMessagingConnection,
  evaluateMessagingEligibility,
  isOptOutKeyword,
  type MessagingRepository,
  type MessagingConnectionFilters,
  type MessagingConversationFilters,
  type MessagingMessageFilters,
  type MessagingAuditSink,
  type RecordConsentCommand,
  type RecordConversationCommand,
  type RecordMessageCommand,
  type RecordProviderEventCommand,
} from '../domain';

export class MessagingApplicationService {
  constructor(
    private readonly repository: MessagingRepository,
    private readonly audit?: MessagingAuditSink,
  ) {}

  async createConnection(context: RequestContext, command: unknown) {
    const parsed = createMessagingConnectionCommandSchema.parse(command);
    authorize(context, {
      permission: 'messaging.manage',
      entitlement: 'messaging',
      branchId: parsed.branchId,
    });
    const connection = await this.repository.createConnection(context, parsed);
    await this.audit?.record(context, {
      action: 'MESSAGING_CONNECTION_CREATED',
      entityType: 'MESSAGING_CONNECTION',
      entityId: connection.id,
      result: 'SUCCESS',
      afterState: connectionAuditState(connection),
    });
    if (parsed.credentialReference || parsed.webhookSecretReference) {
      await this.audit?.record(context, {
        action: 'MESSAGING_CONNECTION_CREDENTIAL_REFERENCE_CHANGED',
        entityType: 'MESSAGING_CONNECTION',
        entityId: connection.id,
        result: 'SUCCESS',
        afterState: {
          connectionId: connection.id,
          provider: connection.provider,
          branchId: connection.branchId,
          credentialReferenceChanged: Boolean(parsed.credentialReference),
          webhookSecretReferenceChanged: Boolean(parsed.webhookSecretReference),
          providerPhoneNumberIdChanged: Boolean(parsed.providerPhoneNumberId),
        },
      });
    }
    return connection;
  }

  async listConnections(context: RequestContext, filters: MessagingConnectionFilters = {}) {
    authorize(context, {
      permission: 'messaging.read',
      entitlement: 'messaging',
      branchId: filters.branchId,
    });
    const connections = await this.repository.listConnections(context, filters);
    return connections.filter(
      (connection) =>
        connection.tenantId === context.tenantId &&
        (!connection.branchId || context.branchScope.includes(connection.branchId)),
    );
  }

  async listConversations(context: RequestContext, filters: MessagingConversationFilters = {}) {
    authorize(context, {
      permission: 'messaging.read',
      entitlement: 'messaging',
      branchId: filters.branchId,
    });
    const conversations = await this.repository.listConversations(context, filters);
    return conversations.filter(
      (conversation) =>
        conversation.tenantId === context.tenantId &&
        (!conversation.branchId || context.branchScope.includes(conversation.branchId)),
    );
  }

  async listMessages(context: RequestContext, filters: MessagingMessageFilters) {
    authorize(context, { permission: 'messaging.read', entitlement: 'messaging' });
    const messages = await this.repository.listMessages(context, filters);
    return messages.filter(
      (message) =>
        message.tenantId === context.tenantId &&
        (!message.branchId || context.branchScope.includes(message.branchId)),
    );
  }

  async selectConnection(context: RequestContext, input: { branchId?: string }) {
    authorize(context, {
      permission: 'messaging.read',
      entitlement: 'messaging',
      branchId: input.branchId,
    });
    const connections = await this.repository.listConnections(context, { status: 'ACTIVE' });
    return chooseMessagingConnection({ branchId: input.branchId, connections });
  }

  async recordProviderEvent(context: RequestContext, command: RecordProviderEventCommand) {
    const parsed = rawMessagingProviderEventSchema
      .omit({ id: true, processedAt: true })
      .parse(command);
    assertMessagingScope(context, { tenantId: parsed.tenantId, branchId: parsed.branchId });
    const existing = await this.repository.findProviderEventByIdempotencyKey(
      context,
      parsed.idempotencyKey,
    );
    if (existing) return existing;
    return this.repository.recordProviderEvent(context, parsed);
  }

  async recordConsent(context: RequestContext, command: RecordConsentCommand) {
    const parsed = updateMessagingConsentCommandSchema.parse(command);
    const branchId = typeof command.branchId === 'string' ? command.branchId : undefined;
    authorize(context, { permission: 'messaging.manage', entitlement: 'messaging', branchId });
    assertMessagingScope(context, { tenantId: command.tenantId, branchId });
    const previous = await this.repository.findLatestConsent(context, {
      contactPhoneHash: parsed.contactPhoneHash,
      customerId: parsed.customerId,
      purpose: parsed.purpose,
    });
    const consent = await this.repository.recordConsent(context, {
      ...parsed,
      tenantId: command.tenantId,
      branchId,
      actorId: command.actorId ?? context.userId,
      providerMessageId: command.providerMessageId,
    });
    await this.audit?.record(context, {
      action: 'MESSAGING_CONSENT_CHANGED',
      entityType: 'MESSAGING_CONSENT',
      entityId: consent.id,
      result: 'SUCCESS',
      beforeState: previous ? consentAuditState(previous) : undefined,
      afterState: consentAuditState(consent),
    });
    return consent;
  }

  async recordInboundMessage(
    context: RequestContext,
    input: {
      conversation: RecordConversationCommand;
      message: RecordMessageCommand;
      rawText?: string;
    },
  ) {
    assertMessagingScope(context, {
      tenantId: input.conversation.tenantId,
      branchId: input.conversation.branchId,
    });
    assertMessagingScope(context, {
      tenantId: input.message.tenantId,
      branchId: input.message.branchId,
    });
    const conversation = messagingConversationSchema
      .omit({ id: true, createdAt: true, updatedAt: true })
      .parse(input.conversation);
    const message = messagingMessageSchema
      .omit({ id: true, createdAt: true, updatedAt: true })
      .parse(input.message);
    if (conversation.connectionId !== message.connectionId) {
      throw new Error('Conversation and message connection do not match.');
    }
    if (conversation.contactPhoneHash !== message.payload.contactPhoneHash) {
      // Payload is provider-shaped and optional; this guard only runs when the normalized hash is present.
      const payload = message.payload as { contactPhoneHash?: unknown };
      if (payload.contactPhoneHash && payload.contactPhoneHash !== conversation.contactPhoneHash) {
        throw new Error('Conversation and message contact do not match.');
      }
    }
    const savedConversation = await this.repository.upsertConversation(context, conversation);
    const savedMessage = await this.repository.recordMessage(context, {
      ...message,
      conversationId: savedConversation.id,
    });
    if (input.rawText && isOptOutKeyword(input.rawText)) {
      await this.repository.recordConsent(context, {
        tenantId: conversation.tenantId,
        branchId: conversation.branchId,
        customerId: conversation.customerId,
        contactPhoneHash: conversation.contactPhoneHash,
        purpose: 'WHATSAPP_MARKETING',
        state: 'OPTED_OUT',
        source: 'CUSTOMER_MESSAGE',
        providerMessageId: savedMessage.providerMessageId,
        reason: input.rawText.trim().toUpperCase(),
      });
    }
    return { conversation: savedConversation, message: savedMessage };
  }

  async evaluateEligibility(
    context: RequestContext,
    input: {
      contactPhoneHash: string;
      purpose: MessagingConsentRecord['purpose'];
      customerId?: string;
      hasReachableDestination: boolean;
    },
  ) {
    authorize(context, { permission: 'messaging.read', entitlement: 'messaging' });
    const whatsappConsent = await this.repository.findLatestConsent(context, {
      contactPhoneHash: input.contactPhoneHash,
      customerId: input.customerId,
      purpose: 'WHATSAPP_TRANSACTIONAL',
    });
    const marketingConsent = await this.repository.findLatestConsent(context, {
      contactPhoneHash: input.contactPhoneHash,
      customerId: input.customerId,
      purpose: 'WHATSAPP_MARKETING',
    });
    return evaluateMessagingEligibility({
      purpose: input.purpose,
      whatsappConsent,
      marketingConsent,
      hasReachableDestination: input.hasReachableDestination,
    });
  }

  async assertConnectionExists(context: RequestContext, connectionId: string) {
    const connection = await this.repository.findConnectionById(context, connectionId);
    if (!connection) throw new Error('Messaging connection was not found.');
    assertMessagingScope(context, connection);
    return messagingConnectionSchema.parse(connection);
  }
}

function connectionAuditState(connection: {
  id: string;
  tenantId: string;
  branchId?: string;
  provider: string;
  status: string;
  displayName: string;
  displayPhoneNumber: string;
  providerPhoneNumberId?: string;
  allowTenantFallback: boolean;
}) {
  return {
    id: connection.id,
    tenantId: connection.tenantId,
    branchId: connection.branchId,
    provider: connection.provider,
    status: connection.status,
    displayName: connection.displayName,
    displayPhoneNumber: connection.displayPhoneNumber,
    providerPhoneNumberId: connection.providerPhoneNumberId,
    allowTenantFallback: connection.allowTenantFallback,
  };
}

function consentAuditState(consent: MessagingConsentRecord) {
  return {
    id: consent.id,
    tenantId: consent.tenantId,
    branchId: consent.branchId,
    customerId: consent.customerId,
    contactPhoneHash: consent.contactPhoneHash,
    purpose: consent.purpose,
    state: consent.state,
    source: consent.source,
    actorId: consent.actorId,
    providerMessageId: consent.providerMessageId,
    reason: consent.reason,
    createdAt: consent.createdAt,
  };
}
