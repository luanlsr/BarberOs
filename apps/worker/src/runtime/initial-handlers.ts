import type {
  CampaignRecipientOutcome,
  CampaignRun,
  CreateNotificationIntentCommand,
  NotificationIntent,
  OutboxSourceType,
  RecordNotificationDeliveryAttemptCommand,
  WorkerJob,
  WorkerJobType,
} from '@barberos/contracts';
import { campaignDispatchPayloadSchema, whatsappDeliveryPayloadSchema } from '@barberos/contracts';

import {
  handleNotificationDelivery,
  LocalNoopNotificationProvider,
  type NotificationProviderAdapter,
} from './notification-delivery-handler';
import {
  handleWhatsAppDelivery,
  handleWhatsAppWebhookProcessing,
  type WhatsAppProviderAdapter,
  type WhatsAppWebhookProcessingPorts,
} from './whatsapp-messaging-handlers';
import type { WorkerLogger } from './worker-logger';
import type { WorkerMetrics } from './worker-metrics';

export type WorkerJobHandlerResult =
  | {
      status: 'succeeded';
      effect: string;
    }
  | {
      status: 'skipped';
      reason: string;
    };

export type AppointmentSnapshot = {
  id: string;
  tenantId: string;
  branchId?: string;
  status:
    'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  customerId?: string;
  startsAt?: string;
};

export type OrderSnapshot = {
  id: string;
  tenantId: string;
  branchId?: string;
  status: 'OPEN' | 'IN_SERVICE' | 'READY_FOR_PAYMENT' | 'PAID' | 'CLOSED' | 'CANCELLED';
  customerId?: string;
};

export type ProductStockSnapshot = {
  id: string;
  tenantId: string;
  branchId?: string;
  name?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  quantityOnHand: number;
  lowStockThreshold?: number;
};

export type FinanceRecalculationInput = {
  tenantId: string;
  branchId?: string;
  sourceType?: OutboxSourceType;
  sourceId?: string;
  correlationId: string;
};

export type TransactionalWhatsAppTarget = {
  connectionId: string;
  recipientPhoneHash: string;
  variables?: Record<string, string>;
};

export type TransactionalWhatsAppTargetInput = {
  tenantId: string;
  branchId?: string;
  customerId: string;
  templateKey: string;
  sourceType: OutboxSourceType;
  sourceId: string;
};

export type AppointmentReminderSettings = {
  enabled: boolean;
  leadMinutes: number;
  timezone?: string;
  templateKey?: string;
};

export type AppointmentReminderSettingsInput = {
  tenantId: string;
  branchId?: string;
  appointmentId: string;
  customerId: string;
  startsAt?: string;
};

export type PostServiceFollowUpSettings = {
  enabled: boolean;
  templateKey?: string;
};

export type PostServiceFollowUpSettingsInput = {
  tenantId: string;
  branchId?: string;
  sourceType: 'APPOINTMENT' | 'ORDER';
  sourceId: string;
  customerId: string;
};

export type CampaignDispatchConnection = {
  connectionId: string;
  templateKey: string;
  variables?: Record<string, string>;
};

