import type { CreatePaymentTerminalIntentCommand, RequestContext } from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { SupabaseOrderRepository } from '../../../../src/modules/orders/infrastructure';
import { PaymentApplicationService } from '../../../../src/modules/payments/application/payment-service';
import {
  SupabasePaymentAuditSink,
  SupabasePaymentRepository,
} from '../../../../src/modules/payments/infrastructure';
import { PaymentTerminalApplicationService } from '../../../../src/modules/payment-terminals/application';
import {
  MockPaymentTerminalProvider,
  SupabasePaymentTerminalRepository,
} from '../../../../src/modules/payment-terminals/infrastructure';
import { createPaymentTerminalRouteHandlers } from '../../../../src/modules/payment-terminals/presentation';

const handlers = createPaymentTerminalRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async listTerminals(context: RequestContext, filters?: { branchId?: string }) {
      return (await getPaymentTerminalService()).listTerminals(context, filters);
    },
    async createIntent(context: RequestContext, command: CreatePaymentTerminalIntentCommand) {
      return (await getPaymentTerminalService()).createIntent(context, command);
    },
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;

async function getPaymentTerminalService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  const orders = new SupabaseOrderRepository(client);
  const payments = new SupabasePaymentRepository(client);
  const paymentService = new PaymentApplicationService(
    orders,
    payments,
    new SupabasePaymentAuditSink(client),
  );
  return new PaymentTerminalApplicationService(
    orders,
    payments,
    new SupabasePaymentTerminalRepository(client),
    [new MockPaymentTerminalProvider()],
    paymentService,
  );
}
