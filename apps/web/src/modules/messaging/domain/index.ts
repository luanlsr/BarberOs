import type {
  CampaignRecipientOutcome,
  ConsentPurpose,
  CreateMessagingConnectionCommand,
  MessageDeliveryState,
  MessagingConnection,
  MessagingConsentRecord,
  MessagingConversation,
  MessagingMessage,
  RawMessagingProviderEvent,
  RequestContext,
  UpdateMessagingConsentCommand,
} from '@barberos/contracts';

export type MessagingConnectionFilters = {
  branchId?: string;
  status?: MessagingConnection['status'];
  provider?: MessagingConnection['provider'];
};

export type ConversationLookup = {
  tenantId: string;
  branchId?: string;
  connectionId: string;
  customerId?: string;
  contactPhoneHash: string;
};

export type RecordProviderEventCommand = Omit<RawMessagingProviderEvent, 'id' | 'processedAt'> & {
  id?: string;
};

export type RecordConversationCommand = Omit<
  MessagingConversation,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
};

export type RecordMessageCommand = Omit<MessagingMessage, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type RecordConsentCommand = UpdateMessagingConsentCommand & {
  tenantId: string;
  branchId?: string;
  actorId?: string;
  providerMessageId?: string;
};

export type MessagingEligibilityInput = {
  purpose: ConsentPurpose;
  whatsappConsent?: MessagingConsentRecord | null;
  marketingConsent?: MessagingConsentRecord | null;
  hasReachableDestination: boolean;
};

export type MessagingEligibilityDecision = {
  allowed: boolean;
  reason?: 'NO_DESTINATION' | 'WHATSAPP_OPTED_OUT' | 'MARKETING_OPTED_OUT' | 'UNKNOWN_CONSENT';
};

export interface MessagingRepository {
  createConnection(
    context: RequestContext,
    command: CreateMessagingConnectionCommand,
  ): Promise<MessagingConnection>;
  findConnectionById(
    context: RequestContext,
    connectionId: string,
  ): Promise<MessagingConnection | null>;
  listConnections(
    context: RequestContext,
    filters?: MessagingConnectionFilters,
  ): Promise<MessagingConnection[]>;
  findActiveConnectionForBranch(
    context: RequestContext,
    branchId?: string,
  ): Promise<MessagingConnection | null>;
  findProviderEventByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<RawMessagingProviderEvent | null>;
  recordProviderEvent(
    context: RequestContext,
    command: RecordProviderEventCommand,
  ): Promise<RawMessagingProviderEvent>;
  findConversation(
    context: RequestContext,
    lookup: ConversationLookup,
  ): Promise<MessagingConversation | null>;
  upsertConversation(
    context: RequestContext,
    command: RecordConversationCommand,
  ): Promise<MessagingConversation>;
  recordMessage(context: RequestContext, command: RecordMessageCommand): Promise<MessagingMessage>;
  recordConsent(
    context: RequestContext,
    command: RecordConsentCommand,
  ): Promise<MessagingConsentRecord>;
  findLatestConsent(
    context: RequestContext,
    input: { contactPhoneHash: string; purpose: ConsentPurpose; customerId?: string },
  ): Promise<MessagingConsentRecord | null>;
  updateCampaignRecipientOutcome?(
    context: RequestContext,
    input: Pick<CampaignRecipientOutcome, 'campaignRunId' | 'contactPhoneHash' | 'status'>,
  ): Promise<void>;
}

export function assertMessagingScope(
  context: RequestContext,
  value: { tenantId: string; branchId?: string },
) {
  if (context.tenantId !== value.tenantId) {
    throw new Error('Cross-tenant messaging access is not allowed.');
  }
  if (value.branchId && !context.branchScope.includes(value.branchId)) {
    throw new Error('Messaging branch is outside request scope.');
  }
}

export function chooseMessagingConnection(input: {
  branchId?: string;
  connections: readonly MessagingConnection[];
}) {
  const active = input.connections.filter((connection) => connection.status === 'ACTIVE');
  const branchConnection = active.find((connection) => connection.branchId === input.branchId);
  if (branchConnection) return branchConnection;
  return (
    active.find((connection) => !connection.branchId && connection.allowTenantFallback) ?? null
  );
}

export function isOptOutKeyword(message: string) {
  const normalized = message.trim().toLowerCase();
  return ['sair', 'stop', 'cancelar', 'pare'].includes(normalized);
}

export function evaluateMessagingEligibility(
  input: MessagingEligibilityInput,
): MessagingEligibilityDecision {
  if (!input.hasReachableDestination) return { allowed: false, reason: 'NO_DESTINATION' };
  if (input.whatsappConsent?.state === 'OPTED_OUT') {
    return { allowed: false, reason: 'WHATSAPP_OPTED_OUT' };
  }
  if (input.purpose === 'WHATSAPP_MARKETING') {
    if (input.marketingConsent?.state === 'OPTED_OUT') {
      return { allowed: false, reason: 'MARKETING_OPTED_OUT' };
    }
    if (input.marketingConsent?.state !== 'OPTED_IN') {
      return { allowed: false, reason: 'UNKNOWN_CONSENT' };
    }
  }
  return { allowed: true };
}

export function deliveryStateFromProviderStatus(status: string): MessageDeliveryState {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'sent') return 'SENT';
  if (normalized === 'delivered') return 'DELIVERED';
  if (normalized === 'read') return 'READ';
  if (normalized === 'failed') return 'FAILED';
  return 'QUEUED';
}
