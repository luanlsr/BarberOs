import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  LocalNoopMessagingProviderAdapter,
  MetaWhatsAppProviderAdapter,
} from './messaging-provider-adapter';

const deliveryPayload = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  connectionId: 'connection-1',
  notificationIntentId: 'notification-1',
  recipientPhoneHash: 'hash-recipient-phone',
  templateKey: 'appointment.reminder.v1',
  variables: { customerName: 'Ana' },
  idempotencyKey: 'whatsapp-delivery-1',
  correlationId: 'request-1',
};

describe('messaging provider adapters', () => {
  it('uses local noop without pretending WhatsApp delivery occurred', async () => {
    const adapter = new LocalNoopMessagingProviderAdapter();

    await expect(adapter.send(deliveryPayload)).resolves.toMatchObject({
      accepted: true,
      provider: 'LOCAL',
      deliveryState: 'QUEUED',
      retryable: false,
    });
    expect(adapter.verifyWebhook()).toBe(true);
    expect(
      adapter.normalizeWebhook(
        { id: 'local-event-1', eventKind: 'INBOUND_MESSAGE', text: 'Oi' },
        new Date('2026-09-23T12:00:00.000Z'),
      ),
    ).toEqual([
      expect.objectContaining({
        providerEventId: 'local-event-1',
        eventKind: 'INBOUND_MESSAGE',
        textPreview: 'Oi',
      }),
    ]);
  });

  it('validates Meta webhook signatures with HMAC SHA-256', () => {
    const body = JSON.stringify({ entry: [] });
    const appSecret = 'app-secret';
    const signature =
      'sha256=' + createHmac('sha256', appSecret).update(body, 'utf8').digest('hex');
    const adapter = new MetaWhatsAppProviderAdapter({ appSecret });

    expect(
      adapter.verifyWebhook({
        body,
        headers: new Headers({ 'x-hub-signature-256': signature }),
        receivedAt: new Date(),
      }),
    ).toBe(true);
    expect(
      adapter.verifyWebhook({
        body,
        headers: new Headers({ 'x-hub-signature-256': 'sha256=00' }),
        receivedAt: new Date(),
      }),
    ).toBe(false);
  });

  it('normalizes Meta inbound messages and outbound statuses', () => {
    const adapter = new MetaWhatsAppProviderAdapter({ appSecret: 'secret' });
    const events = adapter.normalizeWebhook(
      {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: 'wamid-in',
                      from: '5511999999999',
                      timestamp: '1790000000',
                      text: { body: 'Quero remarcar' },
                    },
                  ],
                  statuses: [{ id: 'wamid-out', status: 'delivered', timestamp: '1790000001' }],
                },
              },
            ],
          },
        ],
      },
      new Date('2026-09-23T12:00:00.000Z'),
    );

    expect(events).toEqual([
      expect.objectContaining({
        eventKind: 'INBOUND_MESSAGE',
        providerMessageId: 'wamid-in',
        textPreview: 'Quero remarcar',
      }),
      expect.objectContaining({
        eventKind: 'OUTBOUND_STATUS',
        providerMessageId: 'wamid-out',
        deliveryState: 'DELIVERED',
      }),
    ]);
  });

  it('maps Meta send success and retryable provider failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [{ id: 'wamid-out' }] }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: 'down' } }),
      });
    const adapter = new MetaWhatsAppProviderAdapter({
      appSecret: 'secret',
      accessToken: 'token',
      phoneNumberId: 'phone-id',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(adapter.send(deliveryPayload)).resolves.toMatchObject({
      accepted: true,
      providerMessageId: 'wamid-out',
      deliveryState: 'QUEUED',
    });
    await expect(adapter.send(deliveryPayload)).resolves.toMatchObject({
      accepted: false,
      retryable: true,
      error: expect.objectContaining({ code: 'WORKER_PROVIDER_UNAVAILABLE' }),
    });
  });
});
