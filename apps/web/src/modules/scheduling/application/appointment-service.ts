import {
  availabilityQuerySchema,
  cancelAppointmentCommandSchema,
  createAppointmentCommandSchema,
  rescheduleAppointmentCommandSchema,
  updateAppointmentStatusCommandSchema,
  type Appointment,
  type AppointmentService,
  type AppointmentStatus,
  type AvailabilityQuery,
  type CancelAppointmentCommand,
  type CreateAppointmentCommand,
  type Entitlement,
  type Permission,
  type RequestContext,
  type RescheduleAppointmentCommand,
  type Service,
  type UpdateAppointmentStatusCommand,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type {
  AppointmentRepository,
  ScheduleWindowQuery,
  SchedulingAppointmentLookup,
  SchedulingCustomerLookup,
  SchedulingProfessionalLookup,
  SchedulingServiceLookup,
} from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;
const reschedulableStatuses = [
  'PENDING',
  'CONFIRMED',
] as const satisfies readonly AppointmentStatus[];

const allowedTransitions = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_SERVICE', 'CANCELLED', 'NO_SHOW'],
  IN_SERVICE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
} satisfies Record<AppointmentStatus, readonly AppointmentStatus[]>;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export class AppointmentApplicationService {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly activeAppointments: SchedulingAppointmentLookup,
    private readonly customers: SchedulingCustomerLookup,
    private readonly professionals: SchedulingProfessionalLookup,
    private readonly services: SchedulingServiceLookup,
  ) {}

  async list(context: RequestContext, query: AvailabilityQuery) {
    const parsed = availabilityQuerySchema.parse(query);
    authorizeAppointmentAccess(context, 'appointments.read', parsed.branchId);
    return this.appointments.list(context, parsed);
  }

  async get(context: RequestContext, appointmentId: string) {
    return this.getAuthorizedAppointment(context, appointmentId, 'appointments.read');
  }

  async create(context: RequestContext, command: CreateAppointmentCommand) {
    const parsed = createAppointmentCommandSchema.parse(command);
    authorizeAppointmentAccess(context, 'appointments.create', parsed.branchId);

    await this.assertCustomerCanBeScheduled(context, parsed.customerId, parsed.branchId);
    await this.assertProfessionalCanBeScheduled(context, parsed.professionalId, parsed.branchId);
    const serviceSnapshots = await this.buildServiceSnapshots(
      context,
      parsed.services,
      parsed.professionalId,
    );
    const endsAt = addMinutes(parsed.startsAt, totalDurationMinutes(serviceSnapshots));

    await this.assertNoConflictingAppointment(context, {
      branchId: parsed.branchId,
      professionalId: parsed.professionalId,
      startsAt: parsed.startsAt,
      endsAt,
    });

    return mapAppointmentPersistenceConflict(() =>
      this.appointments.create(context, {
        ...parsed,
        endsAt,
        services: serviceSnapshots,
      }),
    );
  }

  async reschedule(context: RequestContext, command: RescheduleAppointmentCommand) {
    const parsed = rescheduleAppointmentCommandSchema.parse(command);
    const current = await this.getAuthorizedAppointment(context, parsed.id, 'appointments.update');
    assertReschedulable(current);

    const professionalId = parsed.professionalId ?? current.professionalId;
    await this.assertProfessionalCanBeScheduled(context, professionalId, current.branchId);
    const endsAt = addMinutes(parsed.startsAt, totalDurationMinutes(current.services));

    await this.assertNoConflictingAppointment(context, {
      branchId: current.branchId,
      professionalId,
      startsAt: parsed.startsAt,
      endsAt,
      excludeAppointmentId: current.id,
    });

    return mapAppointmentPersistenceConflict(() =>
      this.appointments.reschedule(context, {
        ...parsed,
        professionalId,
        endsAt,
      }),
    );
  }

  async updateStatus(context: RequestContext, command: UpdateAppointmentStatusCommand) {
    const parsed = updateAppointmentStatusCommandSchema.parse(command);
    const permission =
      parsed.status === 'CANCELLED' ? 'appointments.cancel' : 'appointments.update';
    const current = await this.getAuthorizedAppointment(context, parsed.id, permission);

    if (current.status === parsed.status) {
      return current;
    }

    assertValidStatusTransition(current.status, parsed.status);
    return this.appointments.updateStatus(context, {
      ...parsed,
      previousStatus: current.status,
      actorId: context.userId,
    });
  }

  async cancel(context: RequestContext, command: CancelAppointmentCommand) {
    const parsed = cancelAppointmentCommandSchema.parse(command);
    const current = await this.getAuthorizedAppointment(context, parsed.id, 'appointments.cancel');

    if (current.status === 'CANCELLED') {
      return current;
    }

    assertValidStatusTransition(current.status, 'CANCELLED');
    return this.appointments.cancel(context, {
      ...parsed,
      status: 'CANCELLED',
      previousStatus: current.status,
      actorId: context.userId,
    });
  }

  async listStatusHistory(context: RequestContext, appointmentId: string) {
    const appointment = await this.getAuthorizedAppointment(
      context,
      appointmentId,
      'appointments.read',
    );
    return this.appointments.listStatusHistory(context, appointment.id);
  }

  private async getAuthorizedAppointment(
    context: RequestContext,
    appointmentId: string,
    permission: Permission,
  ) {
    const appointment = await this.appointments.findById(context, appointmentId);
    if (!appointment || appointment.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Appointment was not found.');
    }

    authorizeAppointmentAccess(context, permission, appointment.branchId);
    return appointment;
  }

  private async assertCustomerCanBeScheduled(
    context: RequestContext,
    customerId: string,
    branchId: string,
  ) {
    const customer = await this.customers.findCustomerById(context, customerId);
    if (!customer || customer.tenantId !== context.tenantId || customer.status === 'ARCHIVED') {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Customer was not found.');
    }
    if (customer.branchId && customer.branchId !== branchId) {
      throw new CoreOperationsApplicationError(
        'CORE_BRANCH_SCOPE_DENIED',
        'Customer is not available in this branch.',
      );
    }
  }

  private async assertProfessionalCanBeScheduled(
    context: RequestContext,
    professionalId: string,
    branchId: string,
  ) {
    const professional = await this.professionals.findProfessionalById(context, professionalId);
    if (
      !professional ||
      professional.tenantId !== context.tenantId ||
      professional.status !== 'ACTIVE' ||
      !professional.branchIds.includes(branchId)
    ) {
      throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Professional was not found.');
    }
  }

  private async buildServiceSnapshots(
    context: RequestContext,
    services: readonly { serviceId: string }[],
    professionalId: string,
  ) {
    const snapshots: AppointmentService[] = [];

    for (const [index, item] of services.entries()) {
      const service = await this.services.findServiceById(context, item.serviceId);
      assertServiceCanBeScheduled(service, context, professionalId);
      snapshots.push({
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        sequence: index + 1,
      });
    }

    return snapshots;
  }

  private async assertNoConflictingAppointment(
    context: RequestContext,
    query: ScheduleWindowQuery,
  ) {
    const conflicts = await this.activeAppointments.listActiveAppointmentsForWindow(context, query);
    const hasConflict = conflicts.some(
      (appointment) => appointment.id !== query.excludeAppointmentId,
    );
    if (hasConflict) {
      throw new CoreOperationsApplicationError(
        'APPOINTMENT_CONFLICT',
        'Appointment overlaps an active appointment.',
      );
    }
  }
}

