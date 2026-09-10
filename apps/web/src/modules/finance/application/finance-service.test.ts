import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CancelExpenseCommand,
  CreateExpenseCommand,
  Expense,
  ExpenseCategory,
  ExpenseListResponse,
  FinanceSummary,
  FinancialEntry,
  PayExpenseCommand,
  RequestContext,
  UpdateExpenseCommand,
} from '@barberos/contracts';

import type { CashRegisterSummary } from '../../cash-register/domain';
import type {
  ExpenseListFilters,
  FinancialEntryFilters,
  FinanceAuditSink,
  FinanceRepository,
  FinanceSummaryFilters,
} from '../domain';
import { CoreOperationsApplicationError, FinanceApplicationService } from './finance-service';

const baseContext: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['finance.read', 'finance.write', 'commission.read', 'commission.manage'],
  entitlements: ['finance'],
  branchScope: ['branch-1'],
};

const entry: FinancialEntry = {
  id: 'entry-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  direction: 'IN',
  type: 'SERVICE_REVENUE',
  status: 'POSTED',
  amountCents: 8_500,
  signedAmountCents: 8_500,
  competenceDate: '2026-09-07',
  cashDate: '2026-09-07',
  sourceType: 'PAYMENT',
  sourceId: 'payment-1',
  createdBy: 'user-1',
  createdAt: '2026-09-07T15:20:00.000Z',
};

const category: ExpenseCategory = {
  id: 'category-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  name: 'Utilidades',
  status: 'ACTIVE',
  createdBy: 'user-1',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
};

const expense: Expense = {
  id: 'expense-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  categoryId: 'category-1',
  description: 'Energia da unidade',
  vendorName: 'Energia SP',
  status: 'PAID',
  amountCents: 4_200,
  competenceDate: '2026-09-05',
  dueDate: '2026-09-10',
  cashDate: '2026-09-05',
  paymentMethod: 'PIX',
  documentMetadata: {},
  financialEntryId: 'entry-expense-1',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  paidBy: 'user-1',
  paidAt: '2026-09-05T13:00:00.000Z',
  createdAt: '2026-09-05T12:30:00.000Z',
  updatedAt: '2026-09-05T13:00:00.000Z',
};

const openExpense: Expense = {
  ...expense,
  id: 'expense-open-1',
  status: 'OPEN',
  amountCents: 3_100,
  cashDate: undefined,
  paymentMethod: undefined,
  financialEntryId: undefined,
  paidBy: undefined,
  paidAt: undefined,
};

function entryWith(overrides: Partial<FinancialEntry>): FinancialEntry {
  return { ...entry, ...overrides };
}

function expenseWith(overrides: Partial<Expense>): Expense {
  return { ...expense, ...overrides };
}

const cashSession: CashRegisterSummary = {
  id: 'cash-session-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  status: 'OPEN',
  openedBy: 'user-1',
  openedAt: '2026-09-08T09:00:00.000Z',
  openingBalanceAmountCents: 20_000,
  expectedBalanceAmountCents: 16_900,
  differenceAmountCents: 0,
  createdAt: '2026-09-08T09:00:00.000Z',
  updatedAt: '2026-09-08T09:00:00.000Z',
  movements: [],
  cashInAmountCents: 0,
  cashOutAmountCents: 3_100,
};

const summary: FinanceSummary = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  revenueAmountCents: 8_500,
  expenseAmountCents: 4_200,
  resultAmountCents: 4_300,
  commissionLiabilityAmountCents: 4_250,
  paidPayoutAmountCents: 0,
  cashInAmountCents: 8_500,
  cashOutAmountCents: 4_200,
  entriesCount: 2,
};

