import type {
  Entitlement,
  NotificationIntent,
  OutboxEvent,
  Permission,
  RequestContext,
  SessionContext,
  WorkerJob,
} from '@barberos/contracts';

import { createSupabaseServerClient, isDevelopmentAuthEnabled } from './auth/server';
import { SupabaseNotificationRepository } from '../src/modules/notifications/infrastructure';
import {
  WorkerFailureReadService,
  type WorkerFailureSummary,
} from '../src/modules/outbox/application';
import { SupabaseOutboxRepository } from '../src/modules/outbox/infrastructure';
import { DevWorkerFailureRepository } from '../src/modules/platform-data/application/dev-worker-failure-repository';

export type WorkerOperationsViewState =
  'loading' | 'ready' | 'empty' | 'permission-denied' | 'error' | 'offline';
export type WorkerOperationsTone = 'neutral' | 'success' | 'warning' | 'danger';

export type WorkerOperationsMetricModel = {
  label: string;
  value: number;
  tone: WorkerOperationsTone;
};

export type WorkerOperationsIssueModel = {
  id: string;
  title: string;
  description: string;
  status: string;
  statusLabel: string;
  tone: WorkerOperationsTone;
  correlationId: string;
  attemptCount: number;
  updatedAtLabel: string;
};

export type WorkerOperationsViewModel = {
  state: WorkerOperationsViewState;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  canRead: boolean;
  metrics: readonly WorkerOperationsMetricModel[];
  outboxIssues: readonly WorkerOperationsIssueModel[];
  jobIssues: readonly WorkerOperationsIssueModel[];
  notificationIssues: readonly WorkerOperationsIssueModel[];
  error?: { code: string; message: string; requestId: string };
};

type WorkerOperationsOptions = {
  branchId?: string;
  state?: string;
};

type DevelopmentWorkerOperationsOptions = {
  branchId?: string;
  state?: 'loading' | 'populated' | 'empty' | 'error' | 'offline';
};

const requiredPermission = 'worker.failures.read' satisfies Permission;
const requiredEntitlement = 'worker.operations' satisfies Entitlement;

const developmentOutboxEvents: readonly OutboxEvent[] = [
  {
    id: 'dev-outbox-order-paid',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    eventType: 'ORDER_PAID',
    sourceType: 'ORDER',
    sourceId: 'dev-order-1002',
    payload: { orderId: 'dev-order-1002' },
    idempotencyKey: 'dev-order-1002:order-paid',
    status: 'PENDING',
    correlationId: 'worker-correlation-order-paid',
    schemaVersion: 1,
    attemptCount: 0,
    availableAt: '2026-09-22T10:00:00.000Z',
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  },
  {
    id: 'dev-outbox-notification-dead',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    eventType: 'NOTIFICATION_DELIVERY_REQUESTED',
    sourceType: 'NOTIFICATION_INTENT',
    sourceId: 'dev-notification-failed',
    payload: { notificationIntentId: 'dev-notification-failed' },
    idempotencyKey: 'dev-notification-failed:delivery',
    status: 'DEAD_LETTERED',
    correlationId: 'worker-correlation-notification-failed',
    schemaVersion: 1,
    attemptCount: 5,
    availableAt: '2026-09-22T09:30:00.000Z',
    lastError: {
      code: 'WORKER_RETRY_EXHAUSTED',
      message: 'Limite de tentativas atingido para entrega local.',
      retryable: false,
    },
    createdAt: '2026-09-22T09:30:00.000Z',
    updatedAt: '2026-09-22T10:20:00.000Z',
  },
  {
    id: 'dev-outbox-payment-failed',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    eventType: 'PAYMENT_COMPLETED',
    sourceType: 'PAYMENT',
    sourceId: 'dev-payment-1001',
    payload: { paymentId: 'dev-payment-1001' },
    idempotencyKey: 'dev-payment-1001:payment-completed',
    status: 'FAILED',
    correlationId: 'worker-correlation-payment-failed',
    schemaVersion: 1,
    attemptCount: 2,
    availableAt: '2026-09-22T11:00:00.000Z',
    lastError: {
      code: 'WORKER_PROVIDER_UNAVAILABLE',
      message: 'Provider local indisponível para dispatch.',
      retryable: true,
    },
    createdAt: '2026-09-22T10:58:00.000Z',
    updatedAt: '2026-09-22T11:04:00.000Z',
  },
];

