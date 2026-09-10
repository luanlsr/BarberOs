import { describe, expect, it } from 'vitest';
import type { RequestContext } from '@barberos/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabasePaymentRepository, toPayment } from './supabase-payment-repository';

describe('SupabasePaymentRepository mapping', () => {
  it('maps payment rows into contract-safe camelCase records', () => {
    expect(
      toPayment({
        id: 'payment-1',
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        order_id: 'order-1',
        method: 'CASH',
        status: 'PARTIALLY_REFUNDED',
        amount_cents: 8_500,
        cash_received_amount_cents: 10_000,
        change_due_amount_cents: 1_500,
        external_reference: null,
        idempotency_key: 'payment-key-1:1',
        received_by: 'user-1',
        received_at: '2026-09-07T15:20:00Z',
        refunded_amount_cents: 3_000,
        created_at: '2026-09-07T15:20:00Z',
        updated_at: '2026-09-07T15:30:00Z',
      }),
    ).toMatchObject({
      id: 'payment-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      orderId: 'order-1',
      method: 'CASH',
      status: 'PARTIALLY_REFUNDED',
      amountCents: 8_500,
      cashReceivedAmountCents: 10_000,
      changeDueAmountCents: 1_500,
      refundedAmountCents: 3_000,
    });
  });
});

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'RECEPTIONIST',
  permissions: ['payments.receive'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

class FakeQuery {
  readonly filters: Array<[string, unknown]> = [];
  readonly likeFilters: Array<[string, unknown]> = [];
  private single = false;

  constructor(
    readonly table: string,
    private readonly client: FakeSupabaseClient,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  like(column: string, value: unknown) {
    this.likeFilters.push([column, value]);
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  maybeSingle() {
    this.single = true;
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const result = this.client.resolve(this.table, this.single);
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

const defaultPaymentRow = {
  id: 'payment-1',
  tenant_id: 'tenant-1',
  branch_id: 'branch-1',
  order_id: 'order-1',
  method: 'PIX',
  status: 'PAID',
  amount_cents: 8_500,
  cash_received_amount_cents: null,
  change_due_amount_cents: 0,
  external_reference: 'pix-1',
  idempotency_key: 'receive-key-1:1',
  received_by: 'user-1',
  received_at: '2026-09-07T15:20:00Z',
  refunded_amount_cents: 0,
  created_at: '2026-09-07T15:20:00Z',
  updated_at: '2026-09-07T15:20:00Z',
} as const;
class FakeSupabaseClient {
  readonly queries: FakeQuery[] = [];
  readonly rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  rpcError: unknown | null = null;
  paymentRow = defaultPaymentRow;
  refundRow: { payment_id: string } | null = null;

  from(table: string) {
    const query = new FakeQuery(table, this);
    this.queries.push(query);
    return query;
  }

  async rpc(name: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ name, args });
    if (this.rpcError) return { data: null, error: this.rpcError };
    return { data: 'order-1', error: null };
  }

  resolve(table: string, single: boolean) {
    if (table === 'orders' && single) {
      return {
        data: {
          id: 'order-1',
          tenant_id: 'tenant-1',
          branch_id: 'branch-1',
          total_amount_cents: 8_500,
        },
        error: null,
      };
    }
    if (table === 'payments') {
      return { data: single ? this.paymentRow : [this.paymentRow], error: null };
    }
    if (table === 'payment_refunds') {
      return {
        data: single ? this.refundRow : this.refundRow ? [this.refundRow] : [],
        error: null,
      };
    }
    return { data: single ? null : [], error: null };
  }
}

describe('SupabasePaymentRepository queries', () => {
  it('receives payment through the transactional money-effects RPC and tenant-scoped reread', async () => {
    const client = new FakeSupabaseClient();
    const repository = new SupabasePaymentRepository(client as unknown as SupabaseClient);

    const result = await repository.receivePayment(context, {
      orderId: 'order-1',
      idempotencyKey: 'receive-key-1',
      payments: [{ method: 'PIX', amountCents: 8_500, externalReference: 'pix-1' }],
    });

    expect(result).toMatchObject({ status: 'PAID', amountDueCents: 0, paymentIds: ['payment-1'] });
    expect(client.rpcCalls[0]).toEqual({
      name: 'receive_order_payment_with_money_effects',
      args: expect.objectContaining({
        p_tenant_id: 'tenant-1',
        p_branch_id: 'branch-1',
        p_order_id: 'order-1',
        p_actor_id: 'user-1',
        p_idempotency_key: 'receive-key-1',
      }),
    });
    const paymentQuery = client.queries.find((query) => query.table === 'payments');
    expect(paymentQuery?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['order_id', 'order-1'],
      ]),
    );
  });

  it('refunds payment through the transactional money-effects RPC and scoped reread', async () => {
    const client = new FakeSupabaseClient();
    const repository = new SupabasePaymentRepository(client as unknown as SupabaseClient);

    const result = await repository.refundPayment(context, {
      paymentId: 'payment-1',
      amountCents: 2_000,
      reason: 'Cliente solicitou estorno.',
      idempotencyKey: 'refund-key-1',
    });

    expect(result.id).toBe('payment-1');
    expect(client.rpcCalls[0]).toEqual({
      name: 'refund_payment_with_money_effects',
      args: expect.objectContaining({
        p_tenant_id: 'tenant-1',
        p_branch_id: 'branch-1',
        p_payment_id: 'payment-1',
        p_actor_id: 'user-1',
        p_idempotency_key: 'refund-key-1',
      }),
    });
  });

  it('surfaces transactional side-effect rollback before rereading created payments', async () => {
    const client = new FakeSupabaseClient();
    client.rpcError = { message: 'finance side effect failed' };
    const repository = new SupabasePaymentRepository(client as unknown as SupabaseClient);

    await expect(
      repository.receivePayment(context, {
        orderId: 'order-1',
        idempotencyKey: 'receive-key-1',
        payments: [{ method: 'PIX', amountCents: 8_500, externalReference: 'pix-1' }],
      }),
    ).rejects.toMatchObject({ message: 'finance side effect failed' });

    expect(client.rpcCalls[0]?.name).toBe('receive_order_payment_with_money_effects');
    expect(client.queries.filter((query) => query.table === 'payments')).toHaveLength(0);
  });

  it('reuses existing idempotent receive results without invoking duplicate side effects', async () => {
    const client = new FakeSupabaseClient();
    const repository = new SupabasePaymentRepository(client as unknown as SupabaseClient);

    const result = await repository.findReceiveResultByIdempotencyKey(context, 'receive-key-1');

    expect(result).toMatchObject({ orderId: 'order-1', paymentIds: ['payment-1'] });
    expect(client.rpcCalls).toHaveLength(0);
    const paymentLookup = client.queries.find((query) => query.table === 'payments');
    expect(paymentLookup?.likeFilters).toEqual([['idempotency_key', 'receive-key-1:%']]);
  });

  it('reuses existing idempotent refunds without invoking duplicate side effects', async () => {
    const client = new FakeSupabaseClient();
    client.refundRow = { payment_id: 'payment-1' };
    const repository = new SupabasePaymentRepository(client as unknown as SupabaseClient);

    const result = await repository.findRefundResultByIdempotencyKey(context, 'refund-key-1');

    expect(result?.id).toBe('payment-1');
    expect(client.rpcCalls).toHaveLength(0);
    const refundLookup = client.queries.find((query) => query.table === 'payment_refunds');
    expect(refundLookup?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['idempotency_key', 'refund-key-1'],
      ]),
    );
  });
});