export type InitialWorkerHandlerPorts = {
  appointments?: {
    findById(id: string): Promise<AppointmentSnapshot | null>;
  };
  orders?: {
    findById(id: string): Promise<OrderSnapshot | null>;
  };
  inventory?: {
    findProductById(id: string): Promise<ProductStockSnapshot | null>;
  };
  finance?: {
    recalculate(input: FinanceRecalculationInput): Promise<void>;
  };
  cleanup?: {
    deleteExpired(now: Date): Promise<number>;
  };
  notifications?: {
    createIntent(command: CreateNotificationIntentCommand): Promise<unknown>;
    cancelPendingIntentsForSource?(input: {
      tenantId: string;
      branchId?: string;
      sourceType: OutboxSourceType;
      sourceId: string;
      templateKey?: string;
      reason: string;
    }): Promise<number>;
    findIntentById?(id: string): Promise<NotificationIntent | null>;
    recordDeliveryAttempt?(command: RecordNotificationDeliveryAttemptCommand): Promise<unknown>;
  };
  notificationProvider?: NotificationProviderAdapter;
  whatsappProvider?: WhatsAppProviderAdapter;
  transactionalMessaging?: {
    resolveWhatsAppTarget(
      input: TransactionalWhatsAppTargetInput,
    ): Promise<TransactionalWhatsAppTarget | null>;
  };
  appointmentMessagingSettings?: {
    getReminderSettings(
      input: AppointmentReminderSettingsInput,
    ): Promise<AppointmentReminderSettings | null>;
  };
  postServiceMessagingSettings?: {
    getFollowUpSettings(
      input: PostServiceFollowUpSettingsInput,
    ): Promise<PostServiceFollowUpSettings | null>;
  };
  messaging?: WhatsAppWebhookProcessingPorts['messaging'];
  campaigns?: {
    findRunById(id: string): Promise<CampaignRun | null>;
    listRecipientOutcomes(campaignRunId: string): Promise<CampaignRecipientOutcome[]>;
    resolveWhatsAppConnection(input: {
      tenantId: string;
      branchId?: string;
      campaignId: string;
      campaignRunId: string;
    }): Promise<CampaignDispatchConnection | null>;
    updateRecipientOutcome(input: {
      campaignRunId: string;
      contactPhoneHash: string;
      status: CampaignRecipientOutcome['status'];
      notificationIntentId?: string;
      exclusionReason?: string;
    }): Promise<void>;
  };
  campaignDispatch?: {
    maxRecipientsPerDispatch?: number;
  };
  logger?: WorkerLogger;
  metrics?: WorkerMetrics;
};

export type InitialWorkerJobHandler = (job: WorkerJob) => Promise<WorkerJobHandlerResult>;

export function createInitialWorkerHandlers(
  ports: InitialWorkerHandlerPorts,
  options: { now?: () => Date } = {},
): Partial<Record<WorkerJobType, InitialWorkerJobHandler>> {
  const clock = options.now ?? (() => new Date());

  return {
    APPOINTMENT_CANCELLATION: (job) => handleAppointmentCancellation(job, ports),
    APPOINTMENT_CONFIRMATION: (job) => handleAppointmentConfirmation(job, ports),
    APPOINTMENT_REMINDER: (job) => handleAppointmentReminder(job, ports),
    POST_SERVICE_FOLLOW_UP: (job) => handlePostServiceFollowUp(job, ports),
    FINANCE_RECALCULATION: (job) => handleFinanceRecalculation(job, ports),
    STOCK_ALERT: (job) => handleStockAlert(job, ports),
    EXPIRED_RECORD_CLEANUP: (job) => handleExpiredRecordCleanup(job, ports, clock()),
    NOTIFICATION_DELIVERY: (job) => handleNotificationDeliveryJob(job, ports, clock()),
    WHATSAPP_DELIVERY: (job) => handleWhatsAppDeliveryJob(job, ports, clock()),
    MESSAGING_WEBHOOK_PROCESSING: (job) => handleMessagingWebhookProcessingJob(job, ports, clock()),
    CAMPAIGN_DISPATCH: (job) => handleCampaignDispatch(job, ports),
  };
}

export async function handleAppointmentCancellation(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
): Promise<WorkerJobHandlerResult> {
  const appointmentId = getSourceId(job, 'APPOINTMENT');
  if (!appointmentId) return skipped('appointment_source_missing');
  if (!ports.appointments) return skipped('appointments_port_not_configured');

  const appointment = await ports.appointments.findById(appointmentId);
  if (!appointment || !isSameTenant(job, appointment)) return skipped('appointment_not_found');
  if (appointment.status !== 'CANCELLED') return skipped('appointment_not_cancelled');

  await ports.notifications?.cancelPendingIntentsForSource?.({
    tenantId: job.tenantId,
    branchId: appointment.branchId ?? job.branchId,
    sourceType: 'APPOINTMENT',
    sourceId: appointment.id,
    templateKey: 'appointment.reminder.v1',
    reason: 'appointment_cancelled',
  });

  if (!appointment.customerId) return skipped('appointment_without_customer');

  return createCustomerTransactionalNotificationIntent(ports, {
    tenantId: job.tenantId,
    branchId: appointment.branchId ?? job.branchId,
    recipientType: 'CUSTOMER',
    recipientId: appointment.customerId,
    templateKey: 'appointment.cancellation.v1',
    sourceType: 'APPOINTMENT',
    sourceId: appointment.id,
    payload: {
      appointmentId: appointment.id,
      startsAt: appointment.startsAt,
      cancellationReason: 'appointment_cancelled',
    },
    idempotencyKey: createHandlerIdempotencyKey(job, 'appointment-cancellation'),
    correlationId: job.correlationId,
  });
}