const developmentWorkerJobs: readonly WorkerJob[] = [
  {
    id: 'dev-job-reminder-pending',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    type: 'APPOINTMENT_REMINDER',
    status: 'PENDING',
    schemaVersion: 1,
    sourceType: 'APPOINTMENT',
    sourceId: 'dev-appointment-401',
    payload: { appointmentId: 'dev-appointment-401' },
    idempotencyKey: 'dev-appointment-401:reminder',
    correlationId: 'worker-correlation-reminder',
    priority: 80,
    attemptCount: 0,
    maxAttempts: 5,
    runAt: '2026-09-22T13:00:00.000Z',
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  },
  {
    id: 'dev-job-notification-retry',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    type: 'NOTIFICATION_DELIVERY',
    status: 'RETRY_SCHEDULED',
    schemaVersion: 1,
    sourceType: 'NOTIFICATION_INTENT',
    sourceId: 'dev-notification-failed',
    outboxEventId: 'dev-outbox-notification-dead',
    notificationIntentId: 'dev-notification-failed',
    payload: { notificationIntentId: 'dev-notification-failed' },
    idempotencyKey: 'dev-notification-failed:delivery-job',
    correlationId: 'worker-correlation-notification-failed',
    priority: 90,
    attemptCount: 2,
    maxAttempts: 5,
    runAt: '2026-09-22T13:30:00.000Z',
    lastError: {
      code: 'WORKER_PROVIDER_UNAVAILABLE',
      message: 'Provider local indisponível.',
      retryable: true,
    },
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:35:00.000Z',
  },
  {
    id: 'dev-job-finance-dead',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    type: 'FINANCE_RECALCULATION',
    status: 'DEAD_LETTERED',
    schemaVersion: 1,
    sourceType: 'PAYMENT',
    sourceId: 'dev-payment-1001',
    payload: { paymentId: 'dev-payment-1001' },
    idempotencyKey: 'dev-payment-1001:finance-recalc',
    correlationId: 'worker-correlation-finance-dead',
    priority: 70,
    attemptCount: 5,
    maxAttempts: 5,
    runAt: '2026-09-22T10:30:00.000Z',
    lastError: {
      code: 'WORKER_RETRY_EXHAUSTED',
      message: 'Recalculo financeiro excedeu tentativas.',
      retryable: false,
    },
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T11:05:00.000Z',
  },
];

const developmentNotificationIntents: readonly NotificationIntent[] = [
  {
    id: 'dev-notification-pending',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    recipientType: 'CUSTOMER',
    recipientId: 'dev-customer-301',
    channel: 'LOCAL',
    templateKey: 'appointment.reminder.v1',
    sourceType: 'APPOINTMENT',
    sourceId: 'dev-appointment-401',
    payload: { appointmentId: 'dev-appointment-401' },
    status: 'PENDING',
    idempotencyKey: 'dev-appointment-401:notification',
    correlationId: 'worker-correlation-reminder',
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  },
  {
    id: 'dev-notification-failed',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    recipientType: 'CUSTOMER',
    recipientId: 'dev-customer-303',
    channel: 'LOCAL',
    templateKey: 'post-service.follow-up.v1',
    sourceType: 'ORDER',
    sourceId: 'dev-order-1002',
    payload: { orderId: 'dev-order-1002' },
    status: 'FAILED',
    idempotencyKey: 'dev-order-1002:follow-up',
    correlationId: 'worker-correlation-notification-failed',
    createdAt: '2026-09-22T09:30:00.000Z',
    updatedAt: '2026-09-22T10:20:00.000Z',
  },
];

export async function getWorkerOperationsViewModel(
  session: SessionContext,
  options: WorkerOperationsOptions = {},
): Promise<WorkerOperationsViewModel> {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const forcedState = developmentStateFrom(options.state);
  if (forcedState) {
    return getDevelopmentWorkerOperationsViewModel(session, { branchId, state: forcedState });
  }

  const base = baseModel(session, branchId);
  if (!base.canRead) {
    return buildModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar falhas do worker.',
    );
  }

  try {
    const summary = await loadWorkerFailureSummary(session, branchId);
    return buildWorkerOperationsViewModelFromSummary(session, summary);
  } catch (error) {
    return buildModel(base, 'error', 'Não foi possível carregar o monitor do worker.', [], [], [], {
      code: errorCode(error),
      message: 'Monitor de worker indisponível neste ambiente.',
      requestId: 'worker-operations-load-error',
    });
  }
}

export function buildWorkerOperationsViewModelFromSummary(
  session: SessionContext,
  summary: WorkerFailureSummary,
): WorkerOperationsViewModel {
  const branchId =
    summary.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const base = baseModel(session, branchId);
  if (!base.canRead) {
    return buildModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar falhas do worker.',
    );
  }

  const outboxIssues = summary.outbox.map(outboxIssueModel);
  const jobIssues = summary.jobs.map(jobIssueModel);
  const notificationIssues = summary.notifications.map(notificationIssueModel);
  const hasData = outboxIssues.length || jobIssues.length || notificationIssues.length;

  return buildModel(
    base,
    hasData ? 'ready' : 'empty',
    hasData
      ? 'Monitor operacional de outbox, jobs e notificações críticas.'
      : 'Nenhuma falha assíncrona encontrada.',
    outboxIssues,
    jobIssues,
    notificationIssues,
  );
}

