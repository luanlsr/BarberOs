import type {
  Entitlement,
  NotificationDeliveryAttempt,
  NotificationIntent,
  Permission,
  RequestContext,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import type { NotificationRepository } from '../domain';

export type NotificationStatusFilters = {
  branchId?: string;
  status?: NotificationIntent['status'];
  channel?: NotificationIntent['channel'];
  limit?: number;
};

export type NotificationStatusItem = {
  id: string;
  branchId?: string;
  recipientType: NotificationIntent['recipientType'];
  recipientId: string;
  channel: NotificationIntent['channel'];
  templateKey: string;
  sourceType: NotificationIntent['sourceType'];
  sourceId: string;
  status: NotificationIntent['status'];
  correlationId: string;
  lastAttempt?: {
    id: string;
    status: NotificationDeliveryAttempt['status'];
    attemptNumber: number;
    provider?: string;
    error?: NotificationDeliveryAttempt['error'];
    sentAt?: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type NotificationStatusSummary = {
  tenantId: string;
  branchId?: string;
  generatedAt: string;
  notifications: readonly NotificationStatusItem[];
};

const permission = 'notifications.status.read' satisfies Permission;
const entitlement = 'notifications' satisfies Entitlement;

export class NotificationStatusReadService {
  constructor(private readonly repository: NotificationRepository) {}

  async list(context: RequestContext, filters: NotificationStatusFilters = {}) {
    authorize(context, { permission, entitlement, branchId: filters.branchId });
    const limit = clampLimit(filters.limit);
    const [intents, attempts] = await Promise.all([
      this.repository.listIntents(context, {
        branchId: filters.branchId,
        status: filters.status,
        channel: filters.channel,
        limit,
      }),
      this.repository.listDeliveryAttempts(context, {
        branchId: filters.branchId,
        channel: filters.channel,
        limit,
      }),
    ]);
    const latestAttempts = latestAttemptsByIntent(attempts);

    return {
      tenantId: context.tenantId,
      branchId: filters.branchId,
      generatedAt: new Date().toISOString(),
      notifications: intents.map((intent) => toStatusItem(intent, latestAttempts.get(intent.id))),
    } satisfies NotificationStatusSummary;
  }
}

function toStatusItem(
  intent: NotificationIntent,
  attempt?: NotificationDeliveryAttempt,
): NotificationStatusItem {
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
    lastAttempt: attempt
      ? {
          id: attempt.id,
          status: attempt.status,
          attemptNumber: attempt.attemptNumber,
          provider: attempt.provider,
          error: attempt.error,
          sentAt: attempt.sentAt,
          createdAt: attempt.createdAt,
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
    if (!current || attempt.createdAt > current.createdAt)
      latest.set(attempt.notificationIntentId, attempt);
  }
  return latest;
}

function clampLimit(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}
