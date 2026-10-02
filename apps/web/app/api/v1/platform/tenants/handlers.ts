import type { PlatformTenantSummary } from '@barberos/contracts';

import { createSupabaseServerClient, getRequestContext } from '../../../../../lib/auth/server';
import {
  TenantLifecycleService,
  TenantOverviewService,
} from '../../../../../src/modules/platform-admin/application';
import type {
  PlatformRequestContext,
  TenantOverviewFilters,
} from '../../../../../src/modules/platform-admin/domain';
import {
  SupabasePlatformAuditSink,
  SupabasePlatformTenantRepository,
} from '../../../../../src/modules/platform-admin/infrastructure';
import { createPlatformTenantRouteHandlers } from '../../../../../src/modules/platform-admin/presentation';

export function buildPlatformTenantRouteHandlers() {
  return createPlatformTenantRouteHandlers({
    resolveContext,
    service: {
      async listTenants(
        context: PlatformRequestContext,
        filters?: TenantOverviewFilters,
      ): Promise<PlatformTenantSummary[]> {
        return (await getPlatformTenantServices()).overview.listTenants(context, filters);
      },
      async applyLifecycleAction(
        context: PlatformRequestContext,
        command: unknown,
      ): Promise<PlatformTenantSummary> {
        return (await getPlatformTenantServices()).lifecycle.applyLifecycleAction(context, command);
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

async function getPlatformTenantServices() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }

  const repository = new SupabasePlatformTenantRepository(client);
  return {
    overview: new TenantOverviewService(repository),
    lifecycle: new TenantLifecycleService({
      repository,
      auditSink: new SupabasePlatformAuditSink(client),
    }),
  };
}
