import type { SupabaseClient } from '@supabase/supabase-js';
import {
  expenseCategorySchema,
  expenseListResponseSchema,
  expenseSchema,
  financeSummarySchema,
  financialEntrySchema,
  type CreateExpenseCommand,
  type Expense,
  type ExpenseCategory,
  type FinancialEntry,
  type RequestContext,
  type UpdateExpenseCommand,
} from '@barberos/contracts';

import {
  calculateFinancialEntryTotals,
  type ExpenseListFilters,
  type FinanceRepository,
  type FinanceSummaryFilters,
  type FinancialEntryFilters,
} from '../domain';

const financialEntrySelect =
  'id, tenant_id, branch_id, direction, type, status, amount_cents, signed_amount_cents, competence_date, cash_date, source_type, source_id, category_id, description, idempotency_key, reversed_entry_id, created_by, created_at';
const expenseCategorySelect =
  'id, tenant_id, branch_id, name, description, status, created_by, created_at, updated_at';
const expenseSelect =
  'id, tenant_id, branch_id, category_id, description, vendor_name, status, amount_cents, competence_date, due_date, cash_date, payment_method, recurrence_key, document_metadata, financial_entry_id, idempotency_key, payment_idempotency_key, created_by, updated_by, paid_by, paid_at, cancelled_by, cancelled_at, created_at, updated_at';

export type FinancialEntryRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  direction: FinancialEntry['direction'];
  type: FinancialEntry['type'];
  status: FinancialEntry['status'];
  amount_cents: number;
  signed_amount_cents: number;
  competence_date: string;
  cash_date?: string | null;
  source_type: FinancialEntry['sourceType'];
  source_id: string;
  category_id?: string | null;
  description?: string | null;
  idempotency_key?: string | null;
  reversed_entry_id?: string | null;
  created_by?: string | null;
  created_at: string;
};

export type ExpenseCategoryRow = {
  id: string;
  tenant_id: string;
  branch_id?: string | null;
  name: string;
  description?: string | null;
  status: ExpenseCategory['status'];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  category_id?: string | null;
  description: string;
  vendor_name?: string | null;
  status: Expense['status'];
  amount_cents: number;
  competence_date: string;
  due_date?: string | null;
  cash_date?: string | null;
  payment_method?: Expense['paymentMethod'] | null;
  recurrence_key?: string | null;
  document_metadata?: Record<string, unknown> | null;
  financial_entry_id?: string | null;
  idempotency_key?: string | null;
  payment_idempotency_key?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  paid_by?: string | null;
  paid_at?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
};

type AmountRow = {
  tenant_id: string;
  branch_id: string;
  commission_amount_cents?: number | null;
  total_amount_cents?: number | null;
};

