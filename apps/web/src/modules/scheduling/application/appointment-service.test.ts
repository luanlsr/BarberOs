import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Appointment,
  AppointmentStatusHistory,
  AvailabilityQuery,
  Customer,
  Professional,
  RequestContext,
  Service,
} from '@barberos/contracts';

import type {
  AppointmentRepository,
  CancelAppointmentRecordCommand,
  CreateAppointmentRecordCommand,
  RescheduleAppointmentRecordCommand,
  ScheduleWindowQuery,
  SchedulingAppointmentLookup,
  SchedulingCustomerLookup,
  SchedulingOutboxProducer,
  SchedulingProfessionalLookup,
  SchedulingServiceLookup,
  UpdateAppointmentStatusRecordCommand,
} from '../domain';
import {
  AppointmentApplicationService,
  CoreOperationsApplicationError,
} from './appointment-service';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: [
    'appointments.read',
    'appointments.create',
    'appointments.update',
    'appointments.cancel',
  ],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const tenantBContext: RequestContext = {
  ...context,
  requestId: 'request-tenant-b',
  tenantId: 'tenant-2',
  membershipId: 'membership-tenant-b',
};

const professional: Professional = {
  id: 'professional-1',
  tenantId: 'tenant-1',
  branchIds: ['branch-1'],
  displayName: 'Carlos Andrade',
  roleLabel: 'Barbeiro',
  status: 'ACTIVE',
};

const customer: Customer = {
  id: 'customer-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  name: 'João Silva',
  phone: '+5511999999999',
  consents: { whatsapp: true, marketing: false },
  status: 'ACTIVE',
};

const corte: Service = {
  id: 'service-1',
  tenantId: 'tenant-1',
  category: 'Cabelo',
  name: 'Corte Masculino',
  durationMinutes: 30,
  priceCents: 5000,
  status: 'ACTIVE',
  enabledProfessionalIds: ['professional-1'],
};

const barba: Service = {
  id: 'service-2',
  tenantId: 'tenant-1',
  category: 'Barba',
  name: 'Barba',
  durationMinutes: 30,
  priceCents: 3500,
  status: 'ACTIVE',
  enabledProfessionalIds: ['professional-1'],
};

const appointment: Appointment = {
  id: 'appointment-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  customerId: 'customer-1',
  professionalId: 'professional-1',
  startsAt: '2026-09-07T12:00:00.000Z',
  endsAt: '2026-09-07T12:30:00.000Z',
  status: 'CONFIRMED',
  source: 'MANUAL',
  services: [
    {
      sequence: 1,
      serviceId: 'service-1',
      serviceName: 'Corte Masculino',
      durationMinutes: 30,
      priceCents: 5000,
    },
  ],
};

const otherTenantAppointment: Appointment = {
  ...appointment,
  id: 'appointment-tenant-b',
  tenantId: 'tenant-2',
  customerId: 'customer-tenant-b',
  professionalId: 'professional-tenant-b',
};

const otherAppointment: Appointment = {
  ...appointment,
  id: 'appointment-2',
  startsAt: '2026-09-07T13:00:00.000Z',
  endsAt: '2026-09-07T13:30:00.000Z',
};

class FakeAppointmentRepository implements AppointmentRepository {
  appointments = new Map<string, Appointment>([
    [appointment.id, appointment],
    [otherTenantAppointment.id, otherTenantAppointment],
  ]);
  history: AppointmentStatusHistory[] = [];
  lastCreate: CreateAppointmentRecordCommand | null = null;
  lastReschedule: RescheduleAppointmentRecordCommand | null = null;
  lastStatus: UpdateAppointmentStatusRecordCommand | null = null;
  lastCancel: CancelAppointmentRecordCommand | null = null;
  createError: unknown;

  async list(_context: RequestContext, _query: AvailabilityQuery) {
    return [...this.appointments.values()];
  }

  async findById(_context: RequestContext, appointmentId: string) {
    return this.appointments.get(appointmentId) ?? null;
  }

  async create(context: RequestContext, command: CreateAppointmentRecordCommand) {
    this.lastCreate = command;
    if (this.createError) throw this.createError;

    const created: Appointment = {
      id: 'appointment-created',
      tenantId: context.tenantId,
      branchId: command.branchId,
      customerId: command.customerId,
      professionalId: command.professionalId,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      status: command.status ?? 'CONFIRMED',
      source: command.source ?? 'MANUAL',
      notes: command.notes,
      services: command.services,
    };
    this.appointments.set(created.id, created);
    return created;
  }

