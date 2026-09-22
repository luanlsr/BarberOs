import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CreateOrderItemCommand,
  CreateWalkInOrderCommand,
  Order,
  OrderDetail,
  OrderHistory,
  OrderStatus,
  Product,
  RemoveOrderItemCommand,
  RequestContext,
  UpdateOrderItemCommand,
} from '@barberos/contracts';

import type {
  OpenOrderFromAppointmentCommand,
  OrderAuditSink,
  OrderListFilters,
  OrderRepository,
} from '../domain';
import {
  CoreOperationsApplicationError,
  OrderApplicationService,
  type OrderProductCatalog,
} from './order-service';

const managerContext: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'MANAGER',
  permissions: [
    'orders.read',
    'orders.create',
    'orders.update',
    'orders.item.add',
    'orders.item.update',
    'orders.item.remove',
  ],
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
  subtotalAmountCents: 0,
  discountAmountCents: 0,
  totalAmountCents: 0,
  openedAt: '2026-09-05T13:00:00.000Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-05T13:00:00.000Z',
  updatedAt: '2026-09-05T13:00:00.000Z',
  items: [],
  history: [],
};

const otherTenantOrder: OrderDetail = {
  ...order,
  id: 'order-other-tenant',
  tenantId: 'tenant-2',
};

const otherBranchOrder: OrderDetail = {
  ...order,
  id: 'order-other-branch',
  branchId: 'branch-2',
};

const cancelledOrder: OrderDetail = {
  ...order,
  id: 'order-cancelled',
  status: 'CANCELLED',
};

const paidOrder: OrderDetail = {
  ...order,
  id: 'order-paid',
  status: 'PAID',
};
const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  tenantId: 'tenant-1',
  branchIds: ['branch-1'],
  categoryId: 'category-1',
  sku: 'POM-001',
  name: 'Pomada modeladora',
  status: 'ACTIVE',
  salePriceAmountCents: 4500,
  costAmountCents: 1800,
  stockTrackingPolicy: 'TRACKED',
  allowNegativeStock: false,
  minimumStockQuantity: 2,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-08T10:00:00.000Z',
  updatedAt: '2026-09-08T10:00:00.000Z',
  ...overrides,
});

class FakeOrderRepository implements OrderRepository {
  readonly orders = new Map<string, OrderDetail>([
    [order.id, order],
    [otherTenantOrder.id, otherTenantOrder],
    [otherBranchOrder.id, otherBranchOrder],
    [cancelledOrder.id, cancelledOrder],
    [paidOrder.id, paidOrder],
  ]);
  listedFilters: OrderListFilters | null = null;
  createdWalkInCommand: CreateWalkInOrderCommand | null = null;
  readonly history: Array<Omit<OrderHistory, 'id' | 'createdAt'>> = [];

  async list(_context: RequestContext, filters: OrderListFilters = {}) {
    this.listedFilters = filters;
    return Array.from(this.orders.values()).filter(
      (candidate) =>
        (!filters.branchId || candidate.branchId === filters.branchId) &&
        (!filters.status || candidate.status === filters.status) &&
        (!filters.customerId || candidate.customerId === filters.customerId) &&
        (!filters.professionalId || candidate.professionalId === filters.professionalId) &&
        (!filters.appointmentId || candidate.appointmentId === filters.appointmentId),
    );
  }

  async findById(_context: RequestContext, orderId: string) {
    return this.orders.get(orderId) ?? null;
  }

  async findByAppointmentId(_context: RequestContext, appointmentId: string) {
    return (
      Array.from(this.orders.values()).find(
        (candidate) => candidate.appointmentId === appointmentId,
      ) ?? null
    );
  }

  async createWalkIn(context: RequestContext, command: CreateWalkInOrderCommand) {
    this.createdWalkInCommand = command;
    const created: OrderDetail = {
      ...order,
      id: 'order-created',
      tenantId: context.tenantId,
      branchId: command.branchId,
      customerId: command.customerId,
      professionalId: command.professionalId,
      notes: command.notes,
      createdBy: context.userId,
      updatedBy: context.userId,
    };
    this.orders.set(created.id, created);
    return created;
  }

  async createFromAppointment(_context: RequestContext, _command: OpenOrderFromAppointmentCommand) {
    return order;
  }

  async updateStatus(_context: RequestContext, orderId: string, status: OrderStatus) {
    const current = this.orders.get(orderId) ?? order;
    const updated = { ...current, status } satisfies Order;
    this.orders.set(updated.id, { ...current, ...updated });
    return updated;
  }

