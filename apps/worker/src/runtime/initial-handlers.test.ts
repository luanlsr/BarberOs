import type {
  CampaignRecipientOutcome,
  CampaignRun,
  CreateNotificationIntentCommand,
  NotificationDeliveryAttempt,
  NotificationIntent,
  RecordNotificationDeliveryAttemptCommand,
  WorkerJob,
} from '@barberos/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  createInitialWorkerHandlers,
  handleCampaignDispatch,
  handleAppointmentCancellation,
  handleAppointmentConfirmation,
  handleAppointmentReminder,
  handleExpiredRecordCleanup,
  handleFinanceRecalculation,
  handlePostServiceFollowUp,
  handleStockAlert,
  type InitialWorkerHandlerPorts,
} from './initial-handlers';

type NotificationCreateIntent = NonNullable<
  InitialWorkerHandlerPorts['notifications']
>['createIntent'];
type FinanceRecalculate = NonNullable<InitialWorkerHandlerPorts['finance']>['recalculate'];
type CleanupDeleteExpired = NonNullable<InitialWorkerHandlerPorts['cleanup']>['deleteExpired'];

describe('initial worker handlers', () => {
  it('creates an appointment confirmation intent only after reading a confirmed appointment', async () => {
    const notifications: CreateNotificationIntentCommand[] = [];
    const result = await handleAppointmentConfirmation(
      makeJob({
        type: 'APPOINTMENT_CONFIRMATION',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            expect(id).toBe('appointment-1');
            return {
              id,
              tenantId: 'tenant-1',
              branchId: 'branch-2',
              status: 'CONFIRMED',
              customerId: 'customer-1',
              startsAt: '2026-09-20T13:00:00.000Z',
            };
          },
        },
        notifications: {
          async createIntent(command) {
            notifications.push(command);
          },
        },
      },
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    expect(notifications).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-2',
        recipientType: 'CUSTOMER',
        recipientId: 'customer-1',
        channel: 'LOCAL',
        templateKey: 'appointment.confirmation.v1',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
        idempotencyKey: 'job:job-1:appointment-confirmation',
      }),
    ]);
  });

  it('creates an appointment reminder intent only after reading a confirmed appointment', async () => {
    const notifications: CreateNotificationIntentCommand[] = [];
    const result = await handleAppointmentReminder(
      makeJob({
        type: 'APPOINTMENT_REMINDER',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            expect(id).toBe('appointment-1');
            return {
              id,
              tenantId: 'tenant-1',
              branchId: 'branch-2',
              status: 'CONFIRMED',
              customerId: 'customer-1',
              startsAt: '2026-09-20T13:00:00.000Z',
            };
          },
        },
        notifications: {
          async createIntent(command) {
            notifications.push(command);
          },
        },
      },
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    expect(notifications).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-2',
        recipientType: 'CUSTOMER',
        recipientId: 'customer-1',
        channel: 'LOCAL',
        templateKey: 'appointment.reminder.v1',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
        idempotencyKey: 'job:job-1:appointment-reminder',
        payload: expect.objectContaining({
          appointmentId: 'appointment-1',
          startsAt: '2026-09-20T13:00:00.000Z',
          timezone: 'America/Sao_Paulo',
          reminderLeadMinutes: 1440,
          reminderScheduledFor: '2026-09-19T13:00:00.000Z',
        }),
      }),
    ]);
  });

  it('uses tenant or branch reminder settings and timezone context for appointment reminders', async () => {
    const notifications: CreateNotificationIntentCommand[] = [];
    const getReminderSettings = vi.fn(async () => ({
      enabled: true,
      leadMinutes: 120,
      timezone: 'America/Manaus',
      templateKey: 'appointment.reminder.two-hours.v1',
    }));

    const result = await handleAppointmentReminder(
      makeJob({
        type: 'APPOINTMENT_REMINDER',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              branchId: 'branch-2',
              status: 'CONFIRMED',
              customerId: 'customer-1',
              startsAt: '2026-09-20T13:00:00.000Z',
            };
          },
        },
        appointmentMessagingSettings: { getReminderSettings },
        notifications: {
          async createIntent(command) {
            notifications.push(command);
          },
        },
      },
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    expect(getReminderSettings).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      branchId: 'branch-2',
      appointmentId: 'appointment-1',
      customerId: 'customer-1',
      startsAt: '2026-09-20T13:00:00.000Z',
    });
    expect(notifications).toEqual([
      expect.objectContaining({
        templateKey: 'appointment.reminder.two-hours.v1',
        payload: expect.objectContaining({
          timezone: 'America/Manaus',
          reminderLeadMinutes: 120,
          reminderScheduledFor: '2026-09-20T11:00:00.000Z',
        }),
      }),
    ]);
  });

  it('cancels pending reminder intents before creating an appointment cancellation intent', async () => {
    const cancellations: Array<{
      tenantId: string;
      branchId?: string;
      sourceType: string;
      sourceId: string;
      templateKey?: string;
      reason: string;
    }> = [];
    const notifications: CreateNotificationIntentCommand[] = [];

    const result = await handleAppointmentCancellation(
      makeJob({
        type: 'APPOINTMENT_CANCELLATION',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              branchId: 'branch-2',
              status: 'CANCELLED',
              customerId: 'customer-1',
              startsAt: '2026-09-20T13:00:00.000Z',
            };
          },
        },
        notifications: {
          async createIntent(command) {
            notifications.push(command);
          },
          async cancelPendingIntentsForSource(input) {
            cancellations.push(input);
            return 1;
          },
        },
      },
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    expect(cancellations).toEqual([
      {
        tenantId: 'tenant-1',
        branchId: 'branch-2',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
        templateKey: 'appointment.reminder.v1',
        reason: 'appointment_cancelled',
      },
    ]);
    expect(notifications).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-2',
        recipientType: 'CUSTOMER',
        recipientId: 'customer-1',
        channel: 'LOCAL',
        templateKey: 'appointment.cancellation.v1',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
        idempotencyKey: 'job:job-1:appointment-cancellation',
        payload: expect.objectContaining({
          appointmentId: 'appointment-1',
          startsAt: '2026-09-20T13:00:00.000Z',
          cancellationReason: 'appointment_cancelled',
        }),
      }),
    ]);
  });

  it('no-ops appointment cancellation jobs when the appointment is not cancelled', async () => {
    const createIntent = vi.fn<NotificationCreateIntent>();
    const cancelPendingIntentsForSource = vi.fn(async () => 0);

    const result = await handleAppointmentCancellation(
      makeJob({
        type: 'APPOINTMENT_CANCELLATION',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              status: 'CONFIRMED',
              customerId: 'customer-1',
            };
          },
        },
        notifications: { createIntent, cancelPendingIntentsForSource },
      },
    );

    expect(result).toEqual({ status: 'skipped', reason: 'appointment_not_cancelled' });
    expect(cancelPendingIntentsForSource).not.toHaveBeenCalled();
    expect(createIntent).not.toHaveBeenCalled();
  });

  it('skips appointment reminders when tenant or branch settings disable them', async () => {
    const createIntent = vi.fn<NotificationCreateIntent>();

    const result = await handleAppointmentReminder(
      makeJob({
        type: 'APPOINTMENT_REMINDER',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              status: 'CONFIRMED',
              customerId: 'customer-1',
              startsAt: '2026-09-20T13:00:00.000Z',
            };
          },
        },
        appointmentMessagingSettings: {
          async getReminderSettings() {
            return { enabled: false, leadMinutes: 60, timezone: 'America/Sao_Paulo' };
          },
        },
        notifications: { createIntent },
      },
    );

    expect(result).toEqual({ status: 'skipped', reason: 'appointment_reminder_disabled' });
    expect(createIntent).not.toHaveBeenCalled();
  });

  it('creates WhatsApp-capable appointment confirmation, reminder, cancellation and follow-up intents when a transactional target is available', async () => {
    const notifications: CreateNotificationIntentCommand[] = [];
    const resolveWhatsAppTarget = vi.fn(async () => ({
      connectionId: 'connection-1',
      recipientPhoneHash: 'hash-5511999999999',
      variables: { customerName: 'Ana' },
    }));
    const ports: InitialWorkerHandlerPorts = {
      appointments: {
        async findById(id) {
          return {
            id,
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            status: 'CONFIRMED',
            customerId: 'customer-1',
            startsAt: '2026-09-20T13:00:00.000Z',
          };
        },
      },
      orders: {
        async findById(id) {
          return {
            id,
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            status: 'PAID',
            customerId: 'customer-1',
          };
        },
      },
      notifications: {
        async createIntent(command) {
          notifications.push(command);
        },
      },
      transactionalMessaging: { resolveWhatsAppTarget },
    };

    await expect(
      handleAppointmentConfirmation(
        makeJob({
          type: 'APPOINTMENT_CONFIRMATION',
          sourceType: 'APPOINTMENT',
          sourceId: 'appointment-1',
        }),
        ports,
      ),
    ).resolves.toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    await expect(
      handleAppointmentReminder(
        makeJob({
          type: 'APPOINTMENT_REMINDER',
          sourceType: 'APPOINTMENT',
          sourceId: 'appointment-1',
        }),
        ports,
      ),
    ).resolves.toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    await expect(
      handleAppointmentCancellation(
        makeJob({
          type: 'APPOINTMENT_CANCELLATION',
          sourceType: 'APPOINTMENT',
          sourceId: 'appointment-1',
        }),
        {
          ...ports,
          appointments: {
            async findById(id) {
              return {
                id,
                tenantId: 'tenant-1',
                branchId: 'branch-1',
                status: 'CANCELLED',
                customerId: 'customer-1',
                startsAt: '2026-09-20T13:00:00.000Z',
              };
            },
          },
        },
      ),
    ).resolves.toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    await expect(
      handlePostServiceFollowUp(
        makeJob({ type: 'POST_SERVICE_FOLLOW_UP', sourceType: 'ORDER', sourceId: 'order-1' }),
        ports,
      ),
    ).resolves.toEqual({ status: 'succeeded', effect: 'notification_intent_created' });

    expect(resolveWhatsAppTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        customerId: 'customer-1',
        templateKey: 'appointment.confirmation.v1',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
    );
    expect(resolveWhatsAppTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        customerId: 'customer-1',
        templateKey: 'appointment.reminder.v1',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
    );
    expect(resolveWhatsAppTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'post-service.follow-up.v1',
        sourceType: 'ORDER',
        sourceId: 'order-1',
      }),
    );
    expect(resolveWhatsAppTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'appointment.cancellation.v1',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
    );
    expect(notifications).toEqual([
      expect.objectContaining({
        channel: 'WHATSAPP',
        templateKey: 'appointment.confirmation.v1',
        payload: expect.objectContaining({
          appointmentId: 'appointment-1',
          connectionId: 'connection-1',
          recipientPhoneHash: 'hash-5511999999999',
          variables: { customerName: 'Ana' },
        }),
      }),
      expect.objectContaining({
        channel: 'WHATSAPP',
        templateKey: 'appointment.reminder.v1',
        payload: expect.objectContaining({
          appointmentId: 'appointment-1',
          connectionId: 'connection-1',
          recipientPhoneHash: 'hash-5511999999999',
          variables: { customerName: 'Ana' },
        }),
      }),
      expect.objectContaining({
        channel: 'WHATSAPP',
        templateKey: 'appointment.cancellation.v1',
        payload: expect.objectContaining({
          appointmentId: 'appointment-1',
          connectionId: 'connection-1',
          recipientPhoneHash: 'hash-5511999999999',
          variables: { customerName: 'Ana' },
        }),
      }),
      expect.objectContaining({
        channel: 'WHATSAPP',
        templateKey: 'post-service.follow-up.v1',
        payload: expect.objectContaining({
          orderId: 'order-1',
          connectionId: 'connection-1',
          recipientPhoneHash: 'hash-5511999999999',
          variables: { customerName: 'Ana' },
        }),
      }),
    ]);
  });

  it('skips appointment reminders when the current appointment is stale or cancelled', async () => {
    const createIntent = vi.fn<NotificationCreateIntent>();
    const result = await handleAppointmentReminder(
      makeJob({
        type: 'APPOINTMENT_REMINDER',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              status: 'CANCELLED',
              customerId: 'customer-1',
            };
          },
        },
        notifications: { createIntent },
      },
    );

    expect(result).toEqual({ status: 'skipped', reason: 'appointment_not_eligible' });
    expect(createIntent).not.toHaveBeenCalled();
  });

  it('creates a post-service follow-up only for paid or closed orders with a customer', async () => {
    const createIntent = vi.fn<NotificationCreateIntent>();

    const staleResult = await handlePostServiceFollowUp(
      makeJob({ type: 'POST_SERVICE_FOLLOW_UP', sourceType: 'ORDER', sourceId: 'order-1' }),
      {
        orders: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              status: 'OPEN',
              customerId: 'customer-1',
            };
          },
        },
        notifications: { createIntent },
      },
    );

    expect(staleResult).toEqual({ status: 'skipped', reason: 'order_not_eligible' });
    expect(createIntent).not.toHaveBeenCalled();

    const paidResult = await handlePostServiceFollowUp(
      makeJob({ type: 'POST_SERVICE_FOLLOW_UP', sourceType: 'ORDER', sourceId: 'order-1' }),
      {
        orders: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              branchId: 'branch-1',
              status: 'PAID',
              customerId: 'customer-1',
            };
          },
        },
        notifications: { createIntent },
      },
    );

    expect(paidResult).toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    expect(createIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'post-service.follow-up.v1',
        sourceType: 'ORDER',
        sourceId: 'order-1',
        recipientId: 'customer-1',
      }),
    );
  });

  it('creates a post-service follow-up when a completed appointment is configured for it', async () => {
    const createIntent = vi.fn<NotificationCreateIntent>();
    const getFollowUpSettings = vi.fn(async () => ({
      enabled: true,
      templateKey: 'post-service.review-request.v1',
    }));

    const result = await handlePostServiceFollowUp(
      makeJob({
        type: 'POST_SERVICE_FOLLOW_UP',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              branchId: 'branch-2',
              status: 'COMPLETED',
              customerId: 'customer-1',
              startsAt: '2026-09-20T13:00:00.000Z',
            };
          },
        },
        postServiceMessagingSettings: { getFollowUpSettings },
        notifications: { createIntent },
      },
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    expect(getFollowUpSettings).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      branchId: 'branch-2',
      sourceType: 'APPOINTMENT',
      sourceId: 'appointment-1',
      customerId: 'customer-1',
    });
    expect(createIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'branch-2',
        recipientType: 'CUSTOMER',
        recipientId: 'customer-1',
        channel: 'LOCAL',
        templateKey: 'post-service.review-request.v1',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
        idempotencyKey: 'job:job-1:post-service-follow-up',
        payload: expect.objectContaining({
          appointmentId: 'appointment-1',
          startsAt: '2026-09-20T13:00:00.000Z',
        }),
      }),
    );
  });

  it('skips appointment post-service follow-up when the appointment is not completed or settings disable it', async () => {
    const createIntent = vi.fn<NotificationCreateIntent>();

    const staleResult = await handlePostServiceFollowUp(
      makeJob({
        type: 'POST_SERVICE_FOLLOW_UP',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              status: 'CONFIRMED',
              customerId: 'customer-1',
            };
          },
        },
        notifications: { createIntent },
      },
    );
    expect(staleResult).toEqual({ status: 'skipped', reason: 'appointment_not_completed' });
    expect(createIntent).not.toHaveBeenCalled();

    const disabledResult = await handlePostServiceFollowUp(
      makeJob({
        type: 'POST_SERVICE_FOLLOW_UP',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
      }),
      {
        appointments: {
          async findById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              status: 'COMPLETED',
              customerId: 'customer-1',
            };
          },
        },
        postServiceMessagingSettings: {
          async getFollowUpSettings() {
            return { enabled: false };
          },
        },
        notifications: { createIntent },
      },
    );
    expect(disabledResult).toEqual({
      status: 'skipped',
      reason: 'post_service_follow_up_disabled',
    });
    expect(createIntent).not.toHaveBeenCalled();
  });

  it('passes current job scope into the finance recalculation port', async () => {
    const recalculate = vi.fn<FinanceRecalculate>();
    const result = await handleFinanceRecalculation(
      makeJob({ type: 'FINANCE_RECALCULATION', sourceType: 'PAYMENT', sourceId: 'payment-1' }),
      {
        finance: { recalculate },
      },
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'finance_recalculated' });
    expect(recalculate).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      sourceType: 'PAYMENT',
      sourceId: 'payment-1',
      correlationId: 'correlation-1',
    });
  });

  it('creates stock alerts only when the current product is still below threshold', async () => {
    const createIntent = vi.fn<NotificationCreateIntent>();

    const noOp = await handleStockAlert(
      makeJob({ type: 'STOCK_ALERT', sourceType: 'PRODUCT', sourceId: 'product-1' }),
      {
        inventory: {
          async findProductById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              status: 'ACTIVE',
              quantityOnHand: 6,
              lowStockThreshold: 5,
            };
          },
        },
        notifications: { createIntent },
      },
    );

    expect(noOp).toEqual({ status: 'skipped', reason: 'stock_above_threshold' });
    expect(createIntent).not.toHaveBeenCalled();

    const result = await handleStockAlert(
      makeJob({ type: 'STOCK_ALERT', sourceType: 'PRODUCT', sourceId: 'product-1' }),
      {
        inventory: {
          async findProductById(id) {
            return {
              id,
              tenantId: 'tenant-1',
              branchId: 'branch-1',
              name: 'Pomada',
              status: 'ACTIVE',
              quantityOnHand: 2,
              lowStockThreshold: 5,
            };
          },
        },
        notifications: { createIntent },
      },
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'notification_intent_created' });
    expect(createIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientType: 'TENANT_OPERATOR',
        recipientId: 'tenant-1',
        templateKey: 'inventory.stock-low.v1',
        sourceType: 'PRODUCT',
        sourceId: 'product-1',
        payload: expect.objectContaining({
          quantityOnHand: 2,
          lowStockThreshold: 5,
        }),
      }),
    );
  });

  it('skips source snapshots that no longer belong to the job tenant', async () => {
    const createIntent = vi.fn<NotificationCreateIntent>();
    const result = await handleStockAlert(
      makeJob({ type: 'STOCK_ALERT', sourceType: 'PRODUCT', sourceId: 'product-1' }),
      {
        inventory: {
          async findProductById(id) {
            return {
              id,
              tenantId: 'tenant-2',
              quantityOnHand: 1,
              lowStockThreshold: 5,
            };
          },
        },
        notifications: { createIntent },
      },
    );

    expect(result).toEqual({ status: 'skipped', reason: 'product_not_found' });
    expect(createIntent).not.toHaveBeenCalled();
  });

  it('reports expired cleanup as skipped when there is nothing to delete', async () => {
    const cleanupAt = new Date('2026-09-19T12:00:00.000Z');
    const deleteExpired = vi.fn<CleanupDeleteExpired>();
    deleteExpired.mockResolvedValue(0);

    const result = await handleExpiredRecordCleanup(
      makeJob({ type: 'EXPIRED_RECORD_CLEANUP', sourceType: 'SYSTEM', sourceId: 'system' }),
      {
        cleanup: { deleteExpired },
      },
      cleanupAt,
    );

    expect(result).toEqual({ status: 'skipped', reason: 'nothing_expired' });
    expect(deleteExpired).toHaveBeenCalledWith(cleanupAt);
  });

  it('exposes the initial handler map for the worker registry layer', async () => {
    const handlers = createInitialWorkerHandlers(
      {
        cleanup: {
          async deleteExpired() {
            return 3;
          },
        },
      },
      { now: () => new Date('2026-09-19T12:00:00.000Z') },
    );

    await expect(
      handlers.EXPIRED_RECORD_CLEANUP?.(
        makeJob({ type: 'EXPIRED_RECORD_CLEANUP', sourceType: 'SYSTEM', sourceId: 'system' }),
      ),
    ).resolves.toEqual({ status: 'succeeded', effect: 'expired_records_deleted' });
    expect(Object.keys(handlers).sort()).toEqual([
      'APPOINTMENT_CANCELLATION',
      'APPOINTMENT_CONFIRMATION',
      'APPOINTMENT_REMINDER',
      'CAMPAIGN_DISPATCH',
      'EXPIRED_RECORD_CLEANUP',
      'FINANCE_RECALCULATION',
      'MESSAGING_WEBHOOK_PROCESSING',
      'NOTIFICATION_DELIVERY',
      'POST_SERVICE_FOLLOW_UP',
      'STOCK_ALERT',
      'WHATSAPP_DELIVERY',
    ]);
  });

  it('creates campaign WhatsApp delivery work and queues recipient outcomes', async () => {
    const notifications: CreateNotificationIntentCommand[] = [];
    const outcomeUpdates: Array<{
      campaignRunId: string;
      contactPhoneHash: string;
      status: CampaignRecipientOutcome['status'];
      notificationIntentId?: string;
    }> = [];

    const result = await handleCampaignDispatch(
      makeJob({
        type: 'CAMPAIGN_DISPATCH',
        sourceType: 'CAMPAIGN_RUN',
        sourceId: 'campaign-run-1',
        payload: {
          campaignId: 'campaign-1',
          campaignRunId: 'campaign-run-1',
          idempotencyKey: 'campaign-dispatch-1',
          correlationId: 'correlation-1',
        },
      }),
      {
        notifications: {
          async createIntent(command) {
            notifications.push(command);
            return {
              id: `notification-${notifications.length}`,
              tenantId: command.tenantId,
              branchId: command.branchId,
              recipientType: command.recipientType,
              recipientId: command.recipientId,
              channel: command.channel,
              templateKey: command.templateKey,
              sourceType: command.sourceType,
              sourceId: command.sourceId,
              payload: command.payload ?? {},
              status: 'PENDING',
              idempotencyKey: command.idempotencyKey,
              correlationId: command.correlationId,
              createdAt: '2026-09-29T12:00:00.000Z',
              updatedAt: '2026-09-29T12:00:00.000Z',
            } satisfies NotificationIntent;
          },
        },
        campaigns: {
          async findRunById(id) {
            expect(id).toBe('campaign-run-1');
            return campaignRun();
          },
          async listRecipientOutcomes(id) {
            expect(id).toBe('campaign-run-1');
            return [
              campaignRecipientOutcome('recipient-1', 'customer-1', 'hash-customer-1', 'PENDING'),
              campaignRecipientOutcome('recipient-2', 'customer-2', 'hash-customer-2', 'PENDING'),
              campaignRecipientOutcome(
                'recipient-blocked',
                'customer-3',
                'hash-customer-3',
                'BLOCKED_BY_CONSENT',
              ),
            ];
          },
          async resolveWhatsAppConnection(input) {
            expect(input).toEqual({
              tenantId: 'tenant-1',
              branchId: 'branch-1',
              campaignId: 'campaign-1',
              campaignRunId: 'campaign-run-1',
            });
            return {
              connectionId: 'connection-campaign-1',
              templateKey: 'campaign.reactivation.v1',
              variables: { tenantName: 'BarberOS Demo' },
            };
          },
          async updateRecipientOutcome(input) {
            outcomeUpdates.push(input);
          },
        },
      },
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'campaign_dispatch_work_created' });
    expect(notifications).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        recipientType: 'CUSTOMER',
        recipientId: 'customer-1',
        channel: 'WHATSAPP',
        templateKey: 'campaign.reactivation.v1',
        sourceType: 'CAMPAIGN_RUN',
        sourceId: 'campaign-run-1',
        idempotencyKey: 'recipient-1-key:notification',
        payload: expect.objectContaining({
          campaignId: 'campaign-1',
          campaignRunId: 'campaign-run-1',
          campaignRecipientOutcomeId: 'recipient-1',
          connectionId: 'connection-campaign-1',
          recipientPhoneHash: 'hash-customer-1',
          variables: { tenantName: 'BarberOS Demo' },
        }),
      }),
      expect.objectContaining({
        recipientId: 'customer-2',
        idempotencyKey: 'recipient-2-key:notification',
        payload: expect.objectContaining({
          campaignRecipientOutcomeId: 'recipient-2',
          recipientPhoneHash: 'hash-customer-2',
        }),
      }),
    ]);
    expect(outcomeUpdates).toEqual([
      {
        campaignRunId: 'campaign-run-1',
        contactPhoneHash: 'hash-customer-1',
        status: 'QUEUED',
        notificationIntentId: 'notification-1',
      },
      {
        campaignRunId: 'campaign-run-1',
        contactPhoneHash: 'hash-customer-2',
        status: 'QUEUED',
        notificationIntentId: 'notification-2',
      },
    ]);
  });

  it('caps campaign dispatch work to the configured recipient rate limit', async () => {
    const notifications: CreateNotificationIntentCommand[] = [];
    const updates: unknown[] = [];
    const result = await handleCampaignDispatch(
      makeJob({
        type: 'CAMPAIGN_DISPATCH',
        sourceType: 'CAMPAIGN_RUN',
        sourceId: 'campaign-run-1',
        payload: {
          campaignId: 'campaign-1',
          campaignRunId: 'campaign-run-1',
          idempotencyKey: 'campaign-dispatch-1',
          correlationId: 'correlation-1',
        },
      }),
      {
        campaignDispatch: { maxRecipientsPerDispatch: 1 },
        notifications: {
          async createIntent(command) {
            notifications.push(command);
            return { id: 'notification-limited-1' };
          },
        },
        campaigns: {
          async findRunById() {
            return campaignRun();
          },
          async listRecipientOutcomes() {
            return [
              campaignRecipientOutcome('recipient-1', 'customer-1', 'hash-customer-1', 'PENDING'),
              campaignRecipientOutcome('recipient-2', 'customer-2', 'hash-customer-2', 'PENDING'),
            ];
          },
          async resolveWhatsAppConnection() {
            return {
              connectionId: 'connection-campaign-1',
              templateKey: 'campaign.reactivation.v1',
            };
          },
          async updateRecipientOutcome(input) {
            updates.push(input);
          },
        },
      },
    );

    expect(result).toEqual({ status: 'skipped', reason: 'campaign_dispatch_rate_limited' });
    expect(notifications).toHaveLength(1);
    expect(updates).toEqual([
      expect.objectContaining({
        contactPhoneHash: 'hash-customer-1',
        status: 'QUEUED',
        notificationIntentId: 'notification-limited-1',
      }),
    ]);
  });

  it('routes WhatsApp notification delivery intents through the WhatsApp handler', async () => {
    const attempts: NotificationDeliveryAttempt[] = [];
    const whatsappProvider = {
      provider: 'LOCAL',
      send: vi.fn(async () => ({
        accepted: true as const,
        provider: 'LOCAL',
        providerMessageId: 'local-whatsapp-message-1',
        deliveryState: 'QUEUED' as const,
        retryable: false as const,
      })),
    };
    const handlers = createInitialWorkerHandlers(
      {
        notifications: {
          async createIntent() {},
          async findIntentById(id) {
            return id === 'notification-whatsapp' ? whatsappIntent() : null;
          },
          async recordDeliveryAttempt(command) {
            attempts.push(notificationAttempt(command, attempts.length + 1));
          },
        },
        whatsappProvider,
      },
      { now: () => new Date('2026-09-23T12:05:00.000Z') },
    );

    const result = await handlers.NOTIFICATION_DELIVERY?.(
      makeJob({
        type: 'NOTIFICATION_DELIVERY',
        sourceType: 'NOTIFICATION_INTENT',
        sourceId: 'notification-whatsapp',
      }),
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'whatsapp_delivery_queued' });
    expect(whatsappProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        connectionId: 'connection-1',
        notificationIntentId: 'notification-whatsapp',
        recipientPhoneHash: 'hash-5511999999999',
        templateKey: 'appointment.reminder.v1',
      }),
    );
    expect(attempts).toEqual([
      expect.objectContaining({
        notificationIntentId: 'notification-whatsapp',
        channel: 'WHATSAPP',
        status: 'QUEUED',
        provider: 'LOCAL',
        providerMessageId: 'local-whatsapp-message-1',
      }),
    ]);
  });

  it('records a sanitized failure when a WhatsApp intent is missing delivery payload', async () => {
    const attempts: NotificationDeliveryAttempt[] = [];
    const whatsappProvider = {
      provider: 'LOCAL',
      send: vi.fn(),
    };
    const handlers = createInitialWorkerHandlers({
      notifications: {
        async createIntent() {},
        async findIntentById(id) {
          return id === 'notification-whatsapp' ? whatsappIntent({ payload: {} }) : null;
        },
        async recordDeliveryAttempt(command) {
          attempts.push(notificationAttempt(command, attempts.length + 1));
        },
      },
      whatsappProvider,
    });

    const result = await handlers.NOTIFICATION_DELIVERY?.(
      makeJob({
        type: 'NOTIFICATION_DELIVERY',
        sourceType: 'NOTIFICATION_INTENT',
        sourceId: 'notification-whatsapp',
      }),
    );

    expect(result).toEqual({ status: 'skipped', reason: 'whatsapp_delivery_payload_invalid' });
    expect(whatsappProvider.send).not.toHaveBeenCalled();
    expect(attempts).toEqual([
      expect.objectContaining({
        notificationIntentId: 'notification-whatsapp',
        channel: 'WHATSAPP',
        status: 'FAILED',
        provider: 'whatsapp-router',
        error: {
          code: 'MESSAGING_VALIDATION_ERROR',
          message: 'WhatsApp notification intent is missing required delivery payload.',
          retryable: false,
        },
      }),
    ]);
  });
});

