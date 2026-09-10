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
  | 'settings.read'
  | 'memberships.read'
  | 'memberships.manage'
  | 'audit.read';

export type Entitlement = 'core.operations' | 'finance' | 'inventory' | 'ai';
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
  'settings.read',
  'memberships.read',
  'memberships.manage',
  'audit.read',
]);

export const entitlementSchema = z.enum(['core.operations', 'finance', 'inventory', 'ai']);
export const nonEmptyIdSchema = z.string().trim().min(1);
export const optionalTextSchema = z.string().trim().max(2000).optional();
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
]);
export type CoreOperationsErrorCode = z.infer<typeof coreOperationsErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const professionalSchema = z.object({
  id: nonEmptyIdSchema,
  tenantId: nonEmptyIdSchema,
  branchIds: z.array(nonEmptyIdSchema).min(1),
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(8).max(32).optional(),
  roleLabel: z.string().trim().min(2).max(80).default('Profissional'),
  avatarUrl: z.string().url().optional(),
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
  consents: customerConsentSchema.default({ whatsapp: false, marketing: false }),
  status: customerStatusSchema,
  archivedAt: isoDateTimeSchema.optional(),
});
export type Customer = z.infer<typeof customerSchema>;

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
  avatarUrl: z.string().url().optional(),
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
  consents: customerConsentSchema.default({ whatsapp: false, marketing: false }),
});
export type CreateCustomerCommand = z.input<typeof createCustomerCommandSchema>;

export const updateCustomerCommandSchema = createCustomerCommandSchema.partial().extend({
  id: nonEmptyIdSchema,
  status: customerStatusSchema.optional(),
});
export type UpdateCustomerCommand = z.input<typeof updateCustomerCommandSchema>;

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