export function getDevelopmentWorkerOperationsViewModel(
  session: SessionContext,
  options: DevelopmentWorkerOperationsOptions = {},
): WorkerOperationsViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return buildModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar falhas do worker.',
    );
  }

  if (options.state === 'loading') {
    return buildModel(base, 'loading', 'Carregando filas, outbox e notificações.');
  }

  if (options.state === 'offline') {
    return buildModel(base, 'offline', 'Você está offline. O monitor fica somente leitura.');
  }

  if (options.state === 'error') {
    return buildModel(base, 'error', 'Não foi possível carregar o monitor do worker.', [], [], [], {
      code: 'WORKER_VALIDATION_ERROR',
      message: 'Monitor de worker indisponível neste ambiente.',
      requestId: 'local-worker-operations-error',
    });
  }

  if (options.state === 'empty') {
    return buildModel(base, 'empty', 'Nenhuma falha assíncrona encontrada.', [], [], []);
  }

  const outboxIssues = developmentOutboxEvents.filter((event) => event.branchId === branchId);
  const jobIssues = developmentWorkerJobs.filter((job) => job.branchId === branchId);
  const notificationIssues = developmentNotificationIntents.filter(
    (intent) => intent.branchId === branchId,
  );
  const hasData = outboxIssues.length || jobIssues.length || notificationIssues.length;

  return buildModel(
    base,
    hasData ? 'ready' : 'empty',
    hasData
      ? 'Monitor operacional de outbox, jobs e notificações críticas.'
      : 'Nenhuma falha assíncrona encontrada.',
    outboxIssues.map(outboxIssueModel),
    jobIssues.map(jobIssueModel),
    notificationIssues.map(notificationIssueModel),
  );
}

function baseModel(session: SessionContext, branchId: string) {
  const hasBranch = session.branchScope.includes(branchId);
  return {
    title: 'Operações do worker',
    branchId,
    branchName: branchNameFor(session, branchId),
    canRead:
      session.permissions.includes(requiredPermission) &&
      (session.entitlements ?? []).includes(requiredEntitlement) &&
      hasBranch,
  };
}

function buildModel(
  base: ReturnType<typeof baseModel>,
  state: WorkerOperationsViewState,
  description: string,
  outboxIssues: readonly WorkerOperationsIssueModel[] = [],
  jobIssues: readonly WorkerOperationsIssueModel[] = [],
  notificationIssues: readonly WorkerOperationsIssueModel[] = [],
  error?: WorkerOperationsViewModel['error'],
): WorkerOperationsViewModel {
  return {
    ...base,
    state,
    description,
    canRead: base.canRead,
    metrics: metricsFor(outboxIssues, jobIssues, notificationIssues),
    outboxIssues,
    jobIssues,
    notificationIssues,
    error,
  };
}

function metricsFor(
  outboxIssues: readonly WorkerOperationsIssueModel[],
  jobIssues: readonly WorkerOperationsIssueModel[],
  notificationIssues: readonly WorkerOperationsIssueModel[],
): readonly WorkerOperationsMetricModel[] {
  return [
    {
      label: 'Outbox pendente',
      value: outboxIssues.filter((issue) => issue.status === 'PENDING').length,
      tone: 'neutral',
    },
    {
      label: 'Jobs em retry',
      value: jobIssues.filter((issue) => issue.status === 'RETRY_SCHEDULED').length,
      tone: 'warning',
    },
    {
      label: 'Dead letters',
      value: [...outboxIssues, ...jobIssues].filter((issue) => issue.status === 'DEAD_LETTERED')
        .length,
      tone: 'danger',
    },
    {
      label: 'Notificações com falha',
      value: notificationIssues.filter((issue) => issue.status === 'FAILED').length,
      tone: 'danger',
    },
  ];
}

function outboxIssueModel(
  event: Pick<
    OutboxEvent,
    | 'id'
    | 'eventType'
    | 'sourceType'
    | 'sourceId'
    | 'status'
    | 'correlationId'
    | 'attemptCount'
    | 'updatedAt'
  >,
): WorkerOperationsIssueModel {
  return {
    id: event.id,
    title: eventLabel(event.eventType),
    description: event.sourceType + ' · ' + event.sourceId,
    status: event.status,
    statusLabel: outboxStatusLabel(event.status),
    tone: toneForStatus(event.status),
    correlationId: event.correlationId,
    attemptCount: event.attemptCount,
    updatedAtLabel: formatDateTime(event.updatedAt),
  };
}

