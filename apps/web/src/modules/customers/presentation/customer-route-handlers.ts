import { NextResponse } from 'next/server';
import type {
  CreateCustomerCommand,
  Customer,
  CustomerStatus,
  RequestContext,
  UpdateCustomerCommand,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { CustomerListFilters } from '../domain';

export type CustomerRouteService = {
  search(context: RequestContext, filters?: CustomerListFilters): Promise<Customer[]>;
  create(context: RequestContext, command: CreateCustomerCommand): Promise<Customer>;
  update(context: RequestContext, command: UpdateCustomerCommand): Promise<Customer>;
  archive(context: RequestContext, customerId: string): Promise<Customer>;
};

export type CustomerRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: CustomerRouteService;
};

export function createCustomerRouteHandlers(dependencies: CustomerRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const filters: CustomerListFilters = compactFilters({
          branchId: optionalParam(url, 'branchId'),
          phone: optionalParam(url, 'phone'),
          query: optionalParam(url, 'search') ?? optionalParam(url, 'query'),
          status: optionalParam(url, 'status') as CustomerStatus | undefined,
        });
        const customers = await dependencies.service.search(context, filters);
        return NextResponse.json({ data: customers, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const command = (await request.json()) as CreateCustomerCommand;
        const customer = await dependencies.service.create(context, command);
        return NextResponse.json({ data: customer, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    PATCH: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const command = (await request.json()) as UpdateCustomerCommand;
        const customer = await dependencies.service.update(context, command);
        return NextResponse.json({ data: customer, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    DELETE: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const body = (await request.json().catch(() => null)) as { id?: string } | null;
        const customerId = body?.id ?? optionalParam(url, 'id');
        if (!customerId)
          return jsonError(
            'CORE_VALIDATION_ERROR',
            'Customer id is required.',
            400,
            context.requestId,
          );
        const customer = await dependencies.service.archive(context, customerId);
        return NextResponse.json({ data: customer, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function compactFilters(filters: CustomerListFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as CustomerListFilters;
}
