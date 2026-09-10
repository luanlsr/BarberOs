import { describe, expect, it } from 'vitest';
import type { RequestContext } from '@barberos/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  SupabaseCommissionRepository,
  toCommissionAccrual,
  toCommissionRule,
  toPayout,
  toPayoutAllocation,
  type CommissionAccrualRow,
  type CommissionRuleRow,
  type PayoutAllocationRow,
  type PayoutRow,
} from './supabase-commission-repository';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'FINANCE',
  permissions: ['commission.read', 'commission.manage'],
  entitlements: ['finance'],
  branchScope: ['branch-1'],
};

const ruleRow: CommissionRuleRow = {
  id: 'rule-1',
  tenant_id: 'tenant-1',
  branch_id: 'branch-1',
  scope: 'SERVICE',
  type: 'PERCENTAGE',
  status: 'ACTIVE',
  professional_id: 'professional-1',
  source_type: 'SERVICE',
  source_id: 'service-1',
  percentage_bps: 5000,
  fixed_amount_cents: null,
  effective_from: '2026-09-01',
  effective_until: null,
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
};

const accrualRow: CommissionAccrualRow = {
  id: 'accrual-1',
  tenant_id: 'tenant-1',
  branch_id: 'branch-1',
  professional_id: 'professional-1',
  order_id: 'order-1',
  order_item_id: 'item-1',
  payment_id: 'payment-1',
  rule_id: 'rule-1',
  rule_type_snapshot: 'PERCENTAGE',
  rule_scope_snapshot: 'SERVICE',
  rule_percentage_bps_snapshot: 5000,
  rule_fixed_amount_cents_snapshot: null,
  base_amount_cents: 9_000,
  commission_amount_cents: 4_500,
  status: 'OPEN',
  accrued_at: '2026-09-08T12:30:00Z',
  reversed_accrual_id: null,
  payout_id: null,
  created_at: '2026-09-08T12:30:00Z',
  updated_at: '2026-09-08T12:30:00Z',
};

const allocationRow: PayoutAllocationRow = {
  id: 'allocation-1',
  tenant_id: 'tenant-1',
  branch_id: 'branch-1',
  payout_id: 'payout-1',
  accrual_id: 'accrual-1',
  amount_cents: 4_500,
  created_at: '2026-09-08T14:00:00Z',
};

const payoutRow: PayoutRow = {
  id: 'payout-1',
  tenant_id: 'tenant-1',
  branch_id: 'branch-1',
  professional_id: 'professional-1',
  status: 'CLOSED',
  period_start: '2026-09-01',
  period_end: '2026-09-15',
  total_amount_cents: 4_500,
  payment_method: null,
  financial_entry_id: null,
  cash_movement_id: null,
  idempotency_key: 'payout-close-1',
  payment_idempotency_key: null,
  correction_idempotency_key: null,
  closed_by: 'user-1',
  closed_at: '2026-09-08T14:00:00Z',
  approved_by: null,
  approved_at: null,
  paid_by: null,
  paid_at: null,
  correction_reason: null,
  created_at: '2026-09-08T14:00:00Z',
  updated_at: '2026-09-08T14:00:00Z',
};

function paidPayoutRow(overrides: Partial<PayoutRow> = {}): PayoutRow {
  return {
    ...payoutRow,
    status: 'PAID',
    payment_method: 'PIX',
    financial_entry_id: 'entry-payout-1',
    payment_idempotency_key: 'payout-pay-1',
    paid_by: 'user-1',
    paid_at: '2026-09-08T15:00:00Z',
    updated_at: '2026-09-08T15:00:00Z',
    ...overrides,
  };
}

