import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfessionalSchedule, RequestContext, ScheduleBlock } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/scheduling-service';
import {
  createAvailabilityRouteHandlers,
  createScheduleBlockRouteHandlers,
  createScheduleRouteHandlers,
  type AvailabilityRouteService,
  type ScheduleBlockRouteService,
  type ScheduleRouteService,
} from './scheduling-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'MANAGER',
  permissions: ['schedules.read', 'schedules.manage'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const schedule: ProfessionalSchedule = {
  id: 'schedule-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  professionalId: 'professional-1',
  weekday: 1,
  startsAtLocal: '09:00',
  endsAtLocal: '18:00',
  active: true,
};

const block: ScheduleBlock = {
  id: 'block-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  professionalId: 'professional-1',
  startsAt: '2026-09-07T14:00:00.000Z',
  endsAt: '2026-09-07T15:00:00.000Z',
  type: 'MANUAL',
  active: true,
};

type MockScheduleService = ScheduleRouteService & {
  listProfessionalSchedules: ReturnType<typeof vi.fn>;
  upsertProfessionalSchedule: ReturnType<typeof vi.fn>;
};

type MockScheduleBlockService = ScheduleBlockRouteService & {
  listScheduleBlocks: ReturnType<typeof vi.fn>;
  createScheduleBlock: ReturnType<typeof vi.fn>;
};

type MockAvailabilityService = AvailabilityRouteService & {
  findAvailableSlots: ReturnType<typeof vi.fn>;
};

describe('schedule route handlers', () => {
  let service: MockScheduleService;
  let handlers: ReturnType<typeof createScheduleRouteHandlers>;

  beforeEach(() => {
    service = {
      listProfessionalSchedules: vi.fn(async () => [schedule]),
      upsertProfessionalSchedule: vi.fn(async () => schedule),
    };
    handlers = createScheduleRouteHandlers({ resolveContext: vi.fn(async () => context), service });
  });

  it('lists branch schedules through the application service', async () => {
    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/schedules?branchId=branch-1', {
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [schedule], requestId: 'request-1' });
    expect(service.listProfessionalSchedules).toHaveBeenCalledWith(context, 'branch-1');
  });

  it('upserts professional schedules', async () => {
    const body = { branchId: 'branch-1', professionalId: 'professional-1', weekday: 1, startsAtLocal: '09:00', endsAtLocal: '18:00' };

    const response = await handlers.PUT(
      new Request('https://barberos.local/api/v1/schedules', {
        method: 'PUT',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: schedule, requestId: 'request-1' });
    expect(service.upsertProfessionalSchedule).toHaveBeenCalledWith(context, body);
  });
});

describe('schedule block route handlers', () => {
  let service: MockScheduleBlockService;
  let handlers: ReturnType<typeof createScheduleBlockRouteHandlers>;

  beforeEach(() => {
    service = {
      listScheduleBlocks: vi.fn(async () => [block]),
      createScheduleBlock: vi.fn(async () => block),
    };
    handlers = createScheduleBlockRouteHandlers({ resolveContext: vi.fn(async () => context), service });
  });

  it('creates schedule blocks and returns 201', async () => {
    const body = {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      startsAt: '2026-09-07T14:00:00.000Z',
      endsAt: '2026-09-07T15:00:00.000Z',
      type: 'MANUAL',
    };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/schedule-blocks', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: block, requestId: 'request-1' });
    expect(service.createScheduleBlock).toHaveBeenCalledWith(context, body);
  });

  it('maps schedule block appointment conflicts to a stable 409 error', async () => {
    service.createScheduleBlock.mockRejectedValueOnce(
      new CoreOperationsApplicationError('APPOINTMENT_CONFLICT', 'Schedule block overlaps an active appointment.'),
    );

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/schedule-blocks', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({
          branchId: 'branch-1',
          professionalId: 'professional-1',
          startsAt: '2026-09-07T14:00:00.000Z',
          endsAt: '2026-09-07T15:00:00.000Z',
          type: 'MANUAL',
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: 'APPOINTMENT_CONFLICT',
        message: 'Schedule block overlaps an active appointment.',
        requestId: 'request-1',
      },
    });
  });
});

describe('availability route handlers', () => {
  let service: MockAvailabilityService;
  let handlers: ReturnType<typeof createAvailabilityRouteHandlers>;

  beforeEach(() => {
    service = {
      findAvailableSlots: vi.fn(async () => [
        {
          branchId: 'branch-1',
          professionalId: 'professional-1',
          startsAt: '2026-09-07T12:00:00.000Z',
          endsAt: '2026-09-07T12:30:00.000Z',
        },
      ]),
    };
    handlers = createAvailabilityRouteHandlers({ resolveContext: vi.fn(async () => context), service });
  });

  it('returns availability slots from query filters', async () => {
    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/availability?branchId=branch-1&serviceId=service-1&professionalId=professional-1&startsOn=2026-09-07&endsOn=2026-09-07&slotStepMinutes=30', {
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [
        {
          branchId: 'branch-1',
          professionalId: 'professional-1',
          startsAt: '2026-09-07T12:00:00.000Z',
          endsAt: '2026-09-07T12:30:00.000Z',
        },
      ],
      requestId: 'request-1',
    });
    expect(service.findAvailableSlots).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      serviceId: 'service-1',
      professionalId: 'professional-1',
      startsOn: '2026-09-07',
      endsOn: '2026-09-07',
      slotStepMinutes: 30,
    });
  });
});