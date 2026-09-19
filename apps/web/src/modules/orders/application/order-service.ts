import {
  createOrderItemCommandSchema,
  createWalkInOrderCommandSchema,
  removeOrderItemCommandSchema,
  updateOrderItemCommandSchema,
  updateOrderStatusCommandSchema,
  listOrdersQuerySchema,
  type CreateOrderItemCommand,
  type CreateWalkInOrderCommand,
  type Entitlement,
  type Order,
  type OrderDetail,
  type Product,
  type Permission,
  type RemoveOrderItemCommand,
  type RequestContext,
  type UpdateOrderItemCommand,
  type UpdateOrderStatusCommand,
} from '@barberos/contracts';
import { authorize } from '@barberos/permissions';

import {
  createProductSaleSnapshot,
  isProductVisibleForSale,
  productAppliesToBranch,
} from '../../catalog/domain';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type {
  OrderAuditSink,
  OrderListFilters,
  OrderOutboxProducer,
  OrderRepository,
} from '../domain';

const coreOperationsEntitlement = 'core.operations' satisfies Entitlement;

export interface OrderProductCatalog {
  findProductForSale(
    context: RequestContext,
    productId: string,
    branchId: string,
  ): Promise<Product | null>;
}

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export class OrderApplicationService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly audit?: OrderAuditSink,
    private readonly products?: OrderProductCatalog,
    private readonly outbox?: OrderOutboxProducer,
  ) {}

  async list(context: RequestContext, filters: OrderListFilters = {}) {
    const parsed = listOrdersQuerySchema.parse(filters);
    authorizeOrderAccess(context, 'orders.read', parsed.branchId);
    const orders = await this.orders.list(context, parsed);
    return orders.filter((order) => isOrderVisibleToContext(context, order));
  }

  async get(context: RequestContext, orderId: string) {
    const order = await this.orders.findById(context, orderId);
    if (!order || !isOrderVisibleToContext(context, order)) {
      throw new CoreOperationsApplicationError('ORDER_NOT_FOUND', 'Order was not found.');
    }
    authorizeOrderAccess(context, 'orders.read', order.branchId);
    return order;
  }

  async createWalkIn(context: RequestContext, command: CreateWalkInOrderCommand) {
    const parsed = createWalkInOrderCommandSchema.parse(command);
    authorizeOrderAccess(context, 'orders.create', parsed.branchId);
    const order = await this.orders.createWalkIn(context, parsed);
    assertReturnedOrderIsVisible(context, order);
    await this.recordHistoryAndAudit(context, order, {
      eventType: 'ORDER_CREATED',
      action: 'order.created',
      entityType: 'ORDER',
      entityId: order.id,
      reason: parsed.notes,
      metadata: { source: 'walk_in' },
      afterState: order,
    });
    await this.enqueueOrderOpened(context, order, 'walk-in');
    return order;
  }

  async addItem(context: RequestContext, command: CreateOrderItemCommand) {
    const parsed = createOrderItemCommandSchema.parse(command);
    const order = await this.getMutableOrder(context, parsed.orderId, 'orders.item.add');
    const itemCommand = await this.prepareItemCommand(context, order, parsed);
    const updated = await this.orders.addItem(context, itemCommand);
    assertReturnedOrderIsVisible(context, updated);
    assertOrderIdentity(order.id, updated.id);
    await this.recordHistoryAndAudit(context, updated, {
      eventType: 'ITEM_ADDED',
      action: 'order.item_added',
      entityType: 'ORDER_ITEM',
      entityId: findNewItemId(order, updated) ?? parsed.orderId,
      metadata: {
        orderId: parsed.orderId,
        sourceType: itemCommand.sourceType,
        sourceId: itemCommand.sourceId,
      },
      beforeState: order,
      afterState: updated,
    });
    return updated;
  }

  async updateItem(context: RequestContext, command: UpdateOrderItemCommand) {
    const parsed = updateOrderItemCommandSchema.parse(command);
    const order = await this.getMutableOrder(context, parsed.orderId, 'orders.item.update');
    const updated = await this.orders.updateItem(context, parsed);
    assertReturnedOrderIsVisible(context, updated);
    assertOrderIdentity(order.id, updated.id);
    await this.recordHistoryAndAudit(context, updated, {
      eventType: 'ITEM_UPDATED',
      action: 'order.item_updated',
      entityType: 'ORDER_ITEM',
      entityId: parsed.itemId,
      metadata: { orderId: parsed.orderId, itemId: parsed.itemId },
      beforeState: order,
      afterState: updated,
    });
    return updated;
  }

  async removeItem(context: RequestContext, command: RemoveOrderItemCommand) {
    const parsed = removeOrderItemCommandSchema.parse(command);
    const order = await this.getMutableOrder(context, parsed.orderId, 'orders.item.remove');
    const updated = await this.orders.removeItem(context, parsed);
    assertReturnedOrderIsVisible(context, updated);
    assertOrderIdentity(order.id, updated.id);
    await this.recordHistoryAndAudit(context, updated, {
      eventType: 'ITEM_REMOVED',
      action: 'order.item_removed',
      entityType: 'ORDER_ITEM',
      entityId: parsed.itemId,
      reason: parsed.reason,
      metadata: { orderId: parsed.orderId, itemId: parsed.itemId },
      beforeState: order,
      afterState: updated,
    });
    return updated;
  }

  async updateStatus(context: RequestContext, command: UpdateOrderStatusCommand) {
    const parsed = updateOrderStatusCommandSchema.parse(command);
    const current = await this.get(context, parsed.id);
    authorizeOrderAccess(context, 'orders.update', current.branchId);

    if (current.status !== parsed.fromStatus) {
      throw new CoreOperationsApplicationError(
        'ORDER_INVALID_STATUS',
        'Order status changed before update.',
      );
    }

    if (current.status === parsed.toStatus) {
      return current;
    }

    const updated = await this.orders.updateStatus(context, current.id, parsed.toStatus);
    assertReturnedOrderIsVisible(context, { ...current, ...updated });
    await this.recordHistoryAndAudit(
      context,
      { ...current, ...updated },
      {
        eventType: 'STATUS_CHANGED',
        action: 'order.status_changed',
        entityType: 'ORDER',
        entityId: current.id,
        reason: parsed.reason,
        metadata: { previousStatus: current.status, nextStatus: parsed.toStatus },
        beforeState: current,
        afterState: updated,
      },
    );
    return updated;
  }

  private async enqueueOrderOpened(
    context: RequestContext,
    order: Pick<OrderDetail, 'tenantId' | 'branchId' | 'id' | 'items' | 'totalAmountCents'>,
    source: string,
  ) {
    if (!this.outbox) return;
    await this.outbox.createEvent(context, {
      tenantId: order.tenantId,
      branchId: order.branchId,
      eventType: 'ORDER_OPENED',
      sourceType: 'ORDER',
      sourceId: order.id,
      payload: {
        orderId: order.id,
        itemCount: order.items.length,
        totalAmountCents: order.totalAmountCents,
        source,
      },
      idempotencyKey: 'order:' + order.id + ':opened',
      correlationId: context.requestId,
    });
  }

  private async prepareItemCommand(
    context: RequestContext,
    order: OrderDetail,
    command: CreateOrderItemCommand,
  ): Promise<CreateOrderItemCommand> {
    if (command.sourceType !== 'PRODUCT') return command;

    if (!command.sourceId) {
      throw new CoreOperationsApplicationError(
        'ORDER_ITEM_INVALID',
        'Product order items require a source product.',
      );
    }

    const product = await this.products?.findProductForSale(
      context,
      command.sourceId,
      order.branchId,
    );
    assertProductAvailableForOrder(context, order, product);

    const snapshot = createProductSaleSnapshot(product, {
      quantity: command.quantity,
      discountAmountCents: command.discountAmountCents,
    });

    return {
      ...command,
      sourceId: snapshot.sourceId,
      name: snapshot.nameSnapshot,
      quantity: snapshot.quantity,
      unitPriceAmountCents: snapshot.unitPriceAmountCents,
      costAmountCents: snapshot.costAmountCents,
      discountAmountCents: snapshot.discountAmountCents,
    };
  }

  private async getMutableOrder(context: RequestContext, orderId: string, permission: Permission) {
    const order = await this.get(context, orderId);
    authorizeOrderAccess(context, permission, order.branchId);
    if (order.status === 'CANCELLED') {
      throw new CoreOperationsApplicationError(
        'ORDER_INVALID_STATUS',
        'Cancelled orders cannot be mutated.',
      );
    }
    if (order.status === 'PAID') {
      throw new CoreOperationsApplicationError(
        'ORDER_INVALID_STATUS',
        'Paid orders cannot be mutated.',
      );
    }
    return order;
  }

  private async recordHistoryAndAudit(
    context: RequestContext,
    order: Pick<OrderDetail, 'tenantId' | 'branchId' | 'id'>,
    event: {
      eventType:
        'ORDER_CREATED' | 'STATUS_CHANGED' | 'ITEM_ADDED' | 'ITEM_UPDATED' | 'ITEM_REMOVED';
      action: string;
      entityType: 'ORDER' | 'ORDER_ITEM';
      entityId: string;
      reason?: string;
      metadata?: Record<string, unknown>;
      beforeState?: unknown;
      afterState?: unknown;
    },
  ) {
    await this.orders.recordHistory(context, {
      tenantId: order.tenantId,
      branchId: order.branchId,
      orderId: order.id,
      eventType: event.eventType,
      actorId: context.userId,
      reason: event.reason,
      metadata: event.metadata ?? {},
    });
    await this.audit?.record(context, {
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      result: 'SUCCESS',
      beforeState: event.beforeState,
      afterState: event.afterState,
    });
  }
}

