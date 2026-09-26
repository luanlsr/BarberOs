import { z } from 'zod';

export type Role =
  | 'PLATFORM_MASTER'
  | 'PLATFORM_SUPPORT'
  | 'OWNER'
  | 'MANAGER'
  | 'FINANCE'
  | 'RECEPTIONIST'
  | 'PROFESSIONAL';

export type Permission =
  | 'dashboard.read'
  | 'appointments.read'
  | 'appointments.create'
  | 'appointments.update'
  | 'appointments.cancel'
  | 'professionals.read'
  | 'professionals.create'
  | 'professionals.update'
  | 'services.read'
  | 'services.create'
  | 'services.update'
  | 'schedules.read'
  | 'schedules.manage'
  | 'customers.read'
  | 'customers.create'
  | 'customers.update'
  | 'appointments.check_in'
  | 'orders.read'
  | 'orders.create'
  | 'orders.update'
  | 'orders.item.add'
  | 'orders.item.update'
  | 'orders.item.remove'
  | 'payments.receive'
  | 'payments.refund'
  | 'cash.open'
  | 'cash.withdraw'
  | 'cash.close'
  | 'finance.read'
  | 'finance.write'
  | 'commission.read'
  | 'commission.manage'
  | 'inventory.read'
  | 'inventory.write'
  | 'worker.failures.read'
  | 'notifications.status.read'
  | 'messaging.read'
  | 'messaging.manage'
  | 'campaigns.read'
  | 'campaigns.create'
  | 'campaigns.approve'
  | 'campaigns.send'
  | 'settings.read'
  | 'memberships.read'
  | 'memberships.manage'
  | 'audit.read';

export type Entitlement =
  | 'core.operations'
  | 'finance'
  | 'inventory'
  | 'worker.operations'
  | 'notifications'
  | 'messaging'
  | 'campaigns'
  | 'ai';
export type AuthState = 'authenticated' | 'unauthenticated' | 'expired';

export type WorkspaceContext = {
  tenantId: string;
  tenantName: string;
  branchId: string;
  branchName: string;
};

export type SessionContext = {
  authState: AuthState;
  userId: string;
  email?: string;
  sessionId?: string;
  sessionExpiresAt?: string;
  tenantId: string;
  membershipId: string;
  role: Role;
  permissions: readonly Permission[];
  entitlements?: readonly Entitlement[];
  branchScope: readonly string[];
  activeBranchId?: string;
  userName: string;
  tenantName: string;
  branchName: string;
  availableWorkspaces?: readonly WorkspaceContext[];
};

export type RequestContext = {
  requestId: string;
  userId: string;
  tenantId: string;
  membershipId: string;
  role: Role;
  permissions: readonly Permission[];
  entitlements: readonly Entitlement[];
  branchScope: readonly string[];
};

export type AuthorizationRequirement = {
  permission: Permission;
  entitlement?: Entitlement;
  branchId?: string;
};

export const permissionSchema = z.enum([
  'dashboard.read',
  'appointments.read',
  'appointments.create',
  'appointments.update',
  'appointments.cancel',
  'professionals.read',
  'professionals.create',
  'professionals.update',
  'services.read',
  'services.create',
  'services.update',
  'schedules.read',
  'schedules.manage',
  'customers.read',
  'customers.create',
  'customers.update',
  'appointments.check_in',
  'orders.read',
  'orders.create',
  'orders.update',
  'orders.item.add',
  'orders.item.update',
  'orders.item.remove',
  'payments.receive',
  'payments.refund',
  'cash.open',
  'cash.withdraw',
  'cash.close',
  'finance.read',
  'finance.write',
  'commission.read',
  'commission.manage',
  'inventory.read',
  'inventory.write',
  'worker.failures.read',
  'notifications.status.read',
  'messaging.read',
  'messaging.manage',
  'campaigns.read',
  'campaigns.create',
  'campaigns.approve',
  'campaigns.send',
  'settings.read',
  'memberships.read',
  'memberships.manage',
  'audit.read',
]);

export const entitlementSchema = z.enum([
  'core.operations',
  'finance',
  'inventory',
  'worker.operations',
  'notifications',
  'messaging',
  'campaigns',
  'ai',
]);
export const nonEmptyIdSchema = z.string().trim().min(1);
export const optionalTextSchema = z.string().trim().max(2000).optional();
export const optionalUrlSchema = z.string().trim().url().max(2048).optional();
export const colorHexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const moneyCentsSchema = z.number().int().min(0);
export const positiveMoneyCentsSchema = z.number().int().min(1);
export const signedMoneyCentsSchema = z.number().int();
export const idempotencyKeySchema = z.string().trim().min(8).max(120);
export const durationMinutesSchema = z.number().int().min(5).max(720);
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const localTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm in 24-hour format.');

export const directoryStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export type DirectoryStatus = z.infer<typeof directoryStatusSchema>;

export const customerStatusSchema = z.enum([
  'NEW',
  'ACTIVE',
  'COOLING',
  'AT_RISK',
  'INACTIVE',
  'LOST',
  'ARCHIVED',
]);
export type CustomerStatus = z.infer<typeof customerStatusSchema>;

export const appointmentStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_SERVICE',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const activeAppointmentStatuses = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_SERVICE',
] as const satisfies readonly AppointmentStatus[];

export const appointmentSourceSchema = z.enum(['MANUAL', 'ONLINE', 'WHATSAPP', 'AI']);
export type AppointmentSource = z.infer<typeof appointmentSourceSchema>;

export const orderStatusSchema = z.enum([
  'OPEN',
  'IN_SERVICE',
  'READY_FOR_PAYMENT',
  'PAID',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const activeOrderStatuses = [
  'OPEN',
  'IN_SERVICE',
  'READY_FOR_PAYMENT',
] as const satisfies readonly OrderStatus[];
export const paymentMethodSchema = z.enum(['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentStatusSchema = z.enum([
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const refundStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']);
export type RefundStatus = z.infer<typeof refundStatusSchema>;

export const cashRegisterSessionStatusSchema = z.enum(['OPEN', 'CLOSED']);
export type CashRegisterSessionStatus = z.infer<typeof cashRegisterSessionStatusSchema>;

export const cashMovementTypeSchema = z.enum([
  'OPENING_BALANCE',
  'SALE',
  'REFUND',
  'WITHDRAWAL',
  'CASH_IN',
  'EXPENSE',
  'ADJUSTMENT',
]);
export type CashMovementType = z.infer<typeof cashMovementTypeSchema>;

export const financialEntryDirectionSchema = z.enum(['IN', 'OUT']);
export type FinancialEntryDirection = z.infer<typeof financialEntryDirectionSchema>;

export const financialEntryTypeSchema = z.enum([
  'SERVICE_REVENUE',
  'PRODUCT_REVENUE',
  'EXPENSE',
  'COMMISSION',
  'PAYOUT',
  'REFUND',
  'ADJUSTMENT',
  'OTHER',
]);
export type FinancialEntryType = z.infer<typeof financialEntryTypeSchema>;

export const financialEntryStatusSchema = z.enum(['POSTED', 'REVERSED', 'VOIDED']);
export type FinancialEntryStatus = z.infer<typeof financialEntryStatusSchema>;

export const expenseStatusSchema = z.enum(['OPEN', 'DUE', 'OVERDUE', 'PAID', 'CANCELLED']);
export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;

export const expenseRecurrenceFrequencySchema = z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']);
export type ExpenseRecurrenceFrequency = z.infer<typeof expenseRecurrenceFrequencySchema>;

export const commissionRuleTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);
export type CommissionRuleType = z.infer<typeof commissionRuleTypeSchema>;

export const commissionRuleScopeSchema = z.enum([
  'TENANT_DEFAULT',
  'PROFESSIONAL',
  'SERVICE',
  'PRODUCT',
  'MANUAL_ITEM',
]);
export type CommissionRuleScope = z.infer<typeof commissionRuleScopeSchema>;

export const commissionRuleStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export type CommissionRuleStatus = z.infer<typeof commissionRuleStatusSchema>;

export const commissionAccrualStatusSchema = z.enum(['OPEN', 'SETTLED', 'REVERSED', 'ADJUSTED']);
export type CommissionAccrualStatus = z.infer<typeof commissionAccrualStatusSchema>;

export const payoutStatusSchema = z.enum([
  'DRAFT',
  'CLOSED',
  'APPROVED',
  'PAID',
  'CANCELLED',
  'CORRECTED',
]);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;
export const productStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const stockTrackingPolicySchema = z.enum(['TRACKED', 'NOT_TRACKED']);
export type StockTrackingPolicy = z.infer<typeof stockTrackingPolicySchema>;

export const stockMovementTypeSchema = z.enum([
  'ENTRY',
  'SALE',
  'LOSS',
  'CONSUMPTION',
  'ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
]);
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;

export const stockSourceTypeSchema = z.enum([
  'MANUAL',
  'ORDER_ITEM',
  'PAYMENT',
  'TRANSFER',
  'SYSTEM',
]);
export type StockSourceType = z.infer<typeof stockSourceTypeSchema>;

export const stockAlertStateSchema = z.enum(['ACTIVE', 'RESOLVED']);
export type StockAlertState = z.infer<typeof stockAlertStateSchema>;

export const orderItemSourceTypeSchema = z.enum(['SERVICE', 'PRODUCT', 'MANUAL']);
export type OrderItemSourceType = z.infer<typeof orderItemSourceTypeSchema>;

export const orderHistoryEventTypeSchema = z.enum([
  'ORDER_CREATED',
  'CHECK_IN',
  'STATUS_CHANGED',
  'ITEM_ADDED',
  'ITEM_UPDATED',
  'ITEM_REMOVED',
  'PAYMENT_RECEIVED',
  'PAYMENT_REFUNDED',
  'ORDER_PAID',
]);
export type OrderHistoryEventType = z.infer<typeof orderHistoryEventTypeSchema>;

export const scheduleBlockTypeSchema = z.enum([
  'BREAK',
  'DAY_OFF',
  'VACATION',
  'MAINTENANCE',
  'MANUAL',
]);
export type ScheduleBlockType = z.infer<typeof scheduleBlockTypeSchema>;

export const outboxEventStatusSchema = z.enum([
  'PENDING',
  'DISPATCHING',
  'DISPATCHED',
  'FAILED',
  'DEAD_LETTERED',
  'CANCELLED',
]);
export type OutboxEventStatus = z.infer<typeof outboxEventStatusSchema>;

export const outboxEventTypeSchema = z.enum([
  'APPOINTMENT_CREATED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_CANCELLED',
  'ORDER_OPENED',
  'ORDER_PAID',
  'PAYMENT_COMPLETED',
  'PAYMENT_REFUNDED',
  'FINANCE_RECALCULATION_REQUESTED',
  'STOCK_LOW_DETECTED',
  'NOTIFICATION_DELIVERY_REQUESTED',
  'MESSAGING_PROVIDER_EVENT_RECEIVED',
  'MESSAGING_DELIVERY_REQUESTED',
  'CAMPAIGN_DISPATCH_REQUESTED',
]);
export type OutboxEventType = z.infer<typeof outboxEventTypeSchema>;

export const outboxSourceTypeSchema = z.enum([
  'APPOINTMENT',
  'ORDER',
  'PAYMENT',
  'CASH_REGISTER',
  'FINANCIAL_ENTRY',
  'COMMISSION',
  'PAYOUT',
  'PRODUCT',
  'STOCK_MOVEMENT',
  'NOTIFICATION_INTENT',
  'MESSAGING_CONNECTION',
  'MESSAGING_CONVERSATION',
  'MESSAGING_MESSAGE',
  'MESSAGING_PROVIDER_EVENT',
  'CAMPAIGN',
  'CAMPAIGN_RUN',
  'SYSTEM',
]);
export type OutboxSourceType = z.infer<typeof outboxSourceTypeSchema>;

export const workerJobTypeSchema = z.enum([
  'OUTBOX_DISPATCH',
  'APPOINTMENT_REMINDER',
  'POST_SERVICE_FOLLOW_UP',
  'FINANCE_RECALCULATION',
  'STOCK_ALERT',
  'EXPIRED_RECORD_CLEANUP',
  'NOTIFICATION_DELIVERY',
  'MESSAGING_WEBHOOK_PROCESSING',
  'WHATSAPP_DELIVERY',
  'CAMPAIGN_DISPATCH',
]);
export type WorkerJobType = z.infer<typeof workerJobTypeSchema>;

export const workerJobStatusSchema = z.enum([
  'PENDING',
  'CLAIMED',
  'RUNNING',
  'SUCCEEDED',
  'RETRY_SCHEDULED',
  'FAILED',
  'DEAD_LETTERED',
  'CANCELLED',
]);
export type WorkerJobStatus = z.infer<typeof workerJobStatusSchema>;

export const workerJobAttemptStatusSchema = z.enum([
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'RETRY_SCHEDULED',
  'DEAD_LETTERED',
]);
export type WorkerJobAttemptStatus = z.infer<typeof workerJobAttemptStatusSchema>;

export const workerErrorCodeSchema = z.enum([
  'WORKER_VALIDATION_ERROR',
  'WORKER_PERMISSION_DENIED',
  'WORKER_BRANCH_SCOPE_DENIED',
  'WORKER_UNSUPPORTED_JOB_TYPE',
  'WORKER_UNSUPPORTED_JOB_VERSION',
  'WORKER_LOCK_NOT_ACQUIRED',
  'WORKER_RATE_LIMITED',
  'WORKER_PROVIDER_UNAVAILABLE',
  'WORKER_RETRY_EXHAUSTED',
  'WORKER_HANDLER_FAILED',
  'OUTBOX_VALIDATION_ERROR',
  'OUTBOX_IDEMPOTENCY_CONFLICT',
  'NOTIFICATION_VALIDATION_ERROR',
  'NOTIFICATION_DELIVERY_FAILED',
  'MESSAGING_VALIDATION_ERROR',
  'MESSAGING_PERMISSION_DENIED',
  'MESSAGING_BRANCH_SCOPE_DENIED',
  'MESSAGING_PROVIDER_EVENT_REPLAY',
  'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
  'MESSAGING_CONSENT_BLOCKED',
  'CAMPAIGN_VALIDATION_ERROR',
  'CAMPAIGN_PERMISSION_DENIED',
  'CAMPAIGN_BRANCH_SCOPE_DENIED',
  'CAMPAIGN_INVALID_STATUS',
  'CAMPAIGN_IDEMPOTENCY_CONFLICT',
]);
export type WorkerErrorCode = z.infer<typeof workerErrorCodeSchema>;

export const notificationChannelSchema = z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'IN_APP', 'LOCAL']);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export const notificationIntentStatusSchema = z.enum([
  'PENDING',
  'READY',
  'DISPATCHING',
  'SENT',
  'FAILED',
  'CANCELLED',
]);
export type NotificationIntentStatus = z.infer<typeof notificationIntentStatusSchema>;

export const notificationDeliveryAttemptStatusSchema = z.enum([
  'PENDING',
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'SKIPPED',
  'BLOCKED_BY_CONSENT',
  'RETRY_SCHEDULED',
  'FAILED',
  'DEAD_LETTERED',
]);
export type NotificationDeliveryAttemptStatus = z.infer<
  typeof notificationDeliveryAttemptStatusSchema
>;

export const notificationRecipientTypeSchema = z.enum([
  'CUSTOMER',
  'PROFESSIONAL',
  'MEMBERSHIP',
  'TENANT_OPERATOR',
]);
export type NotificationRecipientType = z.infer<typeof notificationRecipientTypeSchema>;
export const messagingProviderSchema = z.enum(['LOCAL', 'META_WHATSAPP_CLOUD']);
export type MessagingProvider = z.infer<typeof messagingProviderSchema>;

export const messagingConnectionStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'DISCONNECTED']);
export type MessagingConnectionStatus = z.infer<typeof messagingConnectionStatusSchema>;

