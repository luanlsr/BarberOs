import type { CheckInAppointmentCommand, RequestContext } from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { CheckInApplicationService } from '../../../../src/modules/orders/application/check-in-service';
import {
  SupabaseOrderAuditSink,
  SupabaseOrderRepository,
} from '../../../../src/modules/orders/infrastructure';
import { createCheckInRouteHandlers } from '../../../../src/modules/orders/presentation/check-in-route-handlers';

const handlers = createCheckInRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async checkIn(context: RequestContext, command: CheckInAppointmentCommand) {
      return (await getCheckInApplicationService()).checkIn(context, command);
    },
  },
});

export const POST = handlers.POST;

async function getCheckInApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  const orders = new SupabaseOrderRepository(client);
  return new CheckInApplicationService(orders, orders, new SupabaseOrderAuditSink(client));
}
