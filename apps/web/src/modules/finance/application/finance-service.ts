import {
  cancelExpenseCommandSchema,
  createExpenseCommandSchema,
  payExpenseCommandSchema,
  updateExpenseCommandSchema,
  type Entitlement,
  type Expense,
  type Permission,
  type RequestContext,
  type UpdateExpenseCommand,
} from '@barberos/contracts';
import { AuthorizationError, authorize } from '@barberos/permissions';

import { CoreOperationsApplicationError } from '../../shared/application/errors';
import type { CashRegisterRepository } from '../../cash-register/domain';
import type {
  ExpenseListFilters,
  FinanceAuditSink,
  FinancialEntryFilters,
  FinanceRepository,
  FinanceSummaryFilters,
} from '../domain';

const financeEntitlement = 'finance' satisfies Entitlement;
const payableExpenseStatuses = ['OPEN', 'DUE', 'OVERDUE'] as const;
const paidExpenseMutableFields = ['documentMetadata', 'notes'] as const;

type ExpenseCashRegisterLookup = Pick<
  CashRegisterRepository,
  'findCurrentSession' | 'findSessionById'
>;

export { CoreOperationsApplicationError } from '../../shared/application/errors';

export type FinanceApplicationServiceDependencies = {
  repository: FinanceRepository;
  cashRegister?: ExpenseCashRegisterLookup;
  auditSink?: FinanceAuditSink;
};

export class FinanceApplicationService {
  private readonly repository: FinanceRepository;
  private readonly cashRegister?: ExpenseCashRegisterLookup;
  private readonly audit?: FinanceAuditSink;

  constructor(dependencies: FinanceApplicationServiceDependencies) {
    this.repository = dependencies.repository;
    this.cashRegister = dependencies.cashRegister;
    this.audit = dependencies.auditSink;
  }

  async listEntries(context: RequestContext, filters: FinancialEntryFilters) {
    authorizeFinanceAccess(context, 'finance.read', filters.branchId);
    const entries = await this.repository.listEntries(context, filters);
    for (const entry of entries) assertFinancialRecordIsVisible(context, entry, 'entry');
    return entries;
  }

  async getSummary(context: RequestContext, filters: FinanceSummaryFilters) {
    authorizeFinanceAccess(context, 'finance.read', filters.branchId);
    const summary = await this.repository.getSummary(context, filters);
    assertFinancialRecordIsVisible(context, summary, 'summary');
    return summary;
  }

  async listExpenseCategories(context: RequestContext, branchId?: string) {
    authorizeFinanceAccess(context, 'finance.read', branchId);
    const categories = await this.repository.listExpenseCategories(context, branchId);
    for (const category of categories) {
      assertFinancialRecordIsVisible(context, category, 'expense category');
    }
    return categories;
  }

  async listExpenses(context: RequestContext, filters: ExpenseListFilters) {
    authorizeFinanceAccess(context, 'finance.read', filters.branchId);
    const response = await this.repository.listExpenses(context, filters);
    if (response.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('FINANCE_NOT_FOUND', 'Expense list was not found.');
    }
    if (response.branchId && !context.branchScope.includes(response.branchId)) {
      throw new CoreOperationsApplicationError(
        'FINANCE_BRANCH_SCOPE_DENIED',
        'Expense list is outside the authorized branch scope.',
      );
    }
    for (const expense of response.expenses)
      assertFinancialRecordIsVisible(context, expense, 'expense');
    return response;
  }

  async createExpense(context: RequestContext, command: unknown) {
    const parsed = createExpenseCommandSchema.parse(command);
    authorizeFinanceAccess(context, 'finance.write', parsed.branchId);

    const created = await this.repository.createExpense(context, parsed);
    assertFinancialRecordIsVisible(context, created, 'expense');
    if (created.status !== 'OPEN' && created.status !== 'DUE' && created.status !== 'OVERDUE') {
      throw new CoreOperationsApplicationError(
        'FINANCE_VALIDATION_ERROR',
        'Created expense returned an invalid status.',
      );
    }

    await this.audit?.record(context, {
      action: 'EXPENSE_CREATED',
      entityType: 'EXPENSE',
      entityId: created.id,
      result: 'SUCCESS',
      branchId: created.branchId,
      amountCents: created.amountCents,
      afterState: created,
    });

    return created;
  }

