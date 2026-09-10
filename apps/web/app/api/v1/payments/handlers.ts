import type {
  ReceivePaymentCommand,
  RefundPaymentCommand,
  RequestContext,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { SupabaseOrderRepository } from '../../../../src/modules/orders/infrastructure';
import { PaymentApplicationService } from '../../../../src/modules/payments/application/payment-service';
import {
  SupabasePaymentAuditSink,
  SupabasePaymentRepository,
} from '../../../../src/modules/payments/infrastructure';
import { createPaymentRouteHandlers } from '../../../../src/modules/payments/presentation/payment-route-handlers';
import type { PaymentListFilters } from '../../../../src/modules/payments/domain';

export function buildPaymentRouteHandlers() {
  return createPaymentRouteHandlers({
    resolveContext(request) {
      const url = new URL(request.url);
      return getRequestContext(
        request.headers.get('x-request-id') ?? crypto.randomUUID(),
        url.searchParams.get('tenantId') ?? undefined,
        url.searchParams.get('branchId') ?? undefined,
      );
    },
    service: {
      async list(context: RequestContext, filters?: PaymentListFilters) {
        const { payments } = await getPaymentServices();
        return payments.list(context, filters);
      },
      async get(context: RequestContext, paymentId: string) {
        const { payments } = await getPaymentServices();
        return payments.findById(context, paymentId);
      },
      async receivePayment(context: RequestContext, command: ReceivePaymentCommand) {
        const { service } = await getPaymentServices();
        return service.receivePayment(context, command);
      },
      async refundPayment(context: RequestContext, command: RefundPaymentCommand) {
        const { service } = await getPaymentServices();
        return service.refundPayment(context, command);
      },
    },
  });
}

async function getPaymentServices() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  const orders = new SupabaseOrderRepository(client);
  const payments = new SupabasePaymentRepository(client);
  const service = new PaymentApplicationService(
    orders,
    payments,
    new SupabasePaymentAuditSink(client),
  );
  return { payments, service };
}
