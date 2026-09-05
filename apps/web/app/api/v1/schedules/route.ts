import type { CreateProfessionalScheduleCommand, RequestContext } from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { SchedulingApplicationService } from '../../../../src/modules/scheduling/application/scheduling-service';
import { SupabaseSchedulingRepository } from '../../../../src/modules/scheduling/infrastructure/supabase-scheduling-repository';
import { createScheduleRouteHandlers } from '../../../../src/modules/scheduling/presentation/scheduling-route-handlers';

const handlers = createScheduleRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async listProfessionalSchedules(context: RequestContext, branchId: string) {
      return (await getSchedulingApplicationService()).listProfessionalSchedules(context, branchId);
    },
    async upsertProfessionalSchedule(context: RequestContext, command: CreateProfessionalScheduleCommand) {
      return (await getSchedulingApplicationService()).upsertProfessionalSchedule(context, command);
    },
  },
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;

async function getSchedulingApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), { code: 'PERSISTENCE_NOT_CONFIGURED' });
  }
  const repository = new SupabaseSchedulingRepository(client);
  return new SchedulingApplicationService(repository, repository);
}