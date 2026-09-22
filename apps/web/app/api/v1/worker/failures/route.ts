import type { RequestContext } from '@barberos/contracts';

import {
  createSupabaseServerClient,
  getRequestContext,
  isDevelopmentAuthEnabled,
} from '../../../../../lib/auth/server';
import {
  WorkerFailureReadService,
  type WorkerFailureFilters,
} from '../../../../../src/modules/outbox/application';
import { SupabaseOutboxRepository } from '../../../../../src/modules/outbox/infrastructure';
import { createWorkerFailureRouteHandlers } from '../../../../../src/modules/outbox/presentation/worker-failure-route-handlers';
import { SupabaseNotificationRepository } from '../../../../../src/modules/notifications/infrastructure';
import { DevWorkerFailureRepository } from '../../../../../src/modules/platform-data/application/dev-worker-failure-repository';

const handlers = createWorkerFailureRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async summarize(context: RequestContext, filters?: WorkerFailureFilters) {
      return (await getWorkerFailureReadService()).summarize(context, filters);
    },
  },
});

export const GET = handlers.GET;

async function getWorkerFailureReadService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    if (isDevelopmentAuthEnabled()) {
      const repository = new DevWorkerFailureRepository();
      return new WorkerFailureReadService({
        outbox: repository,
        jobs: repository,
        notifications: repository,
      });
    }
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }

  const outboxRepository = new SupabaseOutboxRepository(client);
  return new WorkerFailureReadService({
    outbox: outboxRepository,
    jobs: outboxRepository,
    notifications: new SupabaseNotificationRepository(client),
  });
}
