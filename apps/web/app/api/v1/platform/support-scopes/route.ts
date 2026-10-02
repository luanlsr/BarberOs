import { createSupabaseServerClient, getRequestContext } from '../../../../../lib/auth/server';
import { SupportScopeService } from '../../../../../src/modules/platform-admin/application';
import type { PlatformRequestContext } from '../../../../../src/modules/platform-admin/domain';
import {
  SupabasePlatformAuditSink,
  SupabasePlatformSupportScopeRepository,
} from '../../../../../src/modules/platform-admin/infrastructure';
import { createPlatformSupportScopeRouteHandlers } from '../../../../../src/modules/platform-admin/presentation';

const handlers = createPlatformSupportScopeRouteHandlers({
  resolveContext,
  service: {
    async listSupportScopes(context, tenantId) {
      return (await getSupportScopeService()).listSupportScopes(context, tenantId);
    },
    async createSupportScope(context, command) {
      return (await getSupportScopeService()).createSupportScope(context, command);
    },
    async assertScopeForOperation(context, input) {
      return (await getSupportScopeService()).assertScopeForOperation(context, input);
    },
  },
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
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

async function getSupportScopeService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }

  return new SupportScopeService({
    repository: new SupabasePlatformSupportScopeRepository(client),
    auditSink: new SupabasePlatformAuditSink(client),
  });
}