export const messagingEventKindSchema = z.enum([
  'INBOUND_MESSAGE',
  'OUTBOUND_STATUS',
  'TEMPLATE_STATUS',
  'OPT_OUT',
  'UNKNOWN',
]);
export type MessagingEventKind = z.infer<typeof messagingEventKindSchema>;

export const conversationStatusSchema = z.enum(['OPEN', 'RESOLVED', 'ARCHIVED']);
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;

export const messageDirectionSchema = z.enum(['INBOUND', 'OUTBOUND']);
export type MessageDirection = z.infer<typeof messageDirectionSchema>;

export const messageDeliveryStateSchema = z.enum([
  'RECEIVED',
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'SKIPPED',
  'BLOCKED_BY_CONSENT',
]);
export type MessageDeliveryState = z.infer<typeof messageDeliveryStateSchema>;

export const consentPurposeSchema = z.enum(['WHATSAPP_TRANSACTIONAL', 'WHATSAPP_MARKETING']);
export type ConsentPurpose = z.infer<typeof consentPurposeSchema>;

export const consentStateSchema = z.enum(['OPTED_IN', 'OPTED_OUT', 'UNKNOWN']);
export type ConsentState = z.infer<typeof consentStateSchema>;

export const consentSourceSchema = z.enum(['CUSTOMER_MESSAGE', 'OPERATOR', 'IMPORT', 'SYSTEM']);
export type ConsentSource = z.infer<typeof consentSourceSchema>;

export const campaignStatusSchema = z.enum([
  'DRAFT',
  'READY_FOR_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'SENDING',
  'SENT',
  'PARTIALLY_FAILED',
  'CANCELLED',
]);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const campaignRecipientOutcomeStatusSchema = z.enum([
  'PENDING',
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'SKIPPED',
  'BLOCKED_BY_CONSENT',
]);
export type CampaignRecipientOutcomeStatus = z.infer<typeof campaignRecipientOutcomeStatusSchema>;

export const coreOperationsErrorCodeSchema = z.enum([
  'CORE_VALIDATION_ERROR',
  'CORE_PERMISSION_DENIED',
  'CORE_BRANCH_SCOPE_DENIED',
  'CORE_ENTITLEMENT_DENIED',
  'CORE_NOT_FOUND',
  'APPOINTMENT_CONFLICT',
  'APPOINTMENT_INVALID_TRANSITION',
  'ORDER_VALIDATION_ERROR',
  'ORDER_PERMISSION_DENIED',
  'ORDER_BRANCH_SCOPE_DENIED',
  'ORDER_NOT_FOUND',
  'ORDER_INVALID_STATUS',
  'ORDER_ITEM_INVALID',
  'ORDER_ALREADY_OPEN_FOR_APPOINTMENT',
  'ORDER_IDEMPOTENCY_CONFLICT',
  'CHECK_IN_INVALID_APPOINTMENT_STATUS',
  'PAYMENT_VALIDATION_ERROR',
  'PAYMENT_PERMISSION_DENIED',
  'PAYMENT_BRANCH_SCOPE_DENIED',
  'PAYMENT_NOT_FOUND',
  'PAYMENT_INVALID_STATUS',
  'PAYMENT_IDEMPOTENCY_CONFLICT',
  'PAYMENT_AMOUNT_DUE_MISMATCH',
  'CASH_REGISTER_VALIDATION_ERROR',
  'CASH_REGISTER_PERMISSION_DENIED',
  'CASH_REGISTER_BRANCH_SCOPE_DENIED',
  'CASH_REGISTER_NOT_FOUND',
  'CASH_REGISTER_ALREADY_OPEN',
  'CASH_REGISTER_NOT_OPEN',
  'CASH_REGISTER_INVALID_STATUS',
  'CASH_MOVEMENT_INVALID',
  'FINANCE_VALIDATION_ERROR',
  'FINANCE_PERMISSION_DENIED',
  'FINANCE_BRANCH_SCOPE_DENIED',
  'FINANCE_ENTITLEMENT_DENIED',
  'FINANCE_NOT_FOUND',
  'FINANCE_IDEMPOTENCY_CONFLICT',
  'FINANCE_IMMUTABLE_ENTRY',
  'FINANCE_CASH_REGISTER_NOT_OPEN',
  'COMMISSION_VALIDATION_ERROR',
  'COMMISSION_PERMISSION_DENIED',
  'COMMISSION_BRANCH_SCOPE_DENIED',
  'COMMISSION_ENTITLEMENT_DENIED',
  'COMMISSION_NOT_FOUND',
  'COMMISSION_RULE_NOT_FOUND',
  'COMMISSION_IDEMPOTENCY_CONFLICT',
  'COMMISSION_IMMUTABLE_ACCRUAL',
  'PAYOUT_VALIDATION_ERROR',
  'PAYOUT_PERMISSION_DENIED',
  'PAYOUT_BRANCH_SCOPE_DENIED',
  'PAYOUT_ENTITLEMENT_DENIED',
  'PAYOUT_NOT_FOUND',
  'PAYOUT_INVALID_STATUS',
  'PAYOUT_IDEMPOTENCY_CONFLICT',
  'PAYOUT_IMMUTABLE',
  'PAYOUT_CASH_REGISTER_NOT_OPEN',
  'CATALOG_VALIDATION_ERROR',
  'CATALOG_PERMISSION_DENIED',
  'CATALOG_BRANCH_SCOPE_DENIED',
  'CATALOG_ENTITLEMENT_DENIED',
  'CATALOG_NOT_FOUND',
  'CATALOG_IDEMPOTENCY_CONFLICT',
  'PRODUCT_UNAVAILABLE',
  'INVENTORY_VALIDATION_ERROR',
  'INVENTORY_PERMISSION_DENIED',
  'INVENTORY_BRANCH_SCOPE_DENIED',
  'INVENTORY_ENTITLEMENT_DENIED',
  'INVENTORY_NOT_FOUND',
  'INVENTORY_PRODUCT_UNAVAILABLE',
  'INVENTORY_INSUFFICIENT_STOCK',
  'INVENTORY_IDEMPOTENCY_CONFLICT',
  'INVENTORY_IMMUTABLE_MOVEMENT',
  'WORKER_VALIDATION_ERROR',
  'WORKER_PERMISSION_DENIED',
  'WORKER_BRANCH_SCOPE_DENIED',
  'WORKER_UNSUPPORTED_JOB_TYPE',
  'WORKER_UNSUPPORTED_JOB_VERSION',
  'WORKER_LOCK_NOT_ACQUIRED',
  'WORKER_RATE_LIMITED',
  'WORKER_PROVIDER_UNAVAILABLE',
  'WORKER_RETRY_EXHAUSTED',
  'WORKER_HANDLER_FAILED',
  'OUTBOX_VALIDATION_ERROR',
  'OUTBOX_IDEMPOTENCY_CONFLICT',
  'NOTIFICATION_VALIDATION_ERROR',
  'NOTIFICATION_DELIVERY_FAILED',
  'MESSAGING_VALIDATION_ERROR',
  'MESSAGING_PERMISSION_DENIED',
  'MESSAGING_BRANCH_SCOPE_DENIED',
  'MESSAGING_PROVIDER_EVENT_REPLAY',
  'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
  'MESSAGING_CONSENT_BLOCKED',
  'CAMPAIGN_VALIDATION_ERROR',
  'CAMPAIGN_PERMISSION_DENIED',
  'CAMPAIGN_BRANCH_SCOPE_DENIED',
  'CAMPAIGN_INVALID_STATUS',
  'CAMPAIGN_IDEMPOTENCY_CONFLICT',
]);
export type CoreOperationsErrorCode = z.infer<typeof coreOperationsErrorCodeSchema>;

