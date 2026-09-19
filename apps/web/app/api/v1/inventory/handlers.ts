import type {
  CreateStockAdjustmentCommand,
  CreateStockConsumptionCommand,
  CreateStockEntryCommand,
  CreateStockLossCommand,
  CreateStockSaleEffectCommand,
  CreateStockTransferCommand,
  RequestContext,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { InventoryApplicationService } from '../../../../src/modules/inventory/application/inventory-service';
import { SupabaseInventoryRepository } from '../../../../src/modules/inventory/infrastructure';
import { createInventoryRouteHandlers } from '../../../../src/modules/inventory/presentation/inventory-route-handlers';
import type {
  LowStockAlertFilters,
  StockBalanceFilters,
  StockMovementFilters,
} from '../../../../src/modules/inventory/domain';

export function buildInventoryRouteHandlers() {
  return createInventoryRouteHandlers({
    resolveContext,
    service: {
      async listBalances(context: RequestContext, filters?: StockBalanceFilters) {
        return (await getInventoryApplicationService()).listBalances(context, filters ?? {});
      },
      async listMovements(context: RequestContext, filters?: StockMovementFilters) {
        return (await getInventoryApplicationService()).listMovements(context, filters ?? {});
      },
      async listLowStockAlerts(context: RequestContext, filters?: LowStockAlertFilters) {
        return (await getInventoryApplicationService()).listLowStockAlerts(context, filters ?? {});
      },
      async recordStockEntry(context: RequestContext, command: CreateStockEntryCommand) {
        return (await getInventoryApplicationService()).recordStockEntry(context, command);
      },
      async recordStockLoss(context: RequestContext, command: CreateStockLossCommand) {
        return (await getInventoryApplicationService()).recordStockLoss(context, command);
      },
      async recordStockConsumption(
        context: RequestContext,
        command: CreateStockConsumptionCommand,
      ) {
        return (await getInventoryApplicationService()).recordStockConsumption(context, command);
      },
      async recordStockAdjustment(context: RequestContext, command: CreateStockAdjustmentCommand) {
        return (await getInventoryApplicationService()).recordStockAdjustment(context, command);
      },
      async recordStockSaleEffect(
        context: RequestContext,
        command: CreateStockSaleEffectCommand & { allowNegativeStock?: boolean },
      ) {
        return (await getInventoryApplicationService()).recordStockSaleEffect(context, command);
      },
      async recordStockTransfer(context: RequestContext, command: CreateStockTransferCommand) {
        return (await getInventoryApplicationService()).recordStockTransfer(context, command);
      },
    },
  });
}

function resolveContext(request: Request) {
  const url = new URL(request.url);
  return getRequestContext(
    request.headers.get('x-request-id') ?? crypto.randomUUID(),
    url.searchParams.get('tenantId') ?? undefined,
    url.searchParams.get('branchId') ?? undefined,
  );
}

async function getInventoryApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  return new InventoryApplicationService({
    repository: new SupabaseInventoryRepository(client),
  });
}
