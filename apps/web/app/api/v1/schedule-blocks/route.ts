import type { CreateScheduleBlockCommand, RequestContext } from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { SchedulingApplicationService } from '../../../../src/modules/scheduling/application/scheduling-service';
import { SupabaseSchedulingRepository } from '../../../../src/modules/scheduling/infrastructure/supabase-scheduling-repository';
import { createScheduleBlockRouteHandlers } from '../../../../src/modules/scheduling/presentation/scheduling-route-handlers';

const handlers = createScheduleBlockRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async listScheduleBlocks(context: RequestContext, branchId: string) {
      return (await getSchedulingApplicationService()).listScheduleBlocks(context, branchId);
    },
    async createScheduleBlock(context: RequestContext, command: CreateScheduleBlockCommand) {
      return (await getSchedulingApplicationService()).createScheduleBlock(context, command);
    },
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;

async function getSchedulingApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  const repository = new SupabaseSchedulingRepository(client);
  return new SchedulingApplicationService(repository, repository);
}