  async reschedule(_context: RequestContext, command: RescheduleAppointmentRecordCommand) {
    this.lastReschedule = command;
    const current = this.appointments.get(command.id);
    if (!current) throw new Error('missing appointment');

    const updated = {
      ...current,
      professionalId: command.professionalId,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
    };
    this.appointments.set(updated.id, updated);
    return updated;
  }

  async updateStatus(_context: RequestContext, command: UpdateAppointmentStatusRecordCommand) {
    this.lastStatus = command;
    const current = this.appointments.get(command.id);
    if (!current) throw new Error('missing appointment');

    const updated = { ...current, status: command.status };
    this.appointments.set(updated.id, updated);
    this.history.push({
      id: `history-${this.history.length + 1}`,
      appointmentId: command.id,
      previousStatus: command.previousStatus,
      nextStatus: command.status,
      actorId: command.actorId,
      reason: command.reason,
      createdAt: '2026-09-07T12:10:00.000Z',
    });
    return updated;
  }

  async cancel(_context: RequestContext, command: CancelAppointmentRecordCommand) {
    this.lastCancel = command;
    return this.updateStatus(_context, {
      id: command.id,
      status: 'CANCELLED',
      reason: command.reason,
      previousStatus: command.previousStatus,
      actorId: command.actorId,
    });
  }

  async listStatusHistory(_context: RequestContext, appointmentId: string) {
    return this.history.filter((entry) => entry.appointmentId === appointmentId);
  }
}

class ConflictAwareAppointmentRepository extends FakeAppointmentRepository {
  private createdSequence = 0;

  async create(context: RequestContext, command: CreateAppointmentRecordCommand) {
    this.lastCreate = command;
    const hasOverlap = [...this.appointments.values()].some(
      (candidate) =>
        candidate.tenantId === context.tenantId &&
        candidate.branchId === command.branchId &&
        candidate.professionalId === command.professionalId &&
        ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE'].includes(candidate.status) &&
        Date.parse(candidate.startsAt) < Date.parse(command.endsAt) &&
        Date.parse(command.startsAt) < Date.parse(candidate.endsAt),
    );

    if (hasOverlap) {
      throw { code: '23P01', constraint: 'appointments_no_active_overlap' };
    }

    this.createdSequence += 1;
    const created: Appointment = {
      id: `appointment-concurrent-${this.createdSequence}`,
      tenantId: context.tenantId,
      branchId: command.branchId,
      customerId: command.customerId,
      professionalId: command.professionalId,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      status: command.status ?? 'CONFIRMED',
      source: command.source ?? 'MANUAL',
      notes: command.notes,
      services: command.services,
    };
    this.appointments.set(created.id, created);
    return created;
  }
}

class FakeAppointmentLookup implements SchedulingAppointmentLookup {
  appointments: Appointment[] = [];
  lastQuery: ScheduleWindowQuery | null = null;

  async listActiveAppointmentsForWindow(_context: RequestContext, query: ScheduleWindowQuery) {
    this.lastQuery = query;
    return this.appointments.filter(
      (candidate) =>
        candidate.branchId === query.branchId &&
        candidate.id !== query.excludeAppointmentId &&
        (!query.professionalId || candidate.professionalId === query.professionalId) &&
        Date.parse(candidate.startsAt) < Date.parse(query.endsAt) &&
        Date.parse(query.startsAt) < Date.parse(candidate.endsAt),
    );
  }
}

class FakeCustomerLookup implements SchedulingCustomerLookup {
  customer: Customer | null = customer;

  async findCustomerById() {
    return this.customer;
  }
}

class FakeProfessionalLookup implements SchedulingProfessionalLookup {
  professional: Professional | null = professional;

  async findProfessionalById() {
    return this.professional;
  }
}

class FakeOutbox implements SchedulingOutboxProducer {
  readonly events = new Map<string, Parameters<SchedulingOutboxProducer['createEvent']>[1]>();
  attempts = 0;

  async createEvent(
    _context: RequestContext,
    command: Parameters<SchedulingOutboxProducer['createEvent']>[1],
  ) {
    this.attempts += 1;
    if (!this.events.has(command.idempotencyKey)) this.events.set(command.idempotencyKey, command);
    return this.events.get(command.idempotencyKey);
  }
}

