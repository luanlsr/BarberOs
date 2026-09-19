import { describe, expect, it } from 'vitest';
import {
  activeAppointmentStatuses,
  apiErrorSchema,
  createNotificationIntentCommandSchema,
  createOutboxEventCommandSchema,
  createWorkerJobCommandSchema,
  notificationDeliveryAttemptSchema,
  notificationIntentSchema,
  outboxEventSchema,
  recordNotificationDeliveryAttemptCommandSchema,
  workerErrorCodeSchema,
  workerJobAttemptSchema,
  workerJobSchema,
  workerSanitizedErrorSchema,
  archiveProductCategoryCommandSchema,
  archiveProductCommandSchema,
  appointmentSchema,
  branchScopedAuthorizationRequirementSchema,
  canTransitionOrderStatus,
  cashMovementSchema,
  cashMovementTypeSchema,
  cashRegisterMovementCommandSchema,
  cashRegisterSessionSchema,
  cashRegisterSessionStatusSchema,
  commissionAccrualStatusSchema,
  commissionRuleScopeSchema,
  commissionRuleStatusSchema,
  commissionRuleTypeSchema,
  commissionSummarySchema,
  commissionAccrualSchema,
  commissionRuleSchema,
  checkInAppointmentCommandSchema,
  closeCashRegisterCommandSchema,
  closePayoutCommandSchema,
  correctPayoutCommandSchema,
  coreOperationsErrorCodeSchema,
  createCommissionRuleCommandSchema,
  createAppointmentCommandSchema,
  createOrderItemCommandSchema,
  createServiceCommandSchema,
  createWalkInOrderCommandSchema,
  cancelExpenseCommandSchema,
  createExpenseCommandSchema,
  createProductCategoryCommandSchema,
  createProductCommandSchema,
  createStockAdjustmentCommandSchema,
  createStockConsumptionCommandSchema,
  createStockEntryCommandSchema,
  createStockLossCommandSchema,
  createStockSaleEffectCommandSchema,
  createStockTransferCommandSchema,
  expenseStatusSchema,
  entitlementSchema,
  expenseRecurrenceFrequencySchema,
  expenseCategorySchema,
  expenseSchema,
  expenseListResponseSchema,
  financialEntryDirectionSchema,
  financialEntryStatusSchema,
  financialEntryTypeSchema,
  financialEntrySchema,
  financeSummarySchema,
  hasBranchAccess,
  generateCommissionAccrualsCommandSchema,
  openCashRegisterCommandSchema,
  orderDetailSchema,
  inventoryLocationSchema,
  lowStockAlertSchema,
  orderItemSchema,
  productCategorySchema,
  productDetailResponseSchema,
  productListResponseSchema,
  productSchema,
  productStatusSchema,
  orderStatusSchema,
  paymentAllocationSchema,
  paymentMethodSchema,
  paymentSchema,
  paymentStatusSchema,
  payExpenseCommandSchema,
  payPayoutCommandSchema,
  payoutStatusSchema,
  payoutAllocationSchema,
  payoutSchema,
  payoutDetailSchema,
  professionalWalletSchema,
  permissionSchema,
  professionalScheduleSchema,
  receivePaymentCommandSchema,
  refundPaymentCommandSchema,
  refundStatusSchema,
  stockAlertStateSchema,
  stockBalanceSchema,
  stockMovementSchema,
  stockMovementTypeSchema,
  stockSourceTypeSchema,
  stockTrackingPolicySchema,
  updateOrderItemCommandSchema,
  updateOrderStatusCommandSchema,
  updateCommissionRuleCommandSchema,
  updateExpenseCommandSchema,
  updateProductCategoryCommandSchema,
  updateProductCommandSchema,
} from './index';

