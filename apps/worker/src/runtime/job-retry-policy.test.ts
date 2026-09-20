import type { WorkerJob, WorkerSanitizedError } from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import { decideWorkerJobFailure, getRetryDelayMs } from './job-retry-policy';

const now = new Date('2026-09-19T12:00:00.000Z');

const retryableError: WorkerSanitizedError = {
  code: 'WORKER_PROVIDER_UNAVAILABLE',
  message: 'Provider unavailable',
  retryable: true,
};

const rateLimitedError: WorkerSanitizedError = {
  code: 'WORKER_RATE_LIMITED',
  message: 'Provider rate limit reached',
  retryable: true,
};

const permanentError: WorkerSanitizedError = {
  code: 'WORKER_VALIDATION_ERROR',
  message: 'Invalid payload',
  retryable: false,
};

describe('worker job retry policy', () => {
  it('schedules retryable failures with deterministic exponential backoff', () => {
    const first = decideWorkerJobFailure({
      job: makeJob({ attemptCount: 0, maxAttempts: 5 }),
      error: retryableError,
      now,
      backoff: { baseDelayMs: 1_000, maxDelayMs: 60_000 },
    });
    const third = decideWorkerJobFailure({
      job: makeJob({ attemptCount: 2, maxAttempts: 5 }),
      error: retryableError,
      now,
      backoff: { baseDelayMs: 1_000, maxDelayMs: 60_000 },
    });

    expect(first).toMatchObject({
      jobStatus: 'RETRY_SCHEDULED',
      attemptStatus: 'RETRY_SCHEDULED',
      attemptCount: 1,
      runAt: '2026-09-19T12:00:01.000Z',
      lastError: retryableError,
    });
    expect(third.runAt).toBe('2026-09-19T12:00:04.000Z');
    expect(getRetryDelayMs({ job: makeJob({ attemptCount: 10 }), error: retryableError })).toBe(
      30 * 60_000,
    );
  });

  it('uses rate-limit retry-after delay without marking the job successful', () => {
    const decision = decideWorkerJobFailure({
      job: makeJob({ attemptCount: 1, maxAttempts: 5 }),
      error: rateLimitedError,
      retryAfterMs: 90_000,
      now,
    });

    expect(decision).toMatchObject({
      jobStatus: 'RETRY_SCHEDULED',
      attemptStatus: 'RETRY_SCHEDULED',
      attemptCount: 2,
      runAt: '2026-09-19T12:01:30.000Z',
      lastError: rateLimitedError,
    });
  });

  it('moves retryable jobs to dead-letter when attempts are exhausted', () => {
    const decision = decideWorkerJobFailure({
      job: makeJob({ attemptCount: 4, maxAttempts: 5 }),
      error: retryableError,
      now,
    });

    expect(decision).toEqual({
      jobStatus: 'DEAD_LETTERED',
      attemptStatus: 'DEAD_LETTERED',
      attemptCount: 5,
      completedAt: '2026-09-19T12:00:00.000Z',
      lastError: {
        ...retryableError,
        code: 'WORKER_RETRY_EXHAUSTED',
        retryable: false,
      },
    });
  });

  it('fails non-retryable errors without scheduling another run', () => {
    const decision = decideWorkerJobFailure({
      job: makeJob({ attemptCount: 0, maxAttempts: 5 }),
      error: permanentError,
      now,
    });

    expect(decision).toEqual({
      jobStatus: 'FAILED',
      attemptStatus: 'FAILED',
      attemptCount: 1,
      completedAt: '2026-09-19T12:00:00.000Z',
      lastError: permanentError,
    });
  });
});

function makeJob(input: { attemptCount: number; maxAttempts?: number }): WorkerJob {
  return {
    id: 'job-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    type: 'NOTIFICATION_DELIVERY',
    status: 'RUNNING',
    schemaVersion: 1,
    sourceType: 'NOTIFICATION_INTENT',
    sourceId: 'intent-1',
    notificationIntentId: 'intent-1',
    payload: {},
    idempotencyKey: 'job-1:notification-delivery',
    correlationId: 'correlation-1',
    priority: 80,
    attemptCount: input.attemptCount,
    maxAttempts: input.maxAttempts ?? 5,
    runAt: '2026-09-19T12:00:00.000Z',
    createdAt: '2026-09-19T11:59:00.000Z',
    updatedAt: '2026-09-19T12:00:00.000Z',
  };
}
