import { NextResponse } from 'next/server';
import type {
  CreateServiceCommand,
  DirectoryStatus,
  RequestContext,
  Service,
  UpdateServiceCommand,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { ServiceListFilters } from '../domain';

export type ServiceRouteService = {
  list(context: RequestContext, filters?: ServiceListFilters): Promise<Service[]>;
  create(context: RequestContext, command: CreateServiceCommand): Promise<Service>;
  update(context: RequestContext, command: UpdateServiceCommand): Promise<Service>;
  archive(context: RequestContext, serviceId: string): Promise<Service>;
};

export type ServiceRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: ServiceRouteService;
};

export function createServiceRouteHandlers(dependencies: ServiceRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const filters: ServiceListFilters = compactFilters({
          category: optionalParam(url, 'category'),
          professionalId: optionalParam(url, 'professionalId'),
          query: optionalParam(url, 'search') ?? optionalParam(url, 'query'),
          status: optionalParam(url, 'status') as DirectoryStatus | undefined,
        });
        const services = await dependencies.service.list(context, filters);
        return NextResponse.json({ data: services, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const command = (await request.json()) as CreateServiceCommand;
        const service = await dependencies.service.create(context, command);
        return NextResponse.json({ data: service, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    PATCH: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const command = (await request.json()) as UpdateServiceCommand;
        const service = await dependencies.service.update(context, command);
        return NextResponse.json({ data: service, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    DELETE: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const body = await request.json().catch(() => null) as { id?: string } | null;
        const serviceId = body?.id ?? optionalParam(url, 'id');
        if (!serviceId) return jsonError('CORE_VALIDATION_ERROR', 'Service id is required.', 400, context.requestId);
        const service = await dependencies.service.archive(context, serviceId);
        return NextResponse.json({ data: service, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function compactFilters(filters: ServiceListFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)) as ServiceListFilters;
}