class FakeFinanceRepository implements FinanceRepository {
  entries: FinancialEntry[] = [entry];
  categories: ExpenseCategory[] = [category];
  expensesById = new Map<string, Expense>([
    [expense.id, expense],
    [openExpense.id, openExpense],
  ]);
  paidExpensesByIdempotencyKey = new Map<string, Expense>();
  cancelledExpensesByIdempotencyKey = new Map<string, Expense>();
  expenseResponse: ExpenseListResponse = {
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    expenses: [expense],
    openAmountCents: 0,
    overdueAmountCents: 0,
    paidAmountCents: 4_200,
    totalAmountCents: 4_200,
  };
  summary: FinanceSummary = summary;
  lastEntryFilters: FinancialEntryFilters | null = null;
  lastExpenseFilters: ExpenseListFilters | null = null;
  lastSummaryFilters: FinanceSummaryFilters | null = null;
  createdCommand: CreateExpenseCommand | null = null;
  updatedCommand: UpdateExpenseCommand | null = null;
  paidCommand: PayExpenseCommand | null = null;
  cancelledCommand: CancelExpenseCommand | null = null;
  cashMovementCreated = false;

  async listEntries(_context: RequestContext, filters: FinancialEntryFilters) {
    this.lastEntryFilters = filters;
    return this.entries;
  }

  async getSummary(_context: RequestContext, filters: FinanceSummaryFilters) {
    this.lastSummaryFilters = filters;
    return this.summary;
  }

  async listExpenseCategories(_context: RequestContext) {
    return this.categories;
  }

  async listExpenses(_context: RequestContext, filters: ExpenseListFilters) {
    this.lastExpenseFilters = filters;
    return this.expenseResponse;
  }

  async findExpenseById(_context: RequestContext, expenseId: string) {
    return this.expensesById.get(expenseId) ?? null;
  }

  async findExpenseByPaymentIdempotencyKey(_context: RequestContext, idempotencyKey: string) {
    return this.paidExpensesByIdempotencyKey.get(idempotencyKey) ?? null;
  }

  async findExpenseCancellationByIdempotencyKey(_context: RequestContext, idempotencyKey: string) {
    return this.cancelledExpensesByIdempotencyKey.get(idempotencyKey) ?? null;
  }

  async createExpense(context: RequestContext, command: CreateExpenseCommand) {
    this.createdCommand = command;
    const created: Expense = {
      id: 'expense-created-1',
      tenantId: context.tenantId,
      branchId: command.branchId,
      categoryId: command.categoryId,
      description: command.description,
      vendorName: command.vendorName,
      status: 'OPEN',
      amountCents: command.amountCents,
      competenceDate: command.competenceDate,
      dueDate: command.dueDate,
      recurrenceKey: command.recurrence
        ? `${command.recurrence.frequency}:${command.recurrence.interval ?? 1}`
        : undefined,
      documentMetadata: command.documentMetadata ?? {},
      createdBy: context.userId,
      updatedBy: context.userId,
      createdAt: '2026-09-08T12:00:00.000Z',
      updatedAt: '2026-09-08T12:00:00.000Z',
    };
    this.expensesById.set(created.id, created);
    return created;
  }

  async updateExpense(context: RequestContext, expenseId: string, command: UpdateExpenseCommand) {
    this.updatedCommand = command;
    const current = this.expensesById.get(expenseId) ?? openExpense;
    const { id: _id, recurrence, ...changes } = command;
    const updated: Expense = {
      ...current,
      ...changes,
      recurrenceKey: recurrence
        ? `${recurrence.frequency}:${recurrence.interval ?? 1}`
        : current.recurrenceKey,
      updatedBy: context.userId,
      updatedAt: '2026-09-08T12:10:00.000Z',
    };
    this.expensesById.set(expenseId, updated);
    return updated;
  }

  async payExpense(context: RequestContext, command: PayExpenseCommand) {
    this.paidCommand = command;
    this.cashMovementCreated =
      command.paymentMethod === 'CASH' && Boolean(command.cashRegisterSessionId);
    const current = this.expensesById.get(command.expenseId) ?? openExpense;
    const paid: Expense = {
      ...current,
      status: 'PAID',
      amountCents: command.amountCents ?? current.amountCents,
      cashDate: command.cashDate,
      paymentMethod: command.paymentMethod,
      financialEntryId: 'entry-expense-paid-1',
      paidBy: context.userId,
      paidAt: '2026-09-08T12:15:00.000Z',
      updatedBy: context.userId,
      updatedAt: '2026-09-08T12:15:00.000Z',
    };
    this.paidExpensesByIdempotencyKey.set(command.idempotencyKey, paid);
    this.expensesById.set(paid.id, paid);
    return paid;
  }

