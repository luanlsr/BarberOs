import type {
  CreateOrderItemCommand,
  CreateWalkInOrderCommand,
  RemoveOrderItemCommand,
  RequestContext,
  UpdateOrderItemCommand,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { OrderApplicationService } from '../../../../src/modules/orders/application/order-service';
import {
  SupabaseOrderAuditSink,
  SupabaseOrderProductCatalog,
  SupabaseOrderRepository,
} from '../../../../src/modules/orders/infrastructure';
import { createOrderItemRouteHandlers } from '../../../../src/modules/orders/presentation/order-item-route-handlers';
import { createOrderRouteHandlers } from '../../../../src/modules/orders/presentation/order-route-handlers';
import type { OrderListFilters } from '../../../../src/modules/orders/domain';

export function buildOrderRouteHandlers() {
  return createOrderRouteHandlers({
    resolveContext(request) {
      const url = new URL(request.url);
      return getRequestContext(
        request.headers.get('x-request-id') ?? crypto.randomUUID(),
        url.searchParams.get('tenantId') ?? undefined,
        url.searchParams.get('branchId') ?? undefined,
      );
    },
    service: {
      async list(context: RequestContext, filters?: OrderListFilters) {
        return (await getOrderApplicationService()).list(context, filters);
      },
      async get(context: RequestContext, orderId: string) {
        return (await getOrderApplicationService()).get(context, orderId);
      },
      async createWalkIn(context: RequestContext, command: CreateWalkInOrderCommand) {
        return (await getOrderApplicationService()).createWalkIn(context, command);
      },
    },
  });
}

export function buildOrderItemRouteHandlers() {
  return createOrderItemRouteHandlers({
    resolveContext(request) {
      const url = new URL(request.url);
      return getRequestContext(
        request.headers.get('x-request-id') ?? crypto.randomUUID(),
        url.searchParams.get('tenantId') ?? undefined,
        url.searchParams.get('branchId') ?? undefined,
      );
    },
    service: {
      async addItem(context: RequestContext, command: CreateOrderItemCommand) {
        return (await getOrderApplicationService()).addItem(context, command);
      },
      async updateItem(context: RequestContext, command: UpdateOrderItemCommand) {
        return (await getOrderApplicationService()).updateItem(context, command);
      },
      async removeItem(context: RequestContext, command: RemoveOrderItemCommand) {
        return (await getOrderApplicationService()).removeItem(context, command);
      },
    },
  });
}

async function getOrderApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  const orders = new SupabaseOrderRepository(client);
  return new OrderApplicationService(
    orders,
    new SupabaseOrderAuditSink(client),
    new SupabaseOrderProductCatalog(client),
  );
}
