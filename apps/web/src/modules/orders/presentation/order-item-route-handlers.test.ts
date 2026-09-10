import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderDetail, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/order-service';
import {
  createOrderItemRouteHandlers,
  type OrderItemRouteService,
} from './order-item-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['orders.read', 'orders.item.add', 'orders.item.update', 'orders.item.remove'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

const order: OrderDetail = {
  id: 'order-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  customerId: 'customer-1',
  professionalId: 'professional-1',
  status: 'OPEN',
  subtotalAmountCents: 2500,
  discountAmountCents: 0,
  totalAmountCents: 2500,
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
      sourceType: 'MANUAL',
      nameSnapshot: 'Acabamento',
      quantity: 1,
      unitPriceAmountCents: 2500,
      discountAmountCents: 0,
      finalAmountCents: 2500,
      createdBy: 'user-1',
      createdAt: '2026-09-07T13:30:00.000Z',
    },
  ],
  history: [],
};

type MockService = OrderItemRouteService & {
  addItem: ReturnType<typeof vi.fn>;
  updateItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

describe('order item route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createOrderItemRouteHandlers>;

  beforeEach(() => {
    service = {
      addItem: vi.fn(async () => order),
      updateItem: vi.fn(async () => ({
        ...order,
        totalAmountCents: 3000,
        items: [{ ...order.items[0], quantity: 2, finalAmountCents: 5000 }],
      })),
      removeItem: vi.fn(async () => ({ ...order, items: [], totalAmountCents: 0 })),
    };
    handlers = createOrderItemRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('adds an item using the order id from the route', async () => {
    const body = {
      orderId: 'ignored-order',
      sourceType: 'MANUAL' as const,
      name: 'Acabamento',
      quantity: 1,
      unitPriceAmountCents: 2500,
    };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/orders/order-1/items', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify(body),
      }),
      'order-1',
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: order, requestId: 'request-1' });
    expect(service.addItem).toHaveBeenCalledWith(context, {
      ...body,
      orderId: 'order-1',
    });
  });

  it('updates an item using order and item ids from the route', async () => {
    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/orders/order-1/items/item-1', {
        method: 'PATCH',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({ orderId: 'ignored', itemId: 'ignored', quantity: 2 }),
      }),
      'order-1',
      'item-1',
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        ...order,
        totalAmountCents: 3000,
        items: [{ ...order.items[0], quantity: 2, finalAmountCents: 5000 }],
      },
      requestId: 'request-1',
    });
    expect(service.updateItem).toHaveBeenCalledWith(context, {
      orderId: 'order-1',
      itemId: 'item-1',
      quantity: 2,
    });
  });

  it('removes an item with an optional reason', async () => {
    const response = await handlers.DELETE(
      new Request('https://barberos.local/api/v1/orders/order-1/items/item-1', {
        method: 'DELETE',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({ reason: 'Cliente desistiu.' }),
      }),
      'order-1',
      'item-1',
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { ...order, items: [], totalAmountCents: 0 },
      requestId: 'request-1',
    });
    expect(service.removeItem).toHaveBeenCalledWith(context, {
      orderId: 'order-1',
      itemId: 'item-1',
      reason: 'Cliente desistiu.',
    });
  });

  it('returns 401 when there is no authenticated context', async () => {
    handlers = createOrderItemRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/orders/order-1/items', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({
          sourceType: 'MANUAL',
          name: 'Acabamento',
          unitPriceAmountCents: 2500,
        }),
      }),
      'order-1',
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

  it('maps rejected item mutations to stable error responses', async () => {
    service.addItem.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'ORDER_INVALID_STATUS',
        'Cancelled orders cannot be mutated.',
      ),
    );

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/orders/order-1/items', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({
          sourceType: 'MANUAL',
          name: 'Acabamento',
          unitPriceAmountCents: 2500,
        }),
      }),
      'order-1',
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'ORDER_INVALID_STATUS',
        message: 'Cancelled orders cannot be mutated.',
        requestId: 'request-1',
      },
    });
  });

  it('maps context resolution failures to sanitized stable error responses', async () => {
    handlers = createOrderItemRouteHandlers({
      resolveContext: vi.fn(async () => {
        throw new CoreOperationsApplicationError(
          'CORE_BRANCH_SCOPE_DENIED',
          'Tenant tenant-1 cannot mutate branch-2.',
        );
      }),
      service,
    });

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/orders/order-1/items', {
        method: 'POST',
        headers: { 'x-request-id': 'request-context' },
        body: JSON.stringify({
          sourceType: 'MANUAL',
          name: 'Acabamento',
          unitPriceAmountCents: 2500,
        }),
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