type BranchScopedQuery<Query> = {
  eq(column: string, value: unknown): Query;
  in(column: string, values: unknown[]): Query;
};
export class SupabaseFinanceRepository implements FinanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listEntries(context: RequestContext, filters: FinancialEntryFilters) {
    let request = this.client
      .from('financial_entries')
      .select(financialEntrySelect)
      .eq('tenant_id', context.tenantId)
      .gte('competence_date', filters.periodStart)
      .lte('competence_date', filters.periodEnd)
      .order('competence_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100);

    request = applyBranchScope(request, context, filters.branchId);
    if (filters.type) request = request.eq('type', filters.type);
    if (filters.sourceType) request = request.eq('source_type', filters.sourceType);
    if (filters.sourceId) request = request.eq('source_id', filters.sourceId);
    if (filters.cursor) request = request.lt('created_at', filters.cursor);

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as FinancialEntryRow[]).map((row) =>
      toVisibleFinancialEntry(context, row),
    );
  }

  async getSummary(context: RequestContext, filters: FinanceSummaryFilters) {
    const entries = await this.listEntries(context, { ...filters, limit: 1_000 });
    const totals = calculateFinancialEntryTotals(entries);
    const [commissionLiabilityAmountCents, paidPayoutAmountCents] = await Promise.all([
      this.sumOpenCommissionLiability(context, filters),
      this.sumPaidPayouts(context, filters),
    ]);

    return financeSummarySchema.parse({
      tenantId: context.tenantId,
      branchId: filters.branchId,
      periodStart: filters.periodStart,
      periodEnd: filters.periodEnd,
      revenueAmountCents: totals.revenueAmountCents,
      expenseAmountCents: totals.expenseAmountCents,
      resultAmountCents: totals.resultAmountCents,
      commissionLiabilityAmountCents,
      paidPayoutAmountCents,
      cashInAmountCents: totals.cashInAmountCents,
      cashOutAmountCents: totals.cashOutAmountCents,
      entriesCount: totals.entriesCount,
    });
  }

  async listExpenseCategories(context: RequestContext, branchId?: string) {
    let request = this.client
      .from('expense_categories')
      .select(expenseCategorySelect)
      .eq('tenant_id', context.tenantId)
      .neq('status', 'ARCHIVED')
      .order('name', { ascending: true });

    if (branchId) {
      request = request.or(`branch_id.is.null,branch_id.eq.${branchId}`);
    } else if (context.branchScope.length > 0) {
      request = request.or(`branch_id.is.null,branch_id.in.(${context.branchScope.join(',')})`);
    }

    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as ExpenseCategoryRow[]).map((row) =>
      toVisibleExpenseCategory(context, row),
    );
  }

  async listExpenses(context: RequestContext, filters: ExpenseListFilters) {
    let request = this.client
      .from('expenses')
      .select(expenseSelect)
      .eq('tenant_id', context.tenantId)
      .order('competence_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100);

    request = applyBranchScope(request, context, filters.branchId);
    if (filters.periodStart) request = request.gte('competence_date', filters.periodStart);
    if (filters.periodEnd) request = request.lte('competence_date', filters.periodEnd);
    if (filters.categoryId) request = request.eq('category_id', filters.categoryId);
    if (filters.status) request = request.eq('status', filters.status);
    if (filters.cursor) request = request.lt('created_at', filters.cursor);

    const { data, error } = await request;
    if (error) throw error;
    const expenses = ((data ?? []) as ExpenseRow[]).map((row) => toVisibleExpense(context, row));

    return expenseListResponseSchema.parse({
      tenantId: context.tenantId,
      branchId: filters.branchId,
      periodStart: filters.periodStart,
      periodEnd: filters.periodEnd,
      expenses,
      openAmountCents: sumExpenses(expenses, ['OPEN', 'DUE', 'OVERDUE']),
      overdueAmountCents: sumExpenses(expenses, ['OVERDUE']),
      paidAmountCents: sumExpenses(expenses, ['PAID']),
      totalAmountCents: expenses.reduce((total, expense) => total + expense.amountCents, 0),
    });
  }

  async findExpenseById(context: RequestContext, expenseId: string) {
    const { data, error } = await this.client
      .from('expenses')
      .select(expenseSelect)
      .eq('tenant_id', context.tenantId)
      .eq('id', expenseId)
      .maybeSingle();

    if (error) throw error;
    return data ? toVisibleExpense(context, data as ExpenseRow) : null;
  }

  async findExpenseByPaymentIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client
      .from('expenses')
      .select(expenseSelect)
      .eq('tenant_id', context.tenantId)
      .eq('payment_idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    return data ? toVisibleExpense(context, data as ExpenseRow) : null;
  }

  async findExpenseCancellationByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    const { data, error } = await this.client
      .from('expenses')
      .select(expenseSelect)
      .eq('tenant_id', context.tenantId)
      .eq('status', 'CANCELLED')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    return data ? toVisibleExpense(context, data as ExpenseRow) : null;
  }

  async createExpense(context: RequestContext, command: CreateExpenseCommand) {
    const { data, error } = await this.client
      .from('expenses')
      .insert({
        tenant_id: context.tenantId,
        branch_id: command.branchId,
        category_id: command.categoryId ?? null,
        description: command.description,
        vendor_name: command.vendorName ?? null,
        status: 'OPEN',
        amount_cents: command.amountCents,
        competence_date: command.competenceDate,
        due_date: command.dueDate ?? null,
        recurrence_key: recurrenceKeyFor(command),
        document_metadata: command.documentMetadata ?? {},
        idempotency_key: null,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select(expenseSelect)
      .single();

    if (error) throw error;
    return toVisibleExpense(context, data as ExpenseRow);
  }

  async updateExpense(context: RequestContext, expenseId: string, command: UpdateExpenseCommand) {
    const payload: Record<string, unknown> = {
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };

    if (command.branchId !== undefined) payload.branch_id = command.branchId;
    if (command.categoryId !== undefined) payload.category_id = command.categoryId;
    if (command.description !== undefined) payload.description = command.description;
    if (command.vendorName !== undefined) payload.vendor_name = command.vendorName;
    if (command.amountCents !== undefined) payload.amount_cents = command.amountCents;
    if (command.competenceDate !== undefined) payload.competence_date = command.competenceDate;
    if (command.dueDate !== undefined) payload.due_date = command.dueDate;
    if (command.recurrence !== undefined) payload.recurrence_key = recurrenceKeyFor(command);
    if (command.documentMetadata !== undefined)
      payload.document_metadata = command.documentMetadata;

    const { data, error } = await this.client
      .from('expenses')
      .update(payload)
      .eq('tenant_id', context.tenantId)
      .eq('id', expenseId)
      .select(expenseSelect)
      .single();

    if (error) throw error;
    return toVisibleExpense(context, data as ExpenseRow);
  }

  async payExpense(
    context: RequestContext,
    command: Parameters<FinanceRepository['payExpense']>[1],
  ) {
    const current = await this.findExpenseById(context, command.expenseId);
    if (!current) throw new Error('Expense was not found.');

    const { error } = await this.client.rpc('pay_expense', {
      p_tenant_id: context.tenantId,
      p_branch_id: current.branchId,
      p_expense_id: command.expenseId,
      p_actor_id: context.userId,
      p_payment_method: command.paymentMethod,
      p_cash_date: command.cashDate,
      p_cash_session_id: command.cashRegisterSessionId ?? null,
      p_idempotency_key: command.idempotencyKey,
    });

    if (error) throw error;
    return (await this.findExpenseById(context, command.expenseId)) as Expense;
  }

  async cancelExpense(
    context: RequestContext,
    command: Parameters<FinanceRepository['cancelExpense']>[1],
  ) {
    const { data, error } = await this.client
      .from('expenses')
      .update({
        status: 'CANCELLED',
        cancelled_by: context.userId,
        cancelled_at: new Date().toISOString(),
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
        idempotency_key: command.idempotencyKey ?? null,
      })
      .eq('tenant_id', context.tenantId)
      .eq('id', command.expenseId)
      .select(expenseSelect)
      .single();

    if (error) throw error;
    return toVisibleExpense(context, data as ExpenseRow);
  }

  private async sumOpenCommissionLiability(
    context: RequestContext,
    filters: FinanceSummaryFilters,
  ): Promise<number> {
    let request = this.client
      .from('commission_accruals')
      .select('tenant_id, branch_id, commission_amount_cents')
      .eq('tenant_id', context.tenantId)
      .eq('status', 'OPEN')
      .gte('accrued_at', filters.periodStart)
      .lte('accrued_at', endOfDay(filters.periodEnd));

    request = applyBranchScope(request, context, filters.branchId);
    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as AmountRow[]).reduce((total, row) => {
      assertVisibleRow(context, row, 'commission accrual');
      return total + (row.commission_amount_cents ?? 0);
    }, 0);
  }

  private async sumPaidPayouts(
    context: RequestContext,
    filters: FinanceSummaryFilters,
  ): Promise<number> {
    let request = this.client
      .from('payouts')
      .select('tenant_id, branch_id, total_amount_cents')
      .eq('tenant_id', context.tenantId)
      .eq('status', 'PAID')
      .gte('paid_at', filters.periodStart)
      .lte('paid_at', endOfDay(filters.periodEnd));

    request = applyBranchScope(request, context, filters.branchId);
    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as AmountRow[]).reduce((total, row) => {
      assertVisibleRow(context, row, 'payout');
      return total + (row.total_amount_cents ?? 0);
    }, 0);
  }
}