function jobIssueModel(
  job: Pick<
    WorkerJob,
    | 'id'
    | 'type'
    | 'sourceType'
    | 'sourceId'
    | 'status'
    | 'correlationId'
    | 'attemptCount'
    | 'lastError'
    | 'updatedAt'
  >,
): WorkerOperationsIssueModel {
  return {
    id: job.id,
    title: jobTypeLabel(job.type),
    description:
      job.lastError?.message ?? (job.sourceType ?? 'SYSTEM') + ' · ' + (job.sourceId ?? job.id),
    status: job.status,
    statusLabel: jobStatusLabel(job.status),
    tone: toneForStatus(job.status),
    correlationId: job.correlationId,
    attemptCount: job.attemptCount,
    updatedAtLabel: formatDateTime(job.updatedAt),
  };
}

function notificationIssueModel(
  intent: Pick<
    NotificationIntent,
    'id' | 'templateKey' | 'channel' | 'recipientType' | 'status' | 'correlationId' | 'updatedAt'
  >,
): WorkerOperationsIssueModel {
  return {
    id: intent.id,
    title: intent.templateKey,
    description: intent.channel + ' · ' + intent.recipientType,
    status: intent.status,
    statusLabel: notificationStatusLabel(intent.status),
    tone: toneForStatus(intent.status),
    correlationId: intent.correlationId,
    attemptCount: intent.status === 'FAILED' ? 1 : 0,
    updatedAtLabel: formatDateTime(intent.updatedAt),
  };
}

function toneForStatus(status: string): WorkerOperationsTone {
  if (status === 'SUCCEEDED' || status === 'SENT' || status === 'DISPATCHED') return 'success';
  if (status === 'FAILED' || status === 'DEAD_LETTERED') return 'danger';
  if (status === 'RETRY_SCHEDULED' || status === 'DISPATCHING' || status === 'RUNNING') {
    return 'warning';
  }
  return 'neutral';
}

function outboxStatusLabel(status: OutboxEvent['status']) {
  const labels: Record<OutboxEvent['status'], string> = {
    PENDING: 'Pendente',
    DISPATCHING: 'Despachando',
    DISPATCHED: 'Despachado',
    FAILED: 'Falhou',
    DEAD_LETTERED: 'Dead letter',
    CANCELLED: 'Cancelado',
  };
  return labels[status];
}

function jobStatusLabel(status: WorkerJob['status']) {
  const labels: Record<WorkerJob['status'], string> = {
    PENDING: 'Pendente',
    CLAIMED: 'Reservado',
    RUNNING: 'Executando',
    SUCCEEDED: 'Concluído',
    RETRY_SCHEDULED: 'Retry agendado',
    FAILED: 'Falhou',
    DEAD_LETTERED: 'Dead letter',
    CANCELLED: 'Cancelado',
  };
  return labels[status];
}

function notificationStatusLabel(status: NotificationIntent['status']) {
  const labels: Record<NotificationIntent['status'], string> = {
    PENDING: 'Pendente',
    READY: 'Pronta',
    DISPATCHING: 'Despachando',
    SENT: 'Enviada',
    FAILED: 'Falhou',
    CANCELLED: 'Cancelada',
  };
  return labels[status];
}

function eventLabel(type: OutboxEvent['eventType']) {
  return type.toLowerCase().replaceAll('_', ' ');
}

function jobTypeLabel(type: WorkerJob['type']) {
  return type.toLowerCase().replaceAll('_', ' ');
}

function branchNameFor(session: SessionContext, branchId: string) {
  return (
    session.availableWorkspaces?.find((workspace) => workspace.branchId === branchId)?.branchName ??
    (branchId === session.activeBranchId ? session.branchName : 'Unidade autorizada')
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function loadWorkerFailureSummary(session: SessionContext, branchId: string) {
  const service = await getWorkerFailureReadService();
  return service.summarize(toRequestContext(session), { branchId });
}

async function getWorkerFailureReadService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    if (isDevelopmentAuthEnabled()) {
      const repository = new DevWorkerFailureRepository();
      return new WorkerFailureReadService({
        outbox: repository,
        jobs: repository,
        notifications: repository,
      });
    }
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }

  const outboxRepository = new SupabaseOutboxRepository(client);
  return new WorkerFailureReadService({
    outbox: outboxRepository,
    jobs: outboxRepository,
    notifications: new SupabaseNotificationRepository(client),
  });
}

function toRequestContext(session: SessionContext): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    userId: session.userId,
    tenantId: session.tenantId,
    membershipId: session.membershipId,
    role: session.role,
    permissions: session.permissions,
    entitlements: session.entitlements ?? [],
    branchScope: session.branchScope,
  };
}

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : 'WORKER_LOAD_ERROR';
}
function developmentStateFrom(
  state: string | undefined,
): DevelopmentWorkerOperationsOptions['state'] {
  if (state === 'loading' || state === 'empty' || state === 'error' || state === 'offline') {
    return state;
  }
  return undefined;
}
