import type {
  WorkerJob,
  WorkerJobAttemptStatus,
  WorkerJobStatus,
  WorkerSanitizedError,
} from '@barberos/contracts';

export type WorkerJobFailureInput = {
  job: WorkerJob;
  error: WorkerSanitizedError;
  now: Date;
  retryAfterMs?: number;
  backoff?: Partial<WorkerRetryBackoffOptions>;
};

export type WorkerRetryBackoffOptions = {
  baseDelayMs: number;
  maxDelayMs: number;
  rateLimitDelayMs: number;
};

export type WorkerJobFailureDecision = {
  jobStatus: WorkerJobStatus;
  attemptStatus: WorkerJobAttemptStatus;
  attemptCount: number;
  runAt?: string;
  completedAt?: string;
  lastError: WorkerSanitizedError;
};

const defaultBackoff: WorkerRetryBackoffOptions = {
  baseDelayMs: 60_000,
  maxDelayMs: 30 * 60_000,
  rateLimitDelayMs: 5 * 60_000,
};

export function decideWorkerJobFailure(input: WorkerJobFailureInput): WorkerJobFailureDecision {
  const attemptCount = input.job.attemptCount + 1;
  const exhausted = attemptCount >= input.job.maxAttempts;
  const failedAt = input.now.toISOString();

  if (!input.error.retryable) {
    return {
      jobStatus: 'FAILED',
      attemptStatus: 'FAILED',
      attemptCount,
      completedAt: failedAt,
      lastError: input.error,
    };
  }

  if (exhausted) {
    return {
      jobStatus: 'DEAD_LETTERED',
      attemptStatus: 'DEAD_LETTERED',
      attemptCount,
      completedAt: failedAt,
      lastError: {
        ...input.error,
        code:
          input.error.code === 'WORKER_RATE_LIMITED' ? input.error.code : 'WORKER_RETRY_EXHAUSTED',
        retryable: false,
      },
    };
  }

  return {
    jobStatus: 'RETRY_SCHEDULED',
    attemptStatus: 'RETRY_SCHEDULED',
    attemptCount,
    runAt: new Date(input.now.getTime() + getRetryDelayMs(input)).toISOString(),
    lastError: input.error,
  };
}

export function getRetryDelayMs(
  input: Pick<WorkerJobFailureInput, 'job' | 'error' | 'retryAfterMs' | 'backoff'>,
) {
  const backoff = { ...defaultBackoff, ...input.backoff };
  if (input.error.code === 'WORKER_RATE_LIMITED') {
    return clampDelay(input.retryAfterMs ?? backoff.rateLimitDelayMs, backoff.maxDelayMs);
  }

  const retryIndex = input.job.attemptCount;
  const exponentialDelay = backoff.baseDelayMs * 2 ** retryIndex;
  return clampDelay(exponentialDelay, backoff.maxDelayMs);
}

function clampDelay(delayMs: number, maxDelayMs: number) {
  if (!Number.isFinite(delayMs) || delayMs <= 0) return 0;
  return Math.min(Math.floor(delayMs), maxDelayMs);
}
