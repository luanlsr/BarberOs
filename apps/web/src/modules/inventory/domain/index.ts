import type {
  CreateStockAdjustmentCommand,
  CreateStockConsumptionCommand,
  CreateStockEntryCommand,
  CreateStockLossCommand,
  CreateStockSaleEffectCommand,
  CreateStockTransferCommand,
  CreateOutboxEventCommand,
  InventoryLocation,
  LowStockAlert,
  RequestContext,
  StockAlertState,
  StockBalance,
  StockMovement,
  StockMovementType,
  StockSourceType,
} from '@barberos/contracts';

export type InventoryLocationFilters = {
  branchId?: string;
  active?: boolean;
};

export type StockBalanceFilters = {
  branchId?: string;
  productId?: string;
  locationId?: string;
  lowStockOnly?: boolean;
  limit?: number;
  cursor?: string;
};

export type StockMovementFilters = {
  branchId?: string;
  productId?: string;
  locationId?: string;
  type?: StockMovementType;
  sourceType?: StockSourceType;
  sourceId?: string;
  orderId?: string;
  paymentId?: string;
  limit?: number;
  cursor?: string;
};

export type LowStockAlertFilters = {
  branchId?: string;
  productId?: string;
  state?: StockAlertState;
  limit?: number;
  cursor?: string;
};

export type StockTransferResult = {
  transferOut: StockMovement;
  transferIn: StockMovement;
};

export interface InventoryRepository {
  listLocations(
    context: RequestContext,
    filters?: InventoryLocationFilters,
  ): Promise<InventoryLocation[]>;
  listBalances(context: RequestContext, filters?: StockBalanceFilters): Promise<StockBalance[]>;
  listMovements(context: RequestContext, filters?: StockMovementFilters): Promise<StockMovement[]>;
  listLowStockAlerts(
    context: RequestContext,
    filters?: LowStockAlertFilters,
  ): Promise<LowStockAlert[]>;
  findMovementById(context: RequestContext, movementId: string): Promise<StockMovement | null>;
  findMovementByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<StockMovement | null>;
  recordStockEntry(
    context: RequestContext,
    command: CreateStockEntryCommand,
  ): Promise<StockMovement>;
  recordStockSaleEffect(
    context: RequestContext,
    command: CreateStockSaleEffectCommand,
  ): Promise<StockMovement>;
  recordStockLoss(context: RequestContext, command: CreateStockLossCommand): Promise<StockMovement>;
  recordStockConsumption(
    context: RequestContext,
    command: CreateStockConsumptionCommand,
  ): Promise<StockMovement>;
  recordStockAdjustment(
    context: RequestContext,
    command: CreateStockAdjustmentCommand,
  ): Promise<StockMovement>;
  recordStockTransfer(
    context: RequestContext,
    command: CreateStockTransferCommand,
  ): Promise<StockTransferResult>;
}

export interface InventoryOutboxProducer {
  createEvent(
    context: RequestContext,
    command: Pick<
      CreateOutboxEventCommand,
      'tenantId' | 'branchId' | 'payload' | 'idempotencyKey' | 'correlationId'
    > & {
      eventType: 'STOCK_LOW_DETECTED';
      sourceType: 'STOCK_MOVEMENT';
      sourceId: string;
    },
  ): Promise<unknown>;
}

export interface InventoryAuditSink {
  record(
    context: RequestContext,
    event: {
      action:
        | 'STOCK_ENTRY_RECORDED'
        | 'STOCK_SALE_RECORDED'
        | 'STOCK_LOSS_RECORDED'
        | 'STOCK_CONSUMPTION_RECORDED'
        | 'STOCK_ADJUSTMENT_RECORDED'
        | 'STOCK_TRANSFER_RECORDED';
      entityType: 'STOCK_MOVEMENT' | 'STOCK_TRANSFER';
      entityId: string;
      result: 'SUCCESS' | 'DENIED' | 'FAILURE';
      branchId: string;
      productId?: string;
      movementType?: StockMovementType;
      quantity?: number;
      source?: { type: StockSourceType; id?: string };
      beforeState?: unknown;
      afterState?: unknown;
      reason?: string;
    },
  ): Promise<void>;
}
export type StockBalanceProjectionInput = {
  startingQuantity?: number;
  movements: readonly Pick<StockMovement, 'quantity'>[];
};

export type StockAvailabilityInput = {
  currentQuantity: number;
  quantityToRemove: number;
  allowNegativeStock: boolean;
};

export function signedQuantityForStockMovement(type: StockMovementType, quantity: number) {
  assertIntegerStockQuantity(quantity, 'Stock movement quantity');
  if (quantity === 0) throw new Error('Stock movement quantity cannot be zero.');

  const magnitude = Math.abs(quantity);
  switch (type) {
    case 'ENTRY':
    case 'TRANSFER_IN':
      return magnitude;
    case 'SALE':
    case 'LOSS':
    case 'CONSUMPTION':
    case 'TRANSFER_OUT':
      return -magnitude;
    case 'ADJUSTMENT':
      return quantity;
  }
}

export function projectStockBalance(input: StockBalanceProjectionInput) {
  const startingQuantity = input.startingQuantity ?? 0;
  assertIntegerStockQuantity(startingQuantity, 'Starting stock quantity');

  return input.movements.reduce((total, movement) => {
    assertIntegerStockQuantity(movement.quantity, 'Stock movement quantity');
    return total + movement.quantity;
  }, startingQuantity);
}

export function isLowStockQuantity(currentQuantity: number, minimumStockQuantity: number) {
  assertIntegerStockQuantity(currentQuantity, 'Current stock quantity');
  assertIntegerStockQuantity(minimumStockQuantity, 'Minimum stock quantity');
  if (minimumStockQuantity < 0) throw new Error('Minimum stock quantity cannot be negative.');
  return currentQuantity <= minimumStockQuantity;
}

export function evaluateLowStock(
  balance: Pick<StockBalance, 'currentQuantity' | 'minimumStockQuantity'>,
) {
  return isLowStockQuantity(balance.currentQuantity, balance.minimumStockQuantity);
}

export function assertSufficientStock(input: StockAvailabilityInput) {
  assertIntegerStockQuantity(input.currentQuantity, 'Current stock quantity');
  assertIntegerStockQuantity(input.quantityToRemove, 'Stock removal quantity');
  if (input.quantityToRemove <= 0) {
    throw new Error('Stock removal quantity must be a positive integer.');
  }

  const projectedQuantity = input.currentQuantity - input.quantityToRemove;
  if (!input.allowNegativeStock && projectedQuantity < 0) {
    throw new Error('Insufficient stock for this product and branch.');
  }

  return projectedQuantity;
}

function assertIntegerStockQuantity(quantity: number, label: string) {
  if (!Number.isInteger(quantity)) throw new Error(`${label} must be an integer.`);
}
