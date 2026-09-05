import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Appointment,
  CreateProfessionalScheduleCommand,
  CreateScheduleBlockCommand,
  ProfessionalSchedule,
  RequestContext,
  ScheduleBlock,
} from '@barberos/contracts';

import type { ScheduleRepository, ScheduleWindowQuery, SchedulingAppointmentLookup } from '../domain';
import { CoreOperationsApplicationError, SchedulingApplicationService } from './scheduling-service';

const managerContext: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'MANAGER',
  permissions: ['schedules.read', 'schedules.manage'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const baseSchedule: ProfessionalSchedule = {
  id: 'schedule-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  professionalId: 'professional-1',
  weekday: 1,
  startsAtLocal: '09:00',
  endsAtLocal: '18:00',
  breakStartsAtLocal: '12:30',
  breakEndsAtLocal: '13:30',
  active: true,
};

const lunchBlock: ScheduleBlock = {
  id: 'block-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  professionalId: 'professional-1',
  startsAt: '2026-09-07T15:00:00.000Z',
  endsAt: '2026-09-07T15:30:00.000Z',
  type: 'MANUAL',
  reason: 'Treinamento',
  active: true,
};

const activeAppointment: Appointment = {
  id: 'appointment-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  customerId: 'customer-1',
  professionalId: 'professional-1',
  startsAt: '2026-09-07T14:00:00.000Z',
  endsAt: '2026-09-07T14:40:00.000Z',
  status: 'CONFIRMED',
  source: 'MANUAL',
  services: [{ sequence: 1, serviceId: 'service-1', serviceName: 'Corte Masculino', durationMinutes: 40, priceCents: 5000 }],
};

class FakeScheduleRepository implements ScheduleRepository {
  readonly schedules = [baseSchedule];
  readonly blocks = [lunchBlock];
  upsertedSchedule: CreateProfessionalScheduleCommand | null = null;
  createdBlock: CreateScheduleBlockCommand | null = null;

  async listProfessionalSchedules(_context: RequestContext, branchId: string) {
    return this.schedules.filter((schedule) => schedule.branchId === branchId);
  }

  async upsertProfessionalSchedule(context: RequestContext, command: CreateProfessionalScheduleCommand) {
    this.upsertedSchedule = command;
    const schedule: ProfessionalSchedule = {
      id: 'schedule-upserted',
      tenantId: context.tenantId,
      branchId: command.branchId,
      professionalId: command.professionalId,
      weekday: command.weekday,
      startsAtLocal: command.startsAtLocal,
      endsAtLocal: command.endsAtLocal,
      breakStartsAtLocal: command.breakStartsAtLocal,
      breakEndsAtLocal: command.breakEndsAtLocal,
      active: command.active ?? true,
    };
    this.schedules.push(schedule);
    return schedule;
  }

  async listScheduleBlocks(_context: RequestContext, branchId: string) {
    return this.blocks.filter((block) => block.branchId === branchId);
  }

  async createScheduleBlock(context: RequestContext, command: CreateScheduleBlockCommand) {
    this.createdBlock = command;
    const block: ScheduleBlock = {
      id: 'block-created',
      tenantId: context.tenantId,
      branchId: command.branchId,
      professionalId: command.professionalId,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      type: command.type,
      reason: command.reason,
      active: command.active ?? true,
    };
    this.blocks.push(block);
    return block;
  }
}

class FakeSchedulingAppointmentLookup implements SchedulingAppointmentLookup {
  appointments: Appointment[] = [];
  lastQuery: ScheduleWindowQuery | null = null;

  async listActiveAppointmentsForWindow(_context: RequestContext, query: ScheduleWindowQuery) {
    this.lastQuery = query;
    return this.appointments.filter(
      (appointment) =>
        appointment.branchId === query.branchId &&
        (!query.professionalId || appointment.professionalId === query.professionalId) &&
        Date.parse(appointment.startsAt) < Date.parse(query.endsAt) &&
        Date.parse(query.startsAt) < Date.parse(appointment.endsAt) &&
        ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE'].includes(appointment.status),
    );
  }
}

describe('SchedulingApplicationService', () => {
  let schedules: FakeScheduleRepository;
  let appointments: FakeSchedulingAppointmentLookup;
  let service: SchedulingApplicationService;

  beforeEach(() => {
    schedules = new FakeScheduleRepository();
    appointments = new FakeSchedulingAppointmentLookup();
    service = new SchedulingApplicationService(schedules, appointments);
  });

  it('lists and upserts professional schedules when authorized for the branch', async () => {
    const existing = await service.listProfessionalSchedules(managerContext, 'branch-1');
    const upserted = await service.upsertProfessionalSchedule(managerContext, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      weekday: 2,
      startsAtLocal: '10:00',
      endsAtLocal: '19:00',
    });

    expect(existing).toEqual([baseSchedule]);
    expect(upserted).toMatchObject({ active: true, startsAtLocal: '10:00', endsAtLocal: '19:00' });
  });

  it('rejects invalid schedule breaks through the contract schema', async () => {
    await expect(
      service.upsertProfessionalSchedule(managerContext, {
        branchId: 'branch-1',
        professionalId: 'professional-1',
        weekday: 2,
        startsAtLocal: '09:00',
        endsAtLocal: '18:00',
        breakStartsAtLocal: '08:00',
        breakEndsAtLocal: '08:30',
      }),
    ).rejects.toThrow();
  });

  it('reports schedule blocks as impacting availability windows', async () => {
    await expect(
      service.isWindowBlocked(managerContext, {
        branchId: 'branch-1',
        professionalId: 'professional-1',
        startsAt: '2026-09-07T15:10:00.000Z',
        endsAt: '2026-09-07T15:20:00.000Z',
      }),
    ).resolves.toBe(true);

    await expect(
      service.isWindowBlocked(managerContext, {
        branchId: 'branch-1',
        professionalId: 'professional-2',
        startsAt: '2026-09-07T15:10:00.000Z',
        endsAt: '2026-09-07T15:20:00.000Z',
      }),
    ).resolves.toBe(false);
  });

  it('creates schedule blocks when there is no active appointment overlap', async () => {
    const block = await service.createScheduleBlock(managerContext, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      startsAt: '2026-09-07T16:00:00.000Z',
      endsAt: '2026-09-07T16:30:00.000Z',
      type: 'MANUAL',
      reason: 'Pausa operacional',
    });

    expect(block).toMatchObject({ id: 'block-created', active: true, type: 'MANUAL' });
    expect(appointments.lastQuery).toMatchObject({ professionalId: 'professional-1' });
  });

  it('rejects schedule blocks that overlap active appointments', async () => {
    appointments.appointments = [activeAppointment];

    await expect(
      service.createScheduleBlock(managerContext, {
        branchId: 'branch-1',
        professionalId: 'professional-1',
        startsAt: '2026-09-07T14:10:00.000Z',
        endsAt: '2026-09-07T14:30:00.000Z',
        type: 'MANUAL',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError('APPOINTMENT_CONFLICT', 'Schedule block overlaps an active appointment.'),
    );
  });

  it('denies branch-scoped schedule access outside the request context', async () => {
    await expect(service.listProfessionalSchedules(managerContext, 'branch-2')).rejects.toMatchObject({
      code: 'BRANCH_SCOPE_DENIED',
    });
  });
});