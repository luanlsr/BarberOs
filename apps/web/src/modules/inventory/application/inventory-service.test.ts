import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CreateStockAdjustmentCommand,
  CreateStockConsumptionCommand,
  CreateStockEntryCommand,
  CreateStockLossCommand,
  CreateStockSaleEffectCommand,
  CreateStockTransferCommand,
  InventoryLocation,
  LowStockAlert,
  RequestContext,
  StockBalance,
  StockMovement,
} from '@barberos/contracts';

import type {
  InventoryAuditSink,
  InventoryLocationFilters,
  InventoryOutboxProducer,
  InventoryRepository,
  LowStockAlertFilters,
  StockBalanceFilters,
  StockMovementFilters,
  StockTransferResult,
} from '../domain';
import { CoreOperationsApplicationError, InventoryApplicationService } from './inventory-service';

const ownerContext: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['inventory.read', 'inventory.write'],
  entitlements: ['inventory'],
  branchScope: ['branch-1'],
};

function contextWith(overrides: Partial<RequestContext>): RequestContext {
  return { ...ownerContext, ...overrides };
}

const balance = (overrides: Partial<StockBalance> = {}): StockBalance => ({
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  productId: 'product-1',
  currentQuantity: 7,
  minimumStockQuantity: 5,
  lowStock: false,
  lastMovementAt: '2026-09-07T09:00:00.000Z',
  updatedAt: '2026-09-07T09:00:00.000Z',
  ...overrides,
});

const movement = (overrides: Partial<StockMovement> = {}): StockMovement => ({
  id: 'movement-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  productId: 'product-1',
  type: 'ENTRY',
  quantity: 7,
  balanceAfterQuantity: 7,
  sourceType: 'MANUAL',
  idempotencyKey: 'stock-entry-1',
  reason: 'Entrada inicial',
  createdBy: 'user-1',
  createdAt: '2026-09-07T09:00:00.000Z',
  ...overrides,
});

const alert = (overrides: Partial<LowStockAlert> = {}): LowStockAlert => ({
  id: 'alert-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  productId: 'product-1',
  state: 'ACTIVE',
  currentQuantity: 3,
  minimumStockQuantity: 5,
  triggeredAt: '2026-09-07T09:00:00.000Z',
  ...overrides,
});

class FakeInventoryRepository implements InventoryRepository {
  balances: StockBalance[] = [balance()];
  movements: StockMovement[] = [movement()];
  alerts: LowStockAlert[] = [alert()];
  lastBalanceFilters: StockBalanceFilters | null = null;
  lastMovementFilters: StockMovementFilters | null = null;
  lastAlertFilters: LowStockAlertFilters | null = null;
  createdEntryCommand: CreateStockEntryCommand | null = null;
  createdSaleCommand: CreateStockSaleEffectCommand | null = null;
  createdLossCommand: CreateStockLossCommand | null = null;
  createdConsumptionCommand: CreateStockConsumptionCommand | null = null;
  createdAdjustmentCommand: CreateStockAdjustmentCommand | null = null;
  createdTransferCommand: CreateStockTransferCommand | null = null;

  async listLocations(
    _context: RequestContext,
    _filters?: InventoryLocationFilters,
  ): Promise<InventoryLocation[]> {
    return [];
  }

  async listBalances(_context: RequestContext, filters: StockBalanceFilters = {}) {
    this.lastBalanceFilters = filters;
    return this.balances;
  }

  async listMovements(_context: RequestContext, filters: StockMovementFilters = {}) {
    this.lastMovementFilters = filters;
    return this.movements;
  }

  async listLowStockAlerts(_context: RequestContext, filters: LowStockAlertFilters = {}) {
    this.lastAlertFilters = filters;
    return this.alerts;
  }

  async findMovementById(_context: RequestContext, movementId: string) {
    return this.movements.find((item) => item.id === movementId) ?? null;
  }

  async findMovementByIdempotencyKey(_context: RequestContext, idempotencyKey: string) {
    return this.movements.find((item) => item.idempotencyKey === idempotencyKey) ?? null;
  }

