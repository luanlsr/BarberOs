import type {
  CreateCommissionRuleCommand,
  RequestContext,
  UpdateCommissionRuleCommand,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { CommissionApplicationService } from '../../../../src/modules/commissions/application/commission-service';
import type { CommissionRuleFilters } from '../../../../src/modules/commissions/domain';
import { SupabaseCommissionRepository } from '../../../../src/modules/commissions/infrastructure';
import { createCommissionRuleRouteHandlers } from '../../../../src/modules/commissions/presentation/commission-rule-route-handlers';

export function buildCommissionRuleRouteHandlers() {
  return createCommissionRuleRouteHandlers({
    resolveContext,
    service: {
      async listRules(context: RequestContext, filters?: CommissionRuleFilters) {
        return (await getCommissionApplicationService()).listRules(context, filters ?? {});
      },
      async createRule(context: RequestContext, command: CreateCommissionRuleCommand) {
        return (await getCommissionApplicationService()).createRule(context, command);
      },
      async updateRule(context: RequestContext, command: UpdateCommissionRuleCommand) {
        return (await getCommissionApplicationService()).updateRule(context, command);
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

async function getCommissionApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  return new CommissionApplicationService({
    repository: new SupabaseCommissionRepository(client),
  });
}
