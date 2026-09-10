import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type { Expense, ExpenseListResponse, RequestContext } from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/finance-service';
import { createExpenseRouteHandlers, type ExpenseRouteService } from './expense-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'FINANCE',
  permissions: ['finance.read', 'finance.write'],
  entitlements: ['finance'],
  branchScope: ['branch-1'],
};

const expense: Expense = {
  id: 'expense-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  categoryId: 'category-1',
  description: 'Aluguel mensal',
  vendorName: 'Imobiliaria Centro',
  status: 'OPEN',
  amountCents: 12_000,
  competenceDate: '2026-09-01',
  dueDate: '2026-09-10',
  recurrenceKey: 'MONTHLY:1',
  documentMetadata: { contract: 'storage://tenant/contract.pdf' },
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-08T12:00:00.000Z',
  updatedAt: '2026-09-08T12:00:00.000Z',
};

const expenseList: ExpenseListResponse = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  expenses: [expense],
  openAmountCents: 12_000,
  overdueAmountCents: 0,
  paidAmountCents: 0,
  totalAmountCents: 12_000,
};

type MockService = ExpenseRouteService & {
  listExpenses: ReturnType<typeof vi.fn>;
  createExpense: ReturnType<typeof vi.fn>;
  updateExpense: ReturnType<typeof vi.fn>;
  payExpense: ReturnType<typeof vi.fn>;
  cancelExpense: ReturnType<typeof vi.fn>;
};

describe('expense route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createExpenseRouteHandlers>;

  beforeEach(() => {
    service = {
      listExpenses: vi.fn(async () => expenseList),
      createExpense: vi.fn(async () => expense),
      updateExpense: vi.fn(async () => ({ ...expense, description: 'Energia ajustada' })),
      payExpense: vi.fn(async () => ({
        ...expense,
        status: 'PAID' as const,
        cashDate: '2026-09-08',
        paymentMethod: 'PIX' as const,
        financialEntryId: 'financial-entry-1',
        paidBy: 'user-1',
        paidAt: '2026-09-08T12:30:00.000Z',
      })),
      cancelExpense: vi.fn(async () => ({
        ...expense,
        status: 'CANCELLED' as const,
        cancelledBy: 'user-1',
        cancelledAt: '2026-09-08T12:45:00.000Z',
      })),
    };
    handlers = createExpenseRouteHandlers({ resolveContext: vi.fn(async () => context), service });
  });

  it('lists expenses with period, branch, category and status filters', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/expenses?branchId=branch-1&categoryId=category-1&status=OPEN&periodStart=2026-09-01&periodEnd=2026-09-30&limit=25&cursor=cursor-1',
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: expenseList, requestId: 'request-1' });
    expect(service.listExpenses).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      categoryId: 'category-1',
      status: 'OPEN',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      limit: 25,
      cursor: 'cursor-1',
    });
  });

  it('creates a recurring expense and returns 201', async () => {
    const body = {
      branchId: 'branch-1',
      categoryId: 'category-1',
      description: 'Aluguel mensal',
      vendorName: 'Imobiliaria Centro',
      amountCents: 12_000,
      competenceDate: '2026-09-01',
      dueDate: '2026-09-10',
      recurrence: { frequency: 'MONTHLY', interval: 1, endsOn: '2026-12-01' },
      documentMetadata: { contract: 'storage://tenant/contract.pdf' },
    };

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/expenses', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).data.recurrenceKey).toBe('MONTHLY:1');
    expect(service.createExpense).toHaveBeenCalledWith(context, body);
  });

  it('updates, pays and cancels through dynamic route ids', async () => {
    const patchBody = { description: 'Energia ajustada' };
    let response: Response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/expenses/expense-1', {
        method: 'PATCH',
        body: JSON.stringify(patchBody),
      }),
      'expense-1',
    );
    expect(response.status).toBe(200);
    expect(service.updateExpense).toHaveBeenCalledWith(context, { ...patchBody, id: 'expense-1' });

    const payBody = {
      paymentMethod: 'PIX',
      cashDate: '2026-09-08',
      amountCents: 12_000,
      idempotencyKey: 'expense-pay-1',
    };
    response = await handlers.POST_PAY(
      new Request('https://barberos.local/api/v1/expenses/expense-1/pay', {
        method: 'POST',
        body: JSON.stringify(payBody),
      }),
      'expense-1',
    );
    expect(response.status).toBe(200);
    expect(service.payExpense).toHaveBeenCalledWith(context, {
      ...payBody,
      expenseId: 'expense-1',
    });

    const cancelBody = { reason: 'Lancamento duplicado', idempotencyKey: 'expense-cancel-1' };
    response = await handlers.POST_CANCEL(
      new Request('https://barberos.local/api/v1/expenses/expense-1/cancel', {
        method: 'POST',
        body: JSON.stringify(cancelBody),
      }),
      'expense-1',
    );
    expect(response.status).toBe(200);
    expect(service.cancelExpense).toHaveBeenCalledWith(context, {
      ...cancelBody,
      expenseId: 'expense-1',
    });
  });

  it('returns 401 when context is missing', async () => {
    handlers = createExpenseRouteHandlers({ resolveContext: vi.fn(async () => null), service });

    const response = await handlers.GET(new Request('https://barberos.local/api/v1/expenses'));

    expect(response.status).toBe(401);
    expect(service.listExpenses).not.toHaveBeenCalled();
  });

  it('maps validation, unauthorized actors and duplicate idempotency to stable responses', async () => {
    service.createExpense.mockRejectedValueOnce(new ZodError([]));
    let response: Response = await handlers.POST(
      new Request('https://barberos.local/api/v1/expenses', { method: 'POST', body: '{}' }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('CORE_VALIDATION_ERROR');

    service.createExpense.mockRejectedValueOnce(
      new CoreOperationsApplicationError(
        'FINANCE_PERMISSION_DENIED',
        'Tenant tenant-secret cannot create expense.',
      ),
    );
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/expenses', { method: 'POST', body: '{}' }),
    );
    const deniedBody = await response.json();
    expect(response.status).toBe(403);
    expect(deniedBody.error).toMatchObject({
      code: 'FINANCE_PERMISSION_DENIED',
      message: 'Permission denied.',
      requestId: 'request-1',
    });
    expect(JSON.stringify(deniedBody)).not.toContain('tenant-secret');

    service.payExpense.mockRejectedValueOnce(
      new CoreOperationsApplicationError('FINANCE_IDEMPOTENCY_CONFLICT', 'Duplicate key detail.'),
    );
    response = await handlers.POST_PAY(
      new Request('https://barberos.local/api/v1/expenses/expense-1/pay', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: 'PIX',
          cashDate: '2026-09-08',
          idempotencyKey: 'expense-pay-1',
        }),
      }),
      'expense-1',
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatchObject({
      code: 'FINANCE_IDEMPOTENCY_CONFLICT',
      message: 'Finance request conflicts with an existing idempotency key.',
    });
  });
});