  async addItem(context: RequestContext, command: CreateOrderItemCommand) {
    const current = this.orders.get(command.orderId) ?? order;
    const quantity = command.quantity ?? 1;
    const discountAmountCents = command.discountAmountCents ?? 0;
    const item = {
      id: 'item-created',
      tenantId: current.tenantId,
      branchId: current.branchId,
      orderId: current.id,
      sourceType: command.sourceType,
      sourceId: command.sourceId,
      nameSnapshot: command.name,
      quantity,
      unitPriceAmountCents: command.unitPriceAmountCents,
      discountAmountCents,
      finalAmountCents: quantity * command.unitPriceAmountCents - discountAmountCents,
      costAmountCents: command.costAmountCents,
      professionalId: command.professionalId,
      notes: command.notes,
      createdBy: context.userId,
      createdAt: '2026-09-05T13:00:00.000Z',
    };
    const updated = withTotals({ ...current, items: [...current.items, item] });
    this.orders.set(updated.id, updated);
    return updated;
  }

  async updateItem(_context: RequestContext, command: UpdateOrderItemCommand) {
    const current = this.orders.get(command.orderId) ?? order;
    const updatedItems = current.items.map((item) => {
      if (item.id !== command.itemId) return item;
      const quantity = command.quantity ?? item.quantity;
      const discountAmountCents = command.discountAmountCents ?? item.discountAmountCents;
      return {
        ...item,
        quantity,
        discountAmountCents,
        professionalId: command.professionalId ?? item.professionalId,
        notes: command.notes ?? item.notes,
        finalAmountCents: quantity * item.unitPriceAmountCents - discountAmountCents,
      };
    });
    const updated = withTotals({ ...current, items: updatedItems });
    this.orders.set(updated.id, updated);
    return updated;
  }

  async removeItem(_context: RequestContext, command: RemoveOrderItemCommand) {
    const current = this.orders.get(command.orderId) ?? order;
    const updated = withTotals({
      ...current,
      items: current.items.filter((item) => item.id !== command.itemId),
    });
    this.orders.set(updated.id, updated);
    return updated;
  }

  async recordHistory(_context: RequestContext, entry: Omit<OrderHistory, 'id' | 'createdAt'>) {
    this.history.push(entry);
  }
}

class FakeOrderProductCatalog implements OrderProductCatalog {
  products = new Map<string, Product>([[product().id, product()]]);
  readonly lookups: Array<{ productId: string; branchId: string }> = [];

  async findProductForSale(_context: RequestContext, productId: string, branchId: string) {
    this.lookups.push({ productId, branchId });
    return this.products.get(productId) ?? null;
  }
}
class FakeOrderAuditSink implements OrderAuditSink {
  readonly events: Array<Parameters<OrderAuditSink['record']>[1]> = [];

  async record(_context: RequestContext, event: Parameters<OrderAuditSink['record']>[1]) {
    this.events.push(event);
  }
}

function withTotals(orderDetail: OrderDetail): OrderDetail {
  const subtotalAmountCents = orderDetail.items.reduce(
    (total, item) => total + item.quantity * item.unitPriceAmountCents,
    0,
  );
  const discountAmountCents = orderDetail.items.reduce(
    (total, item) => total + item.discountAmountCents,
    0,
  );
  return {
    ...orderDetail,
    subtotalAmountCents,
    discountAmountCents,
    totalAmountCents: subtotalAmountCents - discountAmountCents,
  };
}

