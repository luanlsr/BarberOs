import type { WorkerJob } from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import {
  createWorkerLogEntry,
  sanitizeUnknownError,
  sanitizeWorkerLogValue,
  WorkerLogger,
  type WorkerLogEntry,
} from './worker-logger';

describe('worker structured logging', () => {
  it('creates structured job log entries with required operational context', () => {
    const entry = createWorkerLogEntry(
      {
        level: 'info',
        event: 'worker.job.succeeded',
        job: makeJob(),
        metadata: {
          durationMs: 37,
        },
      },
      new Date('2026-09-19T12:00:00.000Z'),
    );

    expect(entry).toEqual({
      timestamp: '2026-09-19T12:00:00.000Z',
      service: 'worker',
      level: 'info',
      event: 'worker.job.succeeded',
      jobId: 'job-1',
      outboxEventId: 'event-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      correlationId: 'correlation-1',
      attemptCount: 2,
      jobType: 'NOTIFICATION_DELIVERY',
      status: 'RUNNING',
      metadata: {
        durationMs: 37,
      },
      error: undefined,
    });
  });

  it('redacts sensitive metadata recursively before writing logs', () => {
    expect(
      sanitizeWorkerLogValue({
        accessToken: 'secret-token',
        service_role: 'service-role-secret',
        payment: {
          cardNumber: '4111111111111111',
          amount: 127,
          providerResponse: {
            token: 'provider-secret-token',
          },
        },
        messages: [{ body: 'Mensagem sensivel enviada ao cliente' }],
      }),
    ).toEqual({
      accessToken: '[REDACTED]',
      service_role: '[REDACTED]',
      payment: {
        cardNumber: '[REDACTED]',
        amount: 127,
        providerResponse: '[REDACTED]',
      },
      messages: [{ body: '[REDACTED]' }],
    });
  });

  it('sanitizes error details without leaking tokens or card numbers', () => {
    const entry = createWorkerLogEntry(
      {
        level: 'error',
        event: 'worker.job.failed',
        job: makeJob(),
        error: {
          code: 'WORKER_PROVIDER_UNAVAILABLE',
          message: 'Provider failed with bearer secret-token and card 4111 1111 1111 1111',
          retryable: true,
        },
      },
      new Date('2026-09-19T12:00:00.000Z'),
    );

    expect(entry.error).toEqual({
      code: 'WORKER_PROVIDER_UNAVAILABLE',
      message: 'Provider failed with bearer [REDACTED] and card [REDACTED]',
      retryable: true,
    });
  });

  it('converts unknown exceptions into sanitized worker errors', () => {
    expect(sanitizeUnknownError(new Error('JWT eyJhbGciOiJIUzI1NiJ9 leaked'))).toEqual({
      code: 'WORKER_HANDLER_FAILED',
      message: 'JWT [REDACTED] leaked',
      retryable: true,
    });
  });

  it('writes through the configured sink using a deterministic clock', () => {
    const entries: WorkerLogEntry[] = [];
    const logger = new WorkerLogger(
      {
        write(entry) {
          entries.push(entry);
        },
      },
      () => new Date('2026-09-19T12:00:00.000Z'),
    );

    logger.warn({
      event: 'worker.job.skipped',
      job: makeJob(),
      status: 'SKIPPED',
      metadata: {
        reason: 'appointment_not_eligible',
        refreshToken: 'never-log-me',
      },
    });

    expect(entries).toEqual([
      expect.objectContaining({
        timestamp: '2026-09-19T12:00:00.000Z',
        level: 'warn',
        event: 'worker.job.skipped',
        jobId: 'job-1',
        status: 'SKIPPED',
        metadata: {
          reason: 'appointment_not_eligible',
          refreshToken: '[REDACTED]',
        },
      }),
    ]);
  });
});

function makeJob(): WorkerJob {
  return {
    id: 'job-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    type: 'NOTIFICATION_DELIVERY',
    status: 'RUNNING',
    schemaVersion: 1,
    sourceType: 'NOTIFICATION_INTENT',
    sourceId: 'intent-1',
    outboxEventId: 'event-1',
    notificationIntentId: 'intent-1',
    payload: {},
    idempotencyKey: 'job:notification-delivery',
    correlationId: 'correlation-1',
    priority: 80,
    attemptCount: 2,
    maxAttempts: 5,
    runAt: '2026-09-19T12:00:00.000Z',
    createdAt: '2026-09-19T11:59:00.000Z',
    updatedAt: '2026-09-19T12:00:00.000Z',
  };
}
