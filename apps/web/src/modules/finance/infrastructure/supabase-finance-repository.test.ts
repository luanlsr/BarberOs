import { describe, expect, it } from 'vitest';
import type { RequestContext } from '@barberos/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  SupabaseFinanceRepository,
  toExpense,
  toExpenseCategory,
  toFinancialEntry,
  type ExpenseRow,
  type FinancialEntryRow,
} from './supabase-finance-repository';

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

const entryRow: FinancialEntryRow = {
  id: 'entry-1',
  tenant_id: 'tenant-1',
  branch_id: 'branch-1',
  direction: 'OUT',
  type: 'EXPENSE',
  status: 'POSTED',
  amount_cents: 4_200,
  signed_amount_cents: -4_200,
  competence_date: '2026-09-05',
  cash_date: '2026-09-08',
  source_type: 'EXPENSE',
  source_id: 'expense-1',
  category_id: 'category-1',
  financial_category_id: 'financial-category-1',
  description: 'Energia da unidade',
  idempotency_key: 'expense-pay-key-1',
  reversed_entry_id: null,
  created_by: 'user-1',
  created_at: '2026-09-08T12:15:00Z',
};

const expenseRow: ExpenseRow = {
  id: 'expense-1',
  tenant_id: 'tenant-1',
  branch_id: 'branch-1',
  category_id: 'category-1',
  financial_category_id: 'financial-category-1',
  description: 'Energia da unidade',
  vendor_name: 'Energia SP',
  status: 'OPEN',
  amount_cents: 4_200,
  competence_date: '2026-09-05',
  due_date: '2026-09-10',
  cash_date: null,
  payment_method: null,
  recurrence_key: null,
  document_metadata: { attachment: 'storage://tenant/energy.pdf' },
  financial_entry_id: null,
  idempotency_key: null,
  payment_idempotency_key: null,
  created_by: 'user-1',
  updated_by: 'user-1',
  paid_by: null,
  paid_at: null,
  cancelled_by: null,
  cancelled_at: null,
  created_at: '2026-09-05T12:30:00Z',
  updated_at: '2026-09-05T12:30:00Z',
};

function paidExpenseRow(overrides: Partial<ExpenseRow> = {}): ExpenseRow {
  return {
    ...expenseRow,
    status: 'PAID',
    cash_date: '2026-09-08',
    payment_method: 'PIX',
    financial_entry_id: 'entry-1',
    payment_idempotency_key: 'expense-pay-key-1',
    paid_by: 'user-1',
    paid_at: '2026-09-08T12:15:00Z',
    updated_at: '2026-09-08T12:15:00Z',
    ...overrides,
  };
}

describe('SupabaseFinanceRepository mapping', () => {
  it('maps financial entry rows into contract-safe records', () => {
    expect(toFinancialEntry(entryRow)).toMatchObject({
      id: 'entry-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      direction: 'OUT',
      type: 'EXPENSE',
      amountCents: 4_200,
      signedAmountCents: -4_200,
      competenceDate: '2026-09-05',
      cashDate: '2026-09-08',
      sourceType: 'EXPENSE',
      sourceId: 'expense-1',
      financialCategoryId: 'financial-category-1',
    });
  });

  it('maps expense categories and expense rows into camelCase finance records', () => {
    expect(
      toExpenseCategory({
        id: 'category-1',
        tenant_id: 'tenant-1',
        branch_id: null,
        name: 'Utilidades',
        description: null,
        status: 'ACTIVE',
        created_by: 'user-1',
        created_at: '2026-09-01T12:00:00Z',
        updated_at: '2026-09-01T12:00:00Z',
      }),
    ).toMatchObject({
      id: 'category-1',
      tenantId: 'tenant-1',
      branchId: undefined,
      name: 'Utilidades',
      status: 'ACTIVE',
    });

    expect(toExpense(paidExpenseRow())).toMatchObject({
      id: 'expense-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      status: 'PAID',
      amountCents: 4_200,
      paymentMethod: 'PIX',
      financialEntryId: 'entry-1',
      financialCategoryId: 'financial-category-1',
      paidBy: 'user-1',
    });
  });
});

class FakeFinanceQuery {
  readonly filters: Array<[string, unknown]> = [];
  readonly rangeFilters: Array<[string, unknown]> = [];
  readonly inFilters: Array<[string, unknown[]]> = [];
  readonly orFilters: string[] = [];
  readonly orders: Array<[string, unknown]> = [];
  limitValue: number | null = null;
  insertPayload: Record<string, unknown> | null = null;
  updatePayload: Record<string, unknown> | null = null;
  private singleMode: 'single' | 'maybeSingle' | null = null;

  constructor(
    readonly table: string,
    private readonly client: FakeFinanceSupabaseClient,
  ) {}

  select() {
    return this;
  }

