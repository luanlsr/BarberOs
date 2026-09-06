import { NextResponse } from 'next/server';
import type {
  CreateProfessionalCommand,
  DirectoryStatus,
  Professional,
  RequestContext,
  UpdateProfessionalCommand,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { ProfessionalListFilters } from '../domain';

export type ProfessionalRouteService = {
  list(context: RequestContext, filters?: ProfessionalListFilters): Promise<Professional[]>;
  create(context: RequestContext, command: CreateProfessionalCommand): Promise<Professional>;
  update(context: RequestContext, command: UpdateProfessionalCommand): Promise<Professional>;
  archive(context: RequestContext, professionalId: string): Promise<Professional>;
};

export type ProfessionalRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: ProfessionalRouteService;
};

export function createProfessionalRouteHandlers(dependencies: ProfessionalRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const filters: ProfessionalListFilters = {
          branchId: optionalParam(url, 'branchId'),
          query: optionalParam(url, 'search') ?? optionalParam(url, 'query'),
          status: optionalParam(url, 'status') as DirectoryStatus | undefined,
        };
        const professionals = await dependencies.service.list(context, compactFilters(filters));
        return NextResponse.json({ data: professionals, requestId: context.requestId });
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
        const command = (await request.json()) as CreateProfessionalCommand;
        const professional = await dependencies.service.create(context, command);
        return NextResponse.json(
          { data: professional, requestId: context.requestId },
          { status: 201 },
        );
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
        const command = (await request.json()) as UpdateProfessionalCommand;
        const professional = await dependencies.service.update(context, command);
        return NextResponse.json({ data: professional, requestId: context.requestId });
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
        const professionalId = body?.id ?? optionalParam(url, 'id');
        if (!professionalId)
          return jsonError(
            'CORE_VALIDATION_ERROR',
            'Professional id is required.',
            400,
            context.requestId,
          );
        const professional = await dependencies.service.archive(context, professionalId);
        return NextResponse.json({ data: professional, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function compactFilters(filters: ProfessionalListFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as ProfessionalListFilters;
}