describe('OrderApplicationService', () => {
  let repository: FakeOrderRepository;
  let audit: FakeOrderAuditSink;
  let service: OrderApplicationService;

  beforeEach(() => {
    repository = new FakeOrderRepository();
    audit = new FakeOrderAuditSink();
    service = new OrderApplicationService(repository, audit);
  });

  it('lists only orders visible to the current tenant and branch scope', async () => {
    const result = await service.list(managerContext, { branchId: 'branch-1', status: 'OPEN' });

    expect(result).toEqual([order]);
    expect(repository.listedFilters).toEqual({ branchId: 'branch-1', status: 'OPEN', limit: 25 });
  });

  it('rejects listing orders outside branch scope', async () => {
    await expect(service.list(managerContext, { branchId: 'branch-2' })).rejects.toMatchObject({
      code: 'BRANCH_SCOPE_DENIED',
    });
  });

  it('gets a visible order detail', async () => {
    await expect(service.get(managerContext, order.id)).resolves.toEqual(order);
  });

  it('does not leak cross-tenant or cross-branch order details', async () => {
    await expect(service.get(managerContext, otherTenantOrder.id)).rejects.toEqual(
      new CoreOperationsApplicationError('ORDER_NOT_FOUND', 'Order was not found.'),
    );
    await expect(service.get(managerContext, otherBranchOrder.id)).rejects.toEqual(
      new CoreOperationsApplicationError('ORDER_NOT_FOUND', 'Order was not found.'),
    );
  });

  it('creates a walk-in order inside the authorized branch', async () => {
    const created = await service.createWalkIn(managerContext, {
      branchId: 'branch-1',
      customerId: 'customer-1',
      notes: 'Cliente chegou sem horário.',
    });

    expect(created.id).toBe('order-created');
    expect(created.customerId).toBe('customer-1');
    expect(repository.createdWalkInCommand).toEqual({
      branchId: 'branch-1',
      customerId: 'customer-1',
      notes: 'Cliente chegou sem horário.',
    });
    expect(repository.history.at(-1)).toMatchObject({
      eventType: 'ORDER_CREATED',
      orderId: 'order-created',
      reason: 'Cliente chegou sem horário.',
    });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'order.created',
      entityType: 'ORDER',
      entityId: 'order-created',
      result: 'SUCCESS',
    });
  });

  it('requires order create permission for walk-in orders', async () => {
    const readOnlyContext = {
      ...managerContext,
      permissions: ['orders.read'],
    } satisfies RequestContext;

    await expect(
      service.createWalkIn(readOnlyContext, { branchId: 'branch-1' }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('adds, updates and removes order items with server-side totals', async () => {
    const withItem = await service.addItem(managerContext, {
      orderId: order.id,
      sourceType: 'MANUAL',
      name: 'Acabamento',
      quantity: 2,
      unitPriceAmountCents: 1500,
      discountAmountCents: 500,
    });

    expect(withItem.items[0]).toMatchObject({
      nameSnapshot: 'Acabamento',
      quantity: 2,
      finalAmountCents: 2500,
    });
    expect(withItem.totalAmountCents).toBe(2500);

    const updated = await service.updateItem(managerContext, {
      orderId: order.id,
      itemId: 'item-created',
      quantity: 1,
      discountAmountCents: 0,
    });

    expect(updated.items[0]).toMatchObject({ quantity: 1, finalAmountCents: 1500 });
    expect(updated.totalAmountCents).toBe(1500);

    const removed = await service.removeItem(managerContext, {
      orderId: order.id,
      itemId: 'item-created',
      reason: 'Cliente desistiu.',
    });

    expect(removed.items).toEqual([]);
    expect(removed.totalAmountCents).toBe(0);
    expect(repository.history.map((event) => event.eventType)).toEqual([
      'ITEM_ADDED',
      'ITEM_UPDATED',
      'ITEM_REMOVED',
    ]);
    expect(audit.events.map((event) => event.action)).toEqual([
      'order.item_added',
      'order.item_updated',
      'order.item_removed',
    ]);
  });

  it('adds product items from active catalog snapshots instead of trusting client price data', async () => {
    const catalog = new FakeOrderProductCatalog();
    service = new OrderApplicationService(repository, audit, catalog);

    const withProduct = await service.addItem(managerContext, {
      orderId: order.id,
      sourceType: 'PRODUCT',
      sourceId: 'product-1',
      name: 'Nome adulterado',
      quantity: 2,
      unitPriceAmountCents: 999999,
      discountAmountCents: 500,
    });

    expect(catalog.lookups).toEqual([{ productId: 'product-1', branchId: 'branch-1' }]);
    expect(withProduct.items[0]).toMatchObject({
      sourceType: 'PRODUCT',
      sourceId: 'product-1',
      nameSnapshot: 'Pomada modeladora',
      quantity: 2,
      unitPriceAmountCents: 4500,
      costAmountCents: 1800,
      discountAmountCents: 500,
      finalAmountCents: 8500,
    });
    expect(withProduct.totalAmountCents).toBe(8500);
  });

  it('rejects unavailable catalog products before adding order items', async () => {
    const catalog = new FakeOrderProductCatalog();
    catalog.products.set('product-1', product({ status: 'INACTIVE' }));
    service = new OrderApplicationService(repository, audit, catalog);

    await expect(
      service.addItem(managerContext, {
        orderId: order.id,
        sourceType: 'PRODUCT',
        sourceId: 'product-1',
        name: 'Pomada modeladora',
        unitPriceAmountCents: 4500,
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'PRODUCT_UNAVAILABLE',
        'Product is not available for this order branch.',
      ),
    );

    expect(repository.orders.get(order.id)?.items).toEqual([]);
    expect(repository.history).toEqual([]);
  });

  it('rejects product items assigned to another branch without leaking product data', async () => {
    const catalog = new FakeOrderProductCatalog();
    catalog.products.set('product-1', product({ branchIds: ['branch-2'] }));
    service = new OrderApplicationService(repository, audit, catalog);

    await expect(
      service.addItem(managerContext, {
        orderId: order.id,
        sourceType: 'PRODUCT',
        sourceId: 'product-1',
        name: 'Pomada modeladora',
        unitPriceAmountCents: 4500,
      }),
    ).rejects.toMatchObject({ code: 'PRODUCT_UNAVAILABLE' });

    expect(repository.orders.get(order.id)?.items).toEqual([]);
  });

  it('removes unpaid product items without catalog or stock side effects', async () => {
    const catalog = new FakeOrderProductCatalog();
    service = new OrderApplicationService(repository, audit, catalog);

    await service.addItem(managerContext, {
      orderId: order.id,
      sourceType: 'PRODUCT',
      sourceId: 'product-1',
      name: 'Pomada modeladora',
      unitPriceAmountCents: 4500,
    });

    const removed = await service.removeItem(managerContext, {
      orderId: order.id,
      itemId: 'item-created',
      reason: 'Produto removido antes do pagamento.',
    });

    expect(removed.items).toEqual([]);
    expect(removed.totalAmountCents).toBe(0);
    expect(catalog.lookups).toEqual([{ productId: 'product-1', branchId: 'branch-1' }]);
    expect(repository.history.map((event) => event.eventType)).toEqual([
      'ITEM_ADDED',
      'ITEM_REMOVED',
    ]);
  });
  it('updates order status with history and audit events', async () => {
    const updated = await service.updateStatus(managerContext, {
      id: order.id,
      fromStatus: 'OPEN',
      toStatus: 'IN_SERVICE',
      reason: 'Atendimento iniciado.',
    });

    expect(updated.status).toBe('IN_SERVICE');
    expect(repository.history.at(-1)).toMatchObject({
      eventType: 'STATUS_CHANGED',
      orderId: order.id,
      reason: 'Atendimento iniciado.',
      metadata: { previousStatus: 'OPEN', nextStatus: 'IN_SERVICE' },
    });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'order.status_changed',
      entityType: 'ORDER',
      entityId: order.id,
      result: 'SUCCESS',
    });
  });

  it('rejects direct paid status transitions outside the payment workflow', async () => {
    await expect(
      service.updateStatus(managerContext, {
        id: order.id,
        fromStatus: 'READY_FOR_PAYMENT',
        toStatus: 'PAID',
      }),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ['toStatus'] })],
    });

    expect(repository.history).toEqual([]);
    expect(audit.events).toEqual([]);
  });

  it('rejects stale order status transitions without mutating state', async () => {
    await expect(
      service.updateStatus(managerContext, {
        id: order.id,
        fromStatus: 'IN_SERVICE',
        toStatus: 'READY_FOR_PAYMENT',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'ORDER_INVALID_STATUS',
        'Order status changed before update.',
      ),
    );

    expect(repository.history).toEqual([]);
    expect(audit.events).toEqual([]);
  });

  it('requires item permissions before mutating orders', async () => {
    const noItemPermission = {
      ...managerContext,
      permissions: ['orders.read', 'orders.create'],
    } satisfies RequestContext;

    await expect(
      service.addItem(noItemPermission, {
        orderId: order.id,
        sourceType: 'MANUAL',
        name: 'Acabamento',
        unitPriceAmountCents: 1500,
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects item mutations on paid orders', async () => {
    await expect(
      service.addItem(managerContext, {
        orderId: paidOrder.id,
        sourceType: 'MANUAL',
        name: 'Acabamento',
        unitPriceAmountCents: 1500,
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError('ORDER_INVALID_STATUS', 'Paid orders cannot be mutated.'),
    );
  });

  it('rejects item mutations on cancelled orders', async () => {
    await expect(
      service.addItem(managerContext, {
        orderId: cancelledOrder.id,
        sourceType: 'MANUAL',
        name: 'Acabamento',
        unitPriceAmountCents: 1500,
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'ORDER_INVALID_STATUS',
        'Cancelled orders cannot be mutated.',
      ),
    );
  });
});