export async function handleAppointmentConfirmation(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
): Promise<WorkerJobHandlerResult> {
  const appointmentId = getSourceId(job, 'APPOINTMENT');
  if (!appointmentId) return skipped('appointment_source_missing');
  if (!ports.appointments) return skipped('appointments_port_not_configured');

  const appointment = await ports.appointments.findById(appointmentId);
  if (!appointment || !isSameTenant(job, appointment)) return skipped('appointment_not_found');
  if (appointment.status !== 'CONFIRMED') return skipped('appointment_not_eligible');
  if (!appointment.customerId) return skipped('appointment_without_customer');

  return createCustomerTransactionalNotificationIntent(ports, {
    tenantId: job.tenantId,
    branchId: appointment.branchId ?? job.branchId,
    recipientType: 'CUSTOMER',
    recipientId: appointment.customerId,
    templateKey: 'appointment.confirmation.v1',
    sourceType: 'APPOINTMENT',
    sourceId: appointment.id,
    payload: {
      appointmentId: appointment.id,
      startsAt: appointment.startsAt,
    },
    idempotencyKey: createHandlerIdempotencyKey(job, 'appointment-confirmation'),
    correlationId: job.correlationId,
  });
}

export async function handleAppointmentReminder(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
): Promise<WorkerJobHandlerResult> {
  const appointmentId = getSourceId(job, 'APPOINTMENT');
  if (!appointmentId) return skipped('appointment_source_missing');
  if (!ports.appointments) return skipped('appointments_port_not_configured');

  const appointment = await ports.appointments.findById(appointmentId);
  if (!appointment || !isSameTenant(job, appointment)) return skipped('appointment_not_found');
  if (appointment.status !== 'CONFIRMED') return skipped('appointment_not_eligible');
  if (!appointment.customerId) return skipped('appointment_without_customer');

  const settings = await ports.appointmentMessagingSettings?.getReminderSettings({
    tenantId: job.tenantId,
    branchId: appointment.branchId ?? job.branchId,
    appointmentId: appointment.id,
    customerId: appointment.customerId,
    startsAt: appointment.startsAt,
  });
  if (settings && !settings.enabled) return skipped('appointment_reminder_disabled');

  const leadMinutes = settings?.leadMinutes ?? 1440;
  const timezone = settings?.timezone ?? 'America/Sao_Paulo';
  const templateKey = settings?.templateKey ?? 'appointment.reminder.v1';

  return createCustomerTransactionalNotificationIntent(ports, {
    tenantId: job.tenantId,
    branchId: appointment.branchId ?? job.branchId,
    recipientType: 'CUSTOMER',
    recipientId: appointment.customerId,
    templateKey,
    sourceType: 'APPOINTMENT',
    sourceId: appointment.id,
    payload: {
      appointmentId: appointment.id,
      startsAt: appointment.startsAt,
      timezone,
      reminderLeadMinutes: leadMinutes,
      reminderScheduledFor: calculateReminderScheduledFor(appointment.startsAt, leadMinutes),
    },
    idempotencyKey: createHandlerIdempotencyKey(job, 'appointment-reminder'),
    correlationId: job.correlationId,
  });
}

