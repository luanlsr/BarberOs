import type { SaasPlan } from '@barberos/contracts';

import { createSupabaseServerClient, getRequestContext } from '../../../../../lib/auth/server';
import { SaasPlanService } from '../../../../../src/modules/platform-admin/application';
import type { PlatformRequestContext } from '../../../../../src/modules/platform-admin/domain';
import {
  SupabasePlatformAuditSink,
  SupabasePlatformPlanRepository,
} from '../../../../../src/modules/platform-admin/infrastructure';
import { createPlatformPlanRouteHandlers } from '../../../../../src/modules/platform-admin/presentation';

export function buildPlatformPlanRouteHandlers() {
  return createPlatformPlanRouteHandlers({
    resolveContext,
    service: {
      async listPlans(context: PlatformRequestContext): Promise<SaasPlan[]> {
        return (await getPlatformPlanService()).listPlans(context);
      },
      async createPlan(context: PlatformRequestContext, command: unknown): Promise<SaasPlan> {
        return (await getPlatformPlanService()).createPlan(context, command);
      },
      async updatePlan(context: PlatformRequestContext, command: unknown): Promise<SaasPlan> {
        return (await getPlatformPlanService()).updatePlan(context, command);
      },
      async archivePlan(
        context: PlatformRequestContext,
        input: { planId: string; reason: string },
      ): Promise<SaasPlan> {
        return (await getPlatformPlanService()).archivePlan(context, input);
      },
    },
  });
}

async function resolveContext(request: Request): Promise<PlatformRequestContext | null> {
  const context = await getRequestContext(
    request.headers.get('x-request-id') ?? crypto.randomUUID(),
  );
  if (!context) {
    return null;
  }

  return {
    requestId: context.requestId,
    userId: context.userId,
    role: context.role,
    permissions: context.permissions,
  };
}

async function getPlatformPlanService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }

  return new SaasPlanService({
    repository: new SupabasePlatformPlanRepository(client),
    auditSink: new SupabasePlatformAuditSink(client),
  });
}
