import type {
  ClosePayoutCommand,
  CorrectPayoutCommand,
  PayPayoutCommand,
  RequestContext,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { SupabaseCashRegisterRepository } from '../../../../src/modules/cash-register/infrastructure';
import { CommissionApplicationService } from '../../../../src/modules/commissions/application/commission-service';
import type {
  CommissionAccrualFilters,
  ProfessionalWalletFilters,
} from '../../../../src/modules/commissions/domain';
import { SupabaseCommissionRepository } from '../../../../src/modules/commissions/infrastructure';
import { createCommissionRouteHandlers } from '../../../../src/modules/commissions/presentation/commission-route-handlers';

export function buildCommissionRouteHandlers() {
  return createCommissionRouteHandlers({
    resolveContext,
    service: {
      async listAccruals(context: RequestContext, filters?: CommissionAccrualFilters) {
        return (await getCommissionApplicationService()).listAccruals(context, filters ?? {});
      },
      async getProfessionalWallet(context: RequestContext, filters: ProfessionalWalletFilters) {
        return (await getCommissionApplicationService()).getProfessionalWallet(context, filters);
      },
      async closePayout(context: RequestContext, command: ClosePayoutCommand) {
        return (await getCommissionApplicationService()).closePayout(context, command);
      },
      async payPayout(context: RequestContext, command: PayPayoutCommand) {
        return (await getCommissionApplicationService()).payPayout(context, command);
      },
      async correctPayout(context: RequestContext, command: CorrectPayoutCommand) {
        return (await getCommissionApplicationService()).correctPayout(context, command);
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
    cashRegister: new SupabaseCashRegisterRepository(client),
  });
}