describe('SupabaseCommissionRepository mapping', () => {
  it('maps commission rule, accrual, payout and allocation rows', () => {
    expect(toCommissionRule(ruleRow)).toMatchObject({
      id: 'rule-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      scope: 'SERVICE',
      type: 'PERCENTAGE',
      percentageBps: 5000,
      professionalId: 'professional-1',
      sourceId: 'service-1',
    });

    expect(toCommissionAccrual(accrualRow)).toMatchObject({
      id: 'accrual-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      professionalId: 'professional-1',
      orderItemId: 'item-1',
      rulePercentageBpsSnapshot: 5000,
      commissionAmountCents: 4_500,
      status: 'OPEN',
    });

    expect(toPayoutAllocation(allocationRow)).toMatchObject({
      id: 'allocation-1',
      payoutId: 'payout-1',
      accrualId: 'accrual-1',
      amountCents: 4_500,
    });

    expect(toPayout(payoutRow, [{ accrualId: 'accrual-1', amountCents: 4_500 }])).toMatchObject({
      id: 'payout-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      professionalId: 'professional-1',
      status: 'CLOSED',
      totalAmountCents: 4_500,
      sources: [{ accrualId: 'accrual-1', amountCents: 4_500 }],
    });
  });
});

class FakeCommissionQuery {
  readonly filters: Array<[string, unknown]> = [];
  readonly rangeFilters: Array<[string, unknown]> = [];
  readonly inFilters: Array<[string, unknown[]]> = [];
  readonly orFilters: string[] = [];
  readonly orders: Array<[string, unknown]> = [];
  limitValue: number | null = null;
  insertPayload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  updatePayload: Record<string, unknown> | null = null;
  private singleMode: 'single' | 'maybeSingle' | null = null;

  constructor(
    readonly table: string,
    private readonly client: FakeCommissionSupabaseClient,
  ) {}

  select() {
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
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
    return Promise.resolve(this.client.resolve(this, this.singleMode)).then(
      onfulfilled,
      onrejected,
    );
  }
}

class FakeCommissionSupabaseClient {
  readonly queries: FakeCommissionQuery[] = [];
  readonly rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  rules: CommissionRuleRow[] = [ruleRow];
  accruals: CommissionAccrualRow[] = [accrualRow];
  payouts: PayoutRow[] = [payoutRow];
  allocations: PayoutAllocationRow[] = [allocationRow];
  payoutDetailReads = 0;

  from(table: string) {
    const query = new FakeCommissionQuery(table, this);
    this.queries.push(query);
    return query;
  }

  async rpc(name: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ name, args });
    return { data: 'payout-1', error: null };
  }

  resolve(query: FakeCommissionQuery, singleMode: 'single' | 'maybeSingle' | null) {
    if (query.table === 'commission_rules') return this.resolveRows(query, this.rules, singleMode);
    if (query.table === 'commission_accruals') {
      if (query.insertPayload) return { data: null, error: null };
      return this.resolveRows(query, this.accruals, singleMode);
    }
    if (query.table === 'payouts') {
      if (query.updatePayload) return { data: null, error: null };
      return this.resolvePayouts(query, singleMode);
    }
    if (query.table === 'payout_allocations') {
      return this.resolveRows(query, this.allocations, singleMode);
    }
    if (query.table === 'financial_entries') return { data: null, error: null };
    return { data: singleMode ? null : [], error: null };
  }

  private resolvePayouts(query: FakeCommissionQuery, singleMode: 'single' | 'maybeSingle' | null) {
    const hasIdFilter = query.filters.some(([column]) => column === 'id');
    if (hasIdFilter) {
      this.payoutDetailReads += 1;
      const row = this.payoutDetailReads > 1 ? paidPayoutRow() : this.payouts[0];
      return { data: row, error: null };
    }
    return this.resolveRows(query, this.payouts, singleMode);
  }

  private resolveRows<T>(
    query: FakeCommissionQuery,
    rows: T[],
    singleMode: 'single' | 'maybeSingle' | null,
  ) {
    if (query.insertPayload && !Array.isArray(query.insertPayload)) {
      return { data: { ...rows[0], ...query.insertPayload }, error: null };
    }
    if (query.updatePayload) return { data: { ...rows[0], ...query.updatePayload }, error: null };
    return { data: singleMode ? (rows[0] ?? null) : rows, error: null };
  }
}

