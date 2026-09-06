import type { AvailabilityQuery, RequestContext } from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { SupabaseServiceRepository } from '../../../../src/modules/services/infrastructure/supabase-service-repository';
import { AvailabilityApplicationService } from '../../../../src/modules/scheduling/application/availability-service';
import { SupabaseSchedulingRepository } from '../../../../src/modules/scheduling/infrastructure/supabase-scheduling-repository';
import { createAvailabilityRouteHandlers } from '../../../../src/modules/scheduling/presentation/scheduling-route-handlers';

const handlers = createAvailabilityRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async findAvailableSlots(context: RequestContext, query: AvailabilityQuery) {
      return (await getAvailabilityApplicationService()).findAvailableSlots(context, query);
    },
  },
});

export const GET = handlers.GET;

async function getAvailabilityApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  const schedulingRepository = new SupabaseSchedulingRepository(client);
  return new AvailabilityApplicationService(
    schedulingRepository,
    schedulingRepository,
    schedulingRepository,
    new SupabaseServiceRepository(client),
  );
}
