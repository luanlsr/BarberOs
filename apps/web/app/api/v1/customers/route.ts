import type {
  CreateCustomerCommand,
  RequestContext,
  UpdateCustomerCommand,
} from '@barberos/contracts';
import {
  createSupabaseServerClient,
  getRequestContext,
  isDevelopmentAuthEnabled,
} from '../../../../lib/auth/server';
import { CustomerApplicationService } from '../../../../src/modules/customers/application/customer-service';
import type { CustomerListFilters } from '../../../../src/modules/customers/domain';
import { SupabaseCustomerRepository } from '../../../../src/modules/customers/infrastructure/supabase-customer-repository';
import { createCustomerRouteHandlers } from '../../../../src/modules/customers/presentation/customer-route-handlers';
import { DevCustomerRepository } from '../../../../src/modules/platform-data/application/dev-directory-repositories';

const handlers = createCustomerRouteHandlers({
  resolveContext(request) {
    const url = new URL(request.url);
    return getRequestContext(
      request.headers.get('x-request-id') ?? crypto.randomUUID(),
      url.searchParams.get('tenantId') ?? undefined,
      url.searchParams.get('branchId') ?? undefined,
    );
  },
  service: {
    async search(context: RequestContext, filters?: CustomerListFilters) {
      return (await getCustomerApplicationService()).search(context, filters);
    },
    async create(context: RequestContext, command: CreateCustomerCommand) {
      return (await getCustomerApplicationService()).create(context, command);
    },
    async update(context: RequestContext, command: UpdateCustomerCommand) {
      return (await getCustomerApplicationService()).update(context, command);
    },
    async archive(context: RequestContext, customerId: string) {
      return (await getCustomerApplicationService()).archive(context, customerId);
    },
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;

async function getCustomerApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    if (isDevelopmentAuthEnabled()) {
      return new CustomerApplicationService(new DevCustomerRepository());
    }
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  return new CustomerApplicationService(new SupabaseCustomerRepository(client));
}