describe('core operations contracts', () => {
  it('recognizes core operations permissions and stable error codes', () => {
    expect(permissionSchema.parse('professionals.create')).toBe('professionals.create');
    expect(permissionSchema.parse('services.update')).toBe('services.update');
    expect(permissionSchema.parse('schedules.manage')).toBe('schedules.manage');
    expect(permissionSchema.parse('orders.read')).toBe('orders.read');
    expect(permissionSchema.parse('appointments.check_in')).toBe('appointments.check_in');
    expect(permissionSchema.parse('payments.receive')).toBe('payments.receive');
    expect(permissionSchema.parse('cash.close')).toBe('cash.close');
    expect(permissionSchema.parse('worker.failures.read')).toBe('worker.failures.read');
    expect(permissionSchema.parse('notifications.status.read')).toBe('notifications.status.read');
    expect(entitlementSchema.parse('worker.operations')).toBe('worker.operations');
    expect(entitlementSchema.parse('notifications')).toBe('notifications');
    expect(coreOperationsErrorCodeSchema.parse('APPOINTMENT_CONFLICT')).toBe(
      'APPOINTMENT_CONFLICT',
    );
    expect(coreOperationsErrorCodeSchema.parse('ORDER_NOT_FOUND')).toBe('ORDER_NOT_FOUND');
    expect(coreOperationsErrorCodeSchema.parse('PAYMENT_IDEMPOTENCY_CONFLICT')).toBe(
      'PAYMENT_IDEMPOTENCY_CONFLICT',
    );
    expect(coreOperationsErrorCodeSchema.parse('CASH_REGISTER_NOT_OPEN')).toBe(
      'CASH_REGISTER_NOT_OPEN',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_PERMISSION_DENIED')).toBe(
      'FINANCE_PERMISSION_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_BRANCH_SCOPE_DENIED')).toBe(
      'FINANCE_BRANCH_SCOPE_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_IDEMPOTENCY_CONFLICT')).toBe(
      'FINANCE_IDEMPOTENCY_CONFLICT',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_CASH_REGISTER_NOT_OPEN')).toBe(
      'FINANCE_CASH_REGISTER_NOT_OPEN',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_IMMUTABLE_ENTRY')).toBe(
      'FINANCE_IMMUTABLE_ENTRY',
    );
    expect(coreOperationsErrorCodeSchema.parse('COMMISSION_PERMISSION_DENIED')).toBe(
      'COMMISSION_PERMISSION_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('COMMISSION_BRANCH_SCOPE_DENIED')).toBe(
      'COMMISSION_BRANCH_SCOPE_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('COMMISSION_IDEMPOTENCY_CONFLICT')).toBe(
      'COMMISSION_IDEMPOTENCY_CONFLICT',
    );
    expect(coreOperationsErrorCodeSchema.parse('COMMISSION_IMMUTABLE_ACCRUAL')).toBe(
      'COMMISSION_IMMUTABLE_ACCRUAL',
    );
    expect(coreOperationsErrorCodeSchema.parse('PAYOUT_CASH_REGISTER_NOT_OPEN')).toBe(
      'PAYOUT_CASH_REGISTER_NOT_OPEN',
    );
    expect(coreOperationsErrorCodeSchema.parse('CATALOG_PERMISSION_DENIED')).toBe(
      'CATALOG_PERMISSION_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('CATALOG_ENTITLEMENT_DENIED')).toBe(
      'CATALOG_ENTITLEMENT_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('PRODUCT_UNAVAILABLE')).toBe('PRODUCT_UNAVAILABLE');
    expect(coreOperationsErrorCodeSchema.parse('INVENTORY_PERMISSION_DENIED')).toBe(
      'INVENTORY_PERMISSION_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('INVENTORY_BRANCH_SCOPE_DENIED')).toBe(
      'INVENTORY_BRANCH_SCOPE_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('INVENTORY_INSUFFICIENT_STOCK')).toBe(
      'INVENTORY_INSUFFICIENT_STOCK',
    );
    expect(coreOperationsErrorCodeSchema.parse('INVENTORY_IDEMPOTENCY_CONFLICT')).toBe(
      'INVENTORY_IDEMPOTENCY_CONFLICT',
    );
    expect(coreOperationsErrorCodeSchema.parse('INVENTORY_IMMUTABLE_MOVEMENT')).toBe(
      'INVENTORY_IMMUTABLE_MOVEMENT',
    );
    expect(coreOperationsErrorCodeSchema.safeParse('FINANCE_DATA_LEAK').success).toBe(false);

    expect(
      apiErrorSchema.parse({
        error: {
          code: 'FINANCE_PERMISSION_DENIED',
          message: 'Permission denied.',
          requestId: 'request-finance-a',
        },
      }).error.code,
    ).toBe('FINANCE_PERMISSION_DENIED');

    const inventoryError = apiErrorSchema.parse({
      error: {
        code: 'INVENTORY_INSUFFICIENT_STOCK',
        message: 'Insufficient stock.',
        requestId: 'request-inventory-a',
      },
    });
    expect(inventoryError.error).toEqual({
      code: 'INVENTORY_INSUFFICIENT_STOCK',
      message: 'Insufficient stock.',
      requestId: 'request-inventory-a',
    });
  });

  it('recognizes catalog and inventory enum contracts', () => {
    expect(productStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
    expect(productStatusSchema.parse('INACTIVE')).toBe('INACTIVE');
    expect(productStatusSchema.parse('ARCHIVED')).toBe('ARCHIVED');
    expect(productStatusSchema.safeParse('DELETED').success).toBe(false);

    expect(stockTrackingPolicySchema.parse('TRACKED')).toBe('TRACKED');
    expect(stockTrackingPolicySchema.parse('NOT_TRACKED')).toBe('NOT_TRACKED');
    expect(stockTrackingPolicySchema.safeParse('OPTIONAL').success).toBe(false);

    expect(stockMovementTypeSchema.parse('ENTRY')).toBe('ENTRY');
    expect(stockMovementTypeSchema.parse('SALE')).toBe('SALE');
    expect(stockMovementTypeSchema.parse('LOSS')).toBe('LOSS');
    expect(stockMovementTypeSchema.parse('CONSUMPTION')).toBe('CONSUMPTION');
    expect(stockMovementTypeSchema.parse('ADJUSTMENT')).toBe('ADJUSTMENT');
    expect(stockMovementTypeSchema.parse('TRANSFER_IN')).toBe('TRANSFER_IN');
    expect(stockMovementTypeSchema.parse('TRANSFER_OUT')).toBe('TRANSFER_OUT');
    expect(stockMovementTypeSchema.safeParse('DIRECT_EDIT').success).toBe(false);

    expect(stockSourceTypeSchema.parse('MANUAL')).toBe('MANUAL');
    expect(stockSourceTypeSchema.parse('ORDER_ITEM')).toBe('ORDER_ITEM');
    expect(stockSourceTypeSchema.parse('PAYMENT')).toBe('PAYMENT');
    expect(stockSourceTypeSchema.parse('TRANSFER')).toBe('TRANSFER');
    expect(stockSourceTypeSchema.parse('SYSTEM')).toBe('SYSTEM');
    expect(stockSourceTypeSchema.safeParse('TENANT').success).toBe(false);

    expect(stockAlertStateSchema.parse('ACTIVE')).toBe('ACTIVE');
    expect(stockAlertStateSchema.parse('RESOLVED')).toBe('RESOLVED');
    expect(stockAlertStateSchema.safeParse('IGNORED').success).toBe(false);
  });

  it('rejects invalid service duration and price', () => {
    const result = createServiceCommandSchema.safeParse({
      category: 'Cabelo',
      name: 'Corte',
      durationMinutes: 0,
      priceCents: -1,
    });

    expect(result.success).toBe(false);
  });

  it('accepts the minimal valid manual appointment command', () => {
    const result = createAppointmentCommandSchema.parse({
      branchId: 'branch-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      startsAt: '2026-09-05T13:00:00.000Z',
      services: [{ serviceId: 'service-a' }],
    });

    expect(result.status).toBe('CONFIRMED');
    expect(result.source).toBe('MANUAL');
  });

  it('rejects appointments without scheduled services', () => {
    const result = createAppointmentCommandSchema.safeParse({
      branchId: 'branch-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      startsAt: '2026-09-05T13:00:00.000Z',
      services: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects appointment entities whose end is not after start', () => {
    const result = appointmentSchema.safeParse({
      id: 'appointment-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      startsAt: '2026-09-05T13:00:00.000Z',
      endsAt: '2026-09-05T13:00:00.000Z',
      status: 'CONFIRMED',
      source: 'MANUAL',
      services: [
        {
          serviceId: 'service-a',
          serviceName: 'Corte',
          durationMinutes: 40,
          priceCents: 5000,
          sequence: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('validates branch-scoped authorization requirements', () => {
    const requirement = branchScopedAuthorizationRequirementSchema.parse({
      permission: 'appointments.create',
      entitlement: 'core.operations',
      branchId: 'branch-a',
    });

    expect(requirement.branchId).toBe('branch-a');
    const branchId = requirement.branchId ?? '';
    expect(hasBranchAccess({ branchScope: ['branch-a'] }, branchId)).toBe(true);
    expect(hasBranchAccess({ branchScope: ['branch-b'] }, branchId)).toBe(false);
  });

  it('accepts catalog and inventory records with tenant and branch scope', () => {
    const category = productCategorySchema.parse({
      id: 'category-a',
      tenantId: 'tenant-a',
      branchIds: ['branch-a'],
      name: 'Finalizadores',
      status: 'ACTIVE',
      createdBy: 'user-a',
      updatedBy: 'user-a',
      createdAt: '2026-09-05T13:00:00.000Z',
      updatedAt: '2026-09-05T13:00:00.000Z',
    });
    const product = productSchema.parse({
      id: 'product-a',
      tenantId: 'tenant-a',
      branchIds: ['branch-a'],
      categoryId: category.id,
      sku: 'POMADA-01',
      name: 'Pomada matte',
      status: 'ACTIVE',
      salePriceAmountCents: 3200,
      costAmountCents: 1400,
      stockTrackingPolicy: 'TRACKED',
      minimumStockQuantity: 3,
      supplierMetadata: { supplierName: 'Distribuidora Centro', contactPhone: '11999999999' },
      createdBy: 'user-a',
      updatedBy: 'user-a',
      createdAt: '2026-09-05T13:00:00.000Z',
      updatedAt: '2026-09-05T13:00:00.000Z',
    });
    const location = inventoryLocationSchema.parse({
      id: 'location-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      name: 'Vitrine',
      createdBy: 'user-a',
      updatedBy: 'user-a',
      createdAt: '2026-09-05T13:00:00.000Z',
      updatedAt: '2026-09-05T13:00:00.000Z',
    });
    const movement = stockMovementSchema.parse({
      id: 'movement-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      locationId: location.id,
      productId: product.id,
      type: 'ENTRY',
      quantity: 10,
      balanceAfterQuantity: 10,
      sourceType: 'MANUAL',
      idempotencyKey: 'stock-entry-a',
      reason: 'Compra inicial',
      createdBy: 'user-a',
      createdAt: '2026-09-05T13:00:00.000Z',
    });
    const balance = stockBalanceSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      locationId: location.id,
      productId: product.id,
      currentQuantity: 2,
      minimumStockQuantity: 3,
      lowStock: true,
      lastMovementAt: movement.createdAt,
      updatedAt: '2026-09-05T13:00:00.000Z',
    });
    const alert = lowStockAlertSchema.parse({
      id: 'alert-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      productId: product.id,
      state: 'ACTIVE',
      currentQuantity: 2,
      minimumStockQuantity: 3,
      triggeredAt: '2026-09-05T13:00:00.000Z',
    });

    expect(product.allowNegativeStock).toBe(false);
    expect(location.active).toBe(true);
    expect(balance.lowStock).toBe(true);
    expect(alert.state).toBe('ACTIVE');

    const list = productListResponseSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      products: [product],
      categories: [category],
      balances: [balance],
      alerts: [alert],
    });
    const detail = productDetailResponseSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      product,
      category,
      balances: [balance],
      movements: [movement],
      alerts: [alert],
    });

    expect(list.products[0]?.name).toBe('Pomada matte');
    expect(detail.movements[0]?.quantity).toBe(10);
  });

  it('rejects invalid catalog and inventory record shapes', () => {
    expect(
      productCategorySchema.safeParse({
        id: 'category-a',
        tenantId: 'tenant-a',
        branchIds: [],
        name: 'Finalizadores',
        status: 'ACTIVE',
        createdBy: 'user-a',
        updatedBy: 'user-a',
        createdAt: '2026-09-05T13:00:00.000Z',
        updatedAt: '2026-09-05T13:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      productSchema.safeParse({
        id: 'product-a',
        tenantId: 'tenant-a',
        branchIds: ['branch-a'],
        name: '',
        status: 'ACTIVE',
        salePriceAmountCents: -1,
        costAmountCents: -1,
        stockTrackingPolicy: 'TRACKED',
        createdBy: 'user-a',
        updatedBy: 'user-a',
        createdAt: '2026-09-05T13:00:00.000Z',
        updatedAt: '2026-09-05T13:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      inventoryLocationSchema.safeParse({
        id: 'location-a',
        tenantId: 'tenant-a',
        name: 'Vitrine',
        createdBy: 'user-a',
        updatedBy: 'user-a',
        createdAt: '2026-09-05T13:00:00.000Z',
        updatedAt: '2026-09-05T13:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      stockMovementSchema.safeParse({
        id: 'movement-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        productId: 'product-a',
        type: 'SALE',
        quantity: 1,
        sourceType: 'ORDER_ITEM',
        createdBy: 'user-a',
        createdAt: '2026-09-05T13:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('accepts product category and product mutation commands', () => {
    const category = createProductCategoryCommandSchema.parse({
      branchIds: ['branch-a'],
      name: 'Finalizadores',
    });
    const categoryUpdate = updateProductCategoryCommandSchema.parse({
      id: 'category-a',
      status: 'INACTIVE',
    });
    const categoryArchive = archiveProductCategoryCommandSchema.parse({
      id: 'category-a',
      reason: 'Categoria substituida',
    });
    const product = createProductCommandSchema.parse({
      branchIds: ['branch-a', 'branch-b'],
      categoryId: 'category-a',
      name: 'Pomada matte',
      salePriceAmountCents: 3200,
      costAmountCents: 1400,
      supplierMetadata: { supplierName: 'Distribuidora Centro' },
    });
    const inactiveProduct = updateProductCommandSchema.parse({
      id: 'product-a',
      status: 'INACTIVE',
      allowNegativeStock: true,
      minimumStockQuantity: 2,
    });
    const productArchive = archiveProductCommandSchema.parse({ id: 'product-a' });

    expect(category.status).toBe('ACTIVE');
    expect(categoryUpdate.status).toBe('INACTIVE');
    expect(categoryArchive.reason).toContain('substituida');
    expect(product.stockTrackingPolicy).toBe('TRACKED');
    expect(product.allowNegativeStock).toBe(false);
    expect(inactiveProduct.status).toBe('INACTIVE');
    expect(productArchive.id).toBe('product-a');
  });

  it('rejects invalid product mutation commands', () => {
    expect(
      createProductCategoryCommandSchema.safeParse({ branchIds: [], name: 'Finalizadores' })
        .success,
    ).toBe(false);
    expect(updateProductCategoryCommandSchema.safeParse({ id: 'category-a' }).success).toBe(false);
    expect(
      createProductCommandSchema.safeParse({
        branchIds: ['branch-a'],
        name: 'Pomada matte',
        status: 'ARCHIVED',
        salePriceAmountCents: 3200,
      }).success,
    ).toBe(false);
    expect(
      createProductCommandSchema.safeParse({
        branchIds: ['branch-a'],
        name: 'P',
        salePriceAmountCents: 0,
        minimumStockQuantity: -1,
      }).success,
    ).toBe(false);
    expect(updateProductCommandSchema.safeParse({ id: 'product-a' }).success).toBe(false);
  });

  it('accepts stock movement command shapes with idempotency keys', () => {
    const entry = createStockEntryCommandSchema.parse({
      branchId: 'branch-a',
      locationId: 'location-a',
      productId: 'product-a',
      quantity: 10,
      unitCostAmountCents: 1400,
      idempotencyKey: 'stock-entry-a',
    });
    const sale = createStockSaleEffectCommandSchema.parse({
      branchId: 'branch-a',
      productId: 'product-a',
      quantity: -1,
      orderId: 'order-a',
      orderItemId: 'item-a',
      paymentId: 'payment-a',
      idempotencyKey: 'stock-sale-a',
    });
    const loss = createStockLossCommandSchema.parse({
      branchId: 'branch-a',
      productId: 'product-a',
      quantity: -2,
      reason: 'Produto quebrado',
      idempotencyKey: 'stock-loss-a',
    });
    const consumption = createStockConsumptionCommandSchema.parse({
      branchId: 'branch-a',
      productId: 'product-a',
      quantity: -1,
      reason: 'Uso interno',
      idempotencyKey: 'stock-consumption-a',
    });
    const adjustment = createStockAdjustmentCommandSchema.parse({
      branchId: 'branch-a',
      productId: 'product-a',
      quantity: 3,
      reason: 'Contagem fisica',
      idempotencyKey: 'stock-adjustment-a',
    });
    const transfer = createStockTransferCommandSchema.parse({
      branchId: 'branch-a',
      productId: 'product-a',
      fromLocationId: 'location-a',
      toLocationId: 'location-b',
      quantity: 4,
      reason: 'Reposicao da vitrine',
      idempotencyKey: 'stock-transfer-a',
    });

    expect(entry.quantity).toBe(10);
    expect(sale.quantity).toBe(-1);
    expect(loss.reason).toContain('quebrado');
    expect(consumption.reason).toContain('interno');
    expect(adjustment.quantity).toBe(3);
    expect(transfer.toLocationId).toBe('location-b');
  });

  it('rejects invalid stock movement command shapes', () => {
    expect(
      createStockEntryCommandSchema.safeParse({
        branchId: 'branch-a',
        productId: 'product-a',
        quantity: -10,
        idempotencyKey: 'stock-entry-a',
      }).success,
    ).toBe(false);
    expect(
      createStockSaleEffectCommandSchema.safeParse({
        branchId: 'branch-a',
        productId: 'product-a',
        quantity: 1,
        orderId: 'order-a',
        orderItemId: 'item-a',
        paymentId: 'payment-a',
        idempotencyKey: 'stock-sale-a',
      }).success,
    ).toBe(false);
    expect(
      createStockLossCommandSchema.safeParse({
        branchId: 'branch-a',
        productId: 'product-a',
        quantity: -1,
        idempotencyKey: 'stock-loss-a',
      }).success,
    ).toBe(false);
    expect(
      createStockAdjustmentCommandSchema.safeParse({
        branchId: 'branch-a',
        productId: 'product-a',
        quantity: 0,
        reason: 'Contagem',
        idempotencyKey: 'stock-adjustment-a',
      }).success,
    ).toBe(false);
    expect(
      createStockTransferCommandSchema.safeParse({
        branchId: 'branch-a',
        productId: 'product-a',
        fromLocationId: 'location-a',
        toLocationId: 'location-b',
        quantity: 1,
        reason: 'Reposicao',
      }).success,
    ).toBe(false);
  });

  it('rejects schedule breaks outside working hours', () => {
    const result = professionalScheduleSchema.safeParse({
      id: 'schedule-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      weekday: 1,
      startsAtLocal: '09:00',
      endsAtLocal: '18:00',
      breakStartsAtLocal: '08:00',
      breakEndsAtLocal: '08:30',
      active: true,
    });

    expect(result.success).toBe(false);
  });

  it('documents active appointment statuses for database conflict protection', () => {
    expect(activeAppointmentStatuses).toEqual(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE']);
  });

  it('accepts order and item snapshots for an open Comanda', () => {
    const order = orderDetailSchema.parse({
      id: 'order-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      appointmentId: 'appointment-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      status: 'OPEN',
      subtotalAmountCents: 5000,
      discountAmountCents: 500,
      totalAmountCents: 4500,
      openedAt: '2026-09-05T13:00:00.000Z',
      createdBy: 'user-a',
      updatedBy: 'user-a',
      createdAt: '2026-09-05T13:00:00.000Z',
      updatedAt: '2026-09-05T13:00:00.000Z',
      items: [
        {
          id: 'item-a',
          tenantId: 'tenant-a',
          branchId: 'branch-a',
          orderId: 'order-a',
          sourceType: 'SERVICE',
          sourceId: 'service-a',
          nameSnapshot: 'Corte',
          quantity: 1,
          unitPriceAmountCents: 5000,
          discountAmountCents: 500,
          finalAmountCents: 4500,
          professionalId: 'professional-a',
          createdBy: 'user-a',
          createdAt: '2026-09-05T13:00:00.000Z',
        },
      ],
      history: [
        {
          id: 'history-a',
          tenantId: 'tenant-a',
          branchId: 'branch-a',
          orderId: 'order-a',
          eventType: 'CHECK_IN',
          actorId: 'user-a',
          createdAt: '2026-09-05T13:00:00.000Z',
        },
      ],
    });

    expect(order.status).toBe(orderStatusSchema.parse('OPEN'));
    expect(order.items[0]?.nameSnapshot).toBe('Corte');
    expect(order.history[0]?.metadata).toEqual({});
  });

  it('rejects invalid order status transitions', () => {
    expect(canTransitionOrderStatus('OPEN', 'IN_SERVICE')).toBe(true);
    expect(canTransitionOrderStatus('CANCELLED', 'OPEN')).toBe(false);

    const result = updateOrderStatusCommandSchema.safeParse({
      id: 'order-a',
      fromStatus: 'CANCELLED',
      toStatus: 'OPEN',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid order item quantity, discount and final amount', () => {
    expect(
      createOrderItemCommandSchema.safeParse({
        orderId: 'order-a',
        sourceType: 'MANUAL',
        name: 'Desconto indevido',
        quantity: 0,
        unitPriceAmountCents: 5000,
      }).success,
    ).toBe(false);

    expect(
      createOrderItemCommandSchema.safeParse({
        orderId: 'order-a',
        sourceType: 'MANUAL',
        name: 'Desconto indevido',
        quantity: 1,
        unitPriceAmountCents: 5000,
        discountAmountCents: 6000,
      }).success,
    ).toBe(false);

    expect(
      orderItemSchema.safeParse({
        id: 'item-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        orderId: 'order-a',
        sourceType: 'SERVICE',
        nameSnapshot: 'Corte',
        quantity: 2,
        unitPriceAmountCents: 5000,
        discountAmountCents: 1000,
        finalAmountCents: 8000,
        createdBy: 'user-a',
        createdAt: '2026-09-05T13:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('recognizes payment and cash register enums', () => {
    expect(paymentMethodSchema.parse('PIX')).toBe('PIX');
    expect(paymentMethodSchema.parse('CASH')).toBe('CASH');
    expect(paymentStatusSchema.parse('PARTIALLY_REFUNDED')).toBe('PARTIALLY_REFUNDED');
    expect(refundStatusSchema.parse('COMPLETED')).toBe('COMPLETED');
    expect(cashRegisterSessionStatusSchema.parse('OPEN')).toBe('OPEN');
    expect(cashMovementTypeSchema.parse('WITHDRAWAL')).toBe('WITHDRAWAL');
  });
  it('recognizes finance and commission enums', () => {
    expect(financialEntryDirectionSchema.parse('IN')).toBe('IN');
    expect(financialEntryTypeSchema.parse('SERVICE_REVENUE')).toBe('SERVICE_REVENUE');
    expect(financialEntryTypeSchema.parse('PAYOUT')).toBe('PAYOUT');
    expect(financialEntryStatusSchema.parse('POSTED')).toBe('POSTED');
    expect(expenseStatusSchema.parse('OVERDUE')).toBe('OVERDUE');
    expect(commissionRuleTypeSchema.parse('PERCENTAGE')).toBe('PERCENTAGE');
    expect(commissionRuleScopeSchema.parse('MANUAL_ITEM')).toBe('MANUAL_ITEM');
    expect(commissionRuleStatusSchema.parse('ARCHIVED')).toBe('ARCHIVED');
    expect(commissionAccrualStatusSchema.parse('ADJUSTED')).toBe('ADJUSTED');
    expect(payoutStatusSchema.parse('CORRECTED')).toBe('CORRECTED');

    expect(financialEntryDirectionSchema.safeParse('SIDEWAYS').success).toBe(false);
    expect(financialEntryTypeSchema.safeParse('PAYMENT').success).toBe(false);
    expect(expenseStatusSchema.safeParse('DELETED').success).toBe(false);
    expect(commissionRuleTypeSchema.safeParse('TIERED').success).toBe(false);
    expect(commissionRuleScopeSchema.safeParse('GLOBAL').success).toBe(false);
    expect(commissionAccrualStatusSchema.safeParse('PAID').success).toBe(false);
    expect(payoutStatusSchema.safeParse('SETTLED').success).toBe(false);
  });

  it('accepts finance and commission records with tenant and branch scope', () => {
    const entry = financialEntrySchema.parse({
      id: 'entry-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      direction: 'IN',
      type: 'SERVICE_REVENUE',
      amountCents: 4500,
      signedAmountCents: 4500,
      competenceDate: '2026-09-05',
      cashDate: '2026-09-05',
      sourceType: 'PAYMENT',
      sourceId: 'payment-a',
      createdBy: 'user-a',
      createdAt: '2026-09-05T14:00:00.000Z',
    });
    const category = expenseCategorySchema.parse({
      id: 'expense-category-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      name: 'Aluguel',
      createdBy: 'user-a',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    });
    const expense = expenseSchema.parse({
      id: 'expense-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      categoryId: category.id,
      description: 'Conta de energia',
      status: 'PAID',
      amountCents: 84000,
      competenceDate: '2026-09-01',
      dueDate: '2026-09-10',
      cashDate: '2026-09-10',
      paymentMethod: 'PIX',
      documentMetadata: { storagePath: 'tenant-a/expenses/energia.pdf' },
      financialEntryId: 'entry-expense-a',
      createdBy: 'user-a',
      updatedBy: 'user-a',
      paidBy: 'user-a',
      paidAt: '2026-09-10T14:00:00.000Z',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-10T14:00:00.000Z',
    });
    const rule = commissionRuleSchema.parse({
      id: 'rule-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      scope: 'SERVICE',
      type: 'PERCENTAGE',
      status: 'ACTIVE',
      professionalId: 'professional-a',
      sourceType: 'SERVICE',
      sourceId: 'service-a',
      percentageBps: 5000,
      effectiveFrom: '2026-09-01',
      createdBy: 'user-a',
      updatedBy: 'user-a',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    });
    const accrual = commissionAccrualSchema.parse({
      id: 'accrual-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      orderId: 'order-a',
      orderItemId: 'item-a',
      paymentId: 'payment-a',
      ruleId: rule.id,
      ruleTypeSnapshot: 'PERCENTAGE',
      ruleScopeSnapshot: 'SERVICE',
      rulePercentageBpsSnapshot: 5000,
      baseAmountCents: 4500,
      commissionAmountCents: 2250,
      status: 'OPEN',
      accruedAt: '2026-09-05T14:00:00.000Z',
      createdAt: '2026-09-05T14:00:00.000Z',
      updatedAt: '2026-09-05T14:00:00.000Z',
    });
    const payout = payoutSchema.parse({
      id: 'payout-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      status: 'PAID',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      totalAmountCents: 2250,
      sources: [{ accrualId: accrual.id, amountCents: 2250 }],
      paymentMethod: 'PIX',
      financialEntryId: 'entry-payout-a',
      closedBy: 'user-a',
      closedAt: '2026-09-15T20:00:00.000Z',
      paidBy: 'user-a',
      paidAt: '2026-09-16T12:00:00.000Z',
      createdAt: '2026-09-15T20:00:00.000Z',
      updatedAt: '2026-09-16T12:00:00.000Z',
    });
    const allocation = payoutAllocationSchema.parse({
      id: 'payout-allocation-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      payoutId: payout.id,
      accrualId: accrual.id,
      amountCents: 2250,
      createdAt: '2026-09-15T20:00:00.000Z',
    });

    expect(entry.status).toBe('POSTED');
    expect(category.status).toBe('ACTIVE');
    expect(expense.documentMetadata).toEqual({ storagePath: 'tenant-a/expenses/energia.pdf' });
    expect(accrual.rulePercentageBpsSnapshot).toBe(5000);
    expect(payout.sources).toHaveLength(1);
    expect(allocation.amountCents).toBe(2250);
  });

  it('accepts finance and commission read model responses', () => {
    const financeSummary = financeSummarySchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      revenueAmountCents: 0,
      expenseAmountCents: 0,
      resultAmountCents: 0,
      commissionLiabilityAmountCents: 0,
      paidPayoutAmountCents: 0,
      cashInAmountCents: 0,
      cashOutAmountCents: 0,
      entriesCount: 0,
    });
    const expenseList = expenseListResponseSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      expenses: [],
      openAmountCents: 0,
      overdueAmountCents: 0,
      paidAmountCents: 0,
      totalAmountCents: 0,
    });
    const commissionSummary = commissionSummarySchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      openAccrualAmountCents: 2250,
      settledAccrualAmountCents: 0,
      reversedAccrualAmountCents: 0,
      paidPayoutAmountCents: 0,
      professionalCount: 1,
      accrualCount: 1,
    });
    const accrual = commissionAccrualSchema.parse({
      id: 'accrual-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      orderId: 'order-a',
      orderItemId: 'item-a',
      paymentId: 'payment-a',
      ruleTypeSnapshot: 'FIXED_AMOUNT',
      ruleScopeSnapshot: 'PROFESSIONAL',
      ruleFixedAmountCentsSnapshot: 2250,
      baseAmountCents: 4500,
      commissionAmountCents: 2250,
      status: 'OPEN',
      accruedAt: '2026-09-05T14:00:00.000Z',
      createdAt: '2026-09-05T14:00:00.000Z',
      updatedAt: '2026-09-05T14:00:00.000Z',
    });
    const payout = payoutSchema.parse({
      id: 'payout-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      status: 'CLOSED',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      totalAmountCents: 2250,
      sources: [{ accrualId: accrual.id, amountCents: 2250 }],
      closedBy: 'user-a',
      closedAt: '2026-09-15T20:00:00.000Z',
      createdAt: '2026-09-15T20:00:00.000Z',
      updatedAt: '2026-09-15T20:00:00.000Z',
    });
    const payoutDetail = payoutDetailSchema.parse({
      payout,
      allocations: [
        {
          id: 'allocation-a',
          tenantId: 'tenant-a',
          branchId: 'branch-a',
          payoutId: payout.id,
          accrualId: accrual.id,
          amountCents: 2250,
          createdAt: '2026-09-15T20:00:00.000Z',
        },
      ],
      accruals: [accrual],
    });
    const wallet = professionalWalletSchema.parse({
      tenantId: 'tenant-a',
      professionalId: 'professional-a',
      branchIds: ['branch-a'],
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      productionAmountCents: 4500,
      openCommissionAmountCents: 2250,
      paidPayoutAmountCents: 0,
      expectedBalanceAmountCents: 2250,
      accruals: [accrual],
      payouts: [payout],
    });

    expect(financeSummary.entriesCount).toBe(0);
    expect(expenseList.expenses).toEqual([]);
    expect(commissionSummary.branchId).toBe('branch-a');
    expect(payoutDetail.allocations[0]?.accrualId).toBe(accrual.id);
    expect(wallet.professionalId).toBe('professional-a');
  });
  it('rejects invalid finance and commission records', () => {
    expect(
      financialEntrySchema.safeParse({
        id: 'entry-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        direction: 'OUT',
        type: 'EXPENSE',
        amountCents: 5000,
        signedAmountCents: 5000,
        competenceDate: '2026-09-05',
        sourceType: 'EXPENSE',
        sourceId: 'expense-a',
        createdBy: 'user-a',
        createdAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      expenseSchema.safeParse({
        id: 'expense-a',
        tenantId: 'tenant-a',
        description: 'Sem filial',
        status: 'OPEN',
        amountCents: 1000,
        competenceDate: '2026-09-01',
        createdBy: 'user-a',
        updatedBy: 'user-a',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      expenseSchema.safeParse({
        id: 'expense-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        description: 'Despesa paga incompleta',
        status: 'PAID',
        amountCents: 1000,
        competenceDate: '2026-09-01',
        createdBy: 'user-a',
        updatedBy: 'user-a',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      commissionRuleSchema.safeParse({
        id: 'rule-a',
        tenantId: 'tenant-a',
        scope: 'SERVICE',
        type: 'PERCENTAGE',
        status: 'ACTIVE',
        percentageBps: 5000,
        fixedAmountCents: 1000,
        effectiveFrom: '2026-09-01',
        createdBy: 'user-a',
        updatedBy: 'user-a',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      commissionAccrualSchema.safeParse({
        id: 'accrual-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        professionalId: 'professional-a',
        orderId: 'order-a',
        orderItemId: 'item-a',
        ruleTypeSnapshot: 'FIXED_AMOUNT',
        ruleScopeSnapshot: 'SERVICE',
        rulePercentageBpsSnapshot: 5000,
        baseAmountCents: 4500,
        commissionAmountCents: 2250,
        status: 'OPEN',
        accruedAt: '2026-09-05T14:00:00.000Z',
        createdAt: '2026-09-05T14:00:00.000Z',
        updatedAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      payoutSchema.safeParse({
        id: 'payout-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        professionalId: 'professional-a',
        status: 'PAID',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-15',
        totalAmountCents: 3000,
        sources: [{ accrualId: 'accrual-a', amountCents: 2250 }],
        paymentMethod: 'PIX',
        closedBy: 'user-a',
        closedAt: '2026-09-15T20:00:00.000Z',
        paidBy: 'user-a',
        paidAt: '2026-09-16T12:00:00.000Z',
        createdAt: '2026-09-15T20:00:00.000Z',
        updatedAt: '2026-09-16T12:00:00.000Z',
      }).success,
    ).toBe(false);
  });
  it('accepts payment and cash records with tenant and branch scope', () => {
    const payment = paymentSchema.parse({
      id: 'payment-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      orderId: 'order-a',
      method: 'CASH',
      status: 'PAID',
      amountCents: 4500,
      cashReceivedAmountCents: 5000,
      changeDueAmountCents: 500,
      idempotencyKey: 'payment-order-a',
      receivedBy: 'user-a',
      receivedAt: '2026-09-05T14:00:00.000Z',
      createdAt: '2026-09-05T14:00:00.000Z',
      updatedAt: '2026-09-05T14:00:00.000Z',
    });
    const allocation = paymentAllocationSchema.parse({
      id: 'allocation-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      paymentId: payment.id,
      orderId: 'order-a',
      amountCents: 4500,
      createdAt: '2026-09-05T14:00:00.000Z',
    });
    const session = cashRegisterSessionSchema.parse({
      id: 'cash-session-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      status: 'OPEN',
      openedBy: 'user-a',
      openedAt: '2026-09-05T11:00:00.000Z',
      openingBalanceAmountCents: 20000,
      expectedBalanceAmountCents: 24500,
      createdAt: '2026-09-05T11:00:00.000Z',
      updatedAt: '2026-09-05T14:00:00.000Z',
    });
    const movement = cashMovementSchema.parse({
      id: 'movement-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      sessionId: session.id,
      type: 'SALE',
      amountCents: 4500,
      signedAmountCents: 4500,
      orderId: 'order-a',
      paymentId: payment.id,
      createdBy: 'user-a',
      createdAt: '2026-09-05T14:00:00.000Z',
    });

    expect(payment.changeDueAmountCents).toBe(500);
    expect(allocation.amountCents).toBe(4500);
    expect(session.status).toBe('OPEN');
    expect(movement.signedAmountCents).toBe(4500);
  });

  it('rejects invalid payment and cash records', () => {
    expect(
      paymentSchema.safeParse({
        id: 'payment-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        orderId: 'order-a',
        method: 'PIX',
        status: 'PAID',
        amountCents: -1,
        receivedBy: 'user-a',
        receivedAt: '2026-09-05T14:00:00.000Z',
        createdAt: '2026-09-05T14:00:00.000Z',
        updatedAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      paymentSchema.safeParse({
        id: 'payment-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        orderId: 'order-a',
        method: 'PIX',
        status: 'PAID',
        amountCents: 4500,
        cashReceivedAmountCents: 5000,
        receivedBy: 'user-a',
        receivedAt: '2026-09-05T14:00:00.000Z',
        createdAt: '2026-09-05T14:00:00.000Z',
        updatedAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      cashRegisterSessionSchema.safeParse({
        id: 'cash-session-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        status: 'CLOSED',
        openedBy: 'user-a',
        openedAt: '2026-09-05T11:00:00.000Z',
        openingBalanceAmountCents: 20000,
        expectedBalanceAmountCents: 24500,
        actualBalanceAmountCents: 24500,
        createdAt: '2026-09-05T11:00:00.000Z',
        updatedAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('validates receive, refund and cash command shapes', () => {
    const receive = receivePaymentCommandSchema.parse({
      orderId: 'order-a',
      idempotencyKey: 'receive-order-a',
      payments: [
        { method: 'PIX', amountCents: 7000 },
        { method: 'CASH', amountCents: 3000, cashReceivedAmountCents: 5000 },
      ],
    });
    const refund = refundPaymentCommandSchema.parse({
      paymentId: 'payment-a',
      amountCents: 1000,
      reason: 'Cliente retornou para correcao.',
      idempotencyKey: 'refund-payment-a',
    });
    const openCash = openCashRegisterCommandSchema.parse({
      branchId: 'branch-a',
      openingBalanceAmountCents: 20000,
      idempotencyKey: 'open-cash-a',
    });
    const movement = cashRegisterMovementCommandSchema.parse({
      branchId: 'branch-a',
      type: 'WITHDRAWAL',
      amountCents: 5000,
      reason: 'Deposito bancario.',
      idempotencyKey: 'cash-withdrawal-a',
    });
    const closeCash = closeCashRegisterCommandSchema.parse({
      sessionId: 'cash-session-a',
      actualBalanceAmountCents: 19900,
      expectedBalanceAmountCents: 20000,
      differenceReason: 'Falta de troco conferida no fechamento.',
      idempotencyKey: 'close-cash-a',
    });

    expect(receive.payments).toHaveLength(2);
    expect(refund.amountCents).toBe(1000);
    expect(openCash.branchId).toBe('branch-a');
    expect(movement.reason).toContain('Deposito');
    expect(closeCash.differenceReason).toContain('troco');

    expect(
      receivePaymentCommandSchema.safeParse({
        orderId: 'order-a',
        idempotencyKey: 'receive-order-a',
        payments: [{ method: 'CASH', amountCents: 3000, cashReceivedAmountCents: 2000 }],
      }).success,
    ).toBe(false);
    expect(
      cashRegisterMovementCommandSchema.safeParse({
        branchId: 'branch-a',
        type: 'WITHDRAWAL',
        amountCents: 5000,
        idempotencyKey: 'cash-withdrawal-a',
      }).success,
    ).toBe(false);
    expect(
      closeCashRegisterCommandSchema.safeParse({
        sessionId: 'cash-session-a',
        actualBalanceAmountCents: 19900,
        expectedBalanceAmountCents: 20000,
        idempotencyKey: 'close-cash-a',
      }).success,
    ).toBe(false);
  });
  it('validates finance, commission and payout command shapes', () => {
    const createExpense = createExpenseCommandSchema.parse({
      branchId: 'branch-a',
      categoryId: 'category-a',
      description: 'Aluguel da unidade',
      vendorName: 'Imobiliaria Centro',
      amountCents: 400000,
      competenceDate: '2026-09-01',
      dueDate: '2026-09-10',
      recurrence: { frequency: 'MONTHLY' },
    });
    const updateExpense = updateExpenseCommandSchema.parse({
      id: 'expense-a',
      dueDate: '2026-09-12',
    });
    const payExpense = payExpenseCommandSchema.parse({
      expenseId: 'expense-a',
      paymentMethod: 'CASH',
      cashDate: '2026-09-10',
      cashRegisterSessionId: 'cash-session-a',
      idempotencyKey: 'pay-expense-a',
    });
    const cancelExpense = cancelExpenseCommandSchema.parse({
      expenseId: 'expense-b',
      reason: 'Lancamento duplicado.',
      idempotencyKey: 'cancel-expense-b',
    });
    const createRule = createCommissionRuleCommandSchema.parse({
      branchId: 'branch-a',
      scope: 'SERVICE',
      type: 'PERCENTAGE',
      professionalId: 'professional-a',
      sourceType: 'SERVICE',
      sourceId: 'service-a',
      percentageBps: 5000,
      effectiveFrom: '2026-09-01',
    });
    const updateRule = updateCommissionRuleCommandSchema.parse({
      id: 'rule-a',
      status: 'INACTIVE',
    });
    const generateAccruals = generateCommissionAccrualsCommandSchema.parse({
      orderId: 'order-a',
      paymentId: 'payment-a',
      idempotencyKey: 'generate-accruals-a',
    });
    const closePayout = closePayoutCommandSchema.parse({
      professionalId: 'professional-a',
      branchId: 'branch-a',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      accrualIds: ['accrual-a'],
      idempotencyKey: 'close-payout-a',
    });
    const payPayout = payPayoutCommandSchema.parse({
      payoutId: 'payout-a',
      paymentMethod: 'CASH',
      cashRegisterSessionId: 'cash-session-a',
      idempotencyKey: 'pay-payout-a',
    });
    const correctPayout = correctPayoutCommandSchema.parse({
      payoutId: 'payout-a',
      amountCents: 500,
      direction: 'OUT',
      reason: 'Ajuste de repasse conferido.',
      idempotencyKey: 'correct-payout-a',
    });

    expect(createExpense.recurrence?.frequency).toBe(
      expenseRecurrenceFrequencySchema.parse('MONTHLY'),
    );
    expect(updateExpense.dueDate).toBe('2026-09-12');
    expect(payExpense.cashRegisterSessionId).toBe('cash-session-a');
    expect(cancelExpense.reason).toContain('duplicado');
    expect(createRule.percentageBps).toBe(5000);
    expect(updateRule.status).toBe('INACTIVE');
    expect(generateAccruals.paymentId).toBe('payment-a');
    expect(closePayout.accrualIds).toEqual(['accrual-a']);
    expect(payPayout.paymentMethod).toBe('CASH');
    expect(correctPayout.direction).toBe('OUT');

    expect(
      createExpenseCommandSchema.safeParse({
        branchId: 'branch-a',
        description: 'Aluguel da unidade',
        amountCents: 400000,
        competenceDate: '2026-09-01',
        recurrence: { frequency: 'MONTHLY', endsOn: '2026-08-31' },
      }).success,
    ).toBe(false);
    expect(updateExpenseCommandSchema.safeParse({ id: 'expense-a' }).success).toBe(false);
    expect(
      payExpenseCommandSchema.safeParse({
        expenseId: 'expense-a',
        paymentMethod: 'CASH',
        cashDate: '2026-09-10',
        idempotencyKey: 'pay-expense-a',
      }).success,
    ).toBe(false);
    expect(
      createCommissionRuleCommandSchema.safeParse({
        scope: 'SERVICE',
        type: 'PERCENTAGE',
        percentageBps: 5000,
        fixedAmountCents: 1000,
        effectiveFrom: '2026-09-01',
      }).success,
    ).toBe(false);
    expect(
      createCommissionRuleCommandSchema.safeParse({
        scope: 'SERVICE',
        type: 'FIXED_AMOUNT',
        fixedAmountCents: 1000,
        effectiveFrom: '2026-09-15',
        effectiveUntil: '2026-09-01',
      }).success,
    ).toBe(false);
    expect(
      closePayoutCommandSchema.safeParse({
        professionalId: 'professional-a',
        branchId: 'branch-a',
        periodStart: '2026-09-15',
        periodEnd: '2026-09-01',
        idempotencyKey: 'close-payout-a',
      }).success,
    ).toBe(false);
    expect(
      payPayoutCommandSchema.safeParse({
        payoutId: 'payout-a',
        paymentMethod: 'CASH',
        idempotencyKey: 'pay-payout-a',
      }).success,
    ).toBe(false);
  });
  it('validates check-in, walk-in and item mutation command shapes', () => {
    const checkIn = checkInAppointmentCommandSchema.parse({
      appointmentId: 'appointment-a',
      idempotencyKey: 'checkin-appointment-a',
    });
    const walkIn = createWalkInOrderCommandSchema.parse({ branchId: 'branch-a' });
    const updateItem = updateOrderItemCommandSchema.parse({
      orderId: 'order-a',
      itemId: 'item-a',
      notes: 'Cliente pediu acabamento extra.',
    });

    expect(checkIn.appointmentId).toBe('appointment-a');
    expect(walkIn.branchId).toBe('branch-a');
    expect(updateItem.notes).toContain('acabamento');
    expect(
      updateOrderItemCommandSchema.safeParse({ orderId: 'order-a', itemId: 'item-a' }).success,
    ).toBe(false);
  });
  it('accepts worker outbox, job and notification payload contracts', () => {
    const createdAt = '2026-09-18T12:00:00.000Z';
    const outbox = outboxEventSchema.parse({
      id: 'outbox-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      eventType: 'PAYMENT_COMPLETED',
      sourceType: 'PAYMENT',
      sourceId: 'payment-a',
      payload: { paymentId: 'payment-a', orderId: 'order-a' },
      idempotencyKey: 'payment-completed-a',
      status: 'PENDING',
      correlationId: 'request-payment-a',
      availableAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
    const job = workerJobSchema.parse({
      id: 'job-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      type: 'NOTIFICATION_DELIVERY',
      status: 'PENDING',
      sourceType: 'PAYMENT',
      sourceId: 'payment-a',
      outboxEventId: outbox.id,
      payload: { notificationIntentId: 'notification-a' },
      idempotencyKey: 'notification-delivery-a',
      correlationId: outbox.correlationId,
      runAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
    const attempt = workerJobAttemptSchema.parse({
      id: 'attempt-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      jobId: job.id,
      outboxEventId: outbox.id,
      status: 'RUNNING',
      attemptNumber: 1,
      workerId: 'worker-local-a',
      startedAt: createdAt,
    });
    const intent = notificationIntentSchema.parse({
      id: 'notification-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      recipientType: 'CUSTOMER',
      recipientId: 'customer-a',
      channel: 'LOCAL',
      templateKey: 'appointment.reminder.v1',
      sourceType: 'APPOINTMENT',
      sourceId: 'appointment-a',
      payload: { appointmentId: 'appointment-a' },
      status: 'PENDING',
      idempotencyKey: 'appointment-reminder-a',
      correlationId: 'request-appointment-a',
      createdAt,
      updatedAt: createdAt,
    });
    const delivery = notificationDeliveryAttemptSchema.parse({
      id: 'delivery-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      notificationIntentId: intent.id,
      channel: 'LOCAL',
      status: 'SENT',
      attemptNumber: 1,
      provider: 'local',
      providerMessageId: 'local-message-a',
      sentAt: createdAt,
      createdAt,
    });

    expect(outbox.schemaVersion).toBe(1);
    expect(job.priority).toBe(50);
    expect(job.maxAttempts).toBe(5);
    expect(attempt.workerId).toBe('worker-local-a');
    expect(intent.channel).toBe('LOCAL');
    expect(delivery.status).toBe('SENT');
  });

  it('validates worker creation commands, scope and unsupported versions', () => {
    const outboxCommand = createOutboxEventCommandSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      eventType: 'ORDER_PAID',
      sourceType: 'ORDER',
      sourceId: 'order-a',
      payload: { orderId: 'order-a' },
      idempotencyKey: 'order-paid-a',
      correlationId: 'request-order-a',
    });
    const jobCommand = createWorkerJobCommandSchema.parse({
      tenantId: 'tenant-a',
      type: 'FINANCE_RECALCULATION',
      sourceType: 'PAYMENT',
      sourceId: 'payment-a',
      payload: { paymentId: 'payment-a' },
      idempotencyKey: 'finance-recalc-a',
      correlationId: 'request-finance-a',
    });
    const intentCommand = createNotificationIntentCommandSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      recipientType: 'CUSTOMER',
      recipientId: 'customer-a',
      channel: 'LOCAL',
      templateKey: 'post_service.follow_up.v1',
      sourceType: 'ORDER',
      sourceId: 'order-a',
      idempotencyKey: 'post-service-followup-a',
      correlationId: 'request-order-a',
    });
    const attemptCommand = recordNotificationDeliveryAttemptCommandSchema.parse({
      tenantId: 'tenant-a',
      notificationIntentId: 'notification-a',
      channel: 'LOCAL',
      status: 'RETRY_SCHEDULED',
      attemptNumber: 2,
      error: {
        code: 'WORKER_PROVIDER_UNAVAILABLE',
        message: 'Provider unavailable.',
        retryable: true,
      },
    });

    expect(outboxCommand.eventType).toBe('ORDER_PAID');
    expect(jobCommand.schemaVersion).toBe(1);
    expect(intentCommand.payload).toEqual({});
    expect(attemptCommand.error?.retryable).toBe(true);
    expect(workerErrorCodeSchema.parse('WORKER_UNSUPPORTED_JOB_VERSION')).toBe(
      'WORKER_UNSUPPORTED_JOB_VERSION',
    );
    expect(
      createOutboxEventCommandSchema.safeParse({ ...outboxCommand, tenantId: '' }).success,
    ).toBe(false);
    expect(
      createWorkerJobCommandSchema.safeParse({ ...jobCommand, schemaVersion: 2 }).success,
    ).toBe(false);
  });

  it('keeps worker error envelopes stable and sanitized', () => {
    const sanitized = workerSanitizedErrorSchema.parse({
      code: 'WORKER_RETRY_EXHAUSTED',
      message: 'Retry limit reached for notification delivery.',
      retryable: false,
      stack: 'secret stack trace',
      providerResponse: { token: 'secret-token' },
    });
    const apiError = apiErrorSchema.parse({
      error: {
        code: 'WORKER_RETRY_EXHAUSTED',
        message: sanitized.message,
        requestId: 'request-worker-a',
      },
    });

    expect(sanitized).toEqual({
      code: 'WORKER_RETRY_EXHAUSTED',
      message: 'Retry limit reached for notification delivery.',
      retryable: false,
    });
    expect(apiError.error.requestId).toBe('request-worker-a');
    expect(
      workerSanitizedErrorSchema.safeParse({ code: 'WORKER_SECRET', message: 'Nope' }).success,
    ).toBe(false);
  });
});
