import {
  createStockAdjustmentCommandSchema,
  createStockConsumptionCommandSchema,
  createStockEntryCommandSchema,
  createStockLossCommandSchema,
  createStockSaleEffectCommandSchema,
  createStockTransferCommandSchema,
  type CreateStockAdjustmentCommand,
  type CreateStockConsumptionCommand,
  type CreateStockEntryCommand,
  type CreateStockLossCommand,
  type CreateStockSaleEffectCommand,
  type CreateStockTransferCommand,
  type Entitlement,
  type Permission,
  type RequestContext,
  type StockMovement,
  type StockMovementType,
} from '@barberos/contracts';
import { AuthorizationError, authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type {
  InventoryAuditSink,
  InventoryOutboxProducer,
  InventoryRepository,
  LowStockAlertFilters,
  StockBalanceFilters,
  StockMovementFilters,
  StockTransferResult,
} from '../domain';
import { assertSufficientStock, signedQuantityForStockMovement } from '../domain';

const inventoryEntitlement = 'inventory' satisfies Entitlement;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export type InventoryApplicationServiceDependencies = {
  repository: InventoryRepository;
  auditSink?: InventoryAuditSink;
  outbox?: InventoryOutboxProducer;
};

export class InventoryApplicationService {
  private readonly repository: InventoryRepository;
  private readonly audit?: InventoryAuditSink;
  private readonly outbox?: InventoryOutboxProducer;

  constructor(dependencies: InventoryApplicationServiceDependencies | InventoryRepository) {
    if ('repository' in dependencies) {
      this.repository = dependencies.repository;
      this.audit = dependencies.auditSink;
      this.outbox = dependencies.outbox;
    } else {
      this.repository = dependencies;
    }
  }

  async listBalances(context: RequestContext, filters: StockBalanceFilters = {}) {
    authorizeInventoryRead(context, filters.branchId);
    const balances = await this.repository.listBalances(context, filters);
    for (const balance of balances)
      assertInventoryRecordIsVisible(context, balance, 'Stock balance');
    return balances;
  }

  async listMovements(context: RequestContext, filters: StockMovementFilters = {}) {
    authorizeInventoryRead(context, filters.branchId);
    const movements = await this.repository.listMovements(context, filters);
    for (const movement of movements)
      assertInventoryRecordIsVisible(context, movement, 'Stock movement');
    return movements;
  }

  async listLowStockAlerts(context: RequestContext, filters: LowStockAlertFilters = {}) {
    authorizeInventoryRead(context, filters.branchId);
    const alerts = await this.repository.listLowStockAlerts(context, filters);
    for (const alert of alerts) assertInventoryRecordIsVisible(context, alert, 'Low stock alert');
    return alerts;
  }

  async recordStockEntry(context: RequestContext, command: unknown) {
    const parsed = createStockEntryCommandSchema.parse(command);
    authorizeInventoryWrite(context, parsed.branchId);
    const idempotent = await this.findVisibleIdempotentMovement(context, parsed.idempotencyKey);
    if (idempotent) return idempotent;

    const movement = await this.repository.recordStockEntry(context, parsed);
    await this.assertAndAuditMovement(context, movement, parsed, {
      expectedType: 'ENTRY',
      action: 'STOCK_ENTRY_RECORDED',
    });
    return movement;
  }

  async recordStockLoss(context: RequestContext, command: unknown) {
    const parsed = createStockLossCommandSchema.parse(command);
    authorizeInventoryWrite(context, parsed.branchId);
    const idempotent = await this.findVisibleIdempotentMovement(context, parsed.idempotencyKey);
    if (idempotent) return idempotent;

    const movement = await this.repository.recordStockLoss(context, parsed);
    await this.assertAndAuditMovement(context, movement, parsed, {
      expectedType: 'LOSS',
      action: 'STOCK_LOSS_RECORDED',
      reason: parsed.reason,
    });
    return movement;
  }

  async recordStockConsumption(context: RequestContext, command: unknown) {
    const parsed = createStockConsumptionCommandSchema.parse(command);
    authorizeInventoryWrite(context, parsed.branchId);
    const idempotent = await this.findVisibleIdempotentMovement(context, parsed.idempotencyKey);
    if (idempotent) return idempotent;

    const movement = await this.repository.recordStockConsumption(context, parsed);
    await this.assertAndAuditMovement(context, movement, parsed, {
      expectedType: 'CONSUMPTION',
      action: 'STOCK_CONSUMPTION_RECORDED',
      reason: parsed.reason,
    });
    return movement;
  }

  async recordStockAdjustment(context: RequestContext, command: unknown) {
    const parsed = createStockAdjustmentCommandSchema.parse(command);
    authorizeInventoryWrite(context, parsed.branchId);
    const idempotent = await this.findVisibleIdempotentMovement(context, parsed.idempotencyKey);
    if (idempotent) return idempotent;

    const movement = await this.repository.recordStockAdjustment(context, parsed);
    await this.assertAndAuditMovement(context, movement, parsed, {
      expectedType: 'ADJUSTMENT',
      action: 'STOCK_ADJUSTMENT_RECORDED',
      reason: parsed.reason,
    });
    return movement;
  }

  async recordStockTransfer(context: RequestContext, command: unknown) {
    const parsed = createStockTransferCommandSchema.parse(command);
    authorizeInventoryWrite(context, parsed.branchId);
    assertTransferLocationsAreDifferent(parsed);

    const transfer = await this.repository.recordStockTransfer(context, parsed);
    assertTransferResultMatchesCommand(context, transfer, parsed);

    await this.audit?.record(context, {
      action: 'STOCK_TRANSFER_RECORDED',
      entityType: 'STOCK_TRANSFER',
      entityId: `${transfer.transferOut.id}:${transfer.transferIn.id}`,
      result: 'SUCCESS',
      branchId: parsed.branchId,
      productId: parsed.productId,
      quantity: parsed.quantity,
      source: { type: 'TRANSFER', id: parsed.idempotencyKey },
      afterState: transfer,
      reason: parsed.reason,
    });
    await this.enqueueReconciliation(context, transfer.transferOut);
    await this.enqueueReconciliation(context, transfer.transferIn);

    return transfer;
  }

  async recordStockSaleEffect(context: RequestContext, command: unknown) {
    const parsed = createStockSaleEffectCommandSchema.parse(command);
    const allowNegativeStock = readAllowNegativeStock(command);
    authorizeInventoryWrite(context, parsed.branchId);
    const idempotent = await this.findVisibleIdempotentMovement(context, parsed.idempotencyKey);
    if (idempotent) return idempotent;

    await this.assertStockSaleIsAvailable(context, parsed, allowNegativeStock);

    const movement = await this.repository.recordStockSaleEffect(context, parsed);
    await this.assertAndAuditMovement(context, movement, parsed, {
      expectedType: 'SALE',
      action: 'STOCK_SALE_RECORDED',
    });
    return movement;
  }

  private async findVisibleIdempotentMovement(context: RequestContext, idempotencyKey: string) {
    const movement = await this.repository.findMovementByIdempotencyKey(context, idempotencyKey);
    if (!movement) return null;
    assertInventoryRecordIsVisible(context, movement, 'Stock movement');
    await this.enqueueReconciliation(context, movement);
    return movement;
  }

  private async assertStockSaleIsAvailable(
    context: RequestContext,
    command: CreateStockSaleEffectCommand,
    allowNegativeStock: boolean,
  ) {
    const balances = await this.repository.listBalances(context, {
      branchId: command.branchId,
      productId: command.productId,
      locationId: command.locationId,
    });
    for (const balance of balances)
      assertInventoryRecordIsVisible(context, balance, 'Stock balance');

    const currentQuantity = balances.reduce((total, balance) => total + balance.currentQuantity, 0);
    try {
      assertSufficientStock({
        currentQuantity,
        quantityToRemove: Math.abs(command.quantity),
        allowNegativeStock,
      });
    } catch (error) {
      if (error instanceof Error && /insufficient stock/i.test(error.message)) {
        throw new CoreOperationsApplicationError(
          'INVENTORY_INSUFFICIENT_STOCK',
          'Insufficient stock for this product and branch.',
        );
      }
      throw error;
    }
  }

  private async assertAndAuditMovement(
    context: RequestContext,
    movement: StockMovement,
    command:
      | CreateStockEntryCommand
      | CreateStockLossCommand
      | CreateStockConsumptionCommand
      | CreateStockAdjustmentCommand,
    options: {
      expectedType: StockMovementType;
      action: Parameters<InventoryAuditSink['record']>[1]['action'];
      reason?: string;
    },
  ) {
    assertInventoryRecordIsVisible(context, movement, 'Stock movement');
    assertMovementMatchesCommand(movement, command, options.expectedType);

    await this.audit?.record(context, {
      action: options.action,
      entityType: 'STOCK_MOVEMENT',
      entityId: movement.id,
      result: 'SUCCESS',
      branchId: movement.branchId,
      productId: movement.productId,
      movementType: movement.type,
      quantity: movement.quantity,
      source: { type: movement.sourceType, id: movement.sourceId },
      afterState: movement,
      reason: options.reason,
    });
    await this.enqueueReconciliation(context, movement);
  }

  private async enqueueReconciliation(
    context: RequestContext,
    movement: Pick<
      StockMovement,
      'tenantId' | 'branchId' | 'id' | 'productId' | 'type' | 'quantity' | 'idempotencyKey'
    >,
  ) {
    if (!this.outbox) return;
    await this.outbox.createEvent(context, {
      tenantId: movement.tenantId,
      branchId: movement.branchId,
      eventType: 'STOCK_LOW_DETECTED',
      sourceType: 'STOCK_MOVEMENT',
      sourceId: movement.id,
      payload: {
        movementId: movement.id,
        productId: movement.productId,
        movementType: movement.type,
        quantity: movement.quantity,
        reconciliationRequested: true,
      },
      idempotencyKey: 'inventory:movement:' + movement.id + ':reconcile',
      correlationId: context.requestId,
    });
  }
}

function authorizeInventoryRead(context: RequestContext, branchId?: string) {
  authorizeInventoryAccess(context, 'inventory.read', branchId);
}

function authorizeInventoryWrite(context: RequestContext, branchId: string) {
  authorizeInventoryAccess(context, 'inventory.write', branchId);
}

function authorizeInventoryAccess(
  context: RequestContext,
  permission: Permission,
  branchId?: string,
) {
  try {
    authorize(context, {
      permission,
      entitlement: inventoryEntitlement,
      branchId,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      switch (error.code) {
        case 'PERMISSION_DENIED':
          throw new CoreOperationsApplicationError('INVENTORY_PERMISSION_DENIED', error.message);
        case 'ENTITLEMENT_DENIED':
          throw new CoreOperationsApplicationError('INVENTORY_ENTITLEMENT_DENIED', error.message);
        case 'BRANCH_SCOPE_DENIED':
          throw new CoreOperationsApplicationError('INVENTORY_BRANCH_SCOPE_DENIED', error.message);
        case 'UNAUTHENTICATED':
          throw error;
      }
    }
    throw error;
  }
}

function assertInventoryRecordIsVisible(
  context: RequestContext,
  record: { tenantId: string; branchId: string },
  label: string,
) {
  if (record.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError('INVENTORY_NOT_FOUND', label + ' was not found.');
  }
  if (!context.branchScope.includes(record.branchId)) {
    throw new CoreOperationsApplicationError(
      'INVENTORY_BRANCH_SCOPE_DENIED',
      label + ' is outside the authorized branch scope.',
    );
  }
}

function assertMovementMatchesCommand(
  movement: StockMovement,
  command:
    | CreateStockEntryCommand
    | CreateStockLossCommand
    | CreateStockConsumptionCommand
    | CreateStockAdjustmentCommand,
  expectedType: StockMovementType,
) {
  if (
    movement.type !== expectedType ||
    movement.branchId !== command.branchId ||
    movement.productId !== command.productId ||
    movement.locationId !== command.locationId ||
    movement.idempotencyKey !== command.idempotencyKey ||
    movement.quantity !== signedQuantityForStockMovement(expectedType, command.quantity)
  ) {
    throw new CoreOperationsApplicationError(
      'INVENTORY_VALIDATION_ERROR',
      'Stock movement persistence returned an unexpected movement.',
    );
  }
}
function assertTransferLocationsAreDifferent(command: CreateStockTransferCommand) {
  if (command.fromLocationId === command.toLocationId) {
    throw new CoreOperationsApplicationError(
      'INVENTORY_VALIDATION_ERROR',
      'Stock transfer source and destination locations must be different.',
    );
  }
}

function assertTransferResultMatchesCommand(
  context: RequestContext,
  transfer: StockTransferResult,
  command: CreateStockTransferCommand,
) {
  assertInventoryRecordIsVisible(context, transfer.transferOut, 'Stock movement');
  assertInventoryRecordIsVisible(context, transfer.transferIn, 'Stock movement');

  const transferOutMatches =
    transfer.transferOut.type === 'TRANSFER_OUT' &&
    transfer.transferOut.branchId === command.branchId &&
    transfer.transferOut.productId === command.productId &&
    transfer.transferOut.locationId === command.fromLocationId &&
    transfer.transferOut.idempotencyKey === command.idempotencyKey &&
    transfer.transferOut.quantity === -command.quantity;
  const transferInMatches =
    transfer.transferIn.type === 'TRANSFER_IN' &&
    transfer.transferIn.branchId === command.branchId &&
    transfer.transferIn.productId === command.productId &&
    transfer.transferIn.locationId === command.toLocationId &&
    transfer.transferIn.idempotencyKey === command.idempotencyKey &&
    transfer.transferIn.quantity === command.quantity;
  const balancedPair = transfer.transferOut.quantity + transfer.transferIn.quantity === 0;

  if (!transferOutMatches || !transferInMatches || !balancedPair) {
    throw new CoreOperationsApplicationError(
      'INVENTORY_VALIDATION_ERROR',
      'Stock transfer persistence returned an unexpected movement pair.',
    );
  }
}
function readAllowNegativeStock(command: unknown) {
  if (!command || typeof command !== 'object' || !('allowNegativeStock' in command)) return false;
  return (command as { allowNegativeStock?: unknown }).allowNegativeStock === true;
}
