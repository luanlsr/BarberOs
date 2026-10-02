import type { EntitlementDecision } from '@barberos/contracts';
import { NextResponse } from 'next/server';

import { PlatformAdminApplicationError } from '../application/platform-admin-errors';
import type { PlatformRequestContext } from '../domain';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type PlatformEntitlementRouteService = {
  resolveEntitlement(
    context: PlatformRequestContext,
    input: { tenantId: string; entitlement: string },
  ): Promise<EntitlementDecision>;
  applyEntitlementOverride(
    context: PlatformRequestContext,
    command: unknown,
  ): Promise<EntitlementDecision>;
};

export type PlatformEntitlementRouteDependencies = {
  resolveContext(
    request: Request,
  ): Promise<PlatformRequestContext | null> | PlatformRequestContext | null;
  service: PlatformEntitlementRouteService;
};

export function createPlatformEntitlementRouteHandlers(
  dependencies: PlatformEntitlementRouteDependencies,
) {
  const { resolveContext, service } = dependencies;

  return {
    async GET(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const url = new URL(request.url);
        const tenantId = url.searchParams.get('tenantId')?.trim();
        const entitlement = url.searchParams.get('entitlement')?.trim();
        if (!tenantId || !entitlement) {
          throw new PlatformAdminApplicationError(
            'PLATFORM_ADMIN_VALIDATION_ERROR',
            'Entitlement resolution requires tenantId and entitlement.',
          );
        }

        const data = await service.resolveEntitlement(context, { tenantId, entitlement });
        return NextResponse.json({ data, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    async POST(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const command = await readJsonObject(request);
        const data = await service.applyEntitlementOverride(context, command);
        return NextResponse.json({ data, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Expected JSON object.');
    }
    return body as Record<string, unknown>;
  } catch {
    throw new PlatformAdminApplicationError(
      'PLATFORM_ADMIN_VALIDATION_ERROR',
      'Entitlement override command payload is required.',
    );
  }
}

function getRequestId(request: Request) {
  return request.headers.get('x-request-id') ?? undefined;
}

function unauthenticated(requestId?: string) {
  return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
}
