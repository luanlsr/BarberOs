import type {
  CreateNotificationIntentCommand,
  NotificationDeliveryAttempt,
  NotificationDeliveryAttemptStatus,
  NotificationIntent,
  NotificationIntentStatus,
  WorkerSanitizedError,
  RecordNotificationDeliveryAttemptCommand,
  RequestContext,
} from '@barberos/contracts';

export type NotificationIntentFilters = {
  branchId?: string;
  status?: NotificationIntentStatus;
  channel?: NotificationIntent['channel'];
  sourceType?: NotificationIntent['sourceType'];
  sourceId?: string;
  recipientType?: NotificationIntent['recipientType'];
  recipientId?: string;
  limit?: number;
  cursor?: string;
};

export type NotificationDeliveryAttemptFilters = {
  branchId?: string;
  notificationIntentId?: string;
  status?: NotificationDeliveryAttemptStatus;
  channel?: NotificationDeliveryAttempt['channel'];
  limit?: number;
  cursor?: string;
};

export interface NotificationRepository {
  createIntent(
    context: RequestContext,
    command: CreateNotificationIntentCommand,
  ): Promise<NotificationIntent>;
  findIntentById(context: RequestContext, intentId: string): Promise<NotificationIntent | null>;
  findIntentByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<NotificationIntent | null>;
  listIntents(
    context: RequestContext,
    filters?: NotificationIntentFilters,
  ): Promise<NotificationIntent[]>;
  recordDeliveryAttempt(
    context: RequestContext,
    command: RecordNotificationDeliveryAttemptCommand,
  ): Promise<NotificationDeliveryAttempt>;
  listDeliveryAttempts(
    context: RequestContext,
    filters?: NotificationDeliveryAttemptFilters,
  ): Promise<NotificationDeliveryAttempt[]>;
}
export type NotificationIntentIdentityInput = Pick<
  NotificationIntent,
  | 'tenantId'
  | 'branchId'
  | 'recipientType'
  | 'recipientId'
  | 'channel'
  | 'templateKey'
  | 'sourceType'
  | 'sourceId'
> & {
  effect?: string;
};

export type NotificationIntentDuplicateInput = Pick<
  NotificationIntent,
  | 'tenantId'
  | 'branchId'
  | 'recipientType'
  | 'recipientId'
  | 'channel'
  | 'templateKey'
  | 'sourceType'
  | 'sourceId'
  | 'idempotencyKey'
>;

export type NotificationDeliveryTransitionInput = {
  from: NotificationDeliveryAttemptStatus;
  to: NotificationDeliveryAttemptStatus;
};

export type NotificationScopeInput = {
  tenantId: string;
  branchId?: string;
};

const deliveryTransitionTargets: Record<
  NotificationDeliveryAttemptStatus,
  readonly NotificationDeliveryAttemptStatus[]
> = {
  PENDING: [
    'QUEUED',
    'SENT',
    'SKIPPED',
    'BLOCKED_BY_CONSENT',
    'RETRY_SCHEDULED',
    'FAILED',
    'DEAD_LETTERED',
  ],
  QUEUED: ['SENT', 'DELIVERED', 'READ', 'RETRY_SCHEDULED', 'FAILED', 'DEAD_LETTERED'],
  SENT: ['DELIVERED', 'READ'],
  DELIVERED: ['READ'],
  READ: [],
  SKIPPED: [],
  BLOCKED_BY_CONSENT: [],
  RETRY_SCHEDULED: ['QUEUED', 'SENT', 'FAILED', 'DEAD_LETTERED'],
  FAILED: ['RETRY_SCHEDULED', 'DEAD_LETTERED'],
  DEAD_LETTERED: [],
};
export function createNotificationIntentIdempotencyKey(input: NotificationIntentIdentityInput) {
  return [
    input.sourceType.toLowerCase(),
    input.sourceId,
    input.channel.toLowerCase(),
    normalizeNotificationKeySegment(input.templateKey),
    input.effect ? normalizeNotificationKeySegment(input.effect) : undefined,
  ]
    .filter(Boolean)
    .join(':');
}

export function isDuplicateNotificationIntent(
  existing: NotificationIntentDuplicateInput | null | undefined,
  candidate: NotificationIntentDuplicateInput,
) {
  if (!existing) return false;
  return (
    existing.tenantId === candidate.tenantId &&
    existing.branchId === candidate.branchId &&
    existing.recipientType === candidate.recipientType &&
    existing.recipientId === candidate.recipientId &&
    existing.channel === candidate.channel &&
    existing.templateKey === candidate.templateKey &&
    existing.sourceType === candidate.sourceType &&
    existing.sourceId === candidate.sourceId &&
    existing.idempotencyKey === candidate.idempotencyKey
  );
}

export function assertNotificationIntentIsDuplicate(
  existing: NotificationIntentDuplicateInput | null | undefined,
  candidate: NotificationIntentDuplicateInput,
) {
  if (!isDuplicateNotificationIntent(existing, candidate)) {
    throw new Error('Notification intent conflicts with an existing source or idempotency key.');
  }
}

export function assertNotificationScope(
  expected: NotificationScopeInput,
  value: NotificationScopeInput,
) {
  if (expected.tenantId !== value.tenantId) {
    throw new Error('Notification record belongs to a different tenant.');
  }
  if (expected.branchId && value.branchId && expected.branchId !== value.branchId) {
    throw new Error('Notification record belongs to a different branch.');
  }
}

export function canTransitionNotificationDeliveryStatus(
  from: NotificationDeliveryAttemptStatus,
  to: NotificationDeliveryAttemptStatus,
) {
  return from === to || deliveryTransitionTargets[from].includes(to);
}

export function assertNotificationDeliveryStatusTransition(
  input: NotificationDeliveryTransitionInput,
) {
  if (!canTransitionNotificationDeliveryStatus(input.from, input.to)) {
    throw new Error(`Invalid notification delivery transition: ${input.from} -> ${input.to}.`);
  }
}

export function shouldMarkNotificationIntentFailed(input: {
  attemptStatus: NotificationDeliveryAttemptStatus;
  error?: WorkerSanitizedError;
}) {
  return input.attemptStatus === 'FAILED' || input.attemptStatus === 'DEAD_LETTERED';
}

function normalizeNotificationKeySegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