export async function handlePostServiceFollowUp(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
): Promise<WorkerJobHandlerResult> {
  const appointmentId = getSourceId(job, 'APPOINTMENT');
  if (appointmentId) return handleAppointmentPostServiceFollowUp(job, appointmentId, ports);

  const orderId = getSourceId(job, 'ORDER');
  if (!orderId) return skipped('post_service_follow_up_source_missing');
  if (!ports.orders) return skipped('orders_port_not_configured');

  const order = await ports.orders.findById(orderId);
  if (!order || !isSameTenant(job, order)) return skipped('order_not_found');
  if (order.status !== 'PAID' && order.status !== 'CLOSED') return skipped('order_not_eligible');
  if (!order.customerId) return skipped('order_without_customer');

  const settings = await ports.postServiceMessagingSettings?.getFollowUpSettings({
    tenantId: job.tenantId,
    branchId: order.branchId ?? job.branchId,
    sourceType: 'ORDER',
    sourceId: order.id,
    customerId: order.customerId,
  });
  if (settings && !settings.enabled) return skipped('post_service_follow_up_disabled');

  return createCustomerTransactionalNotificationIntent(ports, {
    tenantId: job.tenantId,
    branchId: order.branchId ?? job.branchId,
    recipientType: 'CUSTOMER',
    recipientId: order.customerId,
    templateKey: settings?.templateKey ?? 'post-service.follow-up.v1',
    sourceType: 'ORDER',
    sourceId: order.id,
    payload: {
      orderId: order.id,
    },
    idempotencyKey: createHandlerIdempotencyKey(job, 'post-service-follow-up'),
    correlationId: job.correlationId,
  });
}

async function handleAppointmentPostServiceFollowUp(
  job: WorkerJob,
  appointmentId: string,
  ports: InitialWorkerHandlerPorts,
): Promise<WorkerJobHandlerResult> {
  if (!ports.appointments) return skipped('appointments_port_not_configured');

  const appointment = await ports.appointments.findById(appointmentId);
  if (!appointment || !isSameTenant(job, appointment)) return skipped('appointment_not_found');
  if (appointment.status !== 'COMPLETED') return skipped('appointment_not_completed');
  if (!appointment.customerId) return skipped('appointment_without_customer');

  const settings = await ports.postServiceMessagingSettings?.getFollowUpSettings({
    tenantId: job.tenantId,
    branchId: appointment.branchId ?? job.branchId,
    sourceType: 'APPOINTMENT',
    sourceId: appointment.id,
    customerId: appointment.customerId,
  });
  if (settings && !settings.enabled) return skipped('post_service_follow_up_disabled');

  return createCustomerTransactionalNotificationIntent(ports, {
    tenantId: job.tenantId,
    branchId: appointment.branchId ?? job.branchId,
    recipientType: 'CUSTOMER',
    recipientId: appointment.customerId,
    templateKey: settings?.templateKey ?? 'post-service.follow-up.v1',
    sourceType: 'APPOINTMENT',
    sourceId: appointment.id,
    payload: {
      appointmentId: appointment.id,
      startsAt: appointment.startsAt,
    },
    idempotencyKey: createHandlerIdempotencyKey(job, 'post-service-follow-up'),
    correlationId: job.correlationId,
  });
}

export async function handleFinanceRecalculation(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
): Promise<WorkerJobHandlerResult> {
  if (!ports.finance) return skipped('finance_port_not_configured');

  await ports.finance.recalculate({
    tenantId: job.tenantId,
    branchId: job.branchId,
    sourceType: job.sourceType,
    sourceId: job.sourceId,
    correlationId: job.correlationId,
  });

  return succeeded('finance_recalculated');
}

export async function handleStockAlert(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
): Promise<WorkerJobHandlerResult> {
  const productId = getSourceId(job, 'PRODUCT');
  if (!productId) return skipped('product_source_missing');
  if (!ports.inventory) return skipped('inventory_port_not_configured');

  const product = await ports.inventory.findProductById(productId);
  if (!product || !isSameTenant(job, product)) return skipped('product_not_found');
  if (product.status === 'ARCHIVED') return skipped('product_not_active');

  const threshold = product.lowStockThreshold ?? 0;
  if (product.quantityOnHand > threshold) return skipped('stock_above_threshold');

  return createNotificationIntent(ports, {
    tenantId: job.tenantId,
    branchId: product.branchId ?? job.branchId,
    recipientType: 'TENANT_OPERATOR',
    recipientId: job.tenantId,
    channel: 'LOCAL',
    templateKey: 'inventory.stock-low.v1',
    sourceType: 'PRODUCT',
    sourceId: product.id,
    payload: {
      productId: product.id,
      productName: product.name,
      quantityOnHand: product.quantityOnHand,
      lowStockThreshold: threshold,
    },
    idempotencyKey: createHandlerIdempotencyKey(job, 'stock-alert'),
    correlationId: job.correlationId,
  });
}