function assertProductAvailableForOrder(
  context: RequestContext,
  order: Pick<OrderDetail, 'tenantId' | 'branchId'>,
  product: Product | null | undefined,
): asserts product is Product {
  if (
    !product ||
    product.tenantId !== context.tenantId ||
    product.tenantId !== order.tenantId ||
    !productAppliesToBranch(product, order.branchId) ||
    !isProductVisibleForSale(product)
  ) {
    throw new CoreOperationsApplicationError(
      'PRODUCT_UNAVAILABLE',
      'Product is not available for this order branch.',
    );
  }
}

function authorizeOrderAccess(context: RequestContext, permission: Permission, branchId?: string) {
  authorize(context, { permission, entitlement: coreOperationsEntitlement, branchId });
}

function isOrderVisibleToContext(
  context: RequestContext,
  order: Pick<Order, 'tenantId' | 'branchId'>,
) {
  return order.tenantId === context.tenantId && context.branchScope.includes(order.branchId);
}

function assertReturnedOrderIsVisible(context: RequestContext, order: OrderDetail) {
  if (!isOrderVisibleToContext(context, order)) {
    throw new CoreOperationsApplicationError(
      'ORDER_BRANCH_SCOPE_DENIED',
      'Order is outside the authorized scope.',
    );
  }
}

function findNewItemId(before: OrderDetail, after: OrderDetail) {
  const beforeIds = new Set(before.items.map((item) => item.id));
  return after.items.find((item) => !beforeIds.has(item.id))?.id;
}

function assertOrderIdentity(expectedOrderId: string, actualOrderId: string) {
  if (expectedOrderId !== actualOrderId) {
    throw new CoreOperationsApplicationError(
      'ORDER_VALIDATION_ERROR',
      'Order mutation returned an unexpected order.',
    );
  }
}
