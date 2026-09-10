import type {
  CancelExpenseCommand,
  CreateExpenseCommand,
  PayExpenseCommand,
  RequestContext,
  UpdateExpenseCommand,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { SupabaseCashRegisterRepository } from '../../../../src/modules/cash-register/infrastructure';
import { FinanceApplicationService } from '../../../../src/modules/finance/application/finance-service';
import { SupabaseFinanceRepository } from '../../../../src/modules/finance/infrastructure';
import { createExpenseRouteHandlers } from '../../../../src/modules/finance/presentation/expense-route-handlers';
import type { ExpenseListFilters } from '../../../../src/modules/finance/domain';

export function buildExpenseRouteHandlers() {
  return createExpenseRouteHandlers({
    resolveContext,
    service: {
      async listExpenses(context: RequestContext, filters?: ExpenseListFilters) {
        return (await getFinanceApplicationService()).listExpenses(context, filters ?? {});
      },
      async createExpense(context: RequestContext, command: CreateExpenseCommand) {
        return (await getFinanceApplicationService()).createExpense(context, command);
      },
      async updateExpense(context: RequestContext, command: UpdateExpenseCommand) {
        return (await getFinanceApplicationService()).updateExpense(context, command);
      },
      async payExpense(context: RequestContext, command: PayExpenseCommand) {
        return (await getFinanceApplicationService()).payExpense(context, command);
      },
      async cancelExpense(context: RequestContext, command: CancelExpenseCommand) {
        return (await getFinanceApplicationService()).cancelExpense(context, command);
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
  return new FinanceApplicationService({
    repository: new SupabaseFinanceRepository(client),
    cashRegister: new SupabaseCashRegisterRepository(client),
  });
}