export const workerSanitizedErrorSchema = z.object({
  code: workerErrorCodeSchema,
  message: z.string().trim().min(1).max(500),
  retryable: z.boolean().default(false),
});
export type WorkerSanitizedError = z.infer<typeof workerSanitizedErrorSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const workerJobSchemaVersionSchema = z.literal(1);
export type WorkerJobSchemaVersion = z.infer<typeof workerJobSchemaVersionSchema>;

const workerMetadataSchema = z.record(z.string(), z.unknown()).default({});

export const outboxEventSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  eventType: outboxEventTypeSchema,
  sourceType: outboxSourceTypeSchema,
  sourceId: nonEmptyIdSchema,
  payload: workerMetadataSchema,
  idempotencyKey: idempotencyKeySchema,
  status: outboxEventStatusSchema,
  correlationId: nonEmptyIdSchema,
  schemaVersion: workerJobSchemaVersionSchema.default(1),
  attemptCount: z.number().int().min(0).default(0),
  availableAt: isoDateTimeSchema,
  lockedBy: z.string().trim().min(1).max(120).optional(),
  lockedUntil: isoDateTimeSchema.optional(),
  lastError: workerSanitizedErrorSchema.optional(),
  dispatchedAt: isoDateTimeSchema.optional(),
  createdBy: nonEmptyIdSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type OutboxEvent = z.infer<typeof outboxEventSchema>;

export const workerJobSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  type: workerJobTypeSchema,
  status: workerJobStatusSchema,
  schemaVersion: workerJobSchemaVersionSchema.default(1),
  sourceType: outboxSourceTypeSchema.optional(),
  sourceId: nonEmptyIdSchema.optional(),
  outboxEventId: nonEmptyIdSchema.optional(),
  notificationIntentId: nonEmptyIdSchema.optional(),
  payload: workerMetadataSchema,
  idempotencyKey: idempotencyKeySchema,
  correlationId: nonEmptyIdSchema,
  priority: z.number().int().min(0).max(100).default(50),
  attemptCount: z.number().int().min(0).default(0),
  maxAttempts: z.number().int().min(1).max(25).default(5),
  runAt: isoDateTimeSchema,
  lockedBy: z.string().trim().min(1).max(120).optional(),
  lockedUntil: isoDateTimeSchema.optional(),
  lastError: workerSanitizedErrorSchema.optional(),
  completedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type WorkerJob = z.infer<typeof workerJobSchema>;

export const workerJobAttemptSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  jobId: nonEmptyIdSchema,
  outboxEventId: nonEmptyIdSchema.optional(),
  status: workerJobAttemptStatusSchema,
  attemptNumber: z.number().int().min(1),
  workerId: z.string().trim().min(1).max(120),
  startedAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema.optional(),
  error: workerSanitizedErrorSchema.optional(),
});
export type WorkerJobAttempt = z.infer<typeof workerJobAttemptSchema>;

export const notificationIntentSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  recipientType: notificationRecipientTypeSchema,
  recipientId: nonEmptyIdSchema,
  channel: notificationChannelSchema,
  templateKey: z.string().trim().min(2).max(120),
  sourceType: outboxSourceTypeSchema,
  sourceId: nonEmptyIdSchema,
  payload: workerMetadataSchema,
  status: notificationIntentStatusSchema,
  idempotencyKey: idempotencyKeySchema,
  correlationId: nonEmptyIdSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type NotificationIntent = z.infer<typeof notificationIntentSchema>;

export const notificationDeliveryAttemptSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  notificationIntentId: nonEmptyIdSchema,
  channel: notificationChannelSchema,
  status: notificationDeliveryAttemptStatusSchema,
  attemptNumber: z.number().int().min(1),
  provider: z.string().trim().min(2).max(80).optional(),
  providerMessageId: z.string().trim().min(1).max(160).optional(),
  error: workerSanitizedErrorSchema.optional(),
  sentAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
});
export type NotificationDeliveryAttempt = z.infer<typeof notificationDeliveryAttemptSchema>;
const providerMetadataSchema = z.record(z.string(), z.unknown()).default({});

export const messagingConnectionSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  provider: messagingProviderSchema,
  status: messagingConnectionStatusSchema,
  displayName: z.string().trim().min(1).max(120),
  displayPhoneNumber: z.string().trim().min(6).max(40),
  providerPhoneNumberId: z.string().trim().min(1).max(160).optional(),
  credentialReference: z.string().trim().min(1).max(200).optional(),
  webhookSecretReference: z.string().trim().min(1).max(200).optional(),
  allowTenantFallback: z.boolean().default(false),
  metadata: providerMetadataSchema,
  createdBy: nonEmptyIdSchema,
  updatedBy: nonEmptyIdSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type MessagingConnection = z.infer<typeof messagingConnectionSchema>;

export const rawMessagingProviderEventSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  connectionId: nonEmptyIdSchema,
  provider: messagingProviderSchema,
  providerEventId: z.string().trim().min(1).max(200),
  eventKind: messagingEventKindSchema,
  receivedAt: isoDateTimeSchema,
  processedAt: isoDateTimeSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
  payload: providerMetadataSchema,
  signatureValid: z.boolean(),
});
export type RawMessagingProviderEvent = z.infer<typeof rawMessagingProviderEventSchema>;

export const messagingConversationSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  connectionId: nonEmptyIdSchema,
  customerId: nonEmptyIdSchema.optional(),
  contactPhoneHash: z.string().trim().min(8).max(160),
  status: conversationStatusSchema,
  lastMessageAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type MessagingConversation = z.infer<typeof messagingConversationSchema>;

export const messagingMessageSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  conversationId: nonEmptyIdSchema,
  connectionId: nonEmptyIdSchema,
  customerId: nonEmptyIdSchema.optional(),
  direction: messageDirectionSchema,
  channel: z.literal('WHATSAPP'),
  deliveryState: messageDeliveryStateSchema,
  providerMessageId: z.string().trim().min(1).max(200).optional(),
  notificationIntentId: nonEmptyIdSchema.optional(),
  campaignRunId: nonEmptyIdSchema.optional(),
  bodyPreview: z.string().trim().max(500).optional(),
  payload: providerMetadataSchema,
  sentAt: isoDateTimeSchema.optional(),
  receivedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type MessagingMessage = z.infer<typeof messagingMessageSchema>;

export const messagingConsentRecordSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  customerId: nonEmptyIdSchema.optional(),
  contactPhoneHash: z.string().trim().min(8).max(160),
  purpose: consentPurposeSchema,
  state: consentStateSchema,
  source: consentSourceSchema,
  actorId: nonEmptyIdSchema.optional(),
  providerMessageId: z.string().trim().min(1).max(200).optional(),
  reason: z.string().trim().max(500).optional(),
  createdAt: isoDateTimeSchema,
});
export type MessagingConsentRecord = z.infer<typeof messagingConsentRecordSchema>;

export const campaignContentSchema = z.object({
  templateKey: z.string().trim().min(2).max(120),
  bodyPreview: z.string().trim().min(1).max(500),
  variables: z.record(z.string(), z.string().trim().max(160)).default({}),
});
export type CampaignContent = z.infer<typeof campaignContentSchema>;

export const campaignAudienceCriteriaSchema = z.object({
  branchIds: z.array(nonEmptyIdSchema).min(1),
  customerStatus: z.array(customerStatusSchema).optional(),
  lastVisitBefore: z.string().date().optional(),
  includeCustomersWithoutVisit: z.boolean().default(false),
});
export type CampaignAudienceCriteria = z.infer<typeof campaignAudienceCriteriaSchema>;

export const campaignSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  name: z.string().trim().min(2).max(160),
  status: campaignStatusSchema,
  audienceCriteria: campaignAudienceCriteriaSchema,
  content: campaignContentSchema,
  scheduledFor: isoDateTimeSchema.optional(),
  approvedBy: nonEmptyIdSchema.optional(),
  approvedAt: isoDateTimeSchema.optional(),
  createdBy: nonEmptyIdSchema,
  updatedBy: nonEmptyIdSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Campaign = z.infer<typeof campaignSchema>;

export const campaignRunSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  campaignId: nonEmptyIdSchema,
  status: campaignStatusSchema,
  audienceSize: z.number().int().min(0),
  eligibleCount: z.number().int().min(0),
  excludedCount: z.number().int().min(0),
  scheduledFor: isoDateTimeSchema.optional(),
  startedAt: isoDateTimeSchema.optional(),
  completedAt: isoDateTimeSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type CampaignRun = z.infer<typeof campaignRunSchema>;

export const campaignRecipientOutcomeSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  campaignId: nonEmptyIdSchema,
  campaignRunId: nonEmptyIdSchema,
  customerId: nonEmptyIdSchema.optional(),
  contactPhoneHash: z.string().trim().min(8).max(160),
  status: campaignRecipientOutcomeStatusSchema,
  notificationIntentId: nonEmptyIdSchema.optional(),
  providerMessageId: z.string().trim().min(1).max(200).optional(),
  exclusionReason: z.string().trim().max(200).optional(),
  idempotencyKey: idempotencyKeySchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type CampaignRecipientOutcome = z.infer<typeof campaignRecipientOutcomeSchema>;

export const createOutboxEventCommandSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  eventType: outboxEventTypeSchema,
  sourceType: outboxSourceTypeSchema,
  sourceId: nonEmptyIdSchema,
  payload: workerMetadataSchema,
  idempotencyKey: idempotencyKeySchema,
  correlationId: nonEmptyIdSchema,
  availableAt: isoDateTimeSchema.optional(),
});
export type CreateOutboxEventCommand = z.input<typeof createOutboxEventCommandSchema>;

export const createWorkerJobCommandSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  type: workerJobTypeSchema,
  schemaVersion: workerJobSchemaVersionSchema.default(1),
  sourceType: outboxSourceTypeSchema.optional(),
  sourceId: nonEmptyIdSchema.optional(),
  outboxEventId: nonEmptyIdSchema.optional(),
  notificationIntentId: nonEmptyIdSchema.optional(),
  payload: workerMetadataSchema,
  idempotencyKey: idempotencyKeySchema,
  correlationId: nonEmptyIdSchema,
  priority: z.number().int().min(0).max(100).default(50),
  maxAttempts: z.number().int().min(1).max(25).default(5),
  runAt: isoDateTimeSchema.optional(),
});
export type CreateWorkerJobCommand = z.input<typeof createWorkerJobCommandSchema>;

export const createNotificationIntentCommandSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  recipientType: notificationRecipientTypeSchema,
  recipientId: nonEmptyIdSchema,
  channel: notificationChannelSchema,
  templateKey: z.string().trim().min(2).max(120),
  sourceType: outboxSourceTypeSchema,
  sourceId: nonEmptyIdSchema,
  payload: workerMetadataSchema,
  idempotencyKey: idempotencyKeySchema,
  correlationId: nonEmptyIdSchema,
});
export type CreateNotificationIntentCommand = z.input<typeof createNotificationIntentCommandSchema>;

export const recordNotificationDeliveryAttemptCommandSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  notificationIntentId: nonEmptyIdSchema,
  channel: notificationChannelSchema,
  status: notificationDeliveryAttemptStatusSchema,
  attemptNumber: z.number().int().min(1),
  provider: z.string().trim().min(2).max(80).optional(),
  providerMessageId: z.string().trim().min(1).max(160).optional(),
  error: workerSanitizedErrorSchema.optional(),
  sentAt: isoDateTimeSchema.optional(),
});
export type RecordNotificationDeliveryAttemptCommand = z.input<
  typeof recordNotificationDeliveryAttemptCommandSchema
>;
export const whatsappDeliveryPayloadSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  connectionId: nonEmptyIdSchema,
  notificationIntentId: nonEmptyIdSchema.optional(),
  campaignRunId: nonEmptyIdSchema.optional(),
  campaignRecipientOutcomeId: nonEmptyIdSchema.optional(),
  recipientPhoneHash: z.string().trim().min(8).max(160),
  templateKey: z.string().trim().min(2).max(120),
  variables: z.record(z.string(), z.string().trim().max(160)).default({}),
  idempotencyKey: idempotencyKeySchema,
  correlationId: nonEmptyIdSchema,
});
export type WhatsAppDeliveryPayload = z.infer<typeof whatsappDeliveryPayloadSchema>;

export const whatsappWebhookEventPayloadSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  connectionId: nonEmptyIdSchema,
  rawProviderEventId: nonEmptyIdSchema,
  providerEventId: z.string().trim().min(1).max(200),
  eventKind: messagingEventKindSchema,
  receivedAt: isoDateTimeSchema,
  idempotencyKey: idempotencyKeySchema,
  correlationId: nonEmptyIdSchema,
});
export type WhatsAppWebhookEventPayload = z.infer<typeof whatsappWebhookEventPayloadSchema>;

export const providerStatusEventPayloadSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  connectionId: nonEmptyIdSchema,
  providerMessageId: z.string().trim().min(1).max(200),
  deliveryState: messageDeliveryStateSchema,
  providerEventId: z.string().trim().min(1).max(200),
  occurredAt: isoDateTimeSchema,
  idempotencyKey: idempotencyKeySchema,
  correlationId: nonEmptyIdSchema,
});
export type ProviderStatusEventPayload = z.infer<typeof providerStatusEventPayloadSchema>;

export const campaignDispatchPayloadSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  campaignId: nonEmptyIdSchema,
  campaignRunId: nonEmptyIdSchema,
  scheduledFor: isoDateTimeSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
  correlationId: nonEmptyIdSchema,
});
export type CampaignDispatchPayload = z.infer<typeof campaignDispatchPayloadSchema>;

export const createMessagingConnectionCommandSchema = z.object({
  branchId: nonEmptyIdSchema.optional(),
  provider: messagingProviderSchema,
  displayName: z.string().trim().min(1).max(120),
  displayPhoneNumber: z.string().trim().min(6).max(40),
  providerPhoneNumberId: z.string().trim().min(1).max(160).optional(),
  credentialReference: z.string().trim().min(1).max(200).optional(),
  webhookSecretReference: z.string().trim().min(1).max(200).optional(),
  allowTenantFallback: z.boolean().default(false),
});
export type CreateMessagingConnectionCommand = z.input<
  typeof createMessagingConnectionCommandSchema
>;

export const updateMessagingConsentCommandSchema = z.object({
  customerId: nonEmptyIdSchema.optional(),
  contactPhoneHash: z.string().trim().min(8).max(160),
  purpose: consentPurposeSchema,
  state: consentStateSchema,
  source: consentSourceSchema,
  reason: z.string().trim().max(500).optional(),
});
export type UpdateMessagingConsentCommand = z.input<typeof updateMessagingConsentCommandSchema>;

export const createCampaignCommandSchema = z.object({
  branchId: nonEmptyIdSchema.optional(),
  name: z.string().trim().min(2).max(160),
  audienceCriteria: campaignAudienceCriteriaSchema,
  content: campaignContentSchema,
});
export type CreateCampaignCommand = z.input<typeof createCampaignCommandSchema>;

export const scheduleCampaignCommandSchema = z.object({
  campaignId: nonEmptyIdSchema,
  scheduledFor: isoDateTimeSchema,
  idempotencyKey: idempotencyKeySchema,
});
export type ScheduleCampaignCommand = z.input<typeof scheduleCampaignCommandSchema>;

export const professionalSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchIds: z.array(nonEmptyIdSchema).min(1),
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(8).max(32).optional(),
  roleLabel: z.string().trim().min(2).max(80).default('Profissional'),
  avatarUrl: optionalUrlSchema,
  status: directoryStatusSchema,
  archivedAt: isoDateTimeSchema.optional(),
});
export type Professional = z.infer<typeof professionalSchema>;

export const serviceSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  category: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: durationMinutesSchema,
  priceCents: moneyCentsSchema,
  estimatedCostCents: moneyCentsSchema.optional(),
  imageUrl: optionalUrlSchema,
  iconKey: z.string().trim().min(1).max(40).optional(),
  colorHex: colorHexSchema.optional(),
  status: directoryStatusSchema,
  enabledProfessionalIds: z.array(nonEmptyIdSchema).default([]),
  archivedAt: isoDateTimeSchema.optional(),
});
export type Service = z.infer<typeof serviceSchema>;

export const customerConsentSchema = z.object({
  whatsapp: z.boolean().default(false),
  marketing: z.boolean().default(false),
});
export type CustomerConsent = z.infer<typeof customerConsentSchema>;

export const customerSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(32),
  email: z.string().trim().email().optional(),
  birthDate: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional(),
  source: z.string().trim().min(2).max(80).optional(),
  preferredProfessionalId: nonEmptyIdSchema.optional(),
  avatarUrl: optionalUrlSchema,
  consents: customerConsentSchema.default({ whatsapp: false, marketing: false }),
  status: customerStatusSchema,
  archivedAt: isoDateTimeSchema.optional(),
});
export type Customer = z.infer<typeof customerSchema>;

export const supplierMetadataSchema = z
  .object({
    supplierName: z.string().trim().min(2).max(160).optional(),
    supplierDocument: z.string().trim().min(3).max(40).optional(),
    contactName: z.string().trim().min(2).max(120).optional(),
    contactPhone: z.string().trim().min(8).max(32).optional(),
    purchaseUrl: z.string().url().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Supplier metadata cannot be empty.',
  });
export type SupplierMetadata = z.infer<typeof supplierMetadataSchema>;

export const productCategorySchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchIds: z.array(nonEmptyIdSchema).min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  status: productStatusSchema,
  archivedAt: isoDateTimeSchema.optional(),
  createdBy: nonEmptyIdSchema,
  updatedBy: nonEmptyIdSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const productSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchIds: z.array(nonEmptyIdSchema).min(1),
  categoryId: nonEmptyIdSchema.optional(),
  sku: z.string().trim().min(1).max(80).optional(),
  barcode: z.string().trim().min(3).max(80).optional(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  status: productStatusSchema,
  salePriceAmountCents: positiveMoneyCentsSchema,
  costAmountCents: moneyCentsSchema.optional(),
  stockTrackingPolicy: stockTrackingPolicySchema,
  allowNegativeStock: z.boolean().default(false),
  minimumStockQuantity: z.number().int().min(0).default(0),
  supplierMetadata: supplierMetadataSchema.optional(),
  archivedAt: isoDateTimeSchema.optional(),
  createdBy: nonEmptyIdSchema,
  updatedBy: nonEmptyIdSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Product = z.infer<typeof productSchema>;

export const inventoryLocationSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  active: z.boolean().default(true),
  createdBy: nonEmptyIdSchema,
  updatedBy: nonEmptyIdSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type InventoryLocation = z.infer<typeof inventoryLocationSchema>;

export const stockMovementSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    locationId: nonEmptyIdSchema.optional(),
    productId: nonEmptyIdSchema,
    type: stockMovementTypeSchema,
    quantity: z
      .number()
      .int()
      .refine((value) => value !== 0, {
        message: 'Stock movement quantity cannot be zero.',
      }),
    balanceAfterQuantity: z.number().int().optional(),
    sourceType: stockSourceTypeSchema,
    sourceId: nonEmptyIdSchema.optional(),
    orderId: nonEmptyIdSchema.optional(),
    orderItemId: nonEmptyIdSchema.optional(),
    paymentId: nonEmptyIdSchema.optional(),
    idempotencyKey: idempotencyKeySchema.optional(),
    reason: z.string().trim().min(3).max(500).optional(),
    createdBy: nonEmptyIdSchema,
    createdAt: isoDateTimeSchema,
  })
  .refine(
    (value) =>
      (['ENTRY', 'TRANSFER_IN'].includes(value.type) && value.quantity > 0) ||
      (['SALE', 'LOSS', 'CONSUMPTION', 'TRANSFER_OUT'].includes(value.type) &&
        value.quantity < 0) ||
      value.type === 'ADJUSTMENT',
    {
      message: 'Stock movement quantity sign must match movement type.',
      path: ['quantity'],
    },
  );
export type StockMovement = z.infer<typeof stockMovementSchema>;

export const stockBalanceSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema,
  locationId: nonEmptyIdSchema.optional(),
  productId: nonEmptyIdSchema,
  currentQuantity: z.number().int(),
  minimumStockQuantity: z.number().int().min(0),
  lowStock: z.boolean(),
  lastMovementAt: isoDateTimeSchema.optional(),
  updatedAt: isoDateTimeSchema,
});
export type StockBalance = z.infer<typeof stockBalanceSchema>;

export const lowStockAlertSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema,
  productId: nonEmptyIdSchema,
  state: stockAlertStateSchema,
  currentQuantity: z.number().int(),
  minimumStockQuantity: z.number().int().min(0),
  triggeredAt: isoDateTimeSchema,
  resolvedAt: isoDateTimeSchema.optional(),
});
export type LowStockAlert = z.infer<typeof lowStockAlertSchema>;

export const professionalScheduleSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    professionalId: nonEmptyIdSchema,
    weekday: z.number().int().min(0).max(6),
    startsAtLocal: localTimeSchema,
    endsAtLocal: localTimeSchema,
    breakStartsAtLocal: localTimeSchema.optional(),
    breakEndsAtLocal: localTimeSchema.optional(),
    active: z.boolean(),
  })
  .refine((value) => value.startsAtLocal < value.endsAtLocal, {
    message: 'Schedule start must be before end.',
    path: ['endsAtLocal'],
  })
  .refine(
    (value) =>
      !value.breakStartsAtLocal ||
      !value.breakEndsAtLocal ||
      (value.startsAtLocal < value.breakStartsAtLocal &&
        value.breakStartsAtLocal < value.breakEndsAtLocal &&
        value.breakEndsAtLocal < value.endsAtLocal),
    {
      message: 'Schedule break must fit inside working hours.',
      path: ['breakEndsAtLocal'],
    },
  );
export type ProfessionalSchedule = z.infer<typeof professionalScheduleSchema>;

export const scheduleBlockSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    professionalId: nonEmptyIdSchema.optional(),
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
    type: scheduleBlockTypeSchema,
    reason: z.string().trim().max(500).optional(),
    active: z.boolean(),
  })
  .refine((value) => Date.parse(value.startsAt) < Date.parse(value.endsAt), {
    message: 'Schedule block start must be before end.',
    path: ['endsAt'],
  });
export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;

export const appointmentServiceSchema = z.object({
  serviceId: nonEmptyIdSchema,
  serviceName: z.string().trim().min(2).max(120),
  durationMinutes: durationMinutesSchema,
  priceCents: moneyCentsSchema,
  sequence: z.number().int().min(1),
});
export type AppointmentService = z.infer<typeof appointmentServiceSchema>;