  async cancelExpense(context: RequestContext, command: CancelExpenseCommand) {
    this.cancelledCommand = command;
    const current = this.expensesById.get(command.expenseId) ?? openExpense;
    const cancelled: Expense = {
      ...current,
      status: 'CANCELLED',
      cancelledBy: context.userId,
      cancelledAt: '2026-09-08T12:20:00.000Z',
      updatedBy: context.userId,
      updatedAt: '2026-09-08T12:20:00.000Z',
    };
    if (command.idempotencyKey) {
      this.cancelledExpensesByIdempotencyKey.set(command.idempotencyKey, cancelled);
    }
    this.expensesById.set(cancelled.id, cancelled);
    return cancelled;
  }
}

class FakeExpenseCashRegisterLookup {
  currentSession: CashRegisterSummary | null = cashSession;
  sessions = new Map<string, CashRegisterSummary>([[cashSession.id, cashSession]]);

  async findCurrentSession(
    _context: RequestContext,
    filters: { branchId?: string; status?: string } = {},
  ) {
    if (!this.currentSession) return null;
    if (filters.branchId && this.currentSession.branchId !== filters.branchId) return null;
    if (filters.status && this.currentSession.status !== filters.status) return null;
    return this.currentSession;
  }

  async findSessionById(_context: RequestContext, sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }
}

class FakeFinanceAuditSink implements FinanceAuditSink {
  contexts: RequestContext[] = [];
  events: Array<Parameters<FinanceAuditSink['record']>[1]> = [];

  async record(context: RequestContext, event: Parameters<FinanceAuditSink['record']>[1]) {
    this.contexts.push(context);
    this.events.push(event);
  }
}

function contextWith(overrides: Partial<RequestContext>): RequestContext {
  return { ...baseContext, ...overrides };
}

