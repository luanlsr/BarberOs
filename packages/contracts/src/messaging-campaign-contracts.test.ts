import { describe, expect, it } from 'vitest';
import {
  campaignDispatchPayloadSchema,
  campaignRecipientOutcomeSchema,
  campaignRunSchema,
  campaignSchema,
  campaignStatusSchema,
  createCampaignCommandSchema,
  createMessagingConnectionCommandSchema,
  entitlementSchema,
  messageDeliveryStateSchema,
  messagingConnectionSchema,
  messagingConsentRecordSchema,
  messagingConversationSchema,
  messagingMessageSchema,
  messagingProviderSchema,
  permissionSchema,
  providerStatusEventPayloadSchema,
  rawMessagingProviderEventSchema,
  updateMessagingConsentCommandSchema,
  whatsappDeliveryPayloadSchema,
  whatsappWebhookEventPayloadSchema,
  workerJobTypeSchema,
} from './index';

const now = '2026-09-23T12:00:00.000Z';

describe('messaging and campaign contracts', () => {
  it('recognizes messaging and campaign permissions, entitlements and worker jobs', () => {
    expect(permissionSchema.parse('messaging.read')).toBe('messaging.read');
    expect(permissionSchema.parse('messaging.manage')).toBe('messaging.manage');
    expect(permissionSchema.parse('campaigns.read')).toBe('campaigns.read');
    expect(permissionSchema.parse('campaigns.create')).toBe('campaigns.create');
    expect(permissionSchema.parse('campaigns.approve')).toBe('campaigns.approve');
    expect(permissionSchema.parse('campaigns.send')).toBe('campaigns.send');
    expect(entitlementSchema.parse('messaging')).toBe('messaging');
    expect(entitlementSchema.parse('campaigns')).toBe('campaigns');
    expect(workerJobTypeSchema.parse('WHATSAPP_DELIVERY')).toBe('WHATSAPP_DELIVERY');
    expect(workerJobTypeSchema.parse('CAMPAIGN_DISPATCH')).toBe('CAMPAIGN_DISPATCH');
    expect(messagingProviderSchema.safeParse('BROWSER_SECRET_PROVIDER').success).toBe(false);
  });

  it('validates messaging records without exposing provider secrets', () => {
    const connection = messagingConnectionSchema.parse({
      id: 'connection-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      provider: 'META_WHATSAPP_CLOUD',
      status: 'ACTIVE',
      displayName: 'WhatsApp Centro',
      displayPhoneNumber: '+5511999999999',
      providerPhoneNumberId: 'phone-id-a',
      credentialReference: 'secret://tenant-a/whatsapp/access-token',
      webhookSecretReference: 'secret://tenant-a/whatsapp/app-secret',
      metadata: { businessAccountId: 'waba-a' },
      createdBy: 'user-a',
      updatedBy: 'user-a',
      createdAt: now,
      updatedAt: now,
    });
    const rawEvent = rawMessagingProviderEventSchema.parse({
      id: 'raw-event-a',
      tenantId: connection.tenantId,
      branchId: connection.branchId,
      connectionId: connection.id,
      provider: connection.provider,
      providerEventId: 'provider-event-a',
      eventKind: 'INBOUND_MESSAGE',
      receivedAt: now,
      idempotencyKey: 'provider-event-a-key',
      payload: { object: 'whatsapp_business_account' },
      signatureValid: true,
    });
    const conversation = messagingConversationSchema.parse({
      id: 'conversation-a',
      tenantId: connection.tenantId,
      branchId: connection.branchId,
      connectionId: connection.id,
      customerId: 'customer-a',
      contactPhoneHash: 'hash-customer-phone-a',
      status: 'OPEN',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const message = messagingMessageSchema.parse({
      id: 'message-a',
      tenantId: connection.tenantId,
      branchId: connection.branchId,
      conversationId: conversation.id,
      connectionId: connection.id,
      customerId: 'customer-a',
      direction: 'INBOUND',
      channel: 'WHATSAPP',
      deliveryState: 'RECEIVED',
      providerMessageId: 'wamid-a',
      bodyPreview: 'Oi, quero remarcar.',
      payload: { rawProviderEventId: rawEvent.id },
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const consent = messagingConsentRecordSchema.parse({
      id: 'consent-a',
      tenantId: connection.tenantId,
      branchId: connection.branchId,
      customerId: 'customer-a',
      contactPhoneHash: 'hash-customer-phone-a',
      purpose: 'WHATSAPP_MARKETING',
      state: 'OPTED_OUT',
      source: 'CUSTOMER_MESSAGE',
      providerMessageId: message.providerMessageId,
      reason: 'STOP',
      createdAt: now,
    });

    expect(connection.allowTenantFallback).toBe(false);
    expect(rawEvent.signatureValid).toBe(true);
    expect(message.bodyPreview).toContain('remarcar');
    expect(consent.state).toBe('OPTED_OUT');
    expect(JSON.stringify(connection)).not.toContain('actual-access-token');
  });

  it('validates campaign records and recipient outcomes', () => {
    const campaign = campaignSchema.parse({
      id: 'campaign-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      name: 'Reativacao setembro',
      status: 'APPROVED',
      audienceCriteria: {
        branchIds: ['branch-a'],
        customerStatus: ['INACTIVE', 'AT_RISK'],
        lastVisitBefore: '2026-08-01',
      },
      content: {
        templateKey: 'campaign.reactivation.v1',
        bodyPreview: 'Sentimos sua falta por aqui.',
      },
      approvedBy: 'owner-a',
      approvedAt: now,
      createdBy: 'manager-a',
      updatedBy: 'owner-a',
      createdAt: now,
      updatedAt: now,
    });
    const run = campaignRunSchema.parse({
      id: 'campaign-run-a',
      tenantId: campaign.tenantId,
      branchId: campaign.branchId,
      campaignId: campaign.id,
      status: 'SENDING',
      audienceSize: 100,
      eligibleCount: 80,
      excludedCount: 20,
      idempotencyKey: 'campaign-run-a-key',
      createdAt: now,
      updatedAt: now,
    });
    const outcome = campaignRecipientOutcomeSchema.parse({
      id: 'campaign-recipient-a',
      tenantId: campaign.tenantId,
      branchId: campaign.branchId,
      campaignId: campaign.id,
      campaignRunId: run.id,
      customerId: 'customer-a',
      contactPhoneHash: 'hash-customer-phone-a',
      status: 'BLOCKED_BY_CONSENT',
      exclusionReason: 'marketing_opt_out',
      idempotencyKey: 'campaign-recipient-a-key',
      createdAt: now,
      updatedAt: now,
    });

    expect(campaignStatusSchema.parse('PARTIALLY_FAILED')).toBe('PARTIALLY_FAILED');
    expect(campaign.content.variables).toEqual({});
    expect(run.excludedCount).toBe(20);
    expect(outcome.status).toBe('BLOCKED_BY_CONSENT');
    expect(messageDeliveryStateSchema.parse('DELIVERED')).toBe('DELIVERED');
  });

  it('validates WhatsApp, webhook, provider status and campaign dispatch payloads', () => {
    const delivery = whatsappDeliveryPayloadSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      connectionId: 'connection-a',
      notificationIntentId: 'notification-a',
      recipientPhoneHash: 'hash-customer-phone-a',
      templateKey: 'appointment.reminder.v1',
      variables: { customerName: 'Ana' },
      idempotencyKey: 'whatsapp-delivery-a',
      correlationId: 'request-a',
    });
    const webhook = whatsappWebhookEventPayloadSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      connectionId: 'connection-a',
      rawProviderEventId: 'raw-event-a',
      providerEventId: 'provider-event-a',
      eventKind: 'OUTBOUND_STATUS',
      receivedAt: now,
      idempotencyKey: 'provider-event-a-key',
      correlationId: 'request-webhook-a',
    });
    const status = providerStatusEventPayloadSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      connectionId: 'connection-a',
      providerMessageId: 'wamid-a',
      deliveryState: 'DELIVERED',
      providerEventId: 'provider-status-a',
      occurredAt: now,
      idempotencyKey: 'provider-status-a-key',
      correlationId: 'request-webhook-a',
    });
    const campaign = campaignDispatchPayloadSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      campaignId: 'campaign-a',
      campaignRunId: 'campaign-run-a',
      idempotencyKey: 'campaign-dispatch-a',
      correlationId: 'request-campaign-a',
    });

    expect(delivery.variables.customerName).toBe('Ana');
    expect(webhook.eventKind).toBe('OUTBOUND_STATUS');
    expect(status.deliveryState).toBe('DELIVERED');
    expect(campaign.campaignRunId).toBe('campaign-run-a');
  });

  it('rejects invalid messaging and campaign commands', () => {
    expect(
      createMessagingConnectionCommandSchema.safeParse({
        provider: 'META_WHATSAPP_CLOUD',
        displayName: '',
        displayPhoneNumber: '1',
      }).success,
    ).toBe(false);
    expect(
      updateMessagingConsentCommandSchema.safeParse({
        contactPhoneHash: 'short',
        purpose: 'WHATSAPP_MARKETING',
        state: 'OPTED_OUT',
        source: 'CUSTOMER_MESSAGE',
      }).success,
    ).toBe(false);
    expect(
      createCampaignCommandSchema.safeParse({
        name: 'R',
        audienceCriteria: { branchIds: [] },
        content: { templateKey: 'x', bodyPreview: '' },
      }).success,
    ).toBe(false);
  });
});
