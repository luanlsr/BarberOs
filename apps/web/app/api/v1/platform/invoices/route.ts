import { getSubscriptionBillingService, resolveContext } from '../subscriptions/handlers';
import { createPlatformInvoiceRouteHandlers } from '../../../../../src/modules/platform-admin/presentation';

const handlers = createPlatformInvoiceRouteHandlers({
  resolveContext,
  service: {
    async listInvoices(context) {
      return (await getSubscriptionBillingService()).listInvoices(context);
    },
  },
});

export const GET = handlers.GET;