describe('FinanceApplicationService', () => {
  let repository: FakeFinanceRepository;
  let audit: FakeFinanceAuditSink;
  let cashRegister: FakeExpenseCashRegisterLookup;
  let service: FinanceApplicationService;

  beforeEach(() => {
    repository = new FakeFinanceRepository();
    audit = new FakeFinanceAuditSink();
    cashRegister = new FakeExpenseCashRegisterLookup();
    service = new FinanceApplicationService({ repository, cashRegister, auditSink: audit });
  });

  it('lets an owner read branch-scoped finance summary', async () => {
    const result = await service.getSummary(baseContext, {
      branchId: 'branch-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });

    expect(result.resultAmountCents).toBe(4_300);
    expect(repository.lastSummaryFilters?.branchId).toBe('branch-1');
  });

  it('lets a finance role list entries in its branch scope', async () => {
    const result = await service.listEntries(contextWith({ role: 'FINANCE' }), {
      branchId: 'branch-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });

    expect(result).toEqual([entry]);
    expect(repository.lastEntryFilters?.periodStart).toBe('2026-09-01');
  });

  it('lets a branch manager list expenses without exposing other branches', async () => {
    const result = await service.listExpenses(contextWith({ role: 'MANAGER' }), {
      branchId: 'branch-1',
      status: 'PAID',
    });

    expect(result.expenses).toEqual([expense]);
    expect(repository.lastExpenseFilters?.status).toBe('PAID');
  });

  it('denies actors without finance read permission before hitting the repository', async () => {
    await expect(
      service.getSummary(contextWith({ permissions: ['dashboard.read'] }), {
        branchId: 'branch-1',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      }),
    ).rejects.toMatchObject({ code: 'FINANCE_PERMISSION_DENIED' });
    expect(repository.lastSummaryFilters).toBeNull();
  });

  it('denies branch scope mismatches with a finance-specific stable code', async () => {
    await expect(
      service.listEntries(baseContext, {
        branchId: 'branch-2',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      }),
    ).rejects.toMatchObject({ code: 'FINANCE_BRANCH_SCOPE_DENIED' });
    expect(repository.lastEntryFilters).toBeNull();
  });

  it('sanitizes cross-tenant repository leaks as not found', async () => {
    repository.entries = [entryWith({ tenantId: 'tenant-2' })];

    await expect(
      service.listEntries(baseContext, {
        branchId: 'branch-1',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      }),
    ).rejects.toBeInstanceOf(CoreOperationsApplicationError);
    await expect(
      service.listEntries(baseContext, {
        branchId: 'branch-1',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      }),
    ).rejects.toMatchObject({ code: 'FINANCE_NOT_FOUND' });
  });

  it('creates an open recurring expense in the authorized branch', async () => {
    const created = await service.createExpense(baseContext, {
      branchId: 'branch-1',
      categoryId: 'category-1',
      description: 'Aluguel mensal',
      vendorName: 'Imobiliaria Centro',
      amountCents: 12_000,
      competenceDate: '2026-09-01',
      dueDate: '2026-09-10',
      recurrence: { frequency: 'MONTHLY', interval: 1, endsOn: '2026-12-01' },
      documentMetadata: { contract: 'storage://tenant/contract.pdf' },
    });

    expect(created.status).toBe('OPEN');
    expect(created.recurrenceKey).toBe('MONTHLY:1');
    expect(repository.createdCommand?.amountCents).toBe(12_000);
    expect(audit.contexts.at(-1)).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-1',
      branchScope: ['branch-1'],
    });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'EXPENSE_CREATED',
      entityId: created.id,
      branchId: 'branch-1',
      result: 'SUCCESS',
      amountCents: 12_000,
    });
  });

  it('updates an open expense without creating destructive ledger changes', async () => {
    const updated = await service.updateExpense(baseContext, {
      id: openExpense.id,
      description: 'Energia ajustada',
      amountCents: 3_300,
    });

    expect(updated.description).toBe('Energia ajustada');
    expect(updated.amountCents).toBe(3_300);
    expect(repository.updatedCommand?.id).toBe(openExpense.id);
  });

  it('pays an open expense using the server-side amount and creates a financial entry', async () => {
    const paid = await service.payExpense(baseContext, {
      expenseId: openExpense.id,
      paymentMethod: 'PIX',
      cashDate: '2026-09-08',
      amountCents: openExpense.amountCents,
      idempotencyKey: 'expense-pay-1',
    });

    expect(paid.status).toBe('PAID');
    expect(paid.financialEntryId).toBe('entry-expense-paid-1');
    expect(repository.paidCommand).toMatchObject({
      expenseId: openExpense.id,
      amountCents: openExpense.amountCents,
      idempotencyKey: 'expense-pay-1',
    });
    expect(audit.contexts.at(-1)).toMatchObject({ userId: 'user-1', tenantId: 'tenant-1' });
    expect(audit.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'EXPENSE_PAID',
          branchId: 'branch-1',
          result: 'SUCCESS',
          amountCents: openExpense.amountCents,
          source: { type: 'EXPENSE', id: openExpense.id },
        }),
        expect.objectContaining({
          action: 'FINANCIAL_ENTRY_CREATED',
          entityType: 'FINANCIAL_ENTRY',
          entityId: 'entry-expense-paid-1',
          branchId: 'branch-1',
          result: 'SUCCESS',
          amountCents: openExpense.amountCents,
          source: { type: 'EXPENSE', id: openExpense.id },
        }),
      ]),
    );
  });

  it('passes cash payments with the required cash register session boundary', async () => {
    const paid = await service.payExpense(baseContext, {
      expenseId: openExpense.id,
      paymentMethod: 'CASH',
      cashDate: '2026-09-08',
      cashRegisterSessionId: 'cash-session-1',
      idempotencyKey: 'expense-cash-pay-1',
    });

    expect(paid.paymentMethod).toBe('CASH');
    expect(repository.paidCommand?.cashRegisterSessionId).toBe('cash-session-1');
    expect(repository.cashMovementCreated).toBe(true);
  });

  it('rejects cash expense payment when the branch has no open cash session', async () => {
    cashRegister.sessions.clear();
    cashRegister.currentSession = null;

    await expect(
      service.payExpense(baseContext, {
        expenseId: openExpense.id,
        paymentMethod: 'CASH',
        cashDate: '2026-09-08',
        cashRegisterSessionId: 'cash-session-missing',
        idempotencyKey: 'expense-cash-missing-1',
      }),
    ).rejects.toMatchObject({ code: 'FINANCE_CASH_REGISTER_NOT_OPEN' });
    expect(repository.paidCommand).toBeNull();
  });

  it('rejects cash expense payment when the cash session belongs to another branch', async () => {
    cashRegister.sessions.set('cash-session-branch-2', {
      ...cashSession,
      id: 'cash-session-branch-2',
      branchId: 'branch-2',
    });

    await expect(
      service.payExpense(contextWith({ branchScope: ['branch-1', 'branch-2'] }), {
        expenseId: openExpense.id,
        paymentMethod: 'CASH',
        cashDate: '2026-09-08',
        cashRegisterSessionId: 'cash-session-branch-2',
        idempotencyKey: 'expense-cash-branch-mismatch-1',
      }),
    ).rejects.toMatchObject({ code: 'FINANCE_BRANCH_SCOPE_DENIED' });
    expect(repository.paidCommand).toBeNull();
  });

  it('rejects client-provided payment amounts that do not match the persisted expense', async () => {
    await expect(
      service.payExpense(baseContext, {
        expenseId: openExpense.id,
        paymentMethod: 'PIX',
        cashDate: '2026-09-08',
        amountCents: openExpense.amountCents - 1,
        idempotencyKey: 'expense-pay-mismatch-1',
      }),
    ).rejects.toMatchObject({ code: 'FINANCE_VALIDATION_ERROR' });
    expect(repository.paidCommand).toBeNull();
  });

  it('keeps paid expenses immutable for destructive corrections', async () => {
    await expect(
      service.updateExpense(baseContext, {
        id: expense.id,
        amountCents: expense.amountCents + 100,
      }),
    ).rejects.toMatchObject({ code: 'FINANCE_IMMUTABLE_ENTRY' });
    expect(repository.updatedCommand).toBeNull();
  });

  it('cancels an open expense without touching paid history', async () => {
    const cancelled = await service.cancelExpense(baseContext, {
      expenseId: openExpense.id,
      reason: 'Lancamento duplicado',
      idempotencyKey: 'expense-cancel-1',
    });

    expect(cancelled.status).toBe('CANCELLED');
    expect(repository.cancelledCommand?.reason).toBe('Lancamento duplicado');
    expect(audit.contexts.at(-1)).toMatchObject({ userId: 'user-1', tenantId: 'tenant-1' });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'EXPENSE_CANCELLED',
      branchId: 'branch-1',
      result: 'SUCCESS',
      amountCents: openExpense.amountCents,
    });
  });

  it('audits a non-destructive paid expense correction', async () => {
    const corrected = await service.updateExpense(baseContext, {
      id: expense.id,
      notes: 'Comprovante anexado depois do pagamento.',
      documentMetadata: { receipt: 'storage://tenant/receipt.pdf' },
    });

    expect(corrected.status).toBe('PAID');
    expect(repository.updatedCommand?.notes).toBe('Comprovante anexado depois do pagamento.');
    expect(audit.contexts.at(-1)).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-1',
      branchScope: ['branch-1'],
    });
    expect(audit.events.at(-1)).toMatchObject({
      action: 'EXPENSE_CORRECTED',
      branchId: 'branch-1',
      result: 'SUCCESS',
      amountCents: expense.amountCents,
    });
  });

  it('denies write actors before mutating expense state', async () => {
    await expect(
      service.createExpense(contextWith({ permissions: ['finance.read'] }), {
        branchId: 'branch-1',
        description: 'Despesa bloqueada',
        amountCents: 1_000,
        competenceDate: '2026-09-08',
      }),
    ).rejects.toMatchObject({ code: 'FINANCE_PERMISSION_DENIED' });
    expect(repository.createdCommand).toBeNull();
  });
});