export function toFinancialEntry(row: FinancialEntryRow) {
  return financialEntrySchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    direction: row.direction,
    type: row.type,
    status: row.status,
    amountCents: row.amount_cents,
    signedAmountCents: row.signed_amount_cents,
    competenceDate: toDateOnly(row.competence_date),
    cashDate: row.cash_date ? toDateOnly(row.cash_date) : undefined,
    sourceType: row.source_type,
    sourceId: row.source_id,
    categoryId: row.category_id ?? undefined,
    description: row.description ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    reversedEntryId: row.reversed_entry_id ?? undefined,
    createdBy: row.created_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
  });
}

export function toExpenseCategory(row: ExpenseCategoryRow) {
  return expenseCategorySchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    createdBy: row.created_by ?? 'system',
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

export function toExpense(row: ExpenseRow) {
  return expenseSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    categoryId: row.category_id ?? undefined,
    description: row.description,
    vendorName: row.vendor_name ?? undefined,
    status: row.status,
    amountCents: row.amount_cents,
    competenceDate: toDateOnly(row.competence_date),
    dueDate: row.due_date ? toDateOnly(row.due_date) : undefined,
    cashDate: row.cash_date ? toDateOnly(row.cash_date) : undefined,
    paymentMethod: row.payment_method ?? undefined,
    recurrenceKey: row.recurrence_key ?? undefined,
    documentMetadata: row.document_metadata ?? {},
    financialEntryId: row.financial_entry_id ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? 'system',
    paidBy: row.paid_by ?? undefined,
    paidAt: row.paid_at ? toIsoDateTime(row.paid_at) : undefined,
    cancelledBy: row.cancelled_by ?? undefined,
    cancelledAt: row.cancelled_at ? toIsoDateTime(row.cancelled_at) : undefined,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

function toVisibleFinancialEntry(context: RequestContext, row: FinancialEntryRow) {
  assertVisibleRow(context, row, 'financial entry');
  return toFinancialEntry(row);
}

function toVisibleExpenseCategory(context: RequestContext, row: ExpenseCategoryRow) {
  assertVisibleRow(context, row, 'expense category');
  return toExpenseCategory(row);
}

function toVisibleExpense(context: RequestContext, row: ExpenseRow) {
  assertVisibleRow(context, row, 'expense');
  return toExpense(row);
}

function applyBranchScope<Query extends BranchScopedQuery<Query>>(
  request: Query,
  context: RequestContext,
  branchId?: string,
): Query {
  if (branchId) return request.eq('branch_id', branchId) as Query;
  if (context.branchScope.length === 1)
    return request.eq('branch_id', context.branchScope[0]) as Query;
  return request.in('branch_id', [...context.branchScope]) as Query;
}

function assertVisibleRow(
  context: RequestContext,
  row: { tenant_id: string; branch_id?: string | null },
  label: string,
) {
  if (row.tenant_id !== context.tenantId) {
    throw new Error(`${label} row is outside the requested tenant scope.`);
  }
  if (row.branch_id && !context.branchScope.includes(row.branch_id)) {
    throw new Error(`${label} row is outside the authorized branch scope.`);
  }
}

function sumExpenses(expenses: readonly Expense[], statuses: readonly Expense['status'][]) {
  return expenses
    .filter((expense) => statuses.includes(expense.status))
    .reduce((total, expense) => total + expense.amountCents, 0);
}

function recurrenceKeyFor(command: Pick<CreateExpenseCommand, 'recurrence'>) {
  if (!command.recurrence) return null;
  const interval = command.recurrence.interval ?? 1;
  const endsOn = command.recurrence.endsOn ? `:until=${command.recurrence.endsOn}` : '';
  return `${command.recurrence.frequency}:${interval}${endsOn}`;
}

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function endOfDay(value: string) {
  return `${value}T23:59:59.999Z`;
}
