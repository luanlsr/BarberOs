import type {
  CreateExpenseCommand,
  CancelExpenseCommand,
  Expense,
  ExpenseCategory,
  ExpenseListResponse,
  FinanceSummary,
  FinancialEntry,
  FinancialEntryDirection,
  FinancialEntrySourceType,
  FinancialEntryType,
  PayExpenseCommand,
  RequestContext,
  UpdateExpenseCommand,
} from '@barberos/contracts';

export type FinancePeriod = {
  periodStart: string;
  periodEnd: string;
};

export type FinancialEntryFilters = FinancePeriod & {
  branchId?: string;
  sourceType?: FinancialEntrySourceType;
  sourceId?: string;
  limit?: number;
  cursor?: string;
};

export type ExpenseListFilters = Partial<FinancePeriod> & {
  branchId?: string;
  categoryId?: string;
  status?: Expense['status'];
  limit?: number;
  cursor?: string;
};

export type FinanceSummaryFilters = FinancePeriod & {
  branchId?: string;
};

export interface FinanceRepository {
  listEntries(context: RequestContext, filters: FinancialEntryFilters): Promise<FinancialEntry[]>;
  getSummary(context: RequestContext, filters: FinanceSummaryFilters): Promise<FinanceSummary>;
  listExpenseCategories(context: RequestContext, branchId?: string): Promise<ExpenseCategory[]>;
  listExpenses(context: RequestContext, filters: ExpenseListFilters): Promise<ExpenseListResponse>;
  findExpenseById(context: RequestContext, expenseId: string): Promise<Expense | null>;
  findExpenseByPaymentIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<Expense | null>;
  findExpenseCancellationByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<Expense | null>;
  createExpense(context: RequestContext, command: CreateExpenseCommand): Promise<Expense>;
  updateExpense(
    context: RequestContext,
    expenseId: string,
    command: UpdateExpenseCommand,
  ): Promise<Expense>;
  payExpense(context: RequestContext, command: PayExpenseCommand): Promise<Expense>;
  cancelExpense(context: RequestContext, command: CancelExpenseCommand): Promise<Expense>;
}

export interface FinanceAuditSink {
  record(
    context: RequestContext,
    event: {
      action:
        | 'FINANCIAL_ENTRY_CREATED'
        | 'EXPENSE_CREATED'
        | 'EXPENSE_UPDATED'
        | 'EXPENSE_PAID'
        | 'EXPENSE_CANCELLED'
        | 'EXPENSE_CORRECTED';
      entityType: 'FINANCIAL_ENTRY' | 'EXPENSE';
      entityId: string;
      result: 'SUCCESS' | 'DENIED' | 'FAILURE';
      branchId?: string;
      amountCents?: number;
      source?: { type: FinancialEntrySourceType; id: string };
      beforeState?: unknown;
      afterState?: unknown;
    },
  ): Promise<void>;
}

export type FinancialEntryPeriodMode = 'competence' | 'cash';

export type FinancialEntrySourceKey = Pick<
  FinancialEntry,
  'tenantId' | 'sourceType' | 'sourceId' | 'type' | 'direction'
>;

export type FinanceEntryTotals = {
  revenueAmountCents: number;
  expenseAmountCents: number;
  payoutAmountCents: number;
  resultAmountCents: number;
  cashInAmountCents: number;
  cashOutAmountCents: number;
  entriesCount: number;
};

export type FinancialEntryReversalInput = {
  id: string;
  sourceType: FinancialEntrySourceType;
  sourceId: string;
  createdBy: string;
  createdAt: string;
  competenceDate?: string;
  cashDate?: string;
  type?: FinancialEntryType;
  idempotencyKey?: string;
  description?: string;
};

export function signedAmountForDirection(direction: FinancialEntryDirection, amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Financial entry amount must be a positive integer number of cents.');
  }
  return direction === 'IN' ? amountCents : -amountCents;
}

export function financialEntrySourceKey(source: FinancialEntrySourceKey) {
  return [source.tenantId, source.sourceType, source.sourceId, source.type, source.direction].join(
    ':',
  );
}

export function financialEntryMatchesPeriod(
  entry: FinancialEntry,
  period: FinancePeriod,
  mode: FinancialEntryPeriodMode = 'competence',
) {
  const date = mode === 'cash' ? entry.cashDate : entry.competenceDate;
  if (!date) return false;
  return date >= period.periodStart && date <= period.periodEnd;
}

export function filterFinancialEntriesByPeriod(
  entries: readonly FinancialEntry[],
  period: FinancePeriod,
  mode: FinancialEntryPeriodMode = 'competence',
) {
  return entries.filter((entry) => financialEntryMatchesPeriod(entry, period, mode));
}

export function duplicatePostedFinancialEntrySourceKeys(entries: readonly FinancialEntry[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const entry of entries) {
    if (entry.status !== 'POSTED') continue;
    const key = financialEntrySourceKey(entry);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }

  return Array.from(duplicates);
}

export function calculateFinancialEntryTotals(
  entries: readonly FinancialEntry[],
): FinanceEntryTotals {
  const postedEntries = entries.filter((entry) => entry.status === 'POSTED');
  const revenueAmountCents = postedEntries
    .filter((entry) => entry.direction === 'IN')
    .reduce((total, entry) => total + entry.amountCents, 0);
  const expenseAmountCents = postedEntries
    .filter((entry) => entry.type === 'EXPENSE')
    .reduce((total, entry) => total + entry.amountCents, 0);
  const payoutAmountCents = postedEntries
    .filter((entry) => entry.type === 'PAYOUT')
    .reduce((total, entry) => total + entry.amountCents, 0);
  const cashInAmountCents = postedEntries
    .filter((entry) => entry.direction === 'IN' && entry.cashDate)
    .reduce((total, entry) => total + entry.amountCents, 0);
  const cashOutAmountCents = postedEntries
    .filter((entry) => entry.direction === 'OUT' && entry.cashDate)
    .reduce((total, entry) => total + entry.amountCents, 0);

  return {
    revenueAmountCents,
    expenseAmountCents,
    payoutAmountCents,
    resultAmountCents: revenueAmountCents - expenseAmountCents,
    cashInAmountCents,
    cashOutAmountCents,
    entriesCount: postedEntries.length,
  };
}

export function createFinancialEntryReversal(
  original: FinancialEntry,
  input: FinancialEntryReversalInput,
): FinancialEntry {
  if (original.status !== 'POSTED') {
    throw new Error('Only posted financial entries can be reversed.');
  }

  const direction: FinancialEntryDirection = original.direction === 'IN' ? 'OUT' : 'IN';
  const reversal: FinancialEntry = {
    id: input.id,
    tenantId: original.tenantId,
    branchId: original.branchId,
    direction,
    type: input.type ?? 'ADJUSTMENT',
    status: 'POSTED',
    amountCents: original.amountCents,
    signedAmountCents: signedAmountForDirection(direction, original.amountCents),
    competenceDate: input.competenceDate ?? original.competenceDate,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    reversedEntryId: original.id,
  };

  const cashDate = input.cashDate ?? original.cashDate;
  if (cashDate) reversal.cashDate = cashDate;
  if (input.idempotencyKey) reversal.idempotencyKey = input.idempotencyKey;
  if (input.description) reversal.description = input.description;
  if (original.categoryId) reversal.categoryId = original.categoryId;

  return reversal;
}