export async function handleExpiredRecordCleanup(
  _job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
  now: Date = new Date(),
): Promise<WorkerJobHandlerResult> {
  if (!ports.cleanup) return skipped('cleanup_port_not_configured');

  const deletedCount = await ports.cleanup.deleteExpired(now);
  if (deletedCount === 0) return skipped('nothing_expired');

  return succeeded('expired_records_deleted');
}

export async function handleCampaignDispatch(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
): Promise<WorkerJobHandlerResult> {
  if (!ports.campaigns) return skipped('campaigns_port_not_configured');

  const payload = campaignDispatchPayloadSchema.safeParse({
    tenantId: job.tenantId,
    branchId: job.branchId,
    campaignId: job.sourceType === 'CAMPAIGN' ? job.sourceId : undefined,
    campaignRunId: job.sourceType === 'CAMPAIGN_RUN' ? job.sourceId : undefined,
    idempotencyKey: job.idempotencyKey,
    correlationId: job.correlationId,
    ...job.payload,
  });
  if (!payload.success) return skipped('campaign_dispatch_payload_invalid');
  if (payload.data.tenantId !== job.tenantId) return skipped('tenant_mismatch');
  if (payload.data.branchId && job.branchId && payload.data.branchId !== job.branchId) {
    return skipped('branch_mismatch');
  }

  const run = await ports.campaigns.findRunById(payload.data.campaignRunId);
  if (!run || run.tenantId !== job.tenantId) return skipped('campaign_run_not_found');
  if (run.branchId && job.branchId && run.branchId !== job.branchId)
    return skipped('branch_mismatch');
  if (run.status !== 'APPROVED' && run.status !== 'SCHEDULED' && run.status !== 'SENDING') {
    return skipped('campaign_run_not_dispatchable');
  }

  const connection = await ports.campaigns.resolveWhatsAppConnection({
    tenantId: run.tenantId,
    branchId: run.branchId ?? job.branchId,
    campaignId: run.campaignId,
    campaignRunId: run.id,
  });
  if (!connection) return skipped('campaign_whatsapp_connection_missing');

  const outcomes = await ports.campaigns.listRecipientOutcomes(run.id);
  const pending = outcomes.filter((outcome) => outcome.status === 'PENDING');
  if (pending.length === 0) return skipped('campaign_no_pending_recipients');
  if (!ports.notifications) return skipped('notifications_port_not_configured');

  const limit = ports.campaignDispatch?.maxRecipientsPerDispatch ?? 100;
  const batch = pending.slice(0, limit);
  for (const outcome of batch) {
    const intent = await ports.notifications.createIntent({
      tenantId: run.tenantId,
      branchId: outcome.branchId ?? run.branchId ?? job.branchId,
      recipientType: 'CUSTOMER',
      recipientId: outcome.customerId ?? outcome.contactPhoneHash,
      channel: 'WHATSAPP',
      templateKey: connection.templateKey,
      sourceType: 'CAMPAIGN_RUN',
      sourceId: run.id,
      payload: {
        campaignId: run.campaignId,
        campaignRunId: run.id,
        campaignRecipientOutcomeId: outcome.id,
        connectionId: connection.connectionId,
        recipientPhoneHash: outcome.contactPhoneHash,
        variables: connection.variables ?? {},
      },
      idempotencyKey: `${outcome.idempotencyKey}:notification`,
      correlationId: job.correlationId,
    });
    await ports.campaigns.updateRecipientOutcome({
      campaignRunId: run.id,
      contactPhoneHash: outcome.contactPhoneHash,
      status: 'QUEUED',
      notificationIntentId: objectId(intent),
    });
  }

  if (batch.length < pending.length) {
    recordCampaignDispatchObservability(job, ports, {
      campaignId: run.campaignId,
      campaignRunId: run.id,
      queuedRecipients: batch.length,
      pendingRecipients: pending.length,
      outcome: 'rate_limited',
      limit,
    });
    return skipped('campaign_dispatch_rate_limited');
  }
  recordCampaignDispatchObservability(job, ports, {
    campaignId: run.campaignId,
    campaignRunId: run.id,
    queuedRecipients: batch.length,
    pendingRecipients: pending.length,
    outcome: 'created',
    limit,
  });
  return succeeded('campaign_dispatch_work_created');
}

