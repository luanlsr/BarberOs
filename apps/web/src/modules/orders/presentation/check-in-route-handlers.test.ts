import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderDetail, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/check-in-service';
import { createCheckInRouteHandlers, type CheckInRouteService } from './check-in-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['appointments.check_in', 'orders.create', 'orders.read'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const order: OrderDetail = {
  id: 'order-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  appointmentId: 'appointment-1',
  customerId: 'customer-1',
  professionalId: 'professional-1',
  status: 'OPEN',
  subtotalAmountCents: 5000,
  discountAmountCents: 0,
  totalAmountCents: 5000,
  openedAt: '2026-09-07T13:30:00.000Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-07T13:30:00.000Z',
  updatedAt: '2026-09-07T13:30:00.000Z',
  items: [
    {
      id: 'item-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      orderId: 'order-1',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      nameSnapshot: 'Corte Masculino',
      quantity: 1,
      unitPriceAmountCents: 5000,
      discountAmountCents: 0,
      finalAmountCents: 5000,
      professionalId: 'professional-1',
      createdBy: 'user-1',
      createdAt: '2026-09-07T13:30:00.000Z',
    },
  ],
  history: [],
};

type MockService = CheckInRouteService & {
  checkIn: ReturnType<typeof vi.fn>;
};

describe('check-in route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createCheckInRouteHandlers>;

  beforeEach(() => {
    service = {
      checkIn: vi.fn(async () => order),
    };
    handlers = createCheckInRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('checks in an appointment and returns the opened order', async () => {
    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/check-in', {
        method: 'POST',
        headers: {
          'x-request-id': 'request-1',
          'idempotency-key': 'checkin-appointment-1',
        },
        body: JSON.stringify({ appointmentId: 'appointment-1', notes: 'Cliente chegou.' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: order, requestId: 'request-1' });
    expect(service.checkIn).toHaveBeenCalledWith(context, {
      appointmentId: 'appointment-1',
      idempotencyKey: 'checkin-appointment-1',
      notes: 'Cliente chegou.',
    });
  });

  it('lets the JSON payload idempotency key override the header', async () => {
    await handlers.POST(
      new Request('https://barberos.local/api/v1/check-in', {
        method: 'POST',
        headers: {
          'x-request-id': 'request-1',
          'idempotency-key': 'header-key-123',
        },
        body: JSON.stringify({
          appointmentId: 'appointment-1',
          idempotencyKey: 'body-key-123',
        }),
      }),
    );

    expect(service.checkIn).toHaveBeenCalledWith(context, {
      appointmentId: 'appointment-1',
      idempotencyKey: 'body-key-123',
    });
  });

  it('returns 401 when there is no authenticated context', async () => {
    handlers = createCheckInRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/check-in', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({ appointmentId: 'appointment-1' }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
        requestId: 'request-1',
      },
    });
  });

  it('maps invalid check-in status to a stable 400 response', async () => {
    service.checkIn.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'CHECK_IN_INVALID_APPOINTMENT_STATUS',
        'Appointment cannot be checked in from its current status.',
      ),
    );

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/check-in', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({ appointmentId: 'appointment-1' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'CHECK_IN_INVALID_APPOINTMENT_STATUS',
        message: 'Appointment cannot be checked in from its current status.',
        requestId: 'request-1',
      },
    });
  });

  it('maps context resolution failures to sanitized stable error responses', async () => {
    handlers = createCheckInRouteHandlers({
      resolveContext: vi.fn(async () => {
        throw Object.assign(new Error('User user-1 cannot access tenant-1.'), {
          code: 'PERMISSION_DENIED',
        });
      }),
      service,
    });

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/check-in', {
        method: 'POST',
        headers: { 'x-request-id': 'request-context' },
        body: JSON.stringify({ appointmentId: 'appointment-1' }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'CORE_PERMISSION_DENIED',
        message: 'Permission denied.',
        requestId: 'request-context',
      },
    });
  });
});