export const appointmentSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    customerId: nonEmptyIdSchema,
    professionalId: nonEmptyIdSchema,
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
    status: appointmentStatusSchema,
    source: appointmentSourceSchema,
    notes: z.string().trim().max(2000).optional(),
    services: z.array(appointmentServiceSchema).min(1),
  })
  .refine((value) => Date.parse(value.startsAt) < Date.parse(value.endsAt), {
    message: 'Appointment start must be before end.',
    path: ['endsAt'],
  });
export type Appointment = z.infer<typeof appointmentSchema>;

export const appointmentStatusHistorySchema = z.object({
  id: nonEmptyIdSchema,
  appointmentId: nonEmptyIdSchema,
  previousStatus: appointmentStatusSchema.optional(),
  nextStatus: appointmentStatusSchema,
  actorId: nonEmptyIdSchema,
  reason: z.string().trim().max(500).optional(),
  createdAt: isoDateTimeSchema,
});
export type AppointmentStatusHistory = z.infer<typeof appointmentStatusHistorySchema>;

export const orderSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    appointmentId: nonEmptyIdSchema.optional(),
    customerId: nonEmptyIdSchema.optional(),
    professionalId: nonEmptyIdSchema.optional(),
    status: orderStatusSchema,
    subtotalAmountCents: moneyCentsSchema,
    discountAmountCents: moneyCentsSchema.default(0),
    totalAmountCents: moneyCentsSchema,
    notes: z.string().trim().max(2000).optional(),
    openedAt: isoDateTimeSchema,
    closedAt: isoDateTimeSchema.optional(),
    createdBy: nonEmptyIdSchema,
    updatedBy: nonEmptyIdSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine((value) => value.discountAmountCents <= value.subtotalAmountCents, {
    message: 'Order discount cannot exceed subtotal.',
    path: ['discountAmountCents'],
  })
  .refine(
    (value) => value.totalAmountCents === value.subtotalAmountCents - value.discountAmountCents,
    {
      message: 'Order total must match subtotal minus discount.',
      path: ['totalAmountCents'],
    },
  );
export type Order = z.infer<typeof orderSchema>;

export const orderItemSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    orderId: nonEmptyIdSchema,
    sourceType: orderItemSourceTypeSchema,
    sourceId: nonEmptyIdSchema.optional(),
    nameSnapshot: z.string().trim().min(2).max(160),
    quantity: z.number().int().min(1).max(999),
    unitPriceAmountCents: moneyCentsSchema,
    costAmountCents: moneyCentsSchema.optional(),
    discountAmountCents: moneyCentsSchema.default(0),
    finalAmountCents: moneyCentsSchema,
    professionalId: nonEmptyIdSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
    createdBy: nonEmptyIdSchema,
    createdAt: isoDateTimeSchema,
  })
  .refine((value) => value.discountAmountCents <= value.quantity * value.unitPriceAmountCents, {
    message: 'Order item discount cannot exceed line subtotal.',
    path: ['discountAmountCents'],
  })
  .refine(
    (value) =>
      value.finalAmountCents ===
      value.quantity * value.unitPriceAmountCents - value.discountAmountCents,
    {
      message: 'Order item final amount must match quantity, unit price and discount.',
      path: ['finalAmountCents'],
    },
  );
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderHistorySchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema,
  orderId: nonEmptyIdSchema,
  eventType: orderHistoryEventTypeSchema,
  actorId: nonEmptyIdSchema,
  reason: z.string().trim().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDateTimeSchema,
});
export type OrderHistory = z.infer<typeof orderHistorySchema>;

export const orderDetailSchema = z.intersection(
  orderSchema,
  z.object({
    items: z.array(orderItemSchema).default([]),
    history: z.array(orderHistorySchema).default([]),
  }),
);
export type OrderDetail = z.infer<typeof orderDetailSchema>;
export const paymentSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    orderId: nonEmptyIdSchema,
    method: paymentMethodSchema,
    status: paymentStatusSchema,
    amountCents: positiveMoneyCentsSchema,
    cashReceivedAmountCents: moneyCentsSchema.optional(),
    changeDueAmountCents: moneyCentsSchema.default(0),
    externalReference: z.string().trim().min(1).max(160).optional(),
    idempotencyKey: idempotencyKeySchema.optional(),
    receivedBy: nonEmptyIdSchema,
    receivedAt: isoDateTimeSchema,
    refundedAmountCents: moneyCentsSchema.default(0),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine((value) => value.refundedAmountCents <= value.amountCents, {
    message: 'Refunded amount cannot exceed payment amount.',
    path: ['refundedAmountCents'],
  })
  .refine(
    (value) =>
      value.method !== 'CASH' ||
      value.cashReceivedAmountCents === undefined ||
      value.cashReceivedAmountCents >= value.amountCents,
    {
      message: 'Cash received amount must cover the applied cash payment amount.',
      path: ['cashReceivedAmountCents'],
    },
  )
  .refine(
    (value) =>
      value.method === 'CASH' ||
      (value.cashReceivedAmountCents === undefined && value.changeDueAmountCents === 0),
    {
      message: 'Only cash payments can include cash received or change due.',
      path: ['method'],
    },
  );
export type Payment = z.infer<typeof paymentSchema>;

export const paymentTerminalProviderSchema = z.enum(['MOCK_TERMINAL', 'MERCADO_PAGO']);
export type PaymentTerminalProvider = z.infer<typeof paymentTerminalProviderSchema>;

export const terminalPaymentMethodSchema = z.enum(['PIX', 'DEBIT_CARD', 'CREDIT_CARD']);
export type TerminalPaymentMethod = z.infer<typeof terminalPaymentMethodSchema>;

export const paymentTerminalStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ERROR']);
export type PaymentTerminalStatus = z.infer<typeof paymentTerminalStatusSchema>;

export const paymentTerminalIntentStatusSchema = z.enum([
  'PENDING',
  'SENT_TO_TERMINAL',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
]);
export type PaymentTerminalIntentStatus = z.infer<typeof paymentTerminalIntentStatusSchema>;

export const paymentTerminalSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema,
  provider: paymentTerminalProviderSchema,
  providerTerminalId: z.string().trim().min(1).max(160),
  name: z.string().trim().min(2).max(120),
  status: paymentTerminalStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type PaymentTerminal = z.infer<typeof paymentTerminalSchema>;

export const paymentTerminalIntentSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema,
  orderId: nonEmptyIdSchema,
  terminalId: nonEmptyIdSchema,
  provider: paymentTerminalProviderSchema,
  method: terminalPaymentMethodSchema,
  status: paymentTerminalIntentStatusSchema,
  amountCents: positiveMoneyCentsSchema,
  installments: z.number().int().min(1).max(24).optional(),
  providerIntentId: z.string().trim().min(1).max(180).optional(),
  providerReference: z.string().trim().min(1).max(180).optional(),
  paymentId: nonEmptyIdSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
  createdBy: nonEmptyIdSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  paidAt: isoDateTimeSchema.optional(),
  failureCode: z.string().trim().min(1).max(80).optional(),
  failureMessage: z.string().trim().min(1).max(300).optional(),
});
export type PaymentTerminalIntent = z.infer<typeof paymentTerminalIntentSchema>;

export const paymentAllocationSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema,
  paymentId: nonEmptyIdSchema,
  orderId: nonEmptyIdSchema,
  amountCents: positiveMoneyCentsSchema,
  createdAt: isoDateTimeSchema,
});
export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>;

export const cashRegisterSessionSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    status: cashRegisterSessionStatusSchema,
    openedBy: nonEmptyIdSchema,
    openedAt: isoDateTimeSchema,
    openingBalanceAmountCents: moneyCentsSchema,
    expectedBalanceAmountCents: moneyCentsSchema,
    actualBalanceAmountCents: moneyCentsSchema.optional(),
    differenceAmountCents: signedMoneyCentsSchema.default(0),
    closedBy: nonEmptyIdSchema.optional(),
    closedAt: isoDateTimeSchema.optional(),
    closingNotes: z.string().trim().max(500).optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine((value) => value.status !== 'CLOSED' || Boolean(value.closedBy && value.closedAt), {
    message: 'Closed cash sessions require closing actor and timestamp.',
    path: ['closedAt'],
  });
export type CashRegisterSession = z.infer<typeof cashRegisterSessionSchema>;

export const cashMovementSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema,
  sessionId: nonEmptyIdSchema,
  type: cashMovementTypeSchema,
  amountCents: moneyCentsSchema,
  signedAmountCents: signedMoneyCentsSchema,
  orderId: nonEmptyIdSchema.optional(),
  paymentId: nonEmptyIdSchema.optional(),
  reason: z.string().trim().min(3).max(500).optional(),
  createdBy: nonEmptyIdSchema,
  createdAt: isoDateTimeSchema,
});
export type CashMovement = z.infer<typeof cashMovementSchema>;

export const financialEntrySourceTypeSchema = z.enum([
  'PAYMENT',
  'REFUND',
  'EXPENSE',
  'COMMISSION_ACCRUAL',
  'PAYOUT',
  'CASH_MOVEMENT',
  'MANUAL_ADJUSTMENT',
]);
export type FinancialEntrySourceType = z.infer<typeof financialEntrySourceTypeSchema>;

export const financialCategoryDirectionSchema = z.enum(['IN', 'OUT', 'BOTH']);
export type FinancialCategoryDirection = z.infer<typeof financialCategoryDirectionSchema>;

export const financialCategorySchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  direction: financialCategoryDirectionSchema,
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#64748b'),
  icon: z.string().trim().min(2).max(80).default('wallet'),
  status: directoryStatusSchema.default('ACTIVE'),
  systemDefault: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(100),
  createdBy: nonEmptyIdSchema.optional(),
  updatedBy: nonEmptyIdSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type FinancialCategory = z.infer<typeof financialCategorySchema>;

export const financialEntrySchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    direction: financialEntryDirectionSchema,
    type: financialEntryTypeSchema,
    status: financialEntryStatusSchema.default('POSTED'),
    amountCents: positiveMoneyCentsSchema,
    signedAmountCents: signedMoneyCentsSchema,
    competenceDate: z.string().date(),
    cashDate: z.string().date().optional(),
    sourceType: financialEntrySourceTypeSchema,
    sourceId: nonEmptyIdSchema,
    categoryId: nonEmptyIdSchema.optional(),
    financialCategoryId: nonEmptyIdSchema.optional(),
    description: z.string().trim().min(2).max(300).optional(),
    idempotencyKey: idempotencyKeySchema.optional(),
    reversedEntryId: nonEmptyIdSchema.optional(),
    createdBy: nonEmptyIdSchema,
    createdAt: isoDateTimeSchema,
  })
  .refine(
    (value) =>
      (value.direction === 'IN' && value.signedAmountCents > 0) ||
      (value.direction === 'OUT' && value.signedAmountCents < 0),
    {
      message: 'Financial entry signed amount must match direction.',
      path: ['signedAmountCents'],
    },
  )
  .refine((value) => Math.abs(value.signedAmountCents) === value.amountCents, {
    message: 'Financial entry amount must match absolute signed amount.',
    path: ['amountCents'],
  });
export type FinancialEntry = z.infer<typeof financialEntrySchema>;

export const expenseCategorySchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  status: directoryStatusSchema.default('ACTIVE'),
  createdBy: nonEmptyIdSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

