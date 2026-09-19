import type {
  CreateOutboxEventCommand,
  CreateWorkerJobCommand,
  OutboxEvent,
  OutboxEventStatus,
  OutboxEventType,
  OutboxSourceType,
  RequestContext,
  WorkerJob,
  WorkerJobAttempt,
  WorkerJobStatus,
  WorkerErrorCode,
  WorkerSanitizedError,
} from '@barberos/contracts';

export type OutboxEventFilters = {
  branchId?: string;
  status?: OutboxEventStatus;
  sourceType?: OutboxEvent['sourceType'];
  sourceId?: string;
  limit?: number;
  cursor?: string;
};

export type WorkerJobFilters = {
  branchId?: string;
  status?: WorkerJobStatus;
  type?: WorkerJob['type'];
  sourceType?: WorkerJob['sourceType'];
  sourceId?: string;
  limit?: number;
  cursor?: string;
};

export type WorkerJobClaimInput = {
  workerId: string;
  limit?: number;
  leaseTtlMs?: number;
  now?: Date;
};

export interface OutboxRepository {
  createEvent(context: RequestContext, command: CreateOutboxEventCommand): Promise<OutboxEvent>;
  findEventById(context: RequestContext, eventId: string): Promise<OutboxEvent | null>;
  findEventByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<OutboxEvent | null>;
  listEvents(context: RequestContext, filters?: OutboxEventFilters): Promise<OutboxEvent[]>;
}

export interface WorkerJobRepository {
  createJob(context: RequestContext, command: CreateWorkerJobCommand): Promise<WorkerJob>;
  findJobById(context: RequestContext, jobId: string): Promise<WorkerJob | null>;
  findJobByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<WorkerJob | null>;
  listJobs(context: RequestContext, filters?: WorkerJobFilters): Promise<WorkerJob[]>;
  claimAvailableJobs(input: WorkerJobClaimInput): Promise<WorkerJob[]>;
  listJobAttempts(context: RequestContext, jobId: string): Promise<WorkerJobAttempt[]>;
}
export type OutboxEventIdentityInput = {
  eventType: OutboxEventType;
  sourceType: OutboxSourceType;
  sourceId: string;
  effect?: string;
};

export type OutboxEventDuplicateInput = Pick<
  OutboxEvent,
  'tenantId' | 'branchId' | 'eventType' | 'sourceType' | 'sourceId' | 'idempotencyKey'
>;

export type OutboxStatusTransitionInput = {
  from: OutboxEventStatus;
  to: OutboxEventStatus;
};

export type WorkerErrorSanitizationInput = {
  code?: WorkerErrorCode;
  message?: unknown;
  retryable?: boolean;
};

const outboxTransitionTargets: Record<OutboxEventStatus, readonly OutboxEventStatus[]> = {
  PENDING: ['DISPATCHING', 'DISPATCHED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED'],
  DISPATCHING: ['DISPATCHED', 'FAILED', 'DEAD_LETTERED', 'PENDING'],
  DISPATCHED: [],
  FAILED: ['PENDING', 'DEAD_LETTERED', 'CANCELLED'],
  DEAD_LETTERED: ['PENDING', 'CANCELLED'],
  CANCELLED: [],
};

export function createOutboxEventName(input: Pick<OutboxEventIdentityInput, 'eventType'>) {
  return input.eventType.toLowerCase().replaceAll('_', '.');
}

export function createOutboxIdempotencyKey(input: OutboxEventIdentityInput) {
  const parts = [input.sourceType.toLowerCase(), input.sourceId, createOutboxEventName(input)];
  if (input.effect) parts.push(normalizeKeySegment(input.effect));
  return parts.join(':');
}

export function isDuplicateOutboxEvent(
  existing: OutboxEventDuplicateInput | null | undefined,
  candidate: OutboxEventDuplicateInput,
) {
  if (!existing) return false;
  return (
    existing.tenantId === candidate.tenantId &&
    existing.branchId === candidate.branchId &&
    existing.eventType === candidate.eventType &&
    existing.sourceType === candidate.sourceType &&
    existing.sourceId === candidate.sourceId &&
    existing.idempotencyKey === candidate.idempotencyKey
  );
}

export function assertOutboxEventIsDuplicate(
  existing: OutboxEventDuplicateInput | null | undefined,
  candidate: OutboxEventDuplicateInput,
) {
  if (!isDuplicateOutboxEvent(existing, candidate)) {
    throw new Error('Outbox event conflicts with an existing source or idempotency key.');
  }
}

export function canTransitionOutboxEventStatus(from: OutboxEventStatus, to: OutboxEventStatus) {
  return from === to || outboxTransitionTargets[from].includes(to);
}

export function assertOutboxEventStatusTransition(input: OutboxStatusTransitionInput) {
  if (!canTransitionOutboxEventStatus(input.from, input.to)) {
    throw new Error(`Invalid outbox event status transition: ${input.from} -> ${input.to}.`);
  }
}

export function sanitizeWorkerError(input: WorkerErrorSanitizationInput): WorkerSanitizedError {
  const code = input.code ?? 'WORKER_HANDLER_FAILED';
  const rawMessage = typeof input.message === 'string' ? input.message : code;
  const message = rawMessage.trim().replace(/\s+/g, ' ').slice(0, 500) || code;

  return {
    code,
    message,
    retryable: Boolean(input.retryable),
  };
}

function normalizeKeySegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
