import type { PlatformTenantSummary, TenantLifecycleAction } from '@barberos/contracts';
import { NextResponse } from 'next/server';

import type { PlatformRequestContext, TenantOverviewFilters } from '../domain';
import { PlatformAdminApplicationError } from '../application/platform-admin-errors';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type PlatformTenantRouteService = {
  listTenants(
    context: PlatformRequestContext,
    filters?: TenantOverviewFilters,
  ): Promise<PlatformTenantSummary[]>;
  applyLifecycleAction(
    context: PlatformRequestContext,
    command: unknown,
  ): Promise<PlatformTenantSummary>;
};

export type PlatformTenantRouteDependencies = {
  resolveContext(
    request: Request,
  ): Promise<PlatformRequestContext | null> | PlatformRequestContext | null;
  service: PlatformTenantRouteService;
};

const lifecycleActions = [
  'SUSPEND',
  'RESTRICT',
  'REACTIVATE',
] as const satisfies readonly TenantLifecycleAction[];

export function createPlatformTenantRouteHandlers(dependencies: PlatformTenantRouteDependencies) {
  const { resolveContext, service } = dependencies;

  return {
    async GET(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) {
        return unauthenticated(requestId);
      }

      try {
        const filters = tenantFiltersFromUrl(new URL(request.url));
        const data = await service.listTenants(context, filters);
        return NextResponse.json({ data, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    async POST(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) {
        return unauthenticated(requestId);
      }

      try {
        const url = new URL(request.url);
        const body = await readJsonBody(request);
        const command = lifecycleCommandFromRequest(url, body, context.requestId);
        const data = await service.applyLifecycleAction(context, command);
        return NextResponse.json({ data, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function tenantFiltersFromUrl(url: URL): TenantOverviewFilters | undefined {
  return compact({
    status: optionalParam(url, 'status'),
    planCode: optionalParam(url, 'planCode'),
    query: optionalParam(url, 'query'),
    limit: optionalNumberParam(url, 'limit'),
    cursor: optionalParam(url, 'cursor'),
  });
}

function lifecycleCommandFromRequest(
  url: URL,
  body: unknown,
  requestId: string,
): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PlatformAdminApplicationError(
      'PLATFORM_ADMIN_VALIDATION_ERROR',
      'Tenant lifecycle command payload is required.',
    );
  }

  const action =
    normalizeLifecycleAction(url.searchParams.get('action')) ??
    (body as { action?: unknown }).action;
  if (!action) {
    throw new PlatformAdminApplicationError(
      'PLATFORM_ADMIN_VALIDATION_ERROR',
      'Tenant lifecycle action is required.',
    );
  }

  return {
    ...body,
    action,
    requestId:
      typeof (body as { requestId?: unknown }).requestId === 'string'
        ? (body as { requestId: string }).requestId
        : requestId,
  };
}

function normalizeLifecycleAction(action: string | null): TenantLifecycleAction | undefined {
  if (!action) {
    return undefined;
  }

  const normalized = action.trim().toUpperCase();
  return lifecycleActions.find((candidate) => candidate === normalized);
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new PlatformAdminApplicationError(
      'PLATFORM_ADMIN_VALIDATION_ERROR',
      'Tenant lifecycle command payload is required.',
    );
  }
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() || undefined;
}

function optionalNumberParam(url: URL, key: string) {
  const value = optionalParam(url, key);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new PlatformAdminApplicationError(
      'PLATFORM_ADMIN_VALIDATION_ERROR',
      `${key} must be an integer between 1 and 100.`,
    );
  }

  return parsed;
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> | undefined {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as Partial<T>) : undefined;
}

function getRequestId(request: Request) {
  return request.headers.get('x-request-id') ?? undefined;
}

function unauthenticated(requestId?: string) {
  return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
}