function authorizeAppointmentAccess(
  context: RequestContext,
  permission: Permission,
  branchId: string,
) {
  authorize(context, { permission, entitlement: coreOperationsEntitlement, branchId });
}

function assertServiceCanBeScheduled(
  service: Service | null,
  context: RequestContext,
  professionalId: string,
): asserts service is Service {
  if (!service || service.tenantId !== context.tenantId || service.status !== 'ACTIVE') {
    throw new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Service was not found.');
  }
  if (
    service.enabledProfessionalIds.length > 0 &&
    !service.enabledProfessionalIds.includes(professionalId)
  ) {
    throw new CoreOperationsApplicationError(
      'CORE_VALIDATION_ERROR',
      'Service is not enabled for this professional.',
    );
  }
}

function assertReschedulable(appointment: Appointment) {
  if (
    !reschedulableStatuses.includes(appointment.status as (typeof reschedulableStatuses)[number])
  ) {
    throw new CoreOperationsApplicationError(
      'APPOINTMENT_INVALID_TRANSITION',
      'Appointment cannot be rescheduled from its current status.',
    );
  }
}

function assertValidStatusTransition(previous: AppointmentStatus, next: AppointmentStatus) {
  const allowed = allowedTransitions[previous] as readonly AppointmentStatus[];
  if (!allowed.includes(next)) {
    throw new CoreOperationsApplicationError(
      'APPOINTMENT_INVALID_TRANSITION',
      'Appointment status transition is not allowed.',
    );
  }
}

function totalDurationMinutes(services: readonly Pick<AppointmentService, 'durationMinutes'>[]) {
  return services.reduce((total, service) => total + service.durationMinutes, 0);
}

function addMinutes(startsAt: string, durationMinutes: number) {
  return new Date(Date.parse(startsAt) + durationMinutes * 60_000).toISOString();
}

async function mapAppointmentPersistenceConflict<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (isAppointmentDatabaseConflict(error)) {
      throw new CoreOperationsApplicationError(
        'APPOINTMENT_CONFLICT',
        'Appointment overlaps an active appointment.',
      );
    }
    throw error;
  }
}

function isAppointmentDatabaseConflict(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const record = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    constraint?: unknown;
  };
  const code = typeof record.code === 'string' ? record.code : undefined;
  if (code === '23P01' || code === '23505') return true;

  const text = [record.message, record.details, record.constraint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return text.includes('appointments_no_active_overlap') || text.includes('exclusion constraint');
}
