import { beforeEach, describe, expect, it } from 'vitest';
import type { Appointment, ProfessionalSchedule, RequestContext, ScheduleBlock, Service } from '@barberos/contracts';

import type {
  ScheduleRepository,
  ScheduleWindowQuery,
  SchedulingAppointmentLookup,
  SchedulingBranchLookup,
  SchedulingServiceLookup,
} from '../domain';
import { AvailabilityApplicationService } from './availability-service';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['schedules.read'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
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

const mondaySchedule: ProfessionalSchedule = {
  id: 'schedule-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  professionalId: 'professional-1',
  weekday: 1,
  startsAtLocal: '09:00',
  endsAtLocal: '10:00',
  active: true,
};

const secondProfessionalSchedule: ProfessionalSchedule = {
  ...mondaySchedule,
  id: 'schedule-2',
  professionalId: 'professional-2',
};

const appointment: Appointment = {
  id: 'appointment-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  customerId: 'customer-1',
  professionalId: 'professional-1',
  startsAt: '2026-09-07T12:30:00.000Z',
  endsAt: '2026-09-07T13:00:00.000Z',
  status: 'CONFIRMED',
  source: 'MANUAL',
  services: [{ sequence: 1, serviceId: 'service-1', serviceName: 'Corte Masculino', durationMinutes: 30, priceCents: 5000 }],
};

class FakeScheduleRepository implements ScheduleRepository {
  schedules: ProfessionalSchedule[] = [mondaySchedule];
  blocks: ScheduleBlock[] = [];

  async listProfessionalSchedules(_context: RequestContext, branchId: string) {
    return this.schedules.filter((schedule) => schedule.branchId === branchId);
  }

  async upsertProfessionalSchedule() {
    return mondaySchedule;
  }

  async listScheduleBlocks(_context: RequestContext, branchId: string) {
    return this.blocks.filter((block) => block.branchId === branchId);
  }

  async createScheduleBlock() {
    return {
      id: 'block-created',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      startsAt: '2026-09-07T14:00:00.000Z',
      endsAt: '2026-09-07T15:00:00.000Z',
      type: 'MANUAL' as const,
      active: true,
    };
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
        (!query.professionalId || candidate.professionalId === query.professionalId) &&
        Date.parse(candidate.startsAt) < Date.parse(query.endsAt) &&
        Date.parse(query.startsAt) < Date.parse(candidate.endsAt),
    );
  }
}

class FakeBranchLookup implements SchedulingBranchLookup {
  timezone: string | null = 'America/Sao_Paulo';

  async findBranchTimezone() {
    return this.timezone;
  }
}

class FakeServiceLookup implements SchedulingServiceLookup {
  service: Service | null = corte;

  async findServiceById() {
    return this.service;
  }
}

describe('AvailabilityApplicationService', () => {
  let schedules: FakeScheduleRepository;
  let appointments: FakeAppointmentLookup;
  let branches: FakeBranchLookup;
  let services: FakeServiceLookup;
  let service: AvailabilityApplicationService;

  beforeEach(() => {
    schedules = new FakeScheduleRepository();
    appointments = new FakeAppointmentLookup();
    branches = new FakeBranchLookup();
    services = new FakeServiceLookup();
    service = new AvailabilityApplicationService(schedules, appointments, branches, services);
  });

  it('calculates UTC slots from branch working schedules and timezone', async () => {
    const slots = await service.findAvailableSlots(context, {
      branchId: 'branch-1',
      serviceId: 'service-1',
      startsOn: '2026-09-07',
      endsOn: '2026-09-07',
      slotStepMinutes: 30,
    });

    expect(slots).toEqual([
      {
        professionalId: 'professional-1',
        branchId: 'branch-1',
        startsAt: '2026-09-07T12:00:00.000Z',
        endsAt: '2026-09-07T12:30:00.000Z',
      },
      {
        professionalId: 'professional-1',
        branchId: 'branch-1',
        startsAt: '2026-09-07T12:30:00.000Z',
        endsAt: '2026-09-07T13:00:00.000Z',
      },
    ]);
    expect(appointments.lastQuery).toMatchObject({
      branchId: 'branch-1',
      startsAt: '2026-09-07T03:00:00.000Z',
      endsAt: '2026-09-08T03:00:00.000Z',
    });
  });

  it('filters by requested professional and service professional eligibility', async () => {
    schedules.schedules = [mondaySchedule, secondProfessionalSchedule];

    const slots = await service.findAvailableSlots(context, {
      branchId: 'branch-1',
      serviceId: 'service-1',
      professionalId: 'professional-2',
      startsOn: '2026-09-07',
      endsOn: '2026-09-07',
    });

    expect(slots).toEqual([]);
  });

  it('returns empty availability when no working schedule matches the date', async () => {
    const slots = await service.findAvailableSlots(context, {
      branchId: 'branch-1',
      serviceId: 'service-1',
      startsOn: '2026-09-08',
      endsOn: '2026-09-08',
    });

    expect(slots).toEqual([]);
  });

  it('removes slots that overlap schedule blocks and active appointments', async () => {
    schedules.blocks = [
      {
        id: 'block-1',
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        professionalId: 'professional-1',
        startsAt: '2026-09-07T12:00:00.000Z',
        endsAt: '2026-09-07T12:30:00.000Z',
        type: 'MANUAL',
        active: true,
      },
    ];
    appointments.appointments = [appointment];

    const slots = await service.findAvailableSlots(context, {
      branchId: 'branch-1',
      serviceId: 'service-1',
      startsOn: '2026-09-07',
      endsOn: '2026-09-07',
      slotStepMinutes: 30,
    });

    expect(slots).toEqual([]);
  });

  it('denies availability queries outside authorized branch scope', async () => {
    await expect(
      service.findAvailableSlots(context, {
        branchId: 'branch-2',
        serviceId: 'service-1',
        startsOn: '2026-09-07',
        endsOn: '2026-09-07',
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });
  });
});