  async recordStockEntry(context: RequestContext, command: CreateStockEntryCommand) {
    this.createdEntryCommand = command;
    return this.pushMovement(
      context,
      movement({
        id: 'movement-entry-created',
        branchId: command.branchId,
        locationId: command.locationId,
        productId: command.productId,
        type: 'ENTRY',
        quantity: command.quantity,
        balanceAfterQuantity: 12,
        idempotencyKey: command.idempotencyKey,
        reason: command.reason,
      }),
    );
  }

  async recordStockSaleEffect(context: RequestContext, command: CreateStockSaleEffectCommand) {
    this.createdSaleCommand = command;
    return this.pushMovement(
      context,
      movement({
        id: 'movement-sale-created',
        branchId: command.branchId,
        locationId: command.locationId,
        productId: command.productId,
        type: 'SALE',
        quantity: command.quantity,
        balanceAfterQuantity: 5,
        sourceType: 'ORDER_ITEM',
        sourceId: command.orderItemId,
        orderId: command.orderId,
        orderItemId: command.orderItemId,
        paymentId: command.paymentId,
        idempotencyKey: command.idempotencyKey,
      }),
    );
  }

  async recordStockLoss(context: RequestContext, command: CreateStockLossCommand) {
    this.createdLossCommand = command;
    return this.pushMovement(
      context,
      movement({
        id: 'movement-loss-created',
        branchId: command.branchId,
        locationId: command.locationId,
        productId: command.productId,
        type: 'LOSS',
        quantity: command.quantity,
        balanceAfterQuantity: 6,
        idempotencyKey: command.idempotencyKey,
        reason: command.reason,
      }),
    );
  }

  async recordStockConsumption(context: RequestContext, command: CreateStockConsumptionCommand) {
    this.createdConsumptionCommand = command;
    return this.pushMovement(
      context,
      movement({
        id: 'movement-consumption-created',
        branchId: command.branchId,
        locationId: command.locationId,
        productId: command.productId,
        type: 'CONSUMPTION',
        quantity: command.quantity,
        balanceAfterQuantity: 5,
        idempotencyKey: command.idempotencyKey,
        reason: command.reason,
      }),
    );
  }

  async recordStockAdjustment(context: RequestContext, command: CreateStockAdjustmentCommand) {
    this.createdAdjustmentCommand = command;
    return this.pushMovement(
      context,
      movement({
        id: 'movement-adjustment-created',
        branchId: command.branchId,
        locationId: command.locationId,
        productId: command.productId,
        type: 'ADJUSTMENT',
        quantity: command.quantity,
        balanceAfterQuantity: 8,
        idempotencyKey: command.idempotencyKey,
        reason: command.reason,
      }),
    );
  }

  async recordStockTransfer(
    context: RequestContext,
    command: CreateStockTransferCommand,
  ): Promise<StockTransferResult> {
    this.createdTransferCommand = command;
    const transferOut = this.pushMovement(
      context,
      movement({
        id: 'movement-transfer-out',
        branchId: command.branchId,
        locationId: command.fromLocationId,
        productId: command.productId,
        type: 'TRANSFER_OUT',
        quantity: -command.quantity,
        balanceAfterQuantity: 4,
        sourceType: 'TRANSFER',
        sourceId: command.idempotencyKey,
        idempotencyKey: command.idempotencyKey,
        reason: command.reason,
      }),
    );
    const transferIn = this.pushMovement(
      context,
      movement({
        id: 'movement-transfer-in',
        branchId: command.branchId,
        locationId: command.toLocationId,
        productId: command.productId,
        type: 'TRANSFER_IN',
        quantity: command.quantity,
        balanceAfterQuantity: 10,
        sourceType: 'TRANSFER',
        sourceId: command.idempotencyKey,
        idempotencyKey: command.idempotencyKey,
        reason: command.reason,
      }),
    );
    return { transferOut, transferIn };
  }

  private pushMovement(context: RequestContext, created: StockMovement) {
    const scoped = { ...created, tenantId: context.tenantId, createdBy: context.userId };
    this.movements.push(scoped);
    return scoped;
  }
}

class FakeInventoryAuditSink implements InventoryAuditSink {
  readonly events: Array<Parameters<InventoryAuditSink['record']>[1]> = [];

  async record(_context: RequestContext, event: Parameters<InventoryAuditSink['record']>[1]) {
    this.events.push(event);
  }
}

class FakeInventoryOutbox implements InventoryOutboxProducer {
  readonly events = new Map<string, Parameters<InventoryOutboxProducer['createEvent']>[1]>();
  attempts = 0;

  async createEvent(
    _context: RequestContext,
    command: Parameters<InventoryOutboxProducer['createEvent']>[1],
  ) {
    this.attempts += 1;
    if (!this.events.has(command.idempotencyKey)) this.events.set(command.idempotencyKey, command);
    return this.events.get(command.idempotencyKey);
  }
}

describe('InventoryApplicationService', () => {
  let repository: FakeInventoryRepository;
  let audit: FakeInventoryAuditSink;
  let outbox: FakeInventoryOutbox;
  let service: InventoryApplicationService;

  beforeEach(() => {
    repository = new FakeInventoryRepository();
    audit = new FakeInventoryAuditSink();
    outbox = new FakeInventoryOutbox();
    service = new InventoryApplicationService({ repository, auditSink: audit, outbox });
  });

  it('lists balances, movements and low-stock alerts for authorized inventory readers', async () => {
    await expect(service.listBalances(ownerContext, { branchId: 'branch-1' })).resolves.toEqual([
      balance(),
    ]);
    await expect(service.listMovements(ownerContext, { branchId: 'branch-1' })).resolves.toEqual([
      movement(),
    ]);
    await expect(
      service.listLowStockAlerts(ownerContext, { branchId: 'branch-1' }),
    ).resolves.toEqual([alert()]);
    expect(repository.lastBalanceFilters).toEqual({ branchId: 'branch-1' });
    expect(repository.lastMovementFilters).toEqual({ branchId: 'branch-1' });
    expect(repository.lastAlertFilters).toEqual({ branchId: 'branch-1' });
  });

  it('denies reads without inventory permission or entitlement before repository access', async () => {
    await expect(
      service.listBalances(contextWith({ permissions: ['dashboard.read'] })),
    ).rejects.toMatchObject({ code: 'INVENTORY_PERMISSION_DENIED' });
    await expect(service.listMovements(contextWith({ entitlements: [] }))).rejects.toMatchObject({
      code: 'INVENTORY_ENTITLEMENT_DENIED',
    });
    expect(repository.lastBalanceFilters).toBeNull();
    expect(repository.lastMovementFilters).toBeNull();
  });

  it('denies requested branch filters outside actor scope before repository access', async () => {
    await expect(
      service.listLowStockAlerts(ownerContext, { branchId: 'branch-2' }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'INVENTORY_BRANCH_SCOPE_DENIED',
        'Branch is outside the authorized scope.',
      ),
    );
    expect(repository.lastAlertFilters).toBeNull();
  });

  it('hides cross-tenant inventory records returned by repositories', async () => {
    repository.balances = [balance({ tenantId: 'tenant-2' })];
    repository.movements = [movement({ tenantId: 'tenant-2' })];
    repository.alerts = [alert({ tenantId: 'tenant-2' })];

    await expect(service.listBalances(ownerContext)).rejects.toEqual(
      new CoreOperationsApplicationError('INVENTORY_NOT_FOUND', 'Stock balance was not found.'),
    );
    await expect(service.listMovements(ownerContext)).rejects.toEqual(
      new CoreOperationsApplicationError('INVENTORY_NOT_FOUND', 'Stock movement was not found.'),
    );
    await expect(service.listLowStockAlerts(ownerContext)).rejects.toEqual(
      new CoreOperationsApplicationError('INVENTORY_NOT_FOUND', 'Low stock alert was not found.'),
    );
  });

  it('blocks inventory records that leak outside the actor branch scope', async () => {
    repository.balances = [balance({ branchId: 'branch-2' })];
    repository.movements = [movement({ branchId: 'branch-2' })];
    repository.alerts = [alert({ branchId: 'branch-2' })];

    await expect(service.listBalances(ownerContext)).rejects.toMatchObject({
      code: 'INVENTORY_BRANCH_SCOPE_DENIED',
    });
    await expect(service.listMovements(ownerContext)).rejects.toMatchObject({
      code: 'INVENTORY_BRANCH_SCOPE_DENIED',
    });
    await expect(service.listLowStockAlerts(ownerContext)).rejects.toMatchObject({
      code: 'INVENTORY_BRANCH_SCOPE_DENIED',
    });
  });

  it('records stock entries as immutable movements and audits success', async () => {
    const created = await service.recordStockEntry(ownerContext, {
      branchId: 'branch-1',
      locationId: 'location-1',
      productId: 'product-1',
      quantity: 5,
      reason: 'Compra semanal',
      idempotencyKey: 'stock-entry-new',
    });

    expect(created).toMatchObject({
      id: 'movement-entry-created',
      type: 'ENTRY',
      quantity: 5,
      branchId: 'branch-1',
      locationId: 'location-1',
      idempotencyKey: 'stock-entry-new',
    });
    expect(repository.createdEntryCommand).toMatchObject({ quantity: 5 });
    expect(repository.movements).toHaveLength(2);
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: 'STOCK_ENTRY_RECORDED',
        entityType: 'STOCK_MOVEMENT',
        entityId: 'movement-entry-created',
        branchId: 'branch-1',
        productId: 'product-1',
        movementType: 'ENTRY',
        quantity: 5,
      }),
    ]);
    expect(outbox.events.size).toBe(1);
    expect([...outbox.events.values()]).toEqual([
      expect.objectContaining({
        eventType: 'STOCK_LOW_DETECTED',
        sourceId: 'movement-entry-created',
      }),
    ]);
  });

  it('records loss, consumption and adjustment with required reasons and audit events', async () => {
    await service.recordStockLoss(ownerContext, {
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: -1,
      reason: 'Produto quebrado',
      idempotencyKey: 'stock-loss-new',
    });
    await service.recordStockConsumption(ownerContext, {
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: -2,
      reason: 'Uso interno',
      idempotencyKey: 'stock-consumption-new',
    });
    await service.recordStockAdjustment(ownerContext, {
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: 3,
      reason: 'Contagem revisada',
      idempotencyKey: 'stock-adjustment-new',
    });

    expect(repository.createdLossCommand).toMatchObject({ reason: 'Produto quebrado' });
    expect(repository.createdConsumptionCommand).toMatchObject({ reason: 'Uso interno' });
    expect(repository.createdAdjustmentCommand).toMatchObject({ reason: 'Contagem revisada' });
    expect(repository.movements.map((item) => item.type)).toEqual([
      'ENTRY',
      'LOSS',
      'CONSUMPTION',
      'ADJUSTMENT',
    ]);
    expect(audit.events.map((event) => event.action)).toEqual([
      'STOCK_LOSS_RECORDED',
      'STOCK_CONSUMPTION_RECORDED',
      'STOCK_ADJUSTMENT_RECORDED',
    ]);
  });

  it('returns idempotent stock movement retries without duplicating movement or audit', async () => {
    const existing = await service.recordStockEntry(ownerContext, {
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: 7,
      idempotencyKey: 'stock-entry-1',
    });

    expect(existing).toEqual(movement());
    expect(repository.createdEntryCommand).toBeNull();
    expect(repository.movements).toHaveLength(1);
    expect(audit.events).toEqual([]);
    expect(outbox.events.size).toBe(1);
    expect(outbox.attempts).toBe(1);
  });

  it('denies stock writes without inventory write permission before repository mutation', async () => {
    await expect(
      service.recordStockAdjustment(contextWith({ permissions: ['inventory.read'] }), {
        branchId: 'branch-1',
        productId: 'product-1',
        quantity: 1,
        reason: 'Contagem revisada',
        idempotencyKey: 'stock-adjustment-denied',
      }),
    ).rejects.toMatchObject({ code: 'INVENTORY_PERMISSION_DENIED' });
    expect(repository.createdAdjustmentCommand).toBeNull();
    expect(audit.events).toEqual([]);
  });

  it('rejects unexpected movement persistence results without auditing success', async () => {
    repository.recordStockLoss = async (_context, command) =>
      movement({
        id: 'movement-invalid',
        branchId: command.branchId,
        productId: command.productId,
        type: 'ENTRY',
        quantity: 1,
        idempotencyKey: command.idempotencyKey,
      });

    await expect(
      service.recordStockLoss(ownerContext, {
        branchId: 'branch-1',
        productId: 'product-1',
        quantity: -1,
        reason: 'Produto quebrado',
        idempotencyKey: 'stock-loss-invalid',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'INVENTORY_VALIDATION_ERROR',
        'Stock movement persistence returned an unexpected movement.',
      ),
    );
    expect(audit.events).toEqual([]);
  });

  it('records stock transfers as balanced movement pairs and audits once', async () => {
    const transfer = await service.recordStockTransfer(ownerContext, {
      branchId: 'branch-1',
      productId: 'product-1',
      fromLocationId: 'location-a',
      toLocationId: 'location-b',
      quantity: 3,
      reason: 'Reposicao da vitrine',
      idempotencyKey: 'stock-transfer-new',
    });

    expect(transfer.transferOut).toMatchObject({
      id: 'movement-transfer-out',
      type: 'TRANSFER_OUT',
      quantity: -3,
      locationId: 'location-a',
      idempotencyKey: 'stock-transfer-new',
    });
    expect(transfer.transferIn).toMatchObject({
      id: 'movement-transfer-in',
      type: 'TRANSFER_IN',
      quantity: 3,
      locationId: 'location-b',
      idempotencyKey: 'stock-transfer-new',
    });
    expect(transfer.transferOut.quantity + transfer.transferIn.quantity).toBe(0);
    expect(repository.createdTransferCommand).toMatchObject({
      fromLocationId: 'location-a',
      toLocationId: 'location-b',
      quantity: 3,
    });
    expect(repository.movements.map((item) => item.type)).toEqual([
      'ENTRY',
      'TRANSFER_OUT',
      'TRANSFER_IN',
    ]);
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: 'STOCK_TRANSFER_RECORDED',
        entityType: 'STOCK_TRANSFER',
        entityId: 'movement-transfer-out:movement-transfer-in',
        branchId: 'branch-1',
        productId: 'product-1',
        quantity: 3,
        reason: 'Reposicao da vitrine',
      }),
    ]);
  });

  it('denies stock transfers outside branch scope before repository mutation', async () => {
    await expect(
      service.recordStockTransfer(ownerContext, {
        branchId: 'branch-2',
        productId: 'product-1',
        fromLocationId: 'location-a',
        toLocationId: 'location-b',
        quantity: 3,
        reason: 'Reposicao da vitrine',
        idempotencyKey: 'stock-transfer-denied',
      }),
    ).rejects.toMatchObject({ code: 'INVENTORY_BRANCH_SCOPE_DENIED' });
    expect(repository.createdTransferCommand).toBeNull();
    expect(audit.events).toEqual([]);
  });

  it('rejects stock transfers with the same source and destination location', async () => {
    await expect(
      service.recordStockTransfer(ownerContext, {
        branchId: 'branch-1',
        productId: 'product-1',
        fromLocationId: 'location-a',
        toLocationId: 'location-a',
        quantity: 3,
        reason: 'Reposicao da vitrine',
        idempotencyKey: 'stock-transfer-same-location',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'INVENTORY_VALIDATION_ERROR',
        'Stock transfer source and destination locations must be different.',
      ),
    );
    expect(repository.createdTransferCommand).toBeNull();
    expect(audit.events).toEqual([]);
  });

  it('rejects unbalanced transfer movement pairs without auditing success', async () => {
    repository.recordStockTransfer = async (context, command) => ({
      transferOut: {
        ...movement({
          id: 'movement-transfer-out-invalid',
          branchId: command.branchId,
          locationId: command.fromLocationId,
          productId: command.productId,
          type: 'TRANSFER_OUT',
          quantity: -command.quantity,
          idempotencyKey: command.idempotencyKey,
        }),
        tenantId: context.tenantId,
      },
      transferIn: {
        ...movement({
          id: 'movement-transfer-in-invalid',
          branchId: command.branchId,
          locationId: command.toLocationId,
          productId: command.productId,
          type: 'TRANSFER_IN',
          quantity: command.quantity - 1,
          idempotencyKey: command.idempotencyKey,
        }),
        tenantId: context.tenantId,
      },
    });

    await expect(
      service.recordStockTransfer(ownerContext, {
        branchId: 'branch-1',
        productId: 'product-1',
        fromLocationId: 'location-a',
        toLocationId: 'location-b',
        quantity: 3,
        reason: 'Reposicao da vitrine',
        idempotencyKey: 'stock-transfer-invalid',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'INVENTORY_VALIDATION_ERROR',
        'Stock transfer persistence returned an unexpected movement pair.',
      ),
    );
    expect(audit.events).toEqual([]);
  });

  it('records payment-derived sale effects when stock is sufficient', async () => {
    const sale = await service.recordStockSaleEffect(ownerContext, {
      branchId: 'branch-1',
      locationId: 'location-1',
      productId: 'product-1',
      quantity: -2,
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      paymentId: 'payment-1',
      idempotencyKey: 'stock-sale-new',
    });

    expect(repository.lastBalanceFilters).toEqual({
      branchId: 'branch-1',
      productId: 'product-1',
      locationId: 'location-1',
    });
    expect(sale).toMatchObject({
      id: 'movement-sale-created',
      type: 'SALE',
      quantity: -2,
      sourceType: 'ORDER_ITEM',
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      paymentId: 'payment-1',
      idempotencyKey: 'stock-sale-new',
    });
    expect(repository.createdSaleCommand).toMatchObject({ quantity: -2 });
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: 'STOCK_SALE_RECORDED',
        entityType: 'STOCK_MOVEMENT',
        entityId: 'movement-sale-created',
        branchId: 'branch-1',
        productId: 'product-1',
        movementType: 'SALE',
        quantity: -2,
      }),
    ]);
  });

  it('rejects payment-derived sale effects when stock is insufficient and negative stock is disabled', async () => {
    repository.balances = [balance({ currentQuantity: 1 })];

    await expect(
      service.recordStockSaleEffect(ownerContext, {
        branchId: 'branch-1',
        productId: 'product-1',
        quantity: -2,
        orderId: 'order-1',
        orderItemId: 'order-item-1',
        paymentId: 'payment-1',
        idempotencyKey: 'stock-sale-insufficient',
      }),
    ).rejects.toEqual(
      new CoreOperationsApplicationError(
        'INVENTORY_INSUFFICIENT_STOCK',
        'Insufficient stock for this product and branch.',
      ),
    );
    expect(repository.createdSaleCommand).toBeNull();
    expect(audit.events).toEqual([]);
  });

  it('allows payment-derived sale effects to go negative when product policy permits it', async () => {
    repository.balances = [balance({ currentQuantity: 1 })];

    const sale = await service.recordStockSaleEffect(ownerContext, {
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: -2,
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      paymentId: 'payment-1',
      idempotencyKey: 'stock-sale-negative-allowed',
      allowNegativeStock: true,
    });

    expect(sale).toMatchObject({ type: 'SALE', quantity: -2 });
    expect(repository.createdSaleCommand).toMatchObject({
      idempotencyKey: 'stock-sale-negative-allowed',
    });
    expect(audit.events).toHaveLength(1);
  });

  it('returns idempotent sale effect retries without duplicating movement or audit', async () => {
    repository.movements = [
      movement({
        id: 'movement-sale-existing',
        type: 'SALE',
        quantity: -2,
        sourceType: 'ORDER_ITEM',
        orderId: 'order-1',
        orderItemId: 'order-item-1',
        paymentId: 'payment-1',
        idempotencyKey: 'stock-sale-existing',
      }),
    ];

    const existing = await service.recordStockSaleEffect(ownerContext, {
      branchId: 'branch-1',
      productId: 'product-1',
      quantity: -2,
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      paymentId: 'payment-1',
      idempotencyKey: 'stock-sale-existing',
    });

    expect(existing).toEqual(repository.movements[0]);
    expect(repository.createdSaleCommand).toBeNull();
    expect(repository.lastBalanceFilters).toBeNull();
    expect(audit.events).toEqual([]);
  });
});