describe('SupabaseCommissionRepository queries', () => {
  it('lists rules with tenant, nullable branch and professional/source filters', async () => {
    const client = new FakeCommissionSupabaseClient();
    const repository = new SupabaseCommissionRepository(client as unknown as SupabaseClient);

    const rules = await repository.listRules(context, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      status: 'ACTIVE',
    });

    expect(rules).toHaveLength(1);
    const query = client.queries.find((item) => item.table === 'commission_rules');
    expect(query?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['professional_id', 'professional-1'],
        ['source_type', 'SERVICE'],
        ['source_id', 'service-1'],
        ['status', 'ACTIVE'],
      ]),
    );
    expect(query?.orFilters).toContain('branch_id.is.null,branch_id.eq.branch-1');
  });

  it('creates and updates rules with tenant and actor metadata', async () => {
    const client = new FakeCommissionSupabaseClient();
    const repository = new SupabaseCommissionRepository(client as unknown as SupabaseClient);

    await repository.createRule(context, {
      branchId: 'branch-1',
      scope: 'SERVICE',
      type: 'PERCENTAGE',
      professionalId: 'professional-1',
      sourceType: 'SERVICE',
      sourceId: 'service-1',
      percentageBps: 5500,
      effectiveFrom: '2026-09-08',
    });
    await repository.updateRule(context, 'rule-1', {
      id: 'rule-1',
      type: 'FIXED_AMOUNT',
      fixedAmountCents: 1_500,
    });

    const insert = client.queries.find(
      (query) => query.table === 'commission_rules' && query.insertPayload,
    );
    expect(insert?.insertPayload).toEqual(
      expect.objectContaining({
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        created_by: 'user-1',
        updated_by: 'user-1',
      }),
    );
    const update = client.queries.find(
      (query) => query.table === 'commission_rules' && query.updatePayload,
    );
    expect(update?.updatePayload).toEqual(
      expect.objectContaining({
        fixed_amount_cents: 1_500,
        percentage_bps: null,
        updated_by: 'user-1',
      }),
    );
    expect(update?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['id', 'rule-1'],
      ]),
    );
  });

  it('lists accruals with tenant, branch, professional and period filters', async () => {
    const client = new FakeCommissionSupabaseClient();
    const repository = new SupabaseCommissionRepository(client as unknown as SupabaseClient);

    const accruals = await repository.listAccruals(context, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      status: 'OPEN',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });

    expect(accruals).toHaveLength(1);
    const query = client.queries.find((item) => item.table === 'commission_accruals');
    expect(query?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['branch_id', 'branch-1'],
        ['professional_id', 'professional-1'],
        ['status', 'OPEN'],
      ]),
    );
    expect(query?.rangeFilters).toEqual(
      expect.arrayContaining([
        ['accrued_at:gte', '2026-09-01'],
        ['accrued_at:lte', '2026-09-30T23:59:59.999Z'],
      ]),
    );
  });

  it('persists generated and reversed accruals then rereads by source scope', async () => {
    const client = new FakeCommissionSupabaseClient();
    const repository = new SupabaseCommissionRepository(client as unknown as SupabaseClient);
    const accrual = toCommissionAccrual(accrualRow);

    await repository.generateAccruals(
      context,
      { orderId: 'order-1', paymentId: 'payment-1', idempotencyKey: 'commission-generate-1' },
      [accrual],
    );
    await repository.reverseAccruals(
      context,
      {
        orderId: 'order-1',
        paymentId: 'payment-1',
        idempotencyKey: 'commission-refund-1',
        reason: 'Refund.',
      },
      [{ ...accrual, id: 'reversal-1', status: 'REVERSED', reversedAccrualId: accrual.id }],
    );

    const insertPayloads = client.queries
      .filter((query) => query.table === 'commission_accruals' && query.insertPayload)
      .map((query) => query.insertPayload);
    expect(insertPayloads[0]).toEqual([
      expect.objectContaining({
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        order_id: 'order-1',
        order_item_id: 'item-1',
        status: 'OPEN',
      }),
    ]);
    expect(insertPayloads[1]).toEqual([
      expect.objectContaining({
        tenant_id: 'tenant-1',
        status: 'REVERSED',
        reversed_accrual_id: 'accrual-1',
      }),
    ]);
  });

  it('closes and pays payouts through transactional RPCs and scoped rereads', async () => {
    const client = new FakeCommissionSupabaseClient();
    const repository = new SupabaseCommissionRepository(client as unknown as SupabaseClient);

    const closed = await repository.closePayout(context, {
      professionalId: 'professional-1',
      branchId: 'branch-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      accrualIds: ['accrual-1'],
      idempotencyKey: 'payout-close-1',
    });
    const paid = await repository.payPayout(context, {
      payoutId: closed.payout.id,
      paymentMethod: 'PIX',
      idempotencyKey: 'payout-pay-1',
    });

    expect(paid.payout).toMatchObject({ status: 'PAID', financialEntryId: 'entry-payout-1' });
    expect(client.rpcCalls).toEqual(
      expect.arrayContaining([
        {
          name: 'close_professional_payout',
          args: expect.objectContaining({
            p_tenant_id: 'tenant-1',
            p_branch_id: 'branch-1',
            p_professional_id: 'professional-1',
            p_idempotency_key: 'payout-close-1',
          }),
        },
        {
          name: 'pay_professional_payout',
          args: expect.objectContaining({
            p_tenant_id: 'tenant-1',
            p_branch_id: 'branch-1',
            p_payout_id: 'payout-1',
            p_payment_method: 'PIX',
            p_idempotency_key: 'payout-pay-1',
          }),
        },
      ]),
    );
  });

  it('builds professional wallet from only the requested professional scope', async () => {
    const client = new FakeCommissionSupabaseClient();
    client.payouts = [paidPayoutRow()];
    const repository = new SupabaseCommissionRepository(client as unknown as SupabaseClient);

    const wallet = await repository.getProfessionalWallet(context, {
      branchId: 'branch-1',
      professionalId: 'professional-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });

    expect(wallet).toMatchObject({
      tenantId: 'tenant-1',
      professionalId: 'professional-1',
      branchIds: ['branch-1'],
      productionAmountCents: 9_000,
      openCommissionAmountCents: 4_500,
      paidPayoutAmountCents: 4_500,
      expectedBalanceAmountCents: 0,
    });
    const accrualQuery = client.queries.find((query) => query.table === 'commission_accruals');
    const payoutQuery = client.queries.find((query) => query.table === 'payouts');
    expect(accrualQuery?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['branch_id', 'branch-1'],
        ['professional_id', 'professional-1'],
      ]),
    );
    expect(payoutQuery?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['branch_id', 'branch-1'],
        ['professional_id', 'professional-1'],
      ]),
    );
  });

  it('rejects out-of-scope tenant and branch rows defensively', async () => {
    const client = new FakeCommissionSupabaseClient();
    client.rules = [{ ...ruleRow, tenant_id: 'tenant-2' }];
    const repository = new SupabaseCommissionRepository(client as unknown as SupabaseClient);

    await expect(repository.listRules(context, { branchId: 'branch-1' })).rejects.toThrow(
      /tenant scope/,
    );

    client.rules = [ruleRow];
    client.accruals = [{ ...accrualRow, branch_id: 'branch-2' }];
    await expect(repository.listAccruals(context, { branchId: 'branch-1' })).rejects.toThrow(
      /branch scope/,
    );
  });
});