function campaignRun(overrides: Partial<CampaignRun> = {}): CampaignRun {
  return {
    id: 'campaign-run-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    campaignId: 'campaign-1',
    status: 'SCHEDULED',
    audienceSize: 3,
    eligibleCount: 2,
    excludedCount: 1,
    scheduledFor: '2026-09-29T12:00:00.000Z',
    idempotencyKey: 'campaign-run-1-key',
    createdAt: '2026-09-29T11:00:00.000Z',
    updatedAt: '2026-09-29T11:00:00.000Z',
    ...overrides,
  };
}

function campaignRecipientOutcome(
  id: string,
  customerId: string,
  contactPhoneHash: string,
  status: CampaignRecipientOutcome['status'],
): CampaignRecipientOutcome {
  return {
    id,
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    campaignId: 'campaign-1',
    campaignRunId: 'campaign-run-1',
    customerId,
    contactPhoneHash,
    status,
    idempotencyKey: `${id}-key`,
    createdAt: '2026-09-29T11:00:00.000Z',
    updatedAt: '2026-09-29T11:00:00.000Z',
  };
}

function makeJob(input: {
  type: WorkerJob['type'];
  sourceType?: WorkerJob['sourceType'];
  sourceId?: string;
  payload?: Record<string, unknown>;
}): WorkerJob {
  return {
    id: 'job-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    type: input.type,
    status: 'RUNNING',
    schemaVersion: 1,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    payload: input.payload ?? {},
    idempotencyKey: `job:${input.type.toLowerCase()}`,
    correlationId: 'correlation-1',
    priority: 50,
    attemptCount: 1,
    maxAttempts: 5,
    runAt: '2026-09-19T12:00:00.000Z',
    createdAt: '2026-09-19T11:59:00.000Z',
    updatedAt: '2026-09-19T12:00:00.000Z',
  };
}

function whatsappIntent(overrides: Partial<NotificationIntent> = {}): NotificationIntent {
  return {
    id: 'notification-whatsapp',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    recipientType: 'CUSTOMER',
    recipientId: 'customer-1',
    channel: 'WHATSAPP',
    templateKey: 'appointment.reminder.v1',
    sourceType: 'APPOINTMENT',
    sourceId: 'appointment-1',
    payload: {
      connectionId: 'connection-1',
      recipientPhoneHash: 'hash-5511999999999',
      variables: { customerName: 'Ana' },
    },
    status: 'PENDING',
    idempotencyKey: 'whatsapp-delivery-1',
    correlationId: 'correlation-1',
    createdAt: '2026-09-23T12:00:00.000Z',
    updatedAt: '2026-09-23T12:00:00.000Z',
    ...overrides,
  };
}

function notificationAttempt(
  command: RecordNotificationDeliveryAttemptCommand,
  sequence: number,
): NotificationDeliveryAttempt {
  return {
    id: 'attempt-' + sequence,
    createdAt: '2026-09-23T12:05:00.000Z',
    ...command,
    error: command.error
      ? { ...command.error, retryable: command.error.retryable ?? false }
      : undefined,
  };
}