  async updateExpense(context: RequestContext, command: unknown) {
    const parsed = updateExpenseCommandSchema.parse(command);
    const current = await this.getVisibleExpense(context, parsed.id);
    authorizeFinanceAccess(context, 'finance.write', current.branchId);
    if (parsed.branchId) authorizeFinanceAccess(context, 'finance.write', parsed.branchId);
    assertExpenseCanBeUpdated(current, parsed);

    const updated = await this.repository.updateExpense(context, parsed.id, parsed);
    assertFinancialRecordIsVisible(context, updated, 'expense');
    if (updated.id !== current.id) {
      throw new CoreOperationsApplicationError(
        'FINANCE_VALIDATION_ERROR',
        'Expense update returned an unexpected expense.',
      );
    }

    await this.audit?.record(context, {
      action: updated.status === 'PAID' ? 'EXPENSE_CORRECTED' : 'EXPENSE_UPDATED',
      entityType: 'EXPENSE',
      entityId: updated.id,
      result: 'SUCCESS',
      branchId: updated.branchId,
      amountCents: updated.amountCents,
      beforeState: current,
      afterState: updated,
    });

    return updated;
  }

  async payExpense(context: RequestContext, command: unknown) {
    const parsed = payExpenseCommandSchema.parse(command);
    const idempotentExpense = await this.repository.findExpenseByPaymentIdempotencyKey(
      context,
      parsed.idempotencyKey,
    );
    if (idempotentExpense) {
      assertFinancialRecordIsVisible(context, idempotentExpense, 'expense');
      return idempotentExpense;
    }

    const current = await this.getVisibleExpense(context, parsed.expenseId);
    authorizeFinanceAccess(context, 'finance.write', current.branchId);
    assertExpenseCanBePaid(current);
    if (parsed.amountCents !== undefined && parsed.amountCents !== current.amountCents) {
      throw new CoreOperationsApplicationError(
        'FINANCE_VALIDATION_ERROR',
        'Expense payment amount must match the server-side expense amount.',
      );
    }
    const cashRegisterSessionId =
      parsed.paymentMethod === 'CASH'
        ? await this.resolveCashExpenseSession(context, current, parsed.cashRegisterSessionId)
        : parsed.cashRegisterSessionId;

    const paid = await this.repository.payExpense(context, {
      ...parsed,
      amountCents: current.amountCents,
      cashRegisterSessionId,
    });
    assertFinancialRecordIsVisible(context, paid, 'expense');
    if (paid.id !== current.id || paid.status !== 'PAID' || !paid.financialEntryId) {
      throw new CoreOperationsApplicationError(
        'FINANCE_VALIDATION_ERROR',
        'Expense payment did not create a valid financial entry.',
      );
    }

    await this.audit?.record(context, {
      action: 'EXPENSE_PAID',
      entityType: 'EXPENSE',
      entityId: paid.id,
      result: 'SUCCESS',
      branchId: paid.branchId,
      amountCents: paid.amountCents,
      source: { type: 'EXPENSE', id: paid.id },
      beforeState: current,
      afterState: paid,
    });
    await this.audit?.record(context, {
      action: 'FINANCIAL_ENTRY_CREATED',
      entityType: 'FINANCIAL_ENTRY',
      entityId: paid.financialEntryId,
      result: 'SUCCESS',
      branchId: paid.branchId,
      amountCents: paid.amountCents,
      source: { type: 'EXPENSE', id: paid.id },
      afterState: { expenseId: paid.id, financialEntryId: paid.financialEntryId },
    });

    return paid;
  }

  async cancelExpense(context: RequestContext, command: unknown) {
    const parsed = cancelExpenseCommandSchema.parse(command);
    if (parsed.idempotencyKey) {
      const idempotentExpense = await this.repository.findExpenseCancellationByIdempotencyKey(
        context,
        parsed.idempotencyKey,
      );
      if (idempotentExpense) {
        assertFinancialRecordIsVisible(context, idempotentExpense, 'expense');
        return idempotentExpense;
      }
    }

    const current = await this.getVisibleExpense(context, parsed.expenseId);
    authorizeFinanceAccess(context, 'finance.write', current.branchId);
    assertExpenseCanBeCancelled(current);

    const cancelled = await this.repository.cancelExpense(context, parsed);
    assertFinancialRecordIsVisible(context, cancelled, 'expense');
    if (cancelled.id !== current.id || cancelled.status !== 'CANCELLED') {
      throw new CoreOperationsApplicationError(
        'FINANCE_VALIDATION_ERROR',
        'Expense cancellation returned an invalid status.',
      );
    }

    await this.audit?.record(context, {
      action: 'EXPENSE_CANCELLED',
      entityType: 'EXPENSE',
      entityId: cancelled.id,
      result: 'SUCCESS',
      branchId: cancelled.branchId,
      amountCents: cancelled.amountCents,
      beforeState: current,
      afterState: cancelled,
    });

    return cancelled;
  }

