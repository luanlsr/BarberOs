import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  MessagingConnection,
  MessagingConversation,
  MessagingMessage,
  RequestContext,
} from '@barberos/contracts';
import { developmentSession } from './dev-session';
import {
  getDevelopmentMessagingStatusViewModel,
  getMessagingStatusViewModel,
} from './messaging-status-data';

const authMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getRequestContext: vi.fn(),
  isDevelopmentAuthEnabled: vi.fn(),
}));

const repositoryState = vi.hoisted(() => ({
  listConnections: vi.fn(),
  listConversations: vi.fn(),
  listMessages: vi.fn(),
}));

vi.mock('./auth/server', () => authMocks);

vi.mock('../src/modules/messaging/infrastructure/supabase-messaging-repository', () => ({
  SupabaseMessagingRepository: vi.fn(() => repositoryState),
}));

const requestContext: RequestContext = {
  requestId: 'request-messaging-status-test',
  userId: developmentSession.userId,
  tenantId: developmentSession.tenantId,
  membershipId: developmentSession.membershipId,
  role: developmentSession.role,
  permissions: developmentSession.permissions,
  entitlements: developmentSession.entitlements ?? [],
  branchScope: developmentSession.branchScope,
};

const realConnection: MessagingConnection = {
  id: 'connection-real',
  tenantId: developmentSession.tenantId,
  branchId: 'dev-branch',
  provider: 'META_WHATSAPP_CLOUD',
  status: 'ACTIVE',
  displayName: 'WhatsApp Real',
  displayPhoneNumber: '+55 11 97777-0000',
  providerPhoneNumberId: 'real-phone-id',
  credentialReference: 'vault:messaging/real',
  webhookSecretReference: 'vault:messaging/webhook-real',
  allowTenantFallback: false,
  metadata: {},
  createdBy: developmentSession.userId,
  updatedBy: developmentSession.userId,
  createdAt: '2026-09-30T08:00:00.000Z',
  updatedAt: '2026-09-30T09:00:00.000Z',
};

const realConversation: MessagingConversation = {
  id: 'conversation-real',
  tenantId: developmentSession.tenantId,
  branchId: 'dev-branch',
  connectionId: realConnection.id,
  customerId: 'customer-real-abc123',
  contactPhoneHash: 'hash-contact-real-999999',
  status: 'OPEN',
  lastMessageAt: '2026-09-30T09:10:00.000Z',
  createdAt: '2026-09-30T08:30:00.000Z',
  updatedAt: '2026-09-30T09:10:00.000Z',
};

const realMessages: readonly MessagingMessage[] = [
  {
    id: 'message-real-out',
    tenantId: developmentSession.tenantId,
    branchId: 'dev-branch',
    conversationId: realConversation.id,
    connectionId: realConnection.id,
    customerId: realConversation.customerId,
    direction: 'OUTBOUND',
    channel: 'WHATSAPP',
    deliveryState: 'DELIVERED',
    providerMessageId: 'provider-message-out',
    bodyPreview: 'Veja os detalhes em https://barberos.example/agenda',
    payload: {},
    sentAt: '2026-09-30T09:00:00.000Z',
    createdAt: '2026-09-30T09:00:00.000Z',
    updatedAt: '2026-09-30T09:00:00.000Z',
  },
  {
    id: 'message-real-in',
    tenantId: developmentSession.tenantId,
    branchId: 'dev-branch',
    conversationId: realConversation.id,
    connectionId: realConnection.id,
    customerId: realConversation.customerId,
    direction: 'INBOUND',
    channel: 'WHATSAPP',
    deliveryState: 'RECEIVED',
    providerMessageId: 'provider-message-in',
    bodyPreview: 'Confirmado. Meu telefone e +55 11 98888-7777',
    payload: {},
    receivedAt: '2026-09-30T09:10:00.000Z',
    createdAt: '2026-09-30T09:10:00.000Z',
    updatedAt: '2026-09-30T09:10:00.000Z',
  },
];

describe('Messaging status data loading layer', () => {
  beforeEach(() => {
    authMocks.createSupabaseServerClient.mockResolvedValue(null);
    authMocks.getRequestContext.mockResolvedValue(null);
    authMocks.isDevelopmentAuthEnabled.mockReturnValue(true);
    repositoryState.listConnections.mockResolvedValue([]);
    repositoryState.listConversations.mockResolvedValue([]);
    repositoryState.listMessages.mockResolvedValue([]);
  });

  test('keeps explicit development messaging model available', async () => {
    const model = await getMessagingStatusViewModel(developmentSession);

    expect(model.state).toBe('ready');
    expect(model.connection?.label).toBe('WhatsApp Centro');
    expect(model.conversations.map((conversation) => conversation.customerLabel)).toContain(
      'Ana P.',
    );
  });

  test('does not fallback to development messaging data when development auth is disabled', async () => {
    authMocks.isDevelopmentAuthEnabled.mockReturnValue(false);

    const model = await getMessagingStatusViewModel(developmentSession);

    expect(authMocks.createSupabaseServerClient).toHaveBeenCalled();
    expect(model.state).toBe('empty');
    expect(model.connection).toBeUndefined();
    expect(model.conversations).toEqual([]);
    expect(model.deliveryMetrics).toEqual([]);
  });

  test('loads persistent connections, conversations and delivery metrics through the service', async () => {
    authMocks.createSupabaseServerClient.mockResolvedValue({});
    authMocks.getRequestContext.mockResolvedValue(requestContext);
    authMocks.isDevelopmentAuthEnabled.mockReturnValue(false);
    repositoryState.listConnections.mockResolvedValue([realConnection]);
    repositoryState.listConversations.mockResolvedValue([realConversation]);
    repositoryState.listMessages.mockResolvedValue(realMessages);

    const model = await getMessagingStatusViewModel(developmentSession);

    expect(model.state).toBe('ready');
    expect(model.connection?.label).toBe('WhatsApp Real');
    expect(model.connection?.providerLabel).toBe('Meta WhatsApp Cloud');
    expect(model.conversations).toHaveLength(1);
    expect(model.conversations[0]).toMatchObject({
      customerLabel: 'Cliente abc123',
      lastMessagePreview: 'Confirmado. Meu telefone e [telefone removido]',
      unreadCount: 1,
    });
    expect(model.deliveryMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'DELIVERED', count: 1 }),
        expect.objectContaining({ id: 'RECEIVED', count: 1 }),
      ]),
    );
    expect(model.selectedConversation?.messages[0].bodyPreview).toBe(
      'Veja os detalhes em [link removido]',
    );
  });

  test('reports inactive provider without exposing development conversations', async () => {
    authMocks.createSupabaseServerClient.mockResolvedValue({});
    authMocks.getRequestContext.mockResolvedValue(requestContext);
    authMocks.isDevelopmentAuthEnabled.mockReturnValue(false);
    repositoryState.listConnections.mockResolvedValue([{ ...realConnection, status: 'INACTIVE' }]);

    const model = await getMessagingStatusViewModel(developmentSession);

    expect(model.state).toBe('inactive-provider');
    expect(model.connection?.label).toBe('WhatsApp Real');
    expect(model.conversations).toEqual([]);
    expect(model.connection?.label).not.toBe('WhatsApp Centro');
  });

  test('keeps pure development states deterministic for component tests', () => {
    const model = getDevelopmentMessagingStatusViewModel(developmentSession, { state: 'offline' });

    expect(model.state).toBe('offline');
    expect(model.connection?.label).toBe('WhatsApp Centro');
    expect(model.deliveryMetrics.some((metric) => metric.id === 'QUEUED')).toBe(true);
  });
});