export const expenseSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    categoryId: nonEmptyIdSchema.optional(),
    financialCategoryId: nonEmptyIdSchema.optional(),
    description: z.string().trim().min(2).max(300),
    vendorName: z.string().trim().min(2).max(160).optional(),
    status: expenseStatusSchema,
    amountCents: positiveMoneyCentsSchema,
    competenceDate: z.string().date(),
    dueDate: z.string().date().optional(),
    cashDate: z.string().date().optional(),
    paymentMethod: paymentMethodSchema.optional(),
    recurrenceKey: z.string().trim().min(3).max(120).optional(),
    documentMetadata: z.record(z.string(), z.unknown()).default({}),
    financialEntryId: nonEmptyIdSchema.optional(),
    idempotencyKey: idempotencyKeySchema.optional(),
    createdBy: nonEmptyIdSchema,
    updatedBy: nonEmptyIdSchema,
    paidBy: nonEmptyIdSchema.optional(),
    paidAt: isoDateTimeSchema.optional(),
    cancelledBy: nonEmptyIdSchema.optional(),
    cancelledAt: isoDateTimeSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine(
    (value) =>
      value.status !== 'PAID' ||
      Boolean(value.cashDate && value.paymentMethod && value.paidBy && value.paidAt),
    {
      message: 'Paid expenses require cash date, payment method, actor and timestamp.',
      path: ['status'],
    },
  )
  .refine(
    (value) => value.status !== 'CANCELLED' || Boolean(value.cancelledBy && value.cancelledAt),
    {
      message: 'Cancelled expenses require actor and timestamp.',
      path: ['status'],
    },
  );
export type Expense = z.infer<typeof expenseSchema>;

export const commissionRuleSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema.optional(),
    scope: commissionRuleScopeSchema,
    type: commissionRuleTypeSchema,
    status: commissionRuleStatusSchema,
    professionalId: nonEmptyIdSchema.optional(),
    sourceType: orderItemSourceTypeSchema.optional(),
    sourceId: nonEmptyIdSchema.optional(),
    percentageBps: z.number().int().min(1).max(10000).optional(),
    fixedAmountCents: positiveMoneyCentsSchema.optional(),
    effectiveFrom: z.string().date(),
    effectiveUntil: z.string().date().optional(),
    createdBy: nonEmptyIdSchema,
    updatedBy: nonEmptyIdSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine(
    (value) =>
      (value.type === 'PERCENTAGE' &&
        value.percentageBps !== undefined &&
        value.fixedAmountCents === undefined) ||
      (value.type === 'FIXED_AMOUNT' &&
        value.fixedAmountCents !== undefined &&
        value.percentageBps === undefined),
    {
      message: 'Commission rule amount fields must match the rule type.',
      path: ['type'],
    },
  )
  .refine(
    (value) => value.effectiveUntil === undefined || value.effectiveFrom <= value.effectiveUntil,
    {
      message: 'Commission rule effective end must be after start.',
      path: ['effectiveUntil'],
    },
  );
export type CommissionRule = z.infer<typeof commissionRuleSchema>;

export const commissionAccrualSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    professionalId: nonEmptyIdSchema,
    orderId: nonEmptyIdSchema,
    orderItemId: nonEmptyIdSchema,
    paymentId: nonEmptyIdSchema.optional(),
    ruleId: nonEmptyIdSchema.optional(),
    ruleTypeSnapshot: commissionRuleTypeSchema,
    ruleScopeSnapshot: commissionRuleScopeSchema,
    rulePercentageBpsSnapshot: z.number().int().min(1).max(10000).optional(),
    ruleFixedAmountCentsSnapshot: positiveMoneyCentsSchema.optional(),
    baseAmountCents: positiveMoneyCentsSchema,
    commissionAmountCents: positiveMoneyCentsSchema,
    status: commissionAccrualStatusSchema,
    accruedAt: isoDateTimeSchema,
    reversedAccrualId: nonEmptyIdSchema.optional(),
    payoutId: nonEmptyIdSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine(
    (value) =>
      (value.ruleTypeSnapshot === 'PERCENTAGE' &&
        value.rulePercentageBpsSnapshot !== undefined &&
        value.ruleFixedAmountCentsSnapshot === undefined) ||
      (value.ruleTypeSnapshot === 'FIXED_AMOUNT' &&
        value.ruleFixedAmountCentsSnapshot !== undefined &&
        value.rulePercentageBpsSnapshot === undefined),
    {
      message: 'Commission accrual rule snapshot must match the rule type.',
      path: ['ruleTypeSnapshot'],
    },
  );
export type CommissionAccrual = z.infer<typeof commissionAccrualSchema>;

export const payoutSourceSchema = z.object({
  accrualId: nonEmptyIdSchema,
  amountCents: positiveMoneyCentsSchema,
});
export type PayoutSource = z.infer<typeof payoutSourceSchema>;

export const payoutSchema = z
  .object({
    id: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    professionalId: nonEmptyIdSchema,
    status: payoutStatusSchema,
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    totalAmountCents: positiveMoneyCentsSchema,
    sources: z.array(payoutSourceSchema).min(1),
    paymentMethod: paymentMethodSchema.optional(),
    financialEntryId: nonEmptyIdSchema.optional(),
    cashMovementId: nonEmptyIdSchema.optional(),
    idempotencyKey: idempotencyKeySchema.optional(),
    closedBy: nonEmptyIdSchema.optional(),
    closedAt: isoDateTimeSchema.optional(),
    approvedBy: nonEmptyIdSchema.optional(),
    approvedAt: isoDateTimeSchema.optional(),
    paidBy: nonEmptyIdSchema.optional(),
    paidAt: isoDateTimeSchema.optional(),
    correctionReason: z.string().trim().min(3).max(500).optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine((value) => value.periodStart <= value.periodEnd, {
    message: 'Payout period end must be after start.',
    path: ['periodEnd'],
  })
  .refine(
    (value) =>
      value.sources.reduce((total, source) => total + source.amountCents, 0) ===
      value.totalAmountCents,
    {
      message: 'Payout total must match included source amounts.',
      path: ['totalAmountCents'],
    },
  )
  .refine(
    (value) =>
      !['CLOSED', 'APPROVED', 'PAID'].includes(value.status) ||
      Boolean(value.closedBy && value.closedAt),
    {
      message: 'Closed payouts require actor and timestamp.',
      path: ['status'],
    },
  )
  .refine(
    (value) =>
      value.status !== 'PAID' || Boolean(value.paymentMethod && value.paidBy && value.paidAt),
    {
      message: 'Paid payouts require payment method, actor and timestamp.',
      path: ['status'],
    },
  );
export type Payout = z.infer<typeof payoutSchema>;

export const payoutAllocationSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema,
  payoutId: nonEmptyIdSchema,
  accrualId: nonEmptyIdSchema,
  amountCents: positiveMoneyCentsSchema,
  createdAt: isoDateTimeSchema,
});
export type PayoutAllocation = z.infer<typeof payoutAllocationSchema>;

export const financeSummarySchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  revenueAmountCents: moneyCentsSchema,
  expenseAmountCents: moneyCentsSchema,
  resultAmountCents: signedMoneyCentsSchema,
  commissionLiabilityAmountCents: moneyCentsSchema,
  paidPayoutAmountCents: moneyCentsSchema,
  cashInAmountCents: moneyCentsSchema,
  cashOutAmountCents: moneyCentsSchema,
  entriesCount: z.number().int().min(0),
});
export type FinanceSummary = z.infer<typeof financeSummarySchema>;

export const expenseListResponseSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  periodStart: z.string().date().optional(),
  periodEnd: z.string().date().optional(),
  expenses: z.array(expenseSchema),
  openAmountCents: moneyCentsSchema,
  overdueAmountCents: moneyCentsSchema,
  paidAmountCents: moneyCentsSchema,
  totalAmountCents: moneyCentsSchema,
});
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;

export const commissionSummarySchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  openAccrualAmountCents: moneyCentsSchema,
  settledAccrualAmountCents: moneyCentsSchema,
  reversedAccrualAmountCents: moneyCentsSchema,
  paidPayoutAmountCents: moneyCentsSchema,
  professionalCount: z.number().int().min(0),
  accrualCount: z.number().int().min(0),
});
export type CommissionSummary = z.infer<typeof commissionSummarySchema>;

export const payoutDetailSchema = z.object({
  payout: payoutSchema,
  allocations: z.array(payoutAllocationSchema),
  accruals: z.array(commissionAccrualSchema),
});
export type PayoutDetail = z.infer<typeof payoutDetailSchema>;

export const professionalWalletSchema = z.object({
  tenantId: nonEmptyIdSchema,
  professionalId: nonEmptyIdSchema,
  branchIds: z.array(nonEmptyIdSchema).min(1),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  productionAmountCents: moneyCentsSchema,
  openCommissionAmountCents: moneyCentsSchema,
  paidPayoutAmountCents: moneyCentsSchema,
  expectedBalanceAmountCents: signedMoneyCentsSchema,
  accruals: z.array(commissionAccrualSchema),
  payouts: z.array(payoutSchema),
});
export type ProfessionalWallet = z.infer<typeof professionalWalletSchema>;

export const productListResponseSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  products: z.array(productSchema),
  categories: z.array(productCategorySchema).default([]),
  balances: z.array(stockBalanceSchema).default([]),
  alerts: z.array(lowStockAlertSchema).default([]),
  nextCursor: z.string().trim().min(1).optional(),
});
export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const productDetailResponseSchema = z.object({
  tenantId: nonEmptyIdSchema,
  branchId: nonEmptyIdSchema.optional(),
  product: productSchema,
  category: productCategorySchema.optional(),
  balances: z.array(stockBalanceSchema).default([]),
  movements: z.array(stockMovementSchema).default([]),
  alerts: z.array(lowStockAlertSchema).default([]),
});
export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;

