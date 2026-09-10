import type {
  CashRegisterMovementCommand,
  CloseCashRegisterCommand,
  OpenCashRegisterCommand,
  RequestContext,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { CashRegisterApplicationService } from '../../../../src/modules/cash-register/application/cash-register-service';
import {
  SupabaseCashRegisterAuditSink,
  SupabaseCashRegisterRepository,
} from '../../../../src/modules/cash-register/infrastructure';
import {
  createCashMovementRouteHandlers,
  createCashRegisterRouteHandlers,
} from '../../../../src/modules/cash-register/presentation/cash-register-route-handlers';
import type {
  CashMovementListFilters,
  CashRegisterSessionFilters,
} from '../../../../src/modules/cash-register/domain';

export function buildCashRegisterRouteHandlers() {
  return createCashRegisterRouteHandlers({
    resolveContext,
    service: {
      async getCurrentSession(context: RequestContext, filters?: CashRegisterSessionFilters) {
        return (await getCashRegisterApplicationService()).getCurrentSession(context, filters);
      },
      async openSession(context: RequestContext, command: OpenCashRegisterCommand) {
        return (await getCashRegisterApplicationService()).openSession(context, command);
      },
      async closeSession(context: RequestContext, command: CloseCashRegisterCommand) {
        return (await getCashRegisterApplicationService()).closeSession(context, command);
      },
    },
  });
}

export function buildCashMovementRouteHandlers() {
  return createCashMovementRouteHandlers({
    resolveContext,
    service: {
      async listMovements(context: RequestContext, filters?: CashMovementListFilters) {
        return (await getCashRegisterApplicationService()).listMovements(context, filters);
      },
      async recordMovement(context: RequestContext, command: CashRegisterMovementCommand) {
        return (await getCashRegisterApplicationService()).recordMovement(context, command);
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

async function getCashRegisterApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  const repository = new SupabaseCashRegisterRepository(client);
  return new CashRegisterApplicationService(repository, new SupabaseCashRegisterAuditSink(client));
}
