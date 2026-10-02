import type { PlatformAuditEntry } from '@barberos/contracts';
import { NextResponse } from 'next/server';

import { PlatformAdminApplicationError } from '../application/platform-admin-errors';
import type { PlatformRequestContext } from '../domain';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type PlatformAuditRouteService = {
  listAuditEntries(
    context: PlatformRequestContext,
    filters?: unknown,
  ): Promise<PlatformAuditEntry[]>;
};

export type PlatformAuditRouteDependencies = {
  resolveContext(
    request: Request,
  ): Promise<PlatformRequestContext | null> | PlatformRequestContext | null;
  service: PlatformAuditRouteService;
};

export function createPlatformAuditRouteHandlers(dependencies: PlatformAuditRouteDependencies) {
  const { resolveContext, service } = dependencies;

  return {
    async GET(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const filters = auditFiltersFromUrl(new URL(request.url));
        const data = await service.listAuditEntries(context, filters);
        return NextResponse.json({ data, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function auditFiltersFromUrl(url: URL) {
  return compact({
    tenantId: optionalParam(url, 'tenantId'),
    actorUserId: optionalParam(url, 'actorUserId'),
    action: optionalParam(url, 'action'),
    startsAt: optionalParam(url, 'startsAt'),
    endsAt: optionalParam(url, 'endsAt'),
    limit: optionalNumberParam(url, 'limit'),
    cursor: optionalParam(url, 'cursor'),
  });
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() || undefined;
}

function optionalNumberParam(url: URL, key: string) {
  const value = optionalParam(url, key);
  if (value === undefined) return undefined;

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
  return entries.length ? (Object.fromEntries(entries) as Partial<T>) : undefined;
}

function getRequestId(request: Request) {
  return request.headers.get('x-request-id') ?? undefined;
}

function unauthenticated(requestId?: string) {
  return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
}
