import {
  sanitizeObservabilityFreeText,
  sanitizeObservabilityValue,
  type WorkerJob,
  type WorkerSanitizedError,
} from '@barberos/contracts';

export type WorkerLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type WorkerLoggerSink = {
  write(entry: WorkerLogEntry): void;
};

export type WorkerLogEntry = {
  timestamp: string;
  level: WorkerLogLevel;
  event: string;
  service: 'worker';
  jobId?: string;
  outboxEventId?: string;
  tenantId?: string;
  branchId?: string;
  correlationId?: string;
  attemptCount?: number;
  jobType?: WorkerJob['type'];
  status?: WorkerJob['status'] | 'SKIPPED';
  error?: WorkerSanitizedError;
  metadata?: Record<string, unknown>;
};

export type WorkerLogInput = Omit<
  WorkerLogEntry,
  'timestamp' | 'service' | 'metadata' | 'level'
> & {
  level?: WorkerLogLevel;
  job?: WorkerJob;
  metadata?: Record<string, unknown>;
};

export class WorkerLogger {
  constructor(
    private readonly sink: WorkerLoggerSink = consoleWorkerLoggerSink,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  debug(input: WorkerLogInput) {
    this.write({ ...input, level: 'debug' });
  }

  info(input: WorkerLogInput) {
    this.write({ ...input, level: 'info' });
  }

  warn(input: WorkerLogInput) {
    this.write({ ...input, level: 'warn' });
  }

  error(input: WorkerLogInput) {
    this.write({ ...input, level: 'error' });
  }

  write(input: WorkerLogInput) {
    this.sink.write(createWorkerLogEntry(input, this.clock()));
  }
}

export function createWorkerLogEntry(
  input: WorkerLogInput,
  now: Date = new Date(),
): WorkerLogEntry {
  const jobContext: Partial<WorkerLogEntry> = input.job ? getWorkerJobLogContext(input.job) : {};
  const sanitizedMetadata = input.metadata ? sanitizeWorkerLogValue(input.metadata) : undefined;

  return {
    timestamp: now.toISOString(),
    service: 'worker',
    level: input.level ?? 'info',
    event: input.event,
    ...jobContext,
    jobId: input.jobId ?? jobContext.jobId,
    outboxEventId: input.outboxEventId ?? jobContext.outboxEventId,
    tenantId: input.tenantId ?? jobContext.tenantId,
    branchId: input.branchId ?? jobContext.branchId,
    correlationId: input.correlationId ?? jobContext.correlationId,
    attemptCount: input.attemptCount ?? jobContext.attemptCount,
    jobType: input.jobType ?? jobContext.jobType,
    status: input.status ?? jobContext.status,
    error: input.error ? sanitizeWorkerError(input.error) : undefined,
    metadata:
      sanitizedMetadata && isRecord(sanitizedMetadata)
        ? (sanitizedMetadata as Record<string, unknown>)
        : undefined,
  };
}

export function sanitizeWorkerLogValue(value: unknown, depth = 0): unknown {
  return sanitizeObservabilityValue(value, depth);
}

export function sanitizeWorkerError(error: WorkerSanitizedError): WorkerSanitizedError {
  return {
    code: error.code,
    message: sanitizeFreeText(error.message),
    retryable: error.retryable,
  };
}

export function sanitizeUnknownError(error: unknown): WorkerSanitizedError {
  if (error instanceof Error) {
    return {
      code: 'WORKER_HANDLER_FAILED',
      message: sanitizeFreeText(error.message),
      retryable: true,
    };
  }

  return {
    code: 'WORKER_HANDLER_FAILED',
    message: 'Worker handler failed.',
    retryable: true,
  };
}

export const consoleWorkerLoggerSink: WorkerLoggerSink = {
  write(entry) {
    const line = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(line);
      return;
    }
    if (entry.level === 'warn') {
      console.warn(line);
      return;
    }
    console.log(line);
  },
};

function getWorkerJobLogContext(job: WorkerJob) {
  return {
    jobId: job.id,
    outboxEventId: job.outboxEventId,
    tenantId: job.tenantId,
    branchId: job.branchId,
    correlationId: job.correlationId,
    attemptCount: job.attemptCount,
    jobType: job.type,
    status: job.status,
  };
}

function sanitizeFreeText(value: string) {
  return sanitizeObservabilityFreeText(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