export const listQuerySchema = z.object({
  branchId: nonEmptyIdSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  includeArchived: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().trim().min(1).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export const createProfessionalCommandSchema = z.object({
  branchIds: z.array(nonEmptyIdSchema).min(1),
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(8).max(32).optional(),
  roleLabel: z.string().trim().min(2).max(80).default('Profissional'),
  avatarUrl: optionalUrlSchema,
});
export type CreateProfessionalCommand = z.input<typeof createProfessionalCommandSchema>;

export const updateProfessionalCommandSchema = createProfessionalCommandSchema.partial().extend({
  id: nonEmptyIdSchema,
  status: directoryStatusSchema.optional(),
});
export type UpdateProfessionalCommand = z.input<typeof updateProfessionalCommandSchema>;

export const createServiceCommandSchema = z.object({
  category: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: durationMinutesSchema,
  priceCents: moneyCentsSchema,
  estimatedCostCents: moneyCentsSchema.optional(),
  imageUrl: optionalUrlSchema,
  iconKey: z.string().trim().min(1).max(40).optional(),
  colorHex: colorHexSchema.optional(),
  enabledProfessionalIds: z.array(nonEmptyIdSchema).default([]),
});
export type CreateServiceCommand = z.input<typeof createServiceCommandSchema>;

export const updateServiceCommandSchema = createServiceCommandSchema.partial().extend({
  id: nonEmptyIdSchema,
  status: directoryStatusSchema.optional(),
});
export type UpdateServiceCommand = z.input<typeof updateServiceCommandSchema>;

export const createCustomerCommandSchema = z.object({
  branchId: nonEmptyIdSchema.optional(),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(32),
  email: z.string().trim().email().optional(),
  birthDate: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional(),
  source: z.string().trim().min(2).max(80).optional(),
  preferredProfessionalId: nonEmptyIdSchema.optional(),
  avatarUrl: optionalUrlSchema,
  consents: customerConsentSchema.default({ whatsapp: false, marketing: false }),
});
export type CreateCustomerCommand = z.input<typeof createCustomerCommandSchema>;

export const updateCustomerCommandSchema = createCustomerCommandSchema.partial().extend({
  id: nonEmptyIdSchema,
  status: customerStatusSchema.optional(),
});
export type UpdateCustomerCommand = z.input<typeof updateCustomerCommandSchema>;

const productSaleStatusCommandSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const createProductCategoryCommandSchema = z.object({
  branchIds: z.array(nonEmptyIdSchema).min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  status: productSaleStatusCommandSchema.default('ACTIVE'),
});
export type CreateProductCategoryCommand = z.input<typeof createProductCategoryCommandSchema>;

export const updateProductCategoryCommandSchema = createProductCategoryCommandSchema
  .partial()
  .extend({ id: nonEmptyIdSchema })
  .refine((value) => Object.keys(value).some((key) => key !== 'id'), {
    message: 'Product category update requires at least one mutable field.',
  });
export type UpdateProductCategoryCommand = z.input<typeof updateProductCategoryCommandSchema>;

export const archiveProductCategoryCommandSchema = z.object({
  id: nonEmptyIdSchema,
  reason: z.string().trim().min(3).max(500).optional(),
});
export type ArchiveProductCategoryCommand = z.input<typeof archiveProductCategoryCommandSchema>;

export const createProductCommandSchema = z.object({
  branchIds: z.array(nonEmptyIdSchema).min(1),
  categoryId: nonEmptyIdSchema.optional(),
  sku: z.string().trim().min(1).max(80).optional(),
  barcode: z.string().trim().min(3).max(80).optional(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  status: productSaleStatusCommandSchema.default('ACTIVE'),
  salePriceAmountCents: positiveMoneyCentsSchema,
  costAmountCents: moneyCentsSchema.optional(),
  stockTrackingPolicy: stockTrackingPolicySchema.default('TRACKED'),
  allowNegativeStock: z.boolean().default(false),
  minimumStockQuantity: z.number().int().min(0).default(0),
  supplierMetadata: supplierMetadataSchema.optional(),
});
export type CreateProductCommand = z.input<typeof createProductCommandSchema>;

export const updateProductCommandSchema = createProductCommandSchema
  .partial()
  .extend({ id: nonEmptyIdSchema })
  .refine((value) => Object.keys(value).some((key) => key !== 'id'), {
    message: 'Product update requires at least one mutable field.',
  });
export type UpdateProductCommand = z.input<typeof updateProductCommandSchema>;

export const archiveProductCommandSchema = z.object({
  id: nonEmptyIdSchema,
  reason: z.string().trim().min(3).max(500).optional(),
});
export type ArchiveProductCommand = z.input<typeof archiveProductCommandSchema>;

const stockCommandBaseSchema = z.object({
  branchId: nonEmptyIdSchema,
  locationId: nonEmptyIdSchema.optional(),
  productId: nonEmptyIdSchema,
  idempotencyKey: idempotencyKeySchema,
});

const stockReasonSchema = z.string().trim().min(3).max(500);

export const createStockEntryCommandSchema = stockCommandBaseSchema.extend({
  quantity: z.number().int().positive(),
  unitCostAmountCents: moneyCentsSchema.optional(),
  supplierMetadata: supplierMetadataSchema.optional(),
  reason: stockReasonSchema.optional(),
});
export type CreateStockEntryCommand = z.input<typeof createStockEntryCommandSchema>;

export const createStockSaleEffectCommandSchema = stockCommandBaseSchema.extend({
  quantity: z.number().int().negative(),
  orderId: nonEmptyIdSchema,
  orderItemId: nonEmptyIdSchema,
  paymentId: nonEmptyIdSchema,
});
export type CreateStockSaleEffectCommand = z.input<typeof createStockSaleEffectCommandSchema>;

export const createStockLossCommandSchema = stockCommandBaseSchema.extend({
  quantity: z.number().int().negative(),
  reason: stockReasonSchema,
});
export type CreateStockLossCommand = z.input<typeof createStockLossCommandSchema>;

export const createStockConsumptionCommandSchema = stockCommandBaseSchema.extend({
  quantity: z.number().int().negative(),
  reason: stockReasonSchema,
});
export type CreateStockConsumptionCommand = z.input<typeof createStockConsumptionCommandSchema>;

export const createStockAdjustmentCommandSchema = stockCommandBaseSchema.extend({
  quantity: z
    .number()
    .int()
    .refine((value) => value !== 0, {
      message: 'Stock adjustment quantity cannot be zero.',
    }),
  reason: stockReasonSchema,
});
export type CreateStockAdjustmentCommand = z.input<typeof createStockAdjustmentCommandSchema>;

export const createStockTransferCommandSchema = z.object({
  branchId: nonEmptyIdSchema,
  productId: nonEmptyIdSchema,
  fromLocationId: nonEmptyIdSchema,
  toLocationId: nonEmptyIdSchema,
  quantity: z.number().int().positive(),
  idempotencyKey: idempotencyKeySchema,
  reason: stockReasonSchema,
});
export type CreateStockTransferCommand = z.input<typeof createStockTransferCommandSchema>;

export const createProfessionalScheduleCommandSchema = z
  .object({
    branchId: nonEmptyIdSchema,
    professionalId: nonEmptyIdSchema,
    weekday: z.number().int().min(0).max(6),
    startsAtLocal: localTimeSchema,
    endsAtLocal: localTimeSchema,
    breakStartsAtLocal: localTimeSchema.optional(),
    breakEndsAtLocal: localTimeSchema.optional(),
    active: z.boolean().default(true),
  })
  .refine((value) => value.startsAtLocal < value.endsAtLocal, {
    message: 'Schedule start must be before end.',
    path: ['endsAtLocal'],
  })
  .refine(
    (value) =>
      !value.breakStartsAtLocal ||
      !value.breakEndsAtLocal ||
      (value.startsAtLocal < value.breakStartsAtLocal &&
        value.breakStartsAtLocal < value.breakEndsAtLocal &&
        value.breakEndsAtLocal < value.endsAtLocal),
    {
      message: 'Schedule break must fit inside working hours.',
      path: ['breakEndsAtLocal'],
    },
  );
export type CreateProfessionalScheduleCommand = z.input<
  typeof createProfessionalScheduleCommandSchema
>;

export const createScheduleBlockCommandSchema = z
  .object({
    branchId: nonEmptyIdSchema,
    professionalId: nonEmptyIdSchema.optional(),
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
    type: scheduleBlockTypeSchema,
    reason: z.string().trim().max(500).optional(),
    active: z.boolean().default(true),
  })
  .refine((value) => Date.parse(value.startsAt) < Date.parse(value.endsAt), {
    message: 'Schedule block start must be before end.',
    path: ['endsAt'],
  });
export type CreateScheduleBlockCommand = z.input<typeof createScheduleBlockCommandSchema>;

export const availabilityQuerySchema = z
  .object({
    branchId: nonEmptyIdSchema,
    serviceId: nonEmptyIdSchema,
    professionalId: nonEmptyIdSchema.optional(),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    slotStepMinutes: z.number().int().min(5).max(120).default(15),
  })
  .refine((value) => value.startsOn <= value.endsOn, {
    message: 'Availability start date must be before or equal to end date.',
    path: ['endsOn'],
  });
export type AvailabilityQuery = z.input<typeof availabilityQuerySchema>;

export const createAppointmentCommandSchema = z.object({
  branchId: nonEmptyIdSchema,
  customerId: nonEmptyIdSchema,
  professionalId: nonEmptyIdSchema,
  startsAt: isoDateTimeSchema,
  services: z.array(z.object({ serviceId: nonEmptyIdSchema })).min(1),
  status: z.enum(['PENDING', 'CONFIRMED']).default('CONFIRMED'),
  source: appointmentSourceSchema.default('MANUAL'),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateAppointmentCommand = z.input<typeof createAppointmentCommandSchema>;

export const rescheduleAppointmentCommandSchema = z.object({
  id: nonEmptyIdSchema,
  startsAt: isoDateTimeSchema,
  professionalId: nonEmptyIdSchema.optional(),
  reason: z.string().trim().max(500).optional(),
});
export type RescheduleAppointmentCommand = z.infer<typeof rescheduleAppointmentCommandSchema>;

export const updateAppointmentStatusCommandSchema = z.object({
  id: nonEmptyIdSchema,
  status: appointmentStatusSchema,
  reason: z.string().trim().max(500).optional(),
});
export type UpdateAppointmentStatusCommand = z.infer<typeof updateAppointmentStatusCommandSchema>;

export const cancelAppointmentCommandSchema = z.object({
  id: nonEmptyIdSchema,
  reason: z.string().trim().max(500).optional(),
});
export type CancelAppointmentCommand = z.infer<typeof cancelAppointmentCommandSchema>;

export const createWalkInOrderCommandSchema = z.object({
  branchId: nonEmptyIdSchema,
  customerId: nonEmptyIdSchema.optional(),
  professionalId: nonEmptyIdSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateWalkInOrderCommand = z.input<typeof createWalkInOrderCommandSchema>;

export const checkInAppointmentCommandSchema = z.object({
  appointmentId: nonEmptyIdSchema,
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CheckInAppointmentCommand = z.input<typeof checkInAppointmentCommandSchema>;

const orderStatusTransitionTargets: Record<OrderStatus, readonly OrderStatus[]> = {
  OPEN: ['IN_SERVICE', 'READY_FOR_PAYMENT', 'CANCELLED'],
  IN_SERVICE: ['READY_FOR_PAYMENT', 'CANCELLED'],
  READY_FOR_PAYMENT: ['IN_SERVICE', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus) {
  return from === to || orderStatusTransitionTargets[from].includes(to);
}

export const updateOrderStatusCommandSchema = z
  .object({
    id: nonEmptyIdSchema,
    fromStatus: orderStatusSchema,
    toStatus: orderStatusSchema,
    reason: z.string().trim().max(500).optional(),
  })
  .refine((value) => canTransitionOrderStatus(value.fromStatus, value.toStatus), {
    message: 'Invalid order status transition.',
    path: ['toStatus'],
  });
export type UpdateOrderStatusCommand = z.input<typeof updateOrderStatusCommandSchema>;

export const listOrdersQuerySchema = z.object({
  branchId: nonEmptyIdSchema.optional(),
  status: orderStatusSchema.optional(),
  customerId: nonEmptyIdSchema.optional(),
  professionalId: nonEmptyIdSchema.optional(),
  appointmentId: nonEmptyIdSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().trim().min(1).optional(),
});
export type ListOrdersQuery = z.input<typeof listOrdersQuerySchema>;

export const createOrderItemCommandSchema = z
  .object({
    orderId: nonEmptyIdSchema,
    sourceType: orderItemSourceTypeSchema,
    sourceId: nonEmptyIdSchema.optional(),
    name: z.string().trim().min(2).max(160),
    quantity: z.number().int().min(1).max(999).default(1),
    unitPriceAmountCents: moneyCentsSchema,
    costAmountCents: moneyCentsSchema.optional(),
    discountAmountCents: moneyCentsSchema.default(0),
    professionalId: nonEmptyIdSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((value) => value.discountAmountCents <= value.quantity * value.unitPriceAmountCents, {
    message: 'Order item discount cannot exceed line subtotal.',
    path: ['discountAmountCents'],
  });
export type CreateOrderItemCommand = z.input<typeof createOrderItemCommandSchema>;

export const updateOrderItemCommandSchema = z
  .object({
    orderId: nonEmptyIdSchema,
    itemId: nonEmptyIdSchema,
    quantity: z.number().int().min(1).max(999).optional(),
    discountAmountCents: moneyCentsSchema.optional(),
    professionalId: nonEmptyIdSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) =>
      value.quantity !== undefined ||
      value.discountAmountCents !== undefined ||
      value.professionalId !== undefined ||
      value.notes !== undefined,
    {
      message: 'At least one order item field must be provided.',
      path: ['itemId'],
    },
  );
export type UpdateOrderItemCommand = z.input<typeof updateOrderItemCommandSchema>;

export const removeOrderItemCommandSchema = z.object({
  orderId: nonEmptyIdSchema,
  itemId: nonEmptyIdSchema,
  reason: z.string().trim().max(500).optional(),
});
export type RemoveOrderItemCommand = z.input<typeof removeOrderItemCommandSchema>;
const receivePaymentLineSchema = z
  .object({
    method: paymentMethodSchema,
    amountCents: positiveMoneyCentsSchema,
    cashReceivedAmountCents: moneyCentsSchema.optional(),
    externalReference: z.string().trim().min(1).max(160).optional(),
    installments: z.number().int().min(1).max(24).optional(),
  })
  .refine(
    (value) =>
      value.method !== 'CASH' ||
      value.cashReceivedAmountCents === undefined ||
      value.cashReceivedAmountCents >= value.amountCents,
    {
      message: 'Cash received amount must cover the applied cash payment amount.',
      path: ['cashReceivedAmountCents'],
    },
  )
  .refine((value) => value.method !== 'CASH' || value.installments === undefined, {
    message: 'Cash payments cannot have installments.',
    path: ['installments'],
  });
export type ReceivePaymentLine = z.infer<typeof receivePaymentLineSchema>;

export const receivePaymentCommandSchema = z.object({
  orderId: nonEmptyIdSchema,
  idempotencyKey: idempotencyKeySchema,
  payments: z.array(receivePaymentLineSchema).min(1).max(8),
  notes: z.string().trim().max(500).optional(),
});
export type ReceivePaymentCommand = z.input<typeof receivePaymentCommandSchema>;

export const createPaymentTerminalIntentCommandSchema = z.object({
  orderId: nonEmptyIdSchema,
  terminalId: nonEmptyIdSchema,
  method: terminalPaymentMethodSchema,
  amountCents: positiveMoneyCentsSchema,
  installments: z.number().int().min(1).max(24).optional(),
  idempotencyKey: idempotencyKeySchema,
  notes: z.string().trim().max(500).optional(),
});
export type CreatePaymentTerminalIntentCommand = z.infer<
  typeof createPaymentTerminalIntentCommandSchema
>;

export const refundPaymentCommandSchema = z.object({
  paymentId: nonEmptyIdSchema,
  amountCents: positiveMoneyCentsSchema,
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: idempotencyKeySchema,
});
export type RefundPaymentCommand = z.input<typeof refundPaymentCommandSchema>;

export const openCashRegisterCommandSchema = z.object({
  branchId: nonEmptyIdSchema,
  openingBalanceAmountCents: moneyCentsSchema,
  idempotencyKey: idempotencyKeySchema,
  notes: z.string().trim().max(500).optional(),
});
export type OpenCashRegisterCommand = z.input<typeof openCashRegisterCommandSchema>;

export const cashRegisterMovementCommandSchema = z.object({
  branchId: nonEmptyIdSchema,
  type: z.enum(['WITHDRAWAL', 'CASH_IN', 'ADJUSTMENT']),
  amountCents: positiveMoneyCentsSchema,
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: idempotencyKeySchema,
});
export type CashRegisterMovementCommand = z.input<typeof cashRegisterMovementCommandSchema>;

export const closeCashRegisterCommandSchema = z
  .object({
    sessionId: nonEmptyIdSchema,
    actualBalanceAmountCents: moneyCentsSchema,
    expectedBalanceAmountCents: moneyCentsSchema.optional(),
    differenceReason: z.string().trim().min(3).max(500).optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .refine(
    (value) =>
      value.expectedBalanceAmountCents === undefined ||
      value.actualBalanceAmountCents === value.expectedBalanceAmountCents ||
      Boolean(value.differenceReason),
    {
      message: 'Cash closing divergence requires a reason.',
      path: ['differenceReason'],
    },
  );
export type CloseCashRegisterCommand = z.input<typeof closeCashRegisterCommandSchema>;

export const expenseRecurrenceSchema = z.object({
  frequency: expenseRecurrenceFrequencySchema,
  interval: z.number().int().min(1).max(36).default(1),
  endsOn: z.string().date().optional(),
});
export type ExpenseRecurrence = z.infer<typeof expenseRecurrenceSchema>;

const createExpenseCommandBaseSchema = z.object({
  branchId: nonEmptyIdSchema,
  categoryId: nonEmptyIdSchema.optional(),
  financialCategoryId: nonEmptyIdSchema.optional(),
  description: z.string().trim().min(2).max(300),
  vendorName: z.string().trim().min(2).max(160).optional(),
  amountCents: positiveMoneyCentsSchema,
  competenceDate: z.string().date(),
  dueDate: z.string().date().optional(),
  recurrence: expenseRecurrenceSchema.optional(),
  documentMetadata: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().trim().max(500).optional(),
});

export const createExpenseCommandSchema = createExpenseCommandBaseSchema.refine(
  (value) =>
    value.recurrence?.endsOn === undefined || value.competenceDate <= value.recurrence.endsOn,
  {
    message: 'Expense recurrence end must be after competence date.',
    path: ['recurrence', 'endsOn'],
  },
);
export type CreateExpenseCommand = z.input<typeof createExpenseCommandSchema>;

export const updateExpenseCommandSchema = createExpenseCommandBaseSchema
  .partial()
  .extend({ id: nonEmptyIdSchema })
  .refine(
    (value) =>
      value.categoryId !== undefined ||
      value.description !== undefined ||
      value.vendorName !== undefined ||
      value.amountCents !== undefined ||
      value.competenceDate !== undefined ||
      value.dueDate !== undefined ||
      value.recurrence !== undefined ||
      value.documentMetadata !== undefined ||
      value.notes !== undefined,
    {
      message: 'At least one expense field must be provided.',
      path: ['id'],
    },
  );
export type UpdateExpenseCommand = z.input<typeof updateExpenseCommandSchema>;

export const payExpenseCommandSchema = z
  .object({
    expenseId: nonEmptyIdSchema,
    paymentMethod: paymentMethodSchema,
    cashDate: z.string().date(),
    amountCents: positiveMoneyCentsSchema.optional(),
    cashRegisterSessionId: nonEmptyIdSchema.optional(),
    idempotencyKey: idempotencyKeySchema,
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.paymentMethod !== 'CASH' || Boolean(value.cashRegisterSessionId), {
    message: 'Cash expense payments require an open cash register session id.',
    path: ['cashRegisterSessionId'],
  });
export type PayExpenseCommand = z.input<typeof payExpenseCommandSchema>;

export const cancelExpenseCommandSchema = z.object({
  expenseId: nonEmptyIdSchema,
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: idempotencyKeySchema.optional(),
});
export type CancelExpenseCommand = z.input<typeof cancelExpenseCommandSchema>;

const createCommissionRuleCommandBaseSchema = z.object({
  branchId: nonEmptyIdSchema.optional(),
  scope: commissionRuleScopeSchema,
  type: commissionRuleTypeSchema,
  professionalId: nonEmptyIdSchema.optional(),
  sourceType: orderItemSourceTypeSchema.optional(),
  sourceId: nonEmptyIdSchema.optional(),
  percentageBps: z.number().int().min(1).max(10000).optional(),
  fixedAmountCents: positiveMoneyCentsSchema.optional(),
  effectiveFrom: z.string().date(),
  effectiveUntil: z.string().date().optional(),
});

export const createCommissionRuleCommandSchema = createCommissionRuleCommandBaseSchema
  .refine(
    (value) =>
      (value.type === 'PERCENTAGE' &&
        value.percentageBps !== undefined &&
        value.fixedAmountCents === undefined) ||
      (value.type === 'FIXED_AMOUNT' &&
        value.fixedAmountCents !== undefined &&
        value.percentageBps === undefined),
    {
      message: 'Commission rule command amount fields must match the rule type.',
      path: ['type'],
    },
  )
  .refine(
    (value) => value.effectiveUntil === undefined || value.effectiveFrom <= value.effectiveUntil,
    {
      message: 'Commission rule effective end must be after start.',
      path: ['effectiveUntil'],
    },
  );
export type CreateCommissionRuleCommand = z.input<typeof createCommissionRuleCommandSchema>;

export const updateCommissionRuleCommandSchema = createCommissionRuleCommandBaseSchema
  .partial()
  .extend({ id: nonEmptyIdSchema, status: commissionRuleStatusSchema.optional() })
  .refine(
    (value) =>
      value.branchId !== undefined ||
      value.scope !== undefined ||
      value.type !== undefined ||
      value.status !== undefined ||
      value.professionalId !== undefined ||
      value.sourceType !== undefined ||
      value.sourceId !== undefined ||
      value.percentageBps !== undefined ||
      value.fixedAmountCents !== undefined ||
      value.effectiveFrom !== undefined ||
      value.effectiveUntil !== undefined,
    {
      message: 'At least one commission rule field must be provided.',
      path: ['id'],
    },
  )
  .refine((value) => !(value.percentageBps !== undefined && value.fixedAmountCents !== undefined), {
    message: 'Commission rule update cannot provide both percentage and fixed amount.',
    path: ['type'],
  });
export type UpdateCommissionRuleCommand = z.input<typeof updateCommissionRuleCommandSchema>;

export const generateCommissionAccrualsCommandSchema = z.object({
  orderId: nonEmptyIdSchema,
  paymentId: nonEmptyIdSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
});
export type GenerateCommissionAccrualsCommand = z.input<
  typeof generateCommissionAccrualsCommandSchema
>;

export const closePayoutCommandSchema = z
  .object({
    professionalId: nonEmptyIdSchema,
    branchId: nonEmptyIdSchema,
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    accrualIds: z.array(nonEmptyIdSchema).optional(),
    idempotencyKey: idempotencyKeySchema,
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.periodStart <= value.periodEnd, {
    message: 'Payout period end must be after start.',
    path: ['periodEnd'],
  });
export type ClosePayoutCommand = z.input<typeof closePayoutCommandSchema>;

export const payPayoutCommandSchema = z
  .object({
    payoutId: nonEmptyIdSchema,
    paymentMethod: paymentMethodSchema,
    paidAt: isoDateTimeSchema.optional(),
    cashRegisterSessionId: nonEmptyIdSchema.optional(),
    idempotencyKey: idempotencyKeySchema,
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.paymentMethod !== 'CASH' || Boolean(value.cashRegisterSessionId), {
    message: 'Cash payout payments require an open cash register session id.',
    path: ['cashRegisterSessionId'],
  });
export type PayPayoutCommand = z.input<typeof payPayoutCommandSchema>;

export const correctPayoutCommandSchema = z.object({
  payoutId: nonEmptyIdSchema,
  amountCents: positiveMoneyCentsSchema,
  direction: financialEntryDirectionSchema,
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: idempotencyKeySchema,
});
export type CorrectPayoutCommand = z.input<typeof correctPayoutCommandSchema>;

export const branchScopedAuthorizationRequirementSchema = z.object({
  permission: permissionSchema,
  entitlement: entitlementSchema.optional(),
  branchId: nonEmptyIdSchema.optional(),
});
export type BranchScopedAuthorizationRequirement = z.infer<
  typeof branchScopedAuthorizationRequirementSchema
>;

export function hasBranchAccess(context: Pick<RequestContext, 'branchScope'>, branchId: string) {
  return context.branchScope.includes(branchId);
}
