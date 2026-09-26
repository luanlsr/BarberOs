import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MessagingConnection,
  RawMessagingProviderEvent,
  RequestContext,
} from '@barberos/contracts';

import type {
  MessagingProviderAdapter,
  NormalizedMessagingProviderEvent,
} from '../infrastructure/messaging-provider-adapter';
import {
  createMessagingWebhookRouteHandlers,
  type MessagingWebhookRouteService,
} from './messaging-webhook-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'worker-webhook',
  tenantId: 'tenant-1',
  membershipId: 'membership-worker',
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
  displayName: 'WhatsApp Centro',
  displayPhoneNumber: '+55 11 99999-9999',
  allowTenantFallback: false,
  metadata: {},
  createdBy: 'owner-1',
  updatedBy: 'owner-1',
  createdAt: '2026-09-23T12:00:00.000Z',
  updatedAt: '2026-09-23T12:00:00.000Z',
};

function normalizedEvent(overrides: Partial<NormalizedMessagingProviderEvent> = {}) {
  return {
    provider: 'LOCAL' as const,
    providerEventId: 'provider-event-1',
    eventKind: 'INBOUND_MESSAGE' as const,
    providerMessageId: 'provider-message-1',
    fromPhoneHash: 'hash-5511999999999',
    textPreview: 'Oi',
    occurredAt: new Date().toISOString(),
    payload: { id: 'provider-event-1' },
    ...overrides,
  };
}

function rawEvent(overrides: Partial<RawMessagingProviderEvent> = {}): RawMessagingProviderEvent {
  return {
    id: 'raw-event-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    connectionId: 'connection-1',
    provider: 'LOCAL',
    providerEventId: 'provider-event-1',
    eventKind: 'INBOUND_MESSAGE',
    receivedAt: new Date().toISOString(),
    idempotencyKey: 'whatsapp-webhook:connection-1:LOCAL:provider-event-1',
    payload: {},
    signatureValid: true,
    ...overrides,
  };
}

function request(body: unknown) {
  return new Request('https://barberos.local/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'x-request-id': 'request-1', 'x-signature': 'valid' },
    body: JSON.stringify(body),
  });
}

describe('messaging webhook route handlers', () => {
  let adapter: MessagingProviderAdapter;
  let service: MessagingWebhookRouteService & {
    recordProviderEvent: ReturnType<typeof vi.fn>;
  };
  let resolveConnection: ReturnType<typeof vi.fn>;
  let resolveContextForEvent: ReturnType<typeof vi.fn>;
  let enqueueWebhookProcessing: ReturnType<typeof vi.fn>;
  let handlers: ReturnType<typeof createMessagingWebhookRouteHandlers>;

  beforeEach(() => {
    adapter = {
      provider: 'LOCAL',
      send: vi.fn(),
      verifyWebhook: vi.fn(() => true),
      normalizeWebhook: vi.fn(() => [normalizedEvent()]),
    };
    service = {
      recordProviderEvent: vi.fn(async (_context, command) =>
        rawEvent({
          providerEventId: command.providerEventId,
          eventKind: command.eventKind,
          receivedAt: command.receivedAt,
          idempotencyKey: command.idempotencyKey,
          payload: command.payload,
        }),
      ),
    };
    resolveConnection = vi.fn(() => connection);
    resolveContextForEvent = vi.fn(() => context);
    enqueueWebhookProcessing = vi.fn(async () => undefined);
    handlers = createMessagingWebhookRouteHandlers({
      adapter,
      service,
      resolveConnection,
      resolveContextForEvent,
      enqueueWebhookProcessing,
      webhookVerifyToken: 'verify-token',
      maxEventAgeMs: 5 * 60 * 1000,
    });
  });

  it('validates, persists and enqueues valid webhook events', async () => {
    const response = await handlers.POST(request({ id: 'provider-event-1' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { accepted: true, events: 1, enqueued: 1 },
      requestId: 'request-1',
    });
    expect(service.recordProviderEvent).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        connectionId: 'connection-1',
        providerEventId: 'provider-event-1',
        eventKind: 'INBOUND_MESSAGE',
        idempotencyKey: 'whatsapp-webhook:connection-1:LOCAL:provider-event-1',
        signatureValid: true,
      }),
    );
    expect(enqueueWebhookProcessing).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        connectionId: 'connection-1',
        rawProviderEventId: 'raw-event-1',
        providerEventId: 'provider-event-1',
        eventKind: 'INBOUND_MESSAGE',
        correlationId: 'request-1',
      }),
    );
  });

  it('rejects invalid signatures before persisting payloads', async () => {
    vi.mocked(adapter.verifyWebhook).mockReturnValueOnce(false);

    const response = await handlers.POST(request({ id: 'provider-event-1' }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: 'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
        message: 'Webhook signature is invalid.',
        requestId: 'request-1',
      },
    });
    expect(service.recordProviderEvent).not.toHaveBeenCalled();
    expect(enqueueWebhookProcessing).not.toHaveBeenCalled();
  });

  it('rejects stale provider timestamps', async () => {
    vi.mocked(adapter.normalizeWebhook).mockReturnValueOnce([
      normalizedEvent({ occurredAt: '2026-09-23T12:00:00.000Z' }),
    ]);
    handlers = createMessagingWebhookRouteHandlers({
      adapter,
      service,
      resolveConnection,
      resolveContextForEvent,
      enqueueWebhookProcessing,
      maxEventAgeMs: 1,
    });

    const response = await handlers.POST(request({ id: 'provider-event-1' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'MESSAGING_VALIDATION_ERROR',
        message: 'Webhook event timestamp is stale.',
        requestId: 'request-1',
      },
    });
    expect(service.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('rejects events for unknown or inactive connections', async () => {
    resolveConnection.mockReturnValueOnce(null);

    const response = await handlers.POST(request({ id: 'provider-event-1' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: 'MESSAGING_VALIDATION_ERROR',
        message: 'Messaging connection was not found.',
        requestId: 'request-1',
      },
    });
    expect(enqueueWebhookProcessing).not.toHaveBeenCalled();
  });

  it('persists duplicate events idempotently without enqueueing duplicate work', async () => {
    service.recordProviderEvent.mockResolvedValueOnce(
      rawEvent({
        receivedAt: '2026-09-23T12:00:00.000Z',
      }),
    );

    const response = await handlers.POST(request({ id: 'provider-event-1' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { accepted: true, events: 1, enqueued: 0 },
      requestId: 'request-1',
    });
    expect(service.recordProviderEvent).toHaveBeenCalledTimes(1);
    expect(enqueueWebhookProcessing).not.toHaveBeenCalled();
  });

  it('supports Meta verify-token challenges', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=challenge-1',
        { headers: { 'x-request-id': 'request-1' } },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('challenge-1');
  });
});