async function handleNotificationDeliveryJob(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
  now: Date,
) {
  if (!ports.notifications?.findIntentById || !ports.notifications.recordDeliveryAttempt) {
    return Promise.resolve(skipped('notifications_delivery_port_not_configured'));
  }
  const intentId = job.notificationIntentId ?? job.sourceId;
  if (!intentId) return skipped('notification_intent_missing');

  const intent = await ports.notifications.findIntentById(intentId);
  if (intent && intent.tenantId !== job.tenantId) return skipped('notification_intent_not_found');
  if (intent?.channel === 'WHATSAPP') {
    if (intent.status === 'SENT' || intent.status === 'CANCELLED') {
      return skipped('notification_intent_not_deliverable');
    }
    if (!ports.whatsappProvider) return skipped('whatsapp_provider_not_configured');

    const whatsappJob = await buildWhatsAppDeliveryJob(job, intent, ports, now);
    if (!whatsappJob) return skipped('whatsapp_delivery_payload_invalid');

    return handleWhatsAppDeliveryJob(whatsappJob, ports, now);
  }

  return handleNotificationDelivery(job, {
    notifications: {
      findIntentById: ports.notifications.findIntentById,
      recordDeliveryAttempt: ports.notifications.recordDeliveryAttempt,
    },
    provider: ports.notificationProvider ?? new LocalNoopNotificationProvider(),
    now: () => now,
  });
}

async function buildWhatsAppDeliveryJob(
  job: WorkerJob,
  intent: NotificationIntent,
  ports: InitialWorkerHandlerPorts,
  now: Date,
): Promise<WorkerJob | null> {
  const payload = whatsappDeliveryPayloadSchema.safeParse({
    ...intent.payload,
    tenantId: intent.tenantId,
    branchId: intent.branchId ?? job.branchId,
    notificationIntentId: intent.id,
    templateKey: intent.templateKey,
    idempotencyKey: intent.idempotencyKey,
    correlationId: intent.correlationId,
  });
  if (!payload.success) {
    await ports.notifications?.recordDeliveryAttempt?.({
      tenantId: job.tenantId,
      branchId: intent.branchId ?? job.branchId,
      notificationIntentId: intent.id,
      channel: 'WHATSAPP',
      status: 'FAILED',
      attemptNumber: job.attemptCount + 1,
      provider: 'whatsapp-router',
      error: {
        code: 'MESSAGING_VALIDATION_ERROR',
        message: 'WhatsApp notification intent is missing required delivery payload.',
        retryable: false,
      },
    });
    return null;
  }

  return {
    ...job,
    type: 'WHATSAPP_DELIVERY',
    branchId: payload.data.branchId,
    notificationIntentId: intent.id,
    payload: payload.data,
    priority: Math.max(job.priority, 85),
    maxAttempts: Math.max(job.maxAttempts, 8),
    updatedAt: now.toISOString(),
  };
}

function handleWhatsAppDeliveryJob(job: WorkerJob, ports: InitialWorkerHandlerPorts, now: Date) {
  if (!ports.whatsappProvider) {
    return Promise.resolve(skipped('whatsapp_provider_not_configured'));
  }
  return handleWhatsAppDelivery(job, {
    provider: ports.whatsappProvider,
    notifications: ports.notifications?.recordDeliveryAttempt
      ? { recordDeliveryAttempt: ports.notifications.recordDeliveryAttempt }
      : undefined,
    logger: ports.logger,
    metrics: ports.metrics,
    now: () => now,
  });
}

