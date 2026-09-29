import type {
  MessagingConnection,
  MessagingConversation,
  MessagingMessage,
  RequestContext,
} from '@barberos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMessagingConnectionRouteHandlers,
  createMessagingConversationRouteHandlers,
  type MessagingRouteService,
} from './messaging-route-handlers';

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

const connection: MessagingConnection = {
  id: 'connection-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  provider: 'LOCAL',
  status: 'ACTIVE',
  displayName: 'WhatsApp Unidade Centro',
  displayPhoneNumber: '+5511999990101',
  allowTenantFallback: false,
  metadata: {},
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-29T12:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z',
};

const conversation: MessagingConversation = {
  id: 'conversation-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  connectionId: 'connection-1',
  customerId: 'customer-1',
  contactPhoneHash: 'hash-customer-1',
  status: 'OPEN',
  lastMessageAt: '2026-09-29T12:05:00.000Z',
  createdAt: '2026-09-29T12:00:00.000Z',
  updatedAt: '2026-09-29T12:05:00.000Z',
};

const message: MessagingMessage = {
  id: 'message-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  conversationId: 'conversation-1',
  connectionId: 'connection-1',
  customerId: 'customer-1',
  direction: 'INBOUND',
  channel: 'WHATSAPP',
  deliveryState: 'RECEIVED',
  bodyPreview: 'Quero agendar um corte',
  payload: {},
  receivedAt: '2026-09-29T12:05:00.000Z',
  createdAt: '2026-09-29T12:05:00.000Z',
  updatedAt: '2026-09-29T12:05:00.000Z',
};

type MockService = MessagingRouteService & {
  listConnections: ReturnType<typeof vi.fn>;
  createConnection: ReturnType<typeof vi.fn>;
  listConversations: ReturnType<typeof vi.fn>;
  listMessages: ReturnType<typeof vi.fn>;
};

describe('messaging route handlers', () => {
  let service: MockService;

  beforeEach(() => {
    service = {
      listConnections: vi.fn(async () => [connection]),
      createConnection: vi.fn(async () => connection),
      listConversations: vi.fn(async () => [conversation]),
      listMessages: vi.fn(async () => [message]),
    };
  });

  it('lists messaging connections with provider and branch filters', async () => {
    const handlers = createMessagingConnectionRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/messaging/connections?branchId=branch-1&provider=LOCAL&status=ACTIVE',
      ),
    );

    expect(response.status).toBe(200);
    expect(service.listConnections).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      provider: 'LOCAL',
      status: 'ACTIVE',
    });
    expect(await response.json()).toEqual({ data: [connection], requestId: 'request-1' });
  });

  it('creates messaging connections and returns 201 without exposing a custom envelope', async () => {
    const handlers = createMessagingConnectionRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
    const command = {
      branchId: 'branch-1',
      provider: 'LOCAL',
      displayName: 'WhatsApp Unidade Centro',
      displayPhoneNumber: '+5511999990101',
      allowTenantFallback: false,
    };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/messaging/connections', {
        method: 'POST',
        body: JSON.stringify(command),
      }),
    );

    expect(response.status).toBe(201);
    expect(service.createConnection).toHaveBeenCalledWith(context, command);
    expect(await response.json()).toEqual({ data: connection, requestId: 'request-1' });
  });

  it('lists conversations or messages through the same protected conversation endpoint', async () => {
    const handlers = createMessagingConversationRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    let response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/messaging/conversations?branchId=branch-1&status=OPEN&limit=15',
      ),
    );
    expect(response.status).toBe(200);
    expect(service.listConversations).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      status: 'OPEN',
      limit: 15,
    });
    expect(await response.json()).toEqual({ data: [conversation], requestId: 'request-1' });

    response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/messaging/conversations?conversationId=conversation-1&limit=20',
      ),
    );
    expect(service.listMessages).toHaveBeenCalledWith(context, {
      conversationId: 'conversation-1',
      limit: 20,
    });
    expect(await response.json()).toEqual({ data: [message], requestId: 'request-1' });
  });

  it('returns unauthenticated before touching the messaging service', async () => {
    const handlers = createMessagingConnectionRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });

    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/messaging/connections', {
        headers: { 'x-request-id': 'request-unauthenticated' },
      }),
    );

    expect(response.status).toBe(401);
    expect(service.listConnections).not.toHaveBeenCalled();
  });
});