  insert(payload: Record<string, unknown>) {
    this.insertPayload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.updatePayload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push([column, `not:${String(value)}`]);
    return this;
  }

  gte(column: string, value: unknown) {
    this.rangeFilters.push([`${column}:gte`, value]);
    return this;
  }

  lte(column: string, value: unknown) {
    this.rangeFilters.push([`${column}:lte`, value]);
    return this;
  }

  lt(column: string, value: unknown) {
    this.rangeFilters.push([`${column}:lt`, value]);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.inFilters.push([column, values]);
    return this;
  }

  or(filter: string) {
    this.orFilters.push(filter);
    return this;
  }

  order(column: string, options?: unknown) {
    this.orders.push([column, options]);
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.client.resolve(this)).then(onfulfilled, onrejected);
  }
}

class FakeFinanceSupabaseClient {
  readonly queries: FakeFinanceQuery[] = [];
  readonly rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  entries: FinancialEntryRow[] = [entryRow];
  expenses: ExpenseRow[] = [expenseRow];
  expenseSingleReads = 0;

  from(table: string) {
    const query = new FakeFinanceQuery(table, this);
    this.queries.push(query);
    return query;
  }

  async rpc(name: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ name, args });
    return { data: 'entry-1', error: null };
  }

  resolve(query: FakeFinanceQuery) {
    if (query.table === 'financial_entries') return { data: this.entries, error: null };
    if (query.table === 'commission_accruals') {
      return {
        data: [{ tenant_id: 'tenant-1', branch_id: 'branch-1', commission_amount_cents: 1_200 }],
        error: null,
      };
    }
    if (query.table === 'payouts') {
      return {
        data: [{ tenant_id: 'tenant-1', branch_id: 'branch-1', total_amount_cents: 800 }],
        error: null,
      };
    }
    if (query.table === 'expense_categories') {
      return {
        data: [
          {
            id: 'category-1',
            tenant_id: 'tenant-1',
            branch_id: null,
            name: 'Utilidades',
            description: null,
            status: 'ACTIVE',
            created_by: 'user-1',
            created_at: '2026-09-01T12:00:00Z',
            updated_at: '2026-09-01T12:00:00Z',
          },
        ],
        error: null,
      };
    }
    if (query.table === 'expenses') return this.resolveExpenses(query);
    return { data: null, error: null };
  }

  private resolveExpenses(query: FakeFinanceQuery) {
    if (query.insertPayload) {
      return {
        data: {
          ...expenseRow,
          ...query.insertPayload,
          id: 'expense-created-1',
          category_id: query.insertPayload.category_id as string | null,
          vendor_name: query.insertPayload.vendor_name as string | null,
          due_date: query.insertPayload.due_date as string | null,
          recurrence_key: query.insertPayload.recurrence_key as string | null,
          document_metadata: query.insertPayload.document_metadata as Record<string, unknown>,
          created_at: '2026-09-08T12:00:00Z',
          updated_at: '2026-09-08T12:00:00Z',
        },
        error: null,
      };
    }
    if (query.updatePayload) {
      return {
        data: {
          ...expenseRow,
          ...query.updatePayload,
          cancelled_at:
            query.updatePayload.cancelled_at === undefined
              ? expenseRow.cancelled_at
              : '2026-09-08T12:20:00Z',
        },
        error: null,
      };
    }
    const hasIdFilter = query.filters.some(([column]) => column === 'id');
    if (hasIdFilter) {
      this.expenseSingleReads += 1;
      const row = this.expenseSingleReads > 1 ? paidExpenseRow() : this.expenses[0];
      return { data: row, error: null };
    }
    return { data: this.expenses, error: null };
  }
}

