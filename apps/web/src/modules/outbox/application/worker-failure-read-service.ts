import type {
  Entitlement,
  NotificationDeliveryAttempt,
  NotificationIntent,
  NotificationIntentStatus,
  OutboxEvent,
  OutboxEventStatus,
  Permission,
  RequestContext,
  WorkerJob,
  WorkerJobStatus,
  WorkerSanitizedError,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import type { NotificationRepository } from '../../notifications/domain';
import type { OutboxRepository, WorkerJobRepository } from '../domain';

export type WorkerFailureFilters = {
  branchId?: string;
  limit?: number;
  outboxStatus?: OutboxEventStatus;
  jobStatus?: WorkerJobStatus;
  notificationStatus?: NotificationIntentStatus;
};

export type WorkerFailureMetric = {
  key: 'outboxPending' | 'jobsRetrying' | 'deadLetters' | 'notificationFailures';
  label: string;
  value: number;
};

export type WorkerFailureOutboxSummary = {
  id: string;
  branchId?: string;
  eventType: OutboxEvent['eventType'];
  sourceType: OutboxEvent['sourceType'];
  sourceId: string;
  status: OutboxEventStatus;
  correlationId: string;
  attemptCount: number;
  availableAt: string;
  lastError?: WorkerSanitizedError;
  createdAt: string;
  updatedAt: string;
};

export type WorkerFailureJobSummary = {
  id: string;
  branchId?: string;
  type: WorkerJob['type'];
  status: WorkerJobStatus;
  sourceType?: WorkerJob['sourceType'];
  sourceId?: string;
  outboxEventId?: string;
  notificationIntentId?: string;
  correlationId: string;
  priority: number;
  attemptCount: number;
  maxAttempts: number;
  runAt: string;
  lastError?: WorkerSanitizedError;
  createdAt: string;
  updatedAt: string;
};

export type WorkerFailureNotificationSummary = {
  id: string;
  branchId?: string;
  recipientType: NotificationIntent['recipientType'];
  recipientId: string;
  channel: NotificationIntent['channel'];
  templateKey: string;
  sourceType: NotificationIntent['sourceType'];
  sourceId: string;
  status: NotificationIntentStatus;
  correlationId: string;
  lastAttempt?: {
    id: string;
    status: NotificationDeliveryAttempt['status'];
    attemptNumber: number;
    provider?: string;
    error?: WorkerSanitizedError;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type WorkerFailureSummary = {
  tenantId: string;
  branchId?: string;
  generatedAt: string;
  metrics: readonly WorkerFailureMetric[];
  outbox: readonly WorkerFailureOutboxSummary[];
  jobs: readonly WorkerFailureJobSummary[];
  notifications: readonly WorkerFailureNotificationSummary[];
};

export type WorkerFailureReadRepositories = {
  outbox: OutboxRepository;
  jobs: WorkerJobRepository;
  notifications: NotificationRepository;
};

const workerFailurePermission = 'worker.failures.read' satisfies Permission;
const workerOperationsEntitlement = 'worker.operations' satisfies Entitlement;
const defaultLimit = 25;
const maxLimit = 100;

export class WorkerFailureReadService {
  constructor(private readonly repositories: WorkerFailureReadRepositories) {}

  async summarize(context: RequestContext, filters: WorkerFailureFilters = {}) {
    const limit = clampLimit(filters.limit);
    authorize(context, {
      permission: workerFailurePermission,
      entitlement: workerOperationsEntitlement,
      branchId: filters.branchId,
    });

    const [outbox, jobs, notifications, deliveryAttempts] = await Promise.all([
      this.repositories.outbox.listEvents(context, {
        branchId: filters.branchId,
        status: filters.outboxStatus,
        limit,
      }),
      this.repositories.jobs.listJobs(context, {
        branchId: filters.branchId,
        status: filters.jobStatus,
        limit,
      }),
      this.repositories.notifications.listIntents(context, {
        branchId: filters.branchId,
        status: filters.notificationStatus,
        limit,
      }),
      this.repositories.notifications.listDeliveryAttempts(context, {
        branchId: filters.branchId,
        limit,
      }),
    ]);

    const relevantOutbox = filters.outboxStatus ? outbox : outbox.filter(isOperationalOutboxIssue);
    const relevantJobs = filters.jobStatus ? jobs : jobs.filter(isOperationalJobIssue);
    const relevantNotifications = filters.notificationStatus
      ? notifications
      : notifications.filter(isOperationalNotificationIssue);
    const latestAttempts = latestAttemptsByIntent(deliveryAttempts);

    return {
      tenantId: context.tenantId,
      branchId: filters.branchId,
      generatedAt: new Date().toISOString(),
      metrics: metricsFor(relevantOutbox, relevantJobs, relevantNotifications),
      outbox: relevantOutbox.map(toOutboxSummary),
      jobs: relevantJobs.map(toJobSummary),
      notifications: relevantNotifications.map((intent) =>
        toNotificationSummary(intent, latestAttempts.get(intent.id)),
      ),
    } satisfies WorkerFailureSummary;
  }
}

function clampLimit(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) return defaultLimit;
  return Math.min(Math.max(Math.trunc(limit), 1), maxLimit);
}

function isOperationalOutboxIssue(event: OutboxEvent) {
  return (
    event.status === 'PENDING' || event.status === 'FAILED' || event.status === 'DEAD_LETTERED'
  );
}

function isOperationalJobIssue(job: WorkerJob) {
  return (
    job.status === 'PENDING' ||
    job.status === 'RETRY_SCHEDULED' ||
    job.status === 'FAILED' ||
    job.status === 'DEAD_LETTERED'
  );
}

function isOperationalNotificationIssue(intent: NotificationIntent) {
  return intent.status === 'PENDING' || intent.status === 'READY' || intent.status === 'FAILED';
}

function metricsFor(
  outbox: readonly OutboxEvent[],
  jobs: readonly WorkerJob[],
  notifications: readonly NotificationIntent[],
): readonly WorkerFailureMetric[] {
  return [
    {
      key: 'outboxPending',
      label: 'Outbox pendente',
      value: outbox.filter((event) => event.status === 'PENDING').length,
    },
    {
      key: 'jobsRetrying',
      label: 'Jobs em retry',
      value: jobs.filter((job) => job.status === 'RETRY_SCHEDULED').length,
    },
    {
      key: 'deadLetters',
      label: 'Dead letters',
      value:
        outbox.filter((event) => event.status === 'DEAD_LETTERED').length +
        jobs.filter((job) => job.status === 'DEAD_LETTERED').length,
    },
    {
      key: 'notificationFailures',
      label: 'Notificações com falha',
      value: notifications.filter((intent) => intent.status === 'FAILED').length,
    },
  ];
}

function toOutboxSummary(event: OutboxEvent): WorkerFailureOutboxSummary {
  return {
    id: event.id,
    branchId: event.branchId,
    eventType: event.eventType,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    status: event.status,
    correlationId: event.correlationId,
    attemptCount: event.attemptCount,
    availableAt: event.availableAt,
    lastError: event.lastError,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function toJobSummary(job: WorkerJob): WorkerFailureJobSummary {
  return {
    id: job.id,
    branchId: job.branchId,
    type: job.type,
    status: job.status,
    sourceType: job.sourceType,
    sourceId: job.sourceId,
    outboxEventId: job.outboxEventId,
    notificationIntentId: job.notificationIntentId,
    correlationId: job.correlationId,
    priority: job.priority ?? 0,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    runAt: job.runAt,
    lastError: job.lastError,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function toNotificationSummary(
  intent: NotificationIntent,
  lastAttempt?: NotificationDeliveryAttempt,
): WorkerFailureNotificationSummary {
  return {
    id: intent.id,
    branchId: intent.branchId,
    recipientType: intent.recipientType,
    recipientId: intent.recipientId,
    channel: intent.channel,
    templateKey: intent.templateKey,
    sourceType: intent.sourceType,
    sourceId: intent.sourceId,
    status: intent.status,
    correlationId: intent.correlationId,
    lastAttempt: lastAttempt
      ? {
          id: lastAttempt.id,
          status: lastAttempt.status,
          attemptNumber: lastAttempt.attemptNumber,
          provider: lastAttempt.provider,
          error: lastAttempt.error,
          createdAt: lastAttempt.createdAt,
        }
      : undefined,
    createdAt: intent.createdAt,
    updatedAt: intent.updatedAt,
  };
}

function latestAttemptsByIntent(attempts: readonly NotificationDeliveryAttempt[]) {
  const latest = new Map<string, NotificationDeliveryAttempt>();
  for (const attempt of attempts) {
    const current = latest.get(attempt.notificationIntentId);
    if (!current || attempt.createdAt > current.createdAt) {
      latest.set(attempt.notificationIntentId, attempt);
    }
  }
  return latest;
}
