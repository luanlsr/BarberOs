import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order, OrderDetail, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/order-service';
import { createOrderRouteHandlers, type OrderRouteService } from './order-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['orders.read', 'orders.create'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const orderSummary: Order = {
  id: 'order-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  customerId: 'customer-1',
  professionalId: 'professional-1',
  status: 'OPEN',
  subtotalAmountCents: 5000,
  discountAmountCents: 0,
  totalAmountCents: 5000,
  notes: 'Comanda do balcao.',
  openedAt: '2026-09-07T13:30:00.000Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-07T13:30:00.000Z',
  updatedAt: '2026-09-07T13:30:00.000Z',
};

const orderDetail: OrderDetail = {
  ...orderSummary,
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

type MockService = OrderRouteService & {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  createWalkIn: ReturnType<typeof vi.fn>;
};

describe('order route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createOrderRouteHandlers>;

  beforeEach(() => {
    service = {
      list: vi.fn(async () => [orderSummary]),
      get: vi.fn(async () => orderDetail),
      createWalkIn: vi.fn(async () => ({
        ...orderDetail,
        id: 'order-created',
        appointmentId: undefined,
      })),
    };
    handlers = createOrderRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('lists orders using tenant-safe filters', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/orders?branchId=branch-1&status=OPEN&customerId=customer-1&professionalId=professional-1&limit=10',
        { headers: { 'x-request-id': 'request-1' } },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [orderSummary], requestId: 'request-1' });
    expect(service.list).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      status: 'OPEN',
      customerId: 'customer-1',
      professionalId: 'professional-1',
      limit: 10,
    });
  });

  it('gets an order detail using query id', async () => {
    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/orders?id=order-1', {
        headers: { 'x-request-id': 'request-1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: orderDetail, requestId: 'request-1' });
    expect(service.get).toHaveBeenCalledWith(context, 'order-1');
  });

  it('gets an order detail using the dynamic route id', async () => {
    const response = await handlers.GET_BY_ID(
      new Request('https://barberos.local/api/v1/orders/order-1', {
        headers: { 'x-request-id': 'request-1' },
      }),
      'order-1',
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: orderDetail, requestId: 'request-1' });
    expect(service.get).toHaveBeenCalledWith(context, 'order-1');
  });

  it('creates walk-in orders and returns 201', async () => {
    const body = {
      branchId: 'branch-1',
      customerId: 'customer-1',
      professionalId: 'professional-1',
      notes: 'Cliente chegou sem horário.',
    };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/orders', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      data: { ...orderDetail, id: 'order-created', appointmentId: undefined },
      requestId: 'request-1',
    });
    expect(service.createWalkIn).toHaveBeenCalledWith(context, body);
  });

  it('returns 401 when there is no authenticated context', async () => {
    handlers = createOrderRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });

    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/orders', {
        headers: { 'x-request-id': 'request-1' },
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

  it('maps missing orders to stable 404 responses', async () => {
    service.get.mockRejectedValueOnce(
      new CoreOperationsApplicationError('ORDER_NOT_FOUND', 'Order was not found.'),
    );

    const response = await handlers.GET_BY_ID(
      new Request('https://barberos.local/api/v1/orders/missing-order', {
        headers: { 'x-request-id': 'request-1' },
      }),
      'missing-order',
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: 'ORDER_NOT_FOUND',
        message: 'Order was not found.',
        requestId: 'request-1',
      },
    });
  });

  it('maps context resolution failures to sanitized stable error responses', async () => {
    handlers = createOrderRouteHandlers({
      resolveContext: vi.fn(async () => {
        throw new CoreOperationsApplicationError(
          'CORE_BRANCH_SCOPE_DENIED',
          'Tenant tenant-1 cannot access branch-2.',
        );
      }),
      service,
    });

    const response = await handlers.GET_BY_ID(
      new Request('https://barberos.local/api/v1/orders/order-1', {
        headers: { 'x-request-id': 'request-context' },
      }),
      'order-1',
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'CORE_BRANCH_SCOPE_DENIED',
        message: 'Branch scope denied.',
        requestId: 'request-context',
      },
    });
  });
});
