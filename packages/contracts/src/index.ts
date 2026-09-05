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
  | 'orders.create'
  | 'orders.item.add'
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
  'orders.create',
  'orders.item.add',
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
export type UpdateAppointmentStatusCommand = z.infer<
  typeof updateAppointmentStatusCommandSchema
>;

export const cancelAppointmentCommandSchema = z.object({
  id: nonEmptyIdSchema,
  reason: z.string().trim().max(500).optional(),
});
export type CancelAppointmentCommand = z.infer<typeof cancelAppointmentCommandSchema>;

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