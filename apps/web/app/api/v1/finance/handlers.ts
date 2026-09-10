import type { RequestContext } from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { FinanceApplicationService } from '../../../../src/modules/finance/application/finance-service';
import { SupabaseFinanceRepository } from '../../../../src/modules/finance/infrastructure';
import { createFinanceRouteHandlers } from '../../../../src/modules/finance/presentation/finance-route-handlers';
import type {
  FinancialEntryFilters,
  FinanceSummaryFilters,
} from '../../../../src/modules/finance/domain';

export function buildFinanceRouteHandlers() {
  return createFinanceRouteHandlers({
    resolveContext,
    service: {
      async getSummary(context: RequestContext, filters: FinanceSummaryFilters) {
        return (await getFinanceApplicationService()).getSummary(context, filters);
      },
      async listEntries(context: RequestContext, filters: FinancialEntryFilters) {
        return (await getFinanceApplicationService()).listEntries(context, filters);
      },
    },
  });
}

function resolveContext(request: Request) {
  const url = new URL(request.url);
  return getRequestContext(
    request.headers.get('x-request-id') ?? crypto.randomUUID(),
    url.searchParams.get('tenantId') ?? undefined,
    url.searchParams.get('branchId') ?? undefined,
  );
}

async function getFinanceApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  return new FinanceApplicationService({ repository: new SupabaseFinanceRepository(client) });
}