describe('SupabaseFinanceRepository queries', () => {
  it('lists entries with tenant, branch and period filters', async () => {
    const client = new FakeFinanceSupabaseClient();
    const repository = new SupabaseFinanceRepository(client as unknown as SupabaseClient);

    const result = await repository.listEntries(context, {
      branchId: 'branch-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      type: 'PRODUCT_REVENUE',
      sourceType: 'PAYMENT',
      sourceId: 'payment-product-1',
      limit: 50,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'entry-1', tenantId: 'tenant-1', branchId: 'branch-1' });
    const entryQuery = client.queries.find((query) => query.table === 'financial_entries');
    expect(entryQuery?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['branch_id', 'branch-1'],
        ['type', 'PRODUCT_REVENUE'],
        ['source_type', 'PAYMENT'],
        ['source_id', 'payment-product-1'],
      ]),
    );
    expect(entryQuery?.rangeFilters).toEqual(
      expect.arrayContaining([
        ['competence_date:gte', '2026-09-01'],
        ['competence_date:lte', '2026-09-30'],
      ]),
    );
  });

  it('summarizes financial entries with commission liability and paid payouts', async () => {
    const client = new FakeFinanceSupabaseClient();
    client.entries = [
      entryRow,
      {
        ...entryRow,
        id: 'entry-service-revenue-1',
        direction: 'IN',
        type: 'SERVICE_REVENUE',
        amount_cents: 8_500,
        signed_amount_cents: 8_500,
        source_type: 'PAYMENT',
        source_id: 'payment-service-1',
      },
      {
        ...entryRow,
        id: 'entry-product-revenue-1',
        direction: 'IN',
        type: 'PRODUCT_REVENUE',
        amount_cents: 3_200,
        signed_amount_cents: 3_200,
        source_type: 'PAYMENT',
        source_id: 'payment-product-1',
      },
    ];
    const repository = new SupabaseFinanceRepository(client as unknown as SupabaseClient);

    await expect(
      repository.getSummary(context, {
        branchId: 'branch-1',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      }),
    ).resolves.toMatchObject({
      revenueAmountCents: 11_700,
      expenseAmountCents: 4_200,
      resultAmountCents: 7_500,
      commissionLiabilityAmountCents: 1_200,
      paidPayoutAmountCents: 800,
      entriesCount: 3,
    });
  });

  it('lists expenses, maps totals and keeps expense reads branch-scoped', async () => {
    const client = new FakeFinanceSupabaseClient();
    client.expenses = [expenseRow, paidExpenseRow({ id: 'expense-paid-1', amount_cents: 2_500 })];
    const repository = new SupabaseFinanceRepository(client as unknown as SupabaseClient);

    const result = await repository.listExpenses(context, {
      branchId: 'branch-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });

    expect(result).toMatchObject({
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      openAmountCents: 4_200,
      paidAmountCents: 2_500,
      totalAmountCents: 6_700,
    });
    const expenseQuery = client.queries.find((query) => query.table === 'expenses');
    expect(expenseQuery?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['branch_id', 'branch-1'],
      ]),
    );
  });

  it('rejects out-of-scope rows defensively even when the client returns them', async () => {
    const client = new FakeFinanceSupabaseClient();
    client.entries = [{ ...entryRow, tenant_id: 'tenant-2' }];
    const repository = new SupabaseFinanceRepository(client as unknown as SupabaseClient);

    await expect(
      repository.listEntries(context, {
        branchId: 'branch-1',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      }),
    ).rejects.toThrow(/tenant scope/);

    client.entries = [{ ...entryRow, tenant_id: 'tenant-1', branch_id: 'branch-2' }];
    await expect(
      repository.listEntries(context, {
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      }),
    ).rejects.toThrow(/branch scope/);
  });

  it('creates expenses with tenant, branch and actor fields', async () => {
    const client = new FakeFinanceSupabaseClient();
    const repository = new SupabaseFinanceRepository(client as unknown as SupabaseClient);

    const created = await repository.createExpense(context, {
      branchId: 'branch-1',
      categoryId: 'category-1',
      financialCategoryId: 'financial-category-1',
      description: 'Aluguel mensal',
      vendorName: 'Imobiliaria Centro',
      amountCents: 12_000,
      competenceDate: '2026-09-01',
      dueDate: '2026-09-10',
      recurrence: { frequency: 'MONTHLY', interval: 1, endsOn: '2026-12-01' },
      documentMetadata: { contract: 'storage://tenant/contract.pdf' },
    });

    expect(created).toMatchObject({
      id: 'expense-created-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      recurrenceKey: 'MONTHLY:1:until=2026-12-01',
    });
    const insertQuery = client.queries.find((query) => query.insertPayload);
    expect(insertQuery?.insertPayload).toEqual(
      expect.objectContaining({
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        financial_category_id: 'financial-category-1',
        created_by: 'user-1',
        updated_by: 'user-1',
      }),
    );
  });

  it('pays expenses through the transactional RPC and tenant-scoped reread', async () => {
    const client = new FakeFinanceSupabaseClient();
    const repository = new SupabaseFinanceRepository(client as unknown as SupabaseClient);

    const paid = await repository.payExpense(context, {
      expenseId: 'expense-1',
      paymentMethod: 'PIX',
      cashDate: '2026-09-08',
      idempotencyKey: 'expense-pay-key-1',
    });

    expect(paid).toMatchObject({ status: 'PAID', financialEntryId: 'entry-1' });
    expect(client.rpcCalls[0]).toEqual({
      name: 'pay_expense',
      args: expect.objectContaining({
        p_tenant_id: 'tenant-1',
        p_branch_id: 'branch-1',
        p_expense_id: 'expense-1',
        p_actor_id: 'user-1',
        p_payment_method: 'PIX',
        p_cash_date: '2026-09-08',
        p_idempotency_key: 'expense-pay-key-1',
      }),
    });
    const expenseReads = client.queries.filter(
      (query) => query.table === 'expenses' && query.filters.some(([column]) => column === 'id'),
    );
    expect(expenseReads.at(-1)?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['id', 'expense-1'],
      ]),
    );
  });
});
