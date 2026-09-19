import { describe, expect, it } from 'vitest';
import type { NotificationIntent } from '@barberos/contracts';
import {
  assertNotificationDeliveryStatusTransition,
  assertNotificationIntentIsDuplicate,
  assertNotificationScope,
  canTransitionNotificationDeliveryStatus,
  createNotificationIntentIdempotencyKey,
  isDuplicateNotificationIntent,
  shouldMarkNotificationIntentFailed,
} from './index';

const intent: NotificationIntent = {
  id: 'notification-a',
  tenantId: 'tenant-a',
  branchId: 'branch-a',
  recipientType: 'CUSTOMER',
  recipientId: 'customer-a',
  channel: 'LOCAL',
  templateKey: 'appointment.reminder.v1',
  sourceType: 'APPOINTMENT',
  sourceId: 'appointment-a',
  payload: { appointmentId: 'appointment-a' },
  status: 'PENDING',
  idempotencyKey: 'appointment:appointment-a:local:appointment.reminder.v1',
  correlationId: 'request-a',
  createdAt: '2026-09-18T12:00:00.000Z',
  updatedAt: '2026-09-18T12:00:00.000Z',
};

describe('notification domain helpers', () => {
  it('builds provider-agnostic notification idempotency keys', () => {
    expect(createNotificationIntentIdempotencyKey(intent)).toBe(
      'appointment:appointment-a:local:appointment.reminder.v1',
    );
    expect(
      createNotificationIntentIdempotencyKey({
        ...intent,
        channel: 'WHATSAPP',
        effect: 'First Reminder',
      }),
    ).toBe('appointment:appointment-a:whatsapp:appointment.reminder.v1:first-reminder');
  });

  it('detects duplicate notification intents by source, recipient and idempotency key', () => {
    expect(isDuplicateNotificationIntent(intent, intent)).toBe(true);
    expect(isDuplicateNotificationIntent(intent, { ...intent, recipientId: 'customer-b' })).toBe(
      false,
    );
    expect(() => assertNotificationIntentIsDuplicate(intent, intent)).not.toThrow();
    expect(() =>
      assertNotificationIntentIsDuplicate(intent, { ...intent, channel: 'WHATSAPP' }),
    ).toThrow('Notification intent conflicts');
  });

  it('rejects cross-tenant and cross-branch notification data', () => {
    expect(() =>
      assertNotificationScope({ tenantId: 'tenant-a', branchId: 'branch-a' }, intent),
    ).not.toThrow();
    expect(() =>
      assertNotificationScope({ tenantId: 'tenant-b', branchId: 'branch-a' }, intent),
    ).toThrow('different tenant');
    expect(() =>
      assertNotificationScope({ tenantId: 'tenant-a', branchId: 'branch-b' }, intent),
    ).toThrow('different branch');
  });

  it('guards delivery lifecycle and permanent failure states', () => {
    expect(canTransitionNotificationDeliveryStatus('PENDING', 'SENT')).toBe(true);
    expect(canTransitionNotificationDeliveryStatus('RETRY_SCHEDULED', 'DEAD_LETTERED')).toBe(true);
    expect(canTransitionNotificationDeliveryStatus('SENT', 'FAILED')).toBe(false);
    expect(() =>
      assertNotificationDeliveryStatusTransition({ from: 'SENT', to: 'RETRY_SCHEDULED' }),
    ).toThrow('Invalid notification delivery transition');
    expect(shouldMarkNotificationIntentFailed({ attemptStatus: 'RETRY_SCHEDULED' })).toBe(false);
    expect(shouldMarkNotificationIntentFailed({ attemptStatus: 'DEAD_LETTERED' })).toBe(true);
  });
});
