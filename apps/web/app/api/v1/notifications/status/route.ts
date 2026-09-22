import type { RequestContext } from '@barberos/contracts';

import {
  createSupabaseServerClient,
  getRequestContext,
  isDevelopmentAuthEnabled,
} from '../../../../../lib/auth/server';
import {
  NotificationStatusReadService,
  type NotificationStatusFilters,
} from '../../../../../src/modules/notifications/application';
import { SupabaseNotificationRepository } from '../../../../../src/modules/notifications/infrastructure';
import { createNotificationStatusRouteHandlers } from '../../../../../src/modules/notifications/presentation/notification-status-route-handlers';
import { DevWorkerFailureRepository } from '../../../../../src/modules/platform-data/application/dev-worker-failure-repository';

const handlers = createNotificationStatusRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async list(context: RequestContext, filters?: NotificationStatusFilters) {
      return (await getNotificationStatusReadService()).list(context, filters);
    },
  },
});

export const GET = handlers.GET;

async function getNotificationStatusReadService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    if (isDevelopmentAuthEnabled()) {
      return new NotificationStatusReadService(new DevWorkerFailureRepository());
    }
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  return new NotificationStatusReadService(new SupabaseNotificationRepository(client));
}
