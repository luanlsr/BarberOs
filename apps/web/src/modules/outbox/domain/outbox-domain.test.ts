import { describe, expect, it } from 'vitest';
import type { OutboxEvent } from '@barberos/contracts';
import {
  assertOutboxEventIsDuplicate,
  assertOutboxEventStatusTransition,
  canTransitionOutboxEventStatus,
  createOutboxEventName,
  createOutboxIdempotencyKey,
  isDuplicateOutboxEvent,
  sanitizeWorkerError,
} from './index';

const existingOutboxEvent: OutboxEvent = {
  id: 'outbox-a',
  tenantId: 'tenant-a',
  branchId: 'branch-a',
  eventType: 'PAYMENT_COMPLETED',
  sourceType: 'PAYMENT',
  sourceId: 'payment-a',
  payload: { paymentId: 'payment-a' },
  idempotencyKey: 'payment:payment-a:payment.completed',
  status: 'PENDING',
  correlationId: 'request-a',
  schemaVersion: 1,
  attemptCount: 0,
  availableAt: '2026-09-18T12:00:00.000Z',
  createdAt: '2026-09-18T12:00:00.000Z',
  updatedAt: '2026-09-18T12:00:00.000Z',
};

describe('outbox domain helpers', () => {
  it('builds stable event names and retry-safe idempotency keys', () => {
    expect(createOutboxEventName({ eventType: 'PAYMENT_COMPLETED' })).toBe('payment.completed');
    expect(
      createOutboxIdempotencyKey({
        eventType: 'PAYMENT_COMPLETED',
        sourceType: 'PAYMENT',
        sourceId: 'payment-a',
      }),
    ).toBe('payment:payment-a:payment.completed');
    expect(
      createOutboxIdempotencyKey({
        eventType: 'NOTIFICATION_DELIVERY_REQUESTED',
        sourceType: 'NOTIFICATION_INTENT',
        sourceId: 'intent-a',
        effect: 'Local Provider Send',
      }),
    ).toBe('notification_intent:intent-a:notification.delivery.requested:local-provider-send');
  });

  it('detects duplicate source and idempotency combinations', () => {
    expect(isDuplicateOutboxEvent(existingOutboxEvent, existingOutboxEvent)).toBe(true);
    expect(
      isDuplicateOutboxEvent(existingOutboxEvent, {
        ...existingOutboxEvent,
        branchId: 'branch-b',
      }),
    ).toBe(false);
    expect(() =>
      assertOutboxEventIsDuplicate(existingOutboxEvent, existingOutboxEvent),
    ).not.toThrow();
    expect(() =>
      assertOutboxEventIsDuplicate(existingOutboxEvent, {
        ...existingOutboxEvent,
        idempotencyKey: 'payment:payment-a:other-effect',
      }),
    ).toThrow('Outbox event conflicts');
  });

  it('guards invalid outbox status transitions', () => {
    expect(canTransitionOutboxEventStatus('PENDING', 'DISPATCHING')).toBe(true);
    expect(canTransitionOutboxEventStatus('FAILED', 'PENDING')).toBe(true);
    expect(canTransitionOutboxEventStatus('DISPATCHED', 'PENDING')).toBe(false);
    expect(() => assertOutboxEventStatusTransition({ from: 'DISPATCHED', to: 'FAILED' })).toThrow(
      'Invalid outbox event status transition',
    );
  });

  it('sanitizes worker errors without leaking raw details', () => {
    const error = sanitizeWorkerError({
      code: 'WORKER_PROVIDER_UNAVAILABLE',
      message: '  Provider unavailable.   token=secret-token\nstack trace hidden  ',
      retryable: true,
    });

    expect(error).toEqual({
      code: 'WORKER_PROVIDER_UNAVAILABLE',
      message: 'Provider unavailable. token=secret-token stack trace hidden',
      retryable: true,
    });
    expect(sanitizeWorkerError({}).code).toBe('WORKER_HANDLER_FAILED');
    expect(sanitizeWorkerError({ message: { provider: 'raw' } }).message).toBe(
      'WORKER_HANDLER_FAILED',
    );
  });
});