  private async resolveCashExpenseSession(
    context: RequestContext,
    expense: Expense,
    sessionId?: string,
  ) {
    if (!this.cashRegister) return sessionId;

    const session = sessionId
      ? await this.cashRegister.findSessionById(context, sessionId)
      : await this.cashRegister.findCurrentSession(context, {
          branchId: expense.branchId,
          status: 'OPEN',
        });
    if (!session || session.tenantId !== context.tenantId || session.status !== 'OPEN') {
      throw new CoreOperationsApplicationError(
        'FINANCE_CASH_REGISTER_NOT_OPEN',
        'Cash expense requires an open cash register session.',
      );
    }
    if (!context.branchScope.includes(session.branchId) || session.branchId !== expense.branchId) {
      throw new CoreOperationsApplicationError(
        'FINANCE_BRANCH_SCOPE_DENIED',
        'Cash register session is outside the expense branch scope.',
      );
    }

    return session.id;
  }

  private async getVisibleExpense(context: RequestContext, expenseId: string) {
    const expense = await this.repository.findExpenseById(context, expenseId);
    if (!expense || expense.tenantId !== context.tenantId) {
      throw new CoreOperationsApplicationError('FINANCE_NOT_FOUND', 'Expense was not found.');
    }
    assertFinancialRecordIsVisible(context, expense, 'expense');
    return expense;
  }
}

function authorizeFinanceAccess(
  context: RequestContext,
  permission: Permission,
  branchId?: string,
) {
  try {
    authorize(context, { permission, entitlement: financeEntitlement, branchId });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      switch (error.code) {
        case 'PERMISSION_DENIED':
          throw new CoreOperationsApplicationError('FINANCE_PERMISSION_DENIED', error.message);
        case 'ENTITLEMENT_DENIED':
          throw new CoreOperationsApplicationError('FINANCE_ENTITLEMENT_DENIED', error.message);
        case 'BRANCH_SCOPE_DENIED':
          throw new CoreOperationsApplicationError('FINANCE_BRANCH_SCOPE_DENIED', error.message);
        case 'UNAUTHENTICATED':
          throw error;
      }
    }
    throw error;
  }
}

function assertFinancialRecordIsVisible(
  context: RequestContext,
  record: { tenantId: string; branchId?: string },
  label: string,
) {
  if (record.tenantId !== context.tenantId) {
    throw new CoreOperationsApplicationError('FINANCE_NOT_FOUND', label + ' was not found.');
  }
  if (record.branchId && !context.branchScope.includes(record.branchId)) {
    throw new CoreOperationsApplicationError(
      'FINANCE_BRANCH_SCOPE_DENIED',
      label + ' is outside the authorized branch scope.',
    );
  }
}

function assertExpenseCanBeUpdated(expense: Expense, command: UpdateExpenseCommand) {
  if (expense.status === 'CANCELLED') {
    throw new CoreOperationsApplicationError(
      'FINANCE_IMMUTABLE_ENTRY',
      'Cancelled expenses cannot be changed destructively.',
    );
  }
  if (expense.status !== 'PAID') return;

  const commandFields = Object.keys(command).filter((field) => field !== 'id');
  const hasDestructiveChange = commandFields.some(
    (field) =>
      !paidExpenseMutableFields.includes(field as (typeof paidExpenseMutableFields)[number]),
  );
  if (hasDestructiveChange) {
    throw new CoreOperationsApplicationError(
      'FINANCE_IMMUTABLE_ENTRY',
      'Paid expenses require an auditable correction instead of destructive edits.',
    );
  }
}

function assertExpenseCanBePaid(expense: Expense) {
  if (!payableExpenseStatuses.includes(expense.status as (typeof payableExpenseStatuses)[number])) {
    throw new CoreOperationsApplicationError(
      'FINANCE_IMMUTABLE_ENTRY',
      'Expense cannot be paid from its current status.',
    );
  }
}

function assertExpenseCanBeCancelled(expense: Expense) {
  if (expense.status === 'PAID' || expense.status === 'CANCELLED') {
    throw new CoreOperationsApplicationError(
      'FINANCE_IMMUTABLE_ENTRY',
      'Paid or cancelled expenses cannot be cancelled destructively.',
    );
  }
}
