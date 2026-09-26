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
  type RecordConsentCommand,
  type RecordConversationCommand,
  type RecordMessageCommand,
  type RecordProviderEventCommand,
} from '../domain';

export class MessagingApplicationService {
  constructor(private readonly repository: MessagingRepository) {}

  async createConnection(context: RequestContext, command: unknown) {
    const parsed = createMessagingConnectionCommandSchema.parse(command);
    authorize(context, {
      permission: 'messaging.manage',
      entitlement: 'messaging',
      branchId: parsed.branchId,
    });
    return this.repository.createConnection(context, parsed);
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
    return this.repository.recordConsent(context, {
      ...parsed,
      tenantId: command.tenantId,
      branchId,
      actorId: command.actorId ?? context.userId,
      providerMessageId: command.providerMessageId,
    });
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
