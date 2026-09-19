import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  LowStockAlert,
  RequestContext,
  StockBalance,
  StockMovement,
} from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/inventory-service';
import {
  createInventoryRouteHandlers,
  type InventoryRouteService,
} from './inventory-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'MANAGER',
  permissions: ['inventory.read', 'inventory.write'],
  entitlements: ['inventory'],
  branchScope: ['branch-1'],
};

const balance: StockBalance = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  productId: 'product-1',
  currentQuantity: 7,
  minimumStockQuantity: 5,
  lowStock: false,
  updatedAt: '2026-09-07T09:00:00.000Z',
};

const movement: StockMovement = {
  id: 'movement-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  productId: 'product-1',
  type: 'ENTRY',
  quantity: 7,
  sourceType: 'MANUAL',
  idempotencyKey: 'stock-entry-1',
  createdBy: 'user-1',
  createdAt: '2026-09-07T09:00:00.000Z',
};

const alert: LowStockAlert = {
  id: 'alert-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  productId: 'product-1',
  state: 'ACTIVE',
  currentQuantity: 3,
  minimumStockQuantity: 5,
  triggeredAt: '2026-09-07T09:00:00.000Z',
};

type MockService = InventoryRouteService & {
  listBalances: ReturnType<typeof vi.fn>;
  listMovements: ReturnType<typeof vi.fn>;
  listLowStockAlerts: ReturnType<typeof vi.fn>;
  recordStockEntry: ReturnType<typeof vi.fn>;
  recordStockLoss: ReturnType<typeof vi.fn>;
  recordStockConsumption: ReturnType<typeof vi.fn>;
  recordStockAdjustment: ReturnType<typeof vi.fn>;
  recordStockSaleEffect: ReturnType<typeof vi.fn>;
  recordStockTransfer: ReturnType<typeof vi.fn>;
};

describe('inventory route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createInventoryRouteHandlers>;

  beforeEach(() => {
    service = {
      listBalances: vi.fn(async () => [balance]),
      listMovements: vi.fn(async () => [movement]),
      listLowStockAlerts: vi.fn(async () => [alert]),
      recordStockEntry: vi.fn(async () => movement),
      recordStockLoss: vi.fn(async () => ({ ...movement, type: 'LOSS' as const, quantity: -1 })),
      recordStockConsumption: vi.fn(async () => ({
        ...movement,
        type: 'CONSUMPTION' as const,
        quantity: -1,
      })),
      recordStockAdjustment: vi.fn(async () => ({
        ...movement,
        type: 'ADJUSTMENT' as const,
        quantity: 2,
      })),
      recordStockSaleEffect: vi.fn(async () => ({
        ...movement,
        type: 'SALE' as const,
        quantity: -2,
      })),
      recordStockTransfer: vi.fn(async () => ({
        transferOut: {
          ...movement,
          id: 'movement-out',
          type: 'TRANSFER_OUT' as const,
          quantity: -2,
        },
        transferIn: { ...movement, id: 'movement-in', type: 'TRANSFER_IN' as const, quantity: 2 },
      })),
    };
    handlers = createInventoryRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('lists balances, movements and alerts with branch-safe filters', async () => {
    let response: Response = await handlers.GET_BALANCES(
      new Request(
        'https://barberos.local/api/v1/inventory/balances?branchId=branch-1&productId=product-1&locationId=location-1&lowStockOnly=true&limit=25&cursor=cursor-1',
      ),
    );
    expect(response.status).toBe(200);
    expect(service.listBalances).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      productId: 'product-1',
      locationId: 'location-1',
      lowStockOnly: true,
      limit: 25,
      cursor: 'cursor-1',
    });

    response = await handlers.GET_MOVEMENTS(
      new Request(
        'https://barberos.local/api/v1/inventory/movements?branchId=branch-1&type=SALE&sourceType=ORDER_ITEM&sourceId=item-1&orderId=order-1&paymentId=payment-1',
      ),
    );
    expect(response.status).toBe(200);
    expect(service.listMovements).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      type: 'SALE',
      sourceType: 'ORDER_ITEM',
      sourceId: 'item-1',
      orderId: 'order-1',
      paymentId: 'payment-1',
    });

    response = await handlers.GET_ALERTS(
      new Request(
        'https://barberos.local/api/v1/inventory/alerts?branchId=branch-1&productId=product-1&state=ACTIVE',
      ),
    );
    expect(response.status).toBe(200);
    expect(service.listLowStockAlerts).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      productId: 'product-1',
      state: 'ACTIVE',
    });
  });

  it('records idempotent stock movements through a typed dispatcher', async () => {
    const entryBody = {
      type: 'ENTRY',
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: 7,
      idempotencyKey: 'stock-entry-1',
    };
    let response: Response = await handlers.POST_MOVEMENT(
      new Request('https://barberos.local/api/v1/inventory/movements', {
        method: 'POST',
        body: JSON.stringify(entryBody),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.recordStockEntry).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: 7,
      idempotencyKey: 'stock-entry-1',
    });

    const saleBody = {
      type: 'SALE',
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: -2,
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      paymentId: 'payment-1',
      idempotencyKey: 'stock-sale-1',
      allowNegativeStock: false,
    };
    response = await handlers.POST_MOVEMENT(
      new Request('https://barberos.local/api/v1/inventory/movements', {
        method: 'POST',
        body: JSON.stringify(saleBody),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.recordStockSaleEffect).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: -2,
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      paymentId: 'payment-1',
      idempotencyKey: 'stock-sale-1',
      allowNegativeStock: false,
    });
  });

  it('sanitizes insufficient stock and branch-scope denial errors', async () => {
    service.recordStockSaleEffect.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'INVENTORY_INSUFFICIENT_STOCK',
        'Product product-secret in tenant-secret branch-secret has insufficient stock.',
      ),
    );

    let response: Response = await handlers.POST_MOVEMENT(
      new Request('https://barberos.local/api/v1/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          type: 'SALE',
          branchId: 'branch-1',
          productId: 'product-secret',
          quantity: -2,
          orderId: 'order-1',
          orderItemId: 'order-item-1',
          paymentId: 'payment-1',
          idempotencyKey: 'stock-sale-secret',
        }),
      }),
    );
    let body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({
      code: 'INVENTORY_INSUFFICIENT_STOCK',
      message: 'Insufficient stock for this product and branch.',
      requestId: 'request-1',
    });
    expect(JSON.stringify(body)).not.toContain('tenant-secret');

    service.listBalances.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'INVENTORY_BRANCH_SCOPE_DENIED',
        'Branch branch-secret is outside scope for tenant-secret.',
      ),
    );
    response = await handlers.GET_BALANCES(
      new Request('https://barberos.local/api/v1/inventory/balances?branchId=branch-secret'),
    );
    body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      code: 'INVENTORY_BRANCH_SCOPE_DENIED',
      message: 'Inventory data is outside the authorized scope.',
    });
    expect(JSON.stringify(body)).not.toContain('branch-secret');
  });

  it('returns 401 when context is missing', async () => {
    handlers = createInventoryRouteHandlers({ resolveContext: vi.fn(async () => null), service });

    const response = await handlers.GET_ALERTS(
      new Request('https://barberos.local/api/v1/inventory/alerts'),
    );

    expect(response.status).toBe(401);
    expect(service.listLowStockAlerts).not.toHaveBeenCalled();
  });
});
