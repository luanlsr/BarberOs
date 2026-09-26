import type {
  CreateNotificationIntentCommand,
  NotificationIntent,
  OutboxSourceType,
  RecordNotificationDeliveryAttemptCommand,
  WorkerJob,
  WorkerJobType,
} from '@barberos/contracts';

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
    findIntentById?(id: string): Promise<NotificationIntent | null>;
    recordDeliveryAttempt?(command: RecordNotificationDeliveryAttemptCommand): Promise<unknown>;
  };
  notificationProvider?: NotificationProviderAdapter;
  whatsappProvider?: WhatsAppProviderAdapter;
  messaging?: WhatsAppWebhookProcessingPorts['messaging'];
};

export type InitialWorkerJobHandler = (job: WorkerJob) => Promise<WorkerJobHandlerResult>;

export function createInitialWorkerHandlers(
  ports: InitialWorkerHandlerPorts,
  options: { now?: () => Date } = {},
): Partial<Record<WorkerJobType, InitialWorkerJobHandler>> {
  const clock = options.now ?? (() => new Date());

  return {
    APPOINTMENT_REMINDER: (job) => handleAppointmentReminder(job, ports),
    POST_SERVICE_FOLLOW_UP: (job) => handlePostServiceFollowUp(job, ports),
    FINANCE_RECALCULATION: (job) => handleFinanceRecalculation(job, ports),
    STOCK_ALERT: (job) => handleStockAlert(job, ports),
    EXPIRED_RECORD_CLEANUP: (job) => handleExpiredRecordCleanup(job, ports, clock()),
    NOTIFICATION_DELIVERY: (job) => handleNotificationDeliveryJob(job, ports, clock()),
    WHATSAPP_DELIVERY: (job) => handleWhatsAppDeliveryJob(job, ports, clock()),
    MESSAGING_WEBHOOK_PROCESSING: (job) => handleMessagingWebhookProcessingJob(job, ports, clock()),
  };
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

  return createNotificationIntent(ports, {
    tenantId: job.tenantId,
    branchId: appointment.branchId ?? job.branchId,
    recipientType: 'CUSTOMER',
    recipientId: appointment.customerId,
    channel: 'LOCAL',
    templateKey: 'appointment.reminder.v1',
    sourceType: 'APPOINTMENT',
    sourceId: appointment.id,
    payload: {
      appointmentId: appointment.id,
      startsAt: appointment.startsAt,
    },
    idempotencyKey: createHandlerIdempotencyKey(job, 'appointment-reminder'),
    correlationId: job.correlationId,
  });
}

export async function handlePostServiceFollowUp(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
): Promise<WorkerJobHandlerResult> {
  const orderId = getSourceId(job, 'ORDER');
  if (!orderId) return skipped('order_source_missing');
  if (!ports.orders) return skipped('orders_port_not_configured');

  const order = await ports.orders.findById(orderId);
  if (!order || !isSameTenant(job, order)) return skipped('order_not_found');
  if (order.status !== 'PAID' && order.status !== 'CLOSED') return skipped('order_not_eligible');
  if (!order.customerId) return skipped('order_without_customer');

  return createNotificationIntent(ports, {
    tenantId: job.tenantId,
    branchId: order.branchId ?? job.branchId,
    recipientType: 'CUSTOMER',
    recipientId: order.customerId,
    channel: 'LOCAL',
    templateKey: 'post-service.follow-up.v1',
    sourceType: 'ORDER',
    sourceId: order.id,
    payload: {
      orderId: order.id,
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

function handleNotificationDeliveryJob(
  job: WorkerJob,
  ports: InitialWorkerHandlerPorts,
  now: Date,
) {
  if (!ports.notifications?.findIntentById || !ports.notifications.recordDeliveryAttempt) {
    return Promise.resolve(skipped('notifications_delivery_port_not_configured'));
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
function handleWhatsAppDeliveryJob(job: WorkerJob, ports: InitialWorkerHandlerPorts, now: Date) {
  if (!ports.whatsappProvider) {
    return Promise.resolve(skipped('whatsapp_provider_not_configured'));
  }
  return handleWhatsAppDelivery(job, {
    provider: ports.whatsappProvider,
    notifications: ports.notifications?.recordDeliveryAttempt
      ? { recordDeliveryAttempt: ports.notifications.recordDeliveryAttempt }
      : undefined,
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

function createHandlerIdempotencyKey(job: WorkerJob, handler: string) {
  return `job:${job.id}:${handler}`;
}

function succeeded(effect: string): WorkerJobHandlerResult {
  return { status: 'succeeded', effect };
}

function skipped(reason: string): WorkerJobHandlerResult {
  return { status: 'skipped', reason };
}