function handleMessagingWebhookProcessingJob(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
  now: Date,
) {
  if (!ports.messaging) {
    return Promise.resolve(skipped('messaging_port_not_configured'));
  }
  return handleWhatsAppWebhookProcessing(job, {
    messaging: ports.messaging,
    now: () => now,
  });
}

function getSourceId(job: WorkerJob, expectedType: OutboxSourceType) {
  if (job.sourceType !== expectedType) return undefined;
  return job.sourceId;
}

function isSameTenant(job: WorkerJob, snapshot: { tenantId: string }) {
  return job.tenantId === snapshot.tenantId;
}

async function createNotificationIntent(
  ports: InitialWorkerHandlerPorts,
  command: CreateNotificationIntentCommand,
) {
  if (!ports.notifications) return skipped('notifications_port_not_configured');

  await ports.notifications.createIntent(command);
  return succeeded('notification_intent_created');
}

async function createCustomerTransactionalNotificationIntent(
  ports: InitialWorkerHandlerPorts,
  command: Omit<CreateNotificationIntentCommand, 'channel'> & {
    recipientType: 'CUSTOMER';
    recipientId: string;
  },
) {
  const target = await ports.transactionalMessaging?.resolveWhatsAppTarget({
    tenantId: command.tenantId,
    branchId: command.branchId,
    customerId: command.recipientId,
    templateKey: command.templateKey,
    sourceType: command.sourceType,
    sourceId: command.sourceId,
  });

  if (!target) {
    return createNotificationIntent(ports, { ...command, channel: 'LOCAL' });
  }

  return createNotificationIntent(ports, {
    ...command,
    channel: 'WHATSAPP',
    payload: {
      ...command.payload,
      connectionId: target.connectionId,
      recipientPhoneHash: target.recipientPhoneHash,
      variables: target.variables ?? {},
    },
  });
}

function createHandlerIdempotencyKey(job: WorkerJob, handler: string) {
  return `job:${job.id}:${handler}`;
}

function calculateReminderScheduledFor(startsAt: string | undefined, leadMinutes: number) {
  if (!startsAt) return undefined;
  const startsAtTime = new Date(startsAt).getTime();
  if (Number.isNaN(startsAtTime)) return undefined;
  return new Date(startsAtTime - leadMinutes * 60_000).toISOString();
}

function objectId(value: unknown) {
  if (typeof value === 'object' && value && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }
  return undefined;
}

function succeeded(effect: string): WorkerJobHandlerResult {
  return { status: 'succeeded', effect };
}

function skipped(reason: string): WorkerJobHandlerResult {
  return { status: 'skipped', reason };
}

function recordCampaignDispatchObservability(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
  input: {
    campaignId: string;
    campaignRunId: string;
    queuedRecipients: number;
    pendingRecipients: number;
    outcome: 'created' | 'rate_limited';
    limit: number;
  },
) {
  ports.logger?.[input.outcome === 'created' ? 'info' : 'warn']({
    event:
      input.outcome === 'created'
        ? 'campaign.dispatch.work_created'
        : 'campaign.dispatch.rate_limited',
    job,
    metadata: {
      campaignId: input.campaignId,
      campaignRunId: input.campaignRunId,
      queuedRecipients: input.queuedRecipients,
      pendingRecipients: input.pendingRecipients,
      limit: input.limit,
    },
  });
  ports.metrics?.count({
    name: 'campaign_dispatch_recipients_queued_total',
    value: input.queuedRecipients,
    job,
    tags: {
      campaignId: input.campaignId,
      campaignRunId: input.campaignRunId,
      outcome: input.outcome,
    },
  });
  ports.metrics?.count({
    name: 'campaign_dispatch_runs_total',
    job,
    tags: {
      campaignId: input.campaignId,
      campaignRunId: input.campaignRunId,
      outcome: input.outcome,
    },
  });
}
