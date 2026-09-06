import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Appointment, AppointmentStatusHistory, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/appointment-service';
import {
  createAppointmentRouteHandlers,
  type AppointmentRouteService,
} from './appointment-route-handlers';

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

const history: AppointmentStatusHistory = {
  id: 'history-1',
  appointmentId: 'appointment-1',
  previousStatus: 'CONFIRMED',
  nextStatus: 'CANCELLED',
  actorId: 'user-1',
  reason: 'Cliente cancelou',
  createdAt: '2026-09-07T12:10:00.000Z',
};

type MockAppointmentService = AppointmentRouteService & {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  reschedule: ReturnType<typeof vi.fn>;
  updateStatus: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  listStatusHistory: ReturnType<typeof vi.fn>;
};

describe('appointment route handlers', () => {
  let service: MockAppointmentService;
  let handlers: ReturnType<typeof createAppointmentRouteHandlers>;

  beforeEach(() => {
    service = {
      list: vi.fn(async () => [appointment]),
      get: vi.fn(async () => appointment),
      create: vi.fn(async () => appointment),
      reschedule: vi.fn(async () => ({
        ...appointment,
        startsAt: '2026-09-07T13:00:00.000Z',
        endsAt: '2026-09-07T13:30:00.000Z',
      })),
      updateStatus: vi.fn(async () => ({ ...appointment, status: 'CHECKED_IN' as const })),
      cancel: vi.fn(async () => ({ ...appointment, status: 'CANCELLED' as const })),
      listStatusHistory: vi.fn(async () => [history]),
    };
    handlers = createAppointmentRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('lists appointments using branch and date filters', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/appointments?branchId=branch-1&serviceId=service-1&professionalId=professional-1&startsOn=2026-09-07&endsOn=2026-09-07',
        {
          headers: { 'x-request-id': 'request-1' },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [appointment], requestId: 'request-1' });
    expect(service.list).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      serviceId: 'service-1',
      professionalId: 'professional-1',
      startsOn: '2026-09-07',
      endsOn: '2026-09-07',
    });
  });

  it('creates appointments and returns 201', async () => {
    const body = {
      branchId: 'branch-1',
      customerId: 'customer-1',
      professionalId: 'professional-1',
      startsAt: '2026-09-07T12:00:00.000Z',
      services: [{ serviceId: 'service-1' }],
    };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/appointments', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: appointment, requestId: 'request-1' });
    expect(service.create).toHaveBeenCalledWith(context, body);
  });

  it('maps appointment conflicts to stable 409 responses', async () => {
    service.create.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'APPOINTMENT_CONFLICT',
        'Appointment overlaps an active appointment.',
      ),
    );

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/appointments', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({
          branchId: 'branch-1',
          customerId: 'customer-1',
          professionalId: 'professional-1',
          startsAt: '2026-09-07T12:00:00.000Z',
          services: [{ serviceId: 'service-1' }],
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: 'APPOINTMENT_CONFLICT',
        message: 'Appointment overlaps an active appointment.',
        requestId: 'request-1',
      },
    });
  });

  it('reschedules appointments through PATCH when no status is provided', async () => {
    const body = {
      id: 'appointment-1',
      startsAt: '2026-09-07T13:00:00.000Z',
      reason: 'Cliente pediu novo horario',
    };

    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/appointments', {
        method: 'PATCH',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        ...appointment,
        startsAt: '2026-09-07T13:00:00.000Z',
        endsAt: '2026-09-07T13:30:00.000Z',
      },
      requestId: 'request-1',
    });
    expect(service.reschedule).toHaveBeenCalledWith(context, body);
  });

  it('updates appointment status through PATCH when status is provided', async () => {
    const body = { id: 'appointment-1', status: 'CHECKED_IN' as const, reason: 'Cliente chegou' };

    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/appointments', {
        method: 'PATCH',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { ...appointment, status: 'CHECKED_IN' as const },
      requestId: 'request-1',
    });
    expect(service.updateStatus).toHaveBeenCalledWith(context, body);
  });

  it('cancels appointments by id and reason', async () => {
    const response = await handlers.DELETE(
      new Request('https://barberos.local/api/v1/appointments?id=appointment-1', {
        method: 'DELETE',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({ reason: 'Cliente cancelou' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { ...appointment, status: 'CANCELLED' as const },
      requestId: 'request-1',
    });
    expect(service.cancel).toHaveBeenCalledWith(context, {
      id: 'appointment-1',
      reason: 'Cliente cancelou',
    });
  });

  it('returns status history when requested', async () => {
    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/appointments?id=appointment-1&history=1', {
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [history], requestId: 'request-1' });
    expect(service.listStatusHistory).toHaveBeenCalledWith(context, 'appointment-1');
  });
});
