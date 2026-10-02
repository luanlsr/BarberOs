import type { SupportOperationClass, SupportScope } from '@barberos/contracts';
import { NextResponse } from 'next/server';

import { PlatformAdminApplicationError } from '../application/platform-admin-errors';
import type { PlatformRequestContext } from '../domain';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type PlatformSupportScopeRouteService = {
  listSupportScopes(context: PlatformRequestContext, tenantId?: string): Promise<SupportScope[]>;
  createSupportScope(context: PlatformRequestContext, command: unknown): Promise<SupportScope>;
  assertScopeForOperation(
    context: PlatformRequestContext,
    input: {
      tenantId: string;
      actorUserId: string;
      operationClass: SupportOperationClass;
    },
  ): Promise<SupportScope>;
};

export type PlatformSupportScopeRouteDependencies = {
  resolveContext(
    request: Request,
  ): Promise<PlatformRequestContext | null> | PlatformRequestContext | null;
  service: PlatformSupportScopeRouteService;
};

export function createPlatformSupportScopeRouteHandlers(
  dependencies: PlatformSupportScopeRouteDependencies,
) {
  const { resolveContext, service } = dependencies;

  return {
    async GET(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const tenantId = new URL(request.url).searchParams.get('tenantId')?.trim() || undefined;
        const data = await service.listSupportScopes(context, tenantId);
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
        const command = await readJsonObject(request, 'Support scope command payload is required.');
        const data = await service.createSupportScope(context, command);
        return NextResponse.json({ data, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    async PATCH(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const body = await readJsonObject(request, 'Support scope assertion payload is required.');
        const input = supportScopeAssertionFromBody(body);
        const data = await service.assertScopeForOperation(context, input);
        return NextResponse.json({ data, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function supportScopeAssertionFromBody(body: Record<string, unknown>) {
  const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
  const actorUserId = typeof body.actorUserId === 'string' ? body.actorUserId.trim() : '';
  const operationClass = typeof body.operationClass === 'string' ? body.operationClass.trim() : '';
  if (!tenantId || !actorUserId || !operationClass) {
    throw new PlatformAdminApplicationError(
      'PLATFORM_ADMIN_VALIDATION_ERROR',
      'Support scope assertions require tenantId, actorUserId and operationClass.',
    );
  }

  return {
    tenantId,
    actorUserId,
    operationClass: operationClass as SupportOperationClass,
  };
}

async function readJsonObject(request: Request, message: string): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Expected JSON object.');
    }
    return body as Record<string, unknown>;
  } catch {
    throw new PlatformAdminApplicationError('PLATFORM_ADMIN_VALIDATION_ERROR', message);
  }
}

function getRequestId(request: Request) {
  return request.headers.get('x-request-id') ?? undefined;
}

function unauthenticated(requestId?: string) {
  return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
}
