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
  SchedulingProfessionalLookup,
  SchedulingServiceLookup,
  UpdateAppointmentStatusRecordCommand,
} from '../domain';
import { AppointmentApplicationService, CoreOperationsApplicationError } from './appointment-service';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['appointments.read', 'appointments.create', 'appointments.update', 'appointments.cancel'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
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
  name: 'Joao Silva',
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
  services: [{ sequence: 1, serviceId: 'service-1', serviceName: 'Corte Masculino', durationMinutes: 30, priceCents: 5000 }],
};

const otherAppointment: Appointment = {
  ...appointment,
  id: 'appointment-2',
  startsAt: '2026-09-07T13:00:00.000Z',
  endsAt: '2026-09-07T13:30:00.000Z',
};

class FakeAppointmentRepository implements AppointmentRepository {
  appointments = new Map<string, Appointment>([[appointment.id, appointment]]);
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
  let service: AppointmentApplicationService;

  beforeEach(() => {
    repository = new FakeAppointmentRepository();
    activeAppointments = new FakeAppointmentLookup();
    customers = new FakeCustomerLookup();
    professionals = new FakeProfessionalLookup();
    services = new FakeServiceLookup();
    service = new AppointmentApplicationService(repository, activeAppointments, customers, professionals, services);
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
        { sequence: 1, serviceId: 'service-1', serviceName: 'Corte Masculino', durationMinutes: 30, priceCents: 5000 },
        { sequence: 2, serviceId: 'service-2', serviceName: 'Barba', durationMinutes: 30, priceCents: 3500 },
      ],
    });
    expect(activeAppointments.lastQuery).toMatchObject({
      branchId: 'branch-1',
      professionalId: 'professional-1',
      startsAt: '2026-09-07T12:00:00.000Z',
      endsAt: '2026-09-07T13:00:00.000Z',
    });
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
    ).rejects.toEqual(new CoreOperationsApplicationError('APPOINTMENT_CONFLICT', 'Appointment overlaps an active appointment.'));
  });

  it('reschedules appointments to available slots and preserves duration', async () => {
    const updated = await service.reschedule(context, {
      id: 'appointment-1',
      startsAt: '2026-09-07T13:00:00.000Z',
      reason: 'Cliente pediu novo horario',
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
    ).rejects.toEqual(new CoreOperationsApplicationError('APPOINTMENT_CONFLICT', 'Appointment overlaps an active appointment.'));

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
      new CoreOperationsApplicationError('APPOINTMENT_INVALID_TRANSITION', 'Appointment status transition is not allowed.'),
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
  });

  it('returns appointment status history after read authorization', async () => {
    await service.updateStatus(context, { id: 'appointment-1', status: 'CHECKED_IN', reason: 'Chegou' });

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