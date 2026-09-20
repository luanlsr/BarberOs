import type { WorkerJob, WorkerSanitizedError } from '@barberos/contracts';

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

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN =
  /(authorization|access[_-]?token|accesstoken|refresh[_-]?token|refreshtoken|token|secret|service[_-]?role|servicerole|password|senha|pix[_-]?key|pixkey|card|cartao|cvv|cvc|pan|provider[_-]?response|providerresponse|raw[_-]?response|rawresponse|message[_-]?body|messagebody|body|content)/i;

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
  if (depth > 8) return '[MAX_DEPTH]';
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitizeWorkerLogValue(item, depth + 1));
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeWorkerLogValue(entryValue, depth + 1),
    ]),
  );
}

export function sanitizeWorkerError(error: WorkerSanitizedError): WorkerSanitizedError {
  return {
    code: error.code,
    message: String(sanitizeFreeText(error.message)).slice(0, 500),
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
  return value
    .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, `bearer ${REDACTED}`)
    .replace(/eyJ[a-z0-9._-]+/gi, REDACTED)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, REDACTED);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
