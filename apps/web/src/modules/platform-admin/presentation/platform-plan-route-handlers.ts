import type { SaasPlan } from '@barberos/contracts';
import { NextResponse } from 'next/server';

import { PlatformAdminApplicationError } from '../application/platform-admin-errors';
import type { PlatformRequestContext } from '../domain';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type PlatformPlanRouteService = {
  listPlans(context: PlatformRequestContext): Promise<SaasPlan[]>;
  createPlan(context: PlatformRequestContext, command: unknown): Promise<SaasPlan>;
  updatePlan(context: PlatformRequestContext, command: unknown): Promise<SaasPlan>;
  archivePlan(
    context: PlatformRequestContext,
    input: { planId: string; reason: string },
  ): Promise<SaasPlan>;
};

export type PlatformPlanRouteDependencies = {
  resolveContext(
    request: Request,
  ): Promise<PlatformRequestContext | null> | PlatformRequestContext | null;
  service: PlatformPlanRouteService;
};

export function createPlatformPlanRouteHandlers(dependencies: PlatformPlanRouteDependencies) {
  const { resolveContext, service } = dependencies;

  return {
    async GET(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const data = await service.listPlans(context);
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
        const data = await service.createPlan(context, command);
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
        const command = await readJsonObject(request);
        const data = await service.updatePlan(context, command);
        return NextResponse.json({ data, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    async DELETE(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const body = await readJsonObject(request);
        const planId = typeof body.planId === 'string' ? body.planId : undefined;
        const reason = typeof body.reason === 'string' ? body.reason : undefined;
        if (!planId || !reason) {
          throw new PlatformAdminApplicationError(
            'PLATFORM_ADMIN_VALIDATION_ERROR',
            'Plan archive requires planId and reason.',
          );
        }

        const data = await service.archivePlan(context, { planId, reason });
        return NextResponse.json({ data, requestId: context.requestId });
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
      'Platform plan command payload is required.',
    );
  }
}

function getRequestId(request: Request) {
  return request.headers.get('x-request-id') ?? undefined;
}

function unauthenticated(requestId?: string) {
  return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
}
