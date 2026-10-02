import { createSupabaseServerClient, getRequestContext } from '../../../../../lib/auth/server';
import { EntitlementResolutionService } from '../../../../../src/modules/platform-admin/application';
import type { PlatformRequestContext } from '../../../../../src/modules/platform-admin/domain';
import {
  SupabasePlatformAuditSink,
  SupabasePlatformEntitlementRepository,
} from '../../../../../src/modules/platform-admin/infrastructure';
import { createPlatformEntitlementRouteHandlers } from '../../../../../src/modules/platform-admin/presentation';

const handlers = createPlatformEntitlementRouteHandlers({
  resolveContext,
  service: {
    async resolveEntitlement(context, input) {
      return (await getEntitlementResolutionService()).resolveEntitlement(context, input);
    },
    async applyEntitlementOverride(context, command) {
      return (await getEntitlementResolutionService()).applyEntitlementOverride(context, command);
    },
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;

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

async function getEntitlementResolutionService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }

  return new EntitlementResolutionService({
    repository: new SupabasePlatformEntitlementRepository(client),
    auditSink: new SupabasePlatformAuditSink(client),
  });
}
