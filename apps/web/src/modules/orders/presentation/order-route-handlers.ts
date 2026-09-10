import { NextResponse } from 'next/server';
import type {
  CreateWalkInOrderCommand,
  Order,
  OrderDetail,
  OrderStatus,
  RequestContext,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { OrderListFilters } from '../domain';

export type OrderRouteService = {
  list(context: RequestContext, filters?: OrderListFilters): Promise<Order[]>;
  get(context: RequestContext, orderId: string): Promise<OrderDetail>;
  createWalkIn(context: RequestContext, command: CreateWalkInOrderCommand): Promise<OrderDetail>;
};

export type OrderRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: OrderRouteService;
};

export function createOrderRouteHandlers(dependencies: OrderRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;

      try {
        context = await dependencies.resolveContext(request);
        if (!context) {
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        }

        const url = new URL(request.url);
        const orderId = optionalParam(url, 'id');
        if (orderId) {
          const order = await dependencies.service.get(context, orderId);
          return NextResponse.json({ data: order, requestId: context.requestId });
        }

        const orders = await dependencies.service.list(context, listFiltersFromUrl(url));
        return NextResponse.json({ data: orders, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    GET_BY_ID: async (request: Request, orderId: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;

      try {
        context = await dependencies.resolveContext(request);
        if (!context) {
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        }

        const order = await dependencies.service.get(context, orderId);
        return NextResponse.json({ data: order, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;

      try {
        context = await dependencies.resolveContext(request);
        if (!context) {
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        }

        const command = (await request.json()) as CreateWalkInOrderCommand;
        const order = await dependencies.service.createWalkIn(context, command);
        return NextResponse.json({ data: order, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function listFiltersFromUrl(url: URL): OrderListFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    status: optionalParam(url, 'status') as OrderStatus | undefined,
    customerId: optionalParam(url, 'customerId'),
    professionalId: optionalParam(url, 'professionalId'),
    appointmentId: optionalParam(url, 'appointmentId'),
    limit: optionalNumberParam(url, 'limit'),
    cursor: optionalParam(url, 'cursor'),
  });
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function optionalNumberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value ? Number(value) : undefined;
}

function compactFilters(filters: OrderListFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as OrderListFilters;
}
