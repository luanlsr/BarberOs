import { NextResponse } from 'next/server';
import type {
  CreateStockAdjustmentCommand,
  CreateStockConsumptionCommand,
  CreateStockEntryCommand,
  CreateStockLossCommand,
  CreateStockSaleEffectCommand,
  CreateStockTransferCommand,
  LowStockAlert,
  RequestContext,
  StockAlertState,
  StockBalance,
  StockMovement,
  StockMovementType,
  StockSourceType,
} from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/inventory-service';
import type { LowStockAlertFilters, StockBalanceFilters, StockMovementFilters } from '../domain';
import type { StockTransferResult } from '../domain';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

type StockMovementWriteCommand =
  | ({ type: 'ENTRY' } & CreateStockEntryCommand)
  | ({ type: 'LOSS' } & CreateStockLossCommand)
  | ({ type: 'CONSUMPTION' } & CreateStockConsumptionCommand)
  | ({ type: 'ADJUSTMENT' } & CreateStockAdjustmentCommand)
  | ({ type: 'SALE'; allowNegativeStock?: boolean } & CreateStockSaleEffectCommand)
  | ({ type: 'TRANSFER' } & CreateStockTransferCommand);

export type InventoryRouteService = {
  listBalances(context: RequestContext, filters?: StockBalanceFilters): Promise<StockBalance[]>;
  listMovements(context: RequestContext, filters?: StockMovementFilters): Promise<StockMovement[]>;
  listLowStockAlerts(
    context: RequestContext,
    filters?: LowStockAlertFilters,
  ): Promise<LowStockAlert[]>;
  recordStockEntry(
    context: RequestContext,
    command: CreateStockEntryCommand,
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
  recordStockSaleEffect(
    context: RequestContext,
    command: CreateStockSaleEffectCommand & { allowNegativeStock?: boolean },
  ): Promise<StockMovement>;
  recordStockTransfer(
    context: RequestContext,
    command: CreateStockTransferCommand,
  ): Promise<StockTransferResult>;
};

export type InventoryRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: InventoryRouteService;
};

export function createInventoryRouteHandlers(dependencies: InventoryRouteDependencies) {
  return {
    GET_BALANCES: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const balances = await dependencies.service.listBalances(
          context,
          stockBalanceFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: balances, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    GET_MOVEMENTS: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const movements = await dependencies.service.listMovements(
          context,
          stockMovementFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: movements, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    GET_ALERTS: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const alerts = await dependencies.service.listLowStockAlerts(
          context,
          lowStockAlertFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: alerts, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_MOVEMENT: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const command = (await request.json()) as StockMovementWriteCommand;
        const data = await recordMovement(dependencies.service, context, command);
        return NextResponse.json({ data, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

async function recordMovement(
  service: InventoryRouteService,
  context: RequestContext,
  command: StockMovementWriteCommand,
) {
  switch (command.type) {
    case 'ENTRY':
      return service.recordStockEntry(context, withoutType(command));
    case 'LOSS':
      return service.recordStockLoss(context, withoutType(command));
    case 'CONSUMPTION':
      return service.recordStockConsumption(context, withoutType(command));
    case 'ADJUSTMENT':
      return service.recordStockAdjustment(context, withoutType(command));
    case 'SALE':
      return service.recordStockSaleEffect(context, withoutType(command));
    case 'TRANSFER':
      return service.recordStockTransfer(context, withoutType(command));
    default:
      throw new CoreOperationsApplicationError(
        'INVENTORY_VALIDATION_ERROR',
        'Stock movement type is not supported.',
      );
  }
}

function withoutType<T extends { type: string }>(command: T): Omit<T, 'type'> {
  const rest = { ...command };
  delete (rest as Partial<T>).type;
  return rest;
}

function stockBalanceFiltersFromUrl(url: URL): StockBalanceFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    productId: optionalParam(url, 'productId'),
    locationId: optionalParam(url, 'locationId'),
    lowStockOnly: optionalBooleanParam(url, 'lowStockOnly'),
    limit: optionalNumberParam(url, 'limit'),
    cursor: optionalParam(url, 'cursor'),
  });
}

function stockMovementFiltersFromUrl(url: URL): StockMovementFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    productId: optionalParam(url, 'productId'),
    locationId: optionalParam(url, 'locationId'),
    type: optionalParam(url, 'type') as StockMovementType | undefined,
    sourceType: optionalParam(url, 'sourceType') as StockSourceType | undefined,
    sourceId: optionalParam(url, 'sourceId'),
    orderId: optionalParam(url, 'orderId'),
    paymentId: optionalParam(url, 'paymentId'),
    limit: optionalNumberParam(url, 'limit'),
    cursor: optionalParam(url, 'cursor'),
  });
}

function lowStockAlertFiltersFromUrl(url: URL): LowStockAlertFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    productId: optionalParam(url, 'productId'),
    state: optionalParam(url, 'state') as StockAlertState | undefined,
    limit: optionalNumberParam(url, 'limit'),
    cursor: optionalParam(url, 'cursor'),
  });
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function optionalNumberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value ? Number(value) : undefined;
}

function optionalBooleanParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (value === null) return undefined;
  return value === 'true';
}

function compactFilters<T extends Record<string, unknown>>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as T;
}
