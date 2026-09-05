import type { CreateServiceCommand, RequestContext, UpdateServiceCommand } from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { ServiceApplicationService } from '../../../../src/modules/services/application/service-service';
import type { ServiceListFilters } from '../../../../src/modules/services/domain';
import { SupabaseServiceRepository } from '../../../../src/modules/services/infrastructure/supabase-service-repository';
import { createServiceRouteHandlers } from '../../../../src/modules/services/presentation/service-route-handlers';

const handlers = createServiceRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async list(context: RequestContext, filters?: ServiceListFilters) {
      return (await getServiceApplicationService()).list(context, filters);
    },
    async create(context: RequestContext, command: CreateServiceCommand) {
      return (await getServiceApplicationService()).create(context, command);
    },
    async update(context: RequestContext, command: UpdateServiceCommand) {
      return (await getServiceApplicationService()).update(context, command);
    },
    async archive(context: RequestContext, serviceId: string) {
      return (await getServiceApplicationService()).archive(context, serviceId);
    },
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;

async function getServiceApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), { code: 'PERSISTENCE_NOT_CONFIGURED' });
  }
  return new ServiceApplicationService(new SupabaseServiceRepository(client));
}