class FakeServiceLookup implements SchedulingServiceLookup {
  services = new Map<string, Service>([
    [corte.id, corte],
    [barba.id, barba],
  ]);

  async findServiceById(_context: RequestContext, serviceId: string) {
    return this.services.get(serviceId) ?? null;
  }
}

describe('AppointmentApplicationService', () => {
  let repository: FakeAppointmentRepository;
  let activeAppointments: FakeAppointmentLookup;
  let customers: FakeCustomerLookup;
  let professionals: FakeProfessionalLookup;
  let services: FakeServiceLookup;
  let outbox: FakeOutbox;
  let service: AppointmentApplicationService;

  beforeEach(() => {
    repository = new FakeAppointmentRepository();
    activeAppointments = new FakeAppointmentLookup();
    customers = new FakeCustomerLookup();
    professionals = new FakeProfessionalLookup();
    services = new FakeServiceLookup();
    outbox = new FakeOutbox();
    service = new AppointmentApplicationService(
      repository,
      activeAppointments,
      customers,
      professionals,
      services,
      outbox,
    );
  });

  it('isolates appointments by tenant for reads and writes', async () => {
    const query = {
      branchId: 'branch-1',
      serviceId: 'service-1',
      startsOn: '2026-09-07',
      endsOn: '2026-09-07',
    };

    const tenantAResults = await service.list(context, query);
    const tenantBResults = await service.list(tenantBContext, query);

    expect(tenantAResults.map((item) => item.id)).toEqual(['appointment-1']);
    expect(tenantBResults.map((item) => item.id)).toEqual(['appointment-tenant-b']);
    await expect(service.get(tenantBContext, 'appointment-1')).rejects.toEqual(
      new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Appointment was not found.'),
    );
    await expect(
      service.cancel(tenantBContext, { id: 'appointment-1', reason: 'Tentativa externa' }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError('CORE_NOT_FOUND', 'Appointment was not found.'),
    );
    expect(repository.lastCancel).toBeNull();
  });

  it('creates confirmed appointments with service snapshots and calculated end time', async () => {
    const created = await service.create(context, {
      branchId: 'branch-1',
      customerId: 'customer-1',
      professionalId: 'professional-1',
      startsAt: '2026-09-07T12:00:00.000Z',
      services: [{ serviceId: 'service-1' }, { serviceId: 'service-2' }],
    });

    expect(created.endsAt).toBe('2026-09-07T13:00:00.000Z');
    expect(repository.lastCreate).toMatchObject({
      branchId: 'branch-1',
      customerId: 'customer-1',
      professionalId: 'professional-1',
      status: 'CONFIRMED',
      source: 'MANUAL',
      endsAt: '2026-09-07T13:00:00.000Z',
      services: [
        {
          sequence: 1,
          serviceId: 'service-1',
          serviceName: 'Corte Masculino',
          durationMinutes: 30,
          priceCents: 5000,
        },
        {
          sequence: 2,
          serviceId: 'service-2',
          serviceName: 'Barba',
          durationMinutes: 30,
          priceCents: 3500,
        },
      ],
    });
    expect(activeAppointments.lastQuery).toMatchObject({
      branchId: 'branch-1',
      professionalId: 'professional-1',
      startsAt: '2026-09-07T12:00:00.000Z',
      endsAt: '2026-09-07T13:00:00.000Z',
    });
    expect(outbox.events.size).toBe(1);
    expect([...outbox.events.values()]).toEqual([
      expect.objectContaining({
        eventType: 'APPOINTMENT_CONFIRMED',
        sourceId: 'appointment-created',
      }),
    ]);
  });

  it('maps database exclusion violations from concurrent create to appointment conflict', async () => {
    repository.createError = { code: '23P01', constraint: 'appointments_no_active_overlap' };

    await expect(
      service.create(context, {
        branchId: 'branch-1',
        customerId: 'customer-1',
        professionalId: 'professional-1',
        startsAt: '2026-09-07T12:00:00.000Z',
        services: [{ serviceId: 'service-1' }],
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'APPOINTMENT_CONFLICT',
        'Appointment overlaps an active appointment.',
      ),
    );
  });

  it('persists only one overlapping concurrent create for the same professional', async () => {
    repository = new ConflictAwareAppointmentRepository();
    service = new AppointmentApplicationService(
      repository,
      activeAppointments,
      customers,
      professionals,
      services,
    );
    const command = {
      branchId: 'branch-1',
      customerId: 'customer-1',
      professionalId: 'professional-1',
      startsAt: '2026-09-07T14:00:00.000Z',
      services: [{ serviceId: 'service-1' }],
    };

    const results = await Promise.allSettled([
      service.create(context, command),
      service.create(context, command),
    ]);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    const persisted = [...repository.appointments.values()].filter(
      (item) =>
        item.tenantId === 'tenant-1' &&
        item.professionalId === 'professional-1' &&
        item.startsAt === command.startsAt,
    );

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(rejected?.reason).toEqual(
      new CoreOperationsApplicationError(
        'APPOINTMENT_CONFLICT',
        'Appointment overlaps an active appointment.',
      ),
    );
    expect(persisted).toHaveLength(1);
  });

  it('reschedules appointments to available slots and preserves duration', async () => {
    const updated = await service.reschedule(context, {
      id: 'appointment-1',
      startsAt: '2026-09-07T13:00:00.000Z',
      reason: 'Cliente pediu novo horário',
    });

    expect(updated.startsAt).toBe('2026-09-07T13:00:00.000Z');
    expect(updated.endsAt).toBe('2026-09-07T13:30:00.000Z');
    expect(repository.lastReschedule).toMatchObject({
      id: 'appointment-1',
      professionalId: 'professional-1',
      startsAt: '2026-09-07T13:00:00.000Z',
      endsAt: '2026-09-07T13:30:00.000Z',
    });
    expect(activeAppointments.lastQuery).toMatchObject({ excludeAppointmentId: 'appointment-1' });
  });

  it('rejects conflicting reschedules before persisting changes', async () => {
    activeAppointments.appointments = [otherAppointment];

    await expect(
      service.reschedule(context, {
        id: 'appointment-1',
        startsAt: '2026-09-07T13:00:00.000Z',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'APPOINTMENT_CONFLICT',
        'Appointment overlaps an active appointment.',
      ),
    );

    expect(repository.lastReschedule).toBeNull();
    expect(repository.appointments.get('appointment-1')?.startsAt).toBe('2026-09-07T12:00:00.000Z');
  });

  it('rejects invalid status transitions without writing history', async () => {
    repository.appointments.set('appointment-1', { ...appointment, status: 'COMPLETED' });

    await expect(
      service.updateStatus(context, {
        id: 'appointment-1',
        status: 'CONFIRMED',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'APPOINTMENT_INVALID_TRANSITION',
        'Appointment status transition is not allowed.',
      ),
    );

    expect(repository.lastStatus).toBeNull();
    expect(repository.history).toEqual([]);
  });

  it('cancels appointments with actor, previous status and reason for history', async () => {
    const cancelled = await service.cancel(context, {
      id: 'appointment-1',
      reason: 'Cliente cancelou',
    });

    expect(cancelled.status).toBe('CANCELLED');
    expect(repository.lastCancel).toMatchObject({
      id: 'appointment-1',
      status: 'CANCELLED',
      previousStatus: 'CONFIRMED',
      actorId: 'user-1',
      reason: 'Cliente cancelou',
    });
    expect([...outbox.events.values()]).toEqual([
      expect.objectContaining({ eventType: 'APPOINTMENT_CANCELLED', sourceId: 'appointment-1' }),
    ]);
  });

  it('does not duplicate a reminder event on an idempotent cancellation retry', async () => {
    await service.cancel(context, { id: 'appointment-1', reason: 'Cliente cancelou' });
    await service.cancel(context, { id: 'appointment-1', reason: 'Retry do cancelamento' });

    expect(outbox.events.size).toBe(1);
    expect(outbox.attempts).toBe(2);
  });

  it('returns appointment status history after read authorization', async () => {
    await service.updateStatus(context, {
      id: 'appointment-1',
      status: 'CHECKED_IN',
      reason: 'Chegou',
    });

    const history = await service.listStatusHistory(context, 'appointment-1');

    expect(history).toEqual([
      expect.objectContaining({
        appointmentId: 'appointment-1',
        previousStatus: 'CONFIRMED',
        nextStatus: 'CHECKED_IN',
        actorId: 'user-1',
        reason: 'Chegou',
      }),
    ]);
  });
});
