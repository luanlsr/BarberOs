import { createSupabaseServerClient, getRequestContext } from '../../../../../lib/auth/server';
import { PlatformAuditService } from '../../../../../src/modules/platform-admin/application';
import type { PlatformRequestContext } from '../../../../../src/modules/platform-admin/domain';
import { SupabasePlatformAuditRepository } from '../../../../../src/modules/platform-admin/infrastructure';
import { createPlatformAuditRouteHandlers } from '../../../../../src/modules/platform-admin/presentation';

const handlers = createPlatformAuditRouteHandlers({
  resolveContext,
  service: {
    async listAuditEntries(context, filters) {
      return (await getPlatformAuditService()).listAuditEntries(context, filters);
    },
  },
});

export const GET = handlers.GET;

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

async function getPlatformAuditService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }

  return new PlatformAuditService(new SupabasePlatformAuditRepository(client));
}
