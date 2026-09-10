import { NextResponse } from 'next/server';
import type {
  CashMovement,
  CashMovementType,
  CashRegisterMovementCommand,
  CashRegisterSession,
  CloseCashRegisterCommand,
  OpenCashRegisterCommand,
  RequestContext,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type {
  CashMovementListFilters,
  CashRegisterSessionFilters,
  CashRegisterSummary,
} from '../domain';

export type CashRegisterRouteService = {
  getCurrentSession(
    context: RequestContext,
    filters?: CashRegisterSessionFilters,
  ): Promise<CashRegisterSummary | null>;
  openSession(
    context: RequestContext,
    command: OpenCashRegisterCommand,
  ): Promise<CashRegisterSession>;
  closeSession(
    context: RequestContext,
    command: CloseCashRegisterCommand,
  ): Promise<CashRegisterSession>;
};

export type CashMovementRouteService = {
  listMovements(
    context: RequestContext,
    filters?: CashMovementListFilters,
  ): Promise<CashMovement[]>;
  recordMovement(
    context: RequestContext,
    command: CashRegisterMovementCommand,
  ): Promise<CashMovement>;
};

export type CashRegisterRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: CashRegisterRouteService;
};

export type CashMovementRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: CashMovementRouteService;
};

export function createCashRegisterRouteHandlers(dependencies: CashRegisterRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        const url = new URL(request.url);
        const session = await dependencies.service.getCurrentSession(context, {
          branchId: optionalParam(url, 'branchId'),
        });
        return NextResponse.json({ data: session, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        const command = (await request.json()) as OpenCashRegisterCommand;
        const session = await dependencies.service.openSession(context, command);
        return NextResponse.json({ data: session, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_CLOSE: async (request: Request, sessionId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        const body = (await request.json()) as CloseCashRegisterCommand;
        const session = await dependencies.service.closeSession(context, {
          ...body,
          sessionId: sessionId ?? body.sessionId,
        });
        return NextResponse.json({ data: session, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

export function createCashMovementRouteHandlers(dependencies: CashMovementRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        const movements = await dependencies.service.listMovements(
          context,
          cashMovementFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: movements, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        const command = (await request.json()) as CashRegisterMovementCommand;
        const movement = await dependencies.service.recordMovement(context, command);
        return NextResponse.json({ data: movement, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function cashMovementFiltersFromUrl(url: URL): CashMovementListFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    sessionId: optionalParam(url, 'sessionId'),
    type: optionalParam(url, 'type') as CashMovementType | undefined,
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

function compactFilters<T extends Record<string, unknown>>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as T;
}
