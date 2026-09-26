import type { CreateNotificationIntentCommand, WorkerJob } from '@barberos/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  createInitialWorkerHandlers,
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
      'APPOINTMENT_REMINDER',
      'EXPIRED_RECORD_CLEANUP',
      'FINANCE_RECALCULATION',
      'MESSAGING_WEBHOOK_PROCESSING',
      'NOTIFICATION_DELIVERY',
      'POST_SERVICE_FOLLOW_UP',
      'STOCK_ALERT',
      'WHATSAPP_DELIVERY',
    ]);
  });
});

function makeJob(input: {
  type: WorkerJob['type'];
  sourceType?: WorkerJob['sourceType'];
  sourceId?: string;
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
    payload: {},
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
