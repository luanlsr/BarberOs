import { NextResponse } from 'next/server';
import type {
  CreateOrderItemCommand,
  OrderDetail,
  RemoveOrderItemCommand,
  RequestContext,
  UpdateOrderItemCommand,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type OrderItemRouteService = {
  addItem(context: RequestContext, command: CreateOrderItemCommand): Promise<OrderDetail>;
  updateItem(context: RequestContext, command: UpdateOrderItemCommand): Promise<OrderDetail>;
  removeItem(context: RequestContext, command: RemoveOrderItemCommand): Promise<OrderDetail>;
};

export type OrderItemRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: OrderItemRouteService;
};

export function createOrderItemRouteHandlers(dependencies: OrderItemRouteDependencies) {
  return {
    POST: async (request: Request, orderId: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;

      try {
        context = await dependencies.resolveContext(request);
        if (!context) {
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        }

        const body = (await request.json()) as Partial<CreateOrderItemCommand>;
        const order = await dependencies.service.addItem(
          context,
          compactCommand({ ...body, orderId }) as CreateOrderItemCommand,
        );
        return NextResponse.json({ data: order, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    PATCH: async (request: Request, orderId: string, itemId: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;

      try {
        context = await dependencies.resolveContext(request);
        if (!context) {
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        }

        const body = (await request.json()) as Partial<UpdateOrderItemCommand>;
        const order = await dependencies.service.updateItem(
          context,
          compactCommand({ ...body, orderId, itemId }) as UpdateOrderItemCommand,
        );
        return NextResponse.json({ data: order, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    DELETE: async (request: Request, orderId: string, itemId: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;

      try {
        context = await dependencies.resolveContext(request);
        if (!context) {
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        }

        const body = (await request
          .json()
          .catch(() => null)) as Partial<RemoveOrderItemCommand> | null;
        const order = await dependencies.service.removeItem(
          context,
          compactCommand({ orderId, itemId, reason: body?.reason }) as RemoveOrderItemCommand,
        );
        return NextResponse.json({ data: order, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function compactCommand<T extends Record<string, unknown>>(command: T) {
  return Object.fromEntries(Object.entries(command).filter(([, value]) => value !== undefined));
}
