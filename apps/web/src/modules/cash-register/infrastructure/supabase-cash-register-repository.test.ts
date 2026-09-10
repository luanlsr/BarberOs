import { describe, expect, it } from 'vitest';
import type { RequestContext } from '@barberos/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  SupabaseCashRegisterRepository,
  toCashMovement,
  toCashRegisterSession,
} from './supabase-cash-register-repository';

describe('SupabaseCashRegisterRepository mapping', () => {
  it('maps open and closed cash sessions into contract-safe records', () => {
    expect(
      toCashRegisterSession({
        id: 'cash-session-1',
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        status: 'CLOSED',
        opened_by: 'user-1',
        opened_at: '2026-09-07T10:00:00Z',
        opening_balance_amount_cents: 20_000,
        expected_balance_amount_cents: 28_500,
        actual_balance_amount_cents: 28_000,
        difference_amount_cents: -500,
        closed_by: 'user-2',
        closed_at: '2026-09-07T20:00:00Z',
        closing_notes: 'Diferenca conferida.',
        created_at: '2026-09-07T10:00:00Z',
        updated_at: '2026-09-07T20:00:00Z',
      }),
    ).toMatchObject({
      id: 'cash-session-1',
      status: 'CLOSED',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      expectedBalanceAmountCents: 28_500,
      differenceAmountCents: -500,
      closedBy: 'user-2',
    });
  });

  it('maps cash movements and allows a zero opening balance movement', () => {
    expect(
      toCashMovement({
        id: 'cash-movement-1',
        tenant_id: 'tenant-1',
        branch_id: 'branch-1',
        session_id: 'cash-session-1',
        type: 'OPENING_BALANCE',
        amount_cents: 0,
        signed_amount_cents: 0,
        order_id: null,
        payment_id: null,
        reason: 'Abertura sem saldo inicial.',
        created_by: 'user-1',
        created_at: '2026-09-07T10:00:00Z',
      }),
    ).toMatchObject({
      id: 'cash-movement-1',
      type: 'OPENING_BALANCE',
      amountCents: 0,
      signedAmountCents: 0,
      tenantId: 'tenant-1',
      branchId: 'branch-1',
    });
  });
});

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'FINANCE',
  permissions: ['finance.read', 'cash.open', 'cash.withdraw', 'cash.close'],
  entitlements: ['finance'],
  branchScope: ['branch-1'],
};

class FakeCashQuery {
  readonly filters: Array<[string, unknown]> = [];
  private single = false;

  constructor(
    readonly table: string,
    private readonly client: FakeCashSupabaseClient,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
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
    return Promise.resolve(this.client.resolve(this.table, this.single)).then(
      onfulfilled,
      onrejected,
    );
  }
}

class FakeCashSupabaseClient {
  readonly queries: FakeCashQuery[] = [];
  readonly rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  from(table: string) {
    const query = new FakeCashQuery(table, this);
    this.queries.push(query);
    return query;
  }

  async rpc(name: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ name, args });
    return {
      data: name === 'record_cash_register_movement' ? 'cash-movement-1' : 'cash-session-1',
      error: null,
    };
  }

  resolve(table: string, single: boolean) {
    if (table === 'cash_register_sessions' && single) {
      return {
        data: {
          id: 'cash-session-1',
          tenant_id: 'tenant-1',
          branch_id: 'branch-1',
          status: 'OPEN',
          opened_by: 'user-1',
          opened_at: '2026-09-07T10:00:00Z',
          opening_balance_amount_cents: 20_000,
          expected_balance_amount_cents: 20_000,
          actual_balance_amount_cents: null,
          difference_amount_cents: 0,
          closed_by: null,
          closed_at: null,
          closing_notes: null,
          created_at: '2026-09-07T10:00:00Z',
          updated_at: '2026-09-07T10:00:00Z',
        },
        error: null,
      };
    }
    if (table === 'cash_movements' && single) {
      return {
        data: {
          id: 'cash-movement-1',
          tenant_id: 'tenant-1',
          branch_id: 'branch-1',
          session_id: 'cash-session-1',
          type: 'WITHDRAWAL',
          amount_cents: 2_000,
          signed_amount_cents: -2_000,
          order_id: null,
          payment_id: null,
          reason: 'Sangria operacional.',
          created_by: 'user-1',
          created_at: '2026-09-07T11:00:00Z',
        },
        error: null,
      };
    }
    if (table === 'cash_movements') return { data: [], error: null };
    return { data: single ? null : [], error: null };
  }
}

describe('SupabaseCashRegisterRepository queries', () => {
  it('records manual cash movement through RPC and tenant/branch-scoped reread', async () => {
    const client = new FakeCashSupabaseClient();
    const repository = new SupabaseCashRegisterRepository(client as unknown as SupabaseClient);

    const result = await repository.recordMovement(context, {
      branchId: 'branch-1',
      type: 'WITHDRAWAL',
      amountCents: 2_000,
      reason: 'Sangria operacional.',
      idempotencyKey: 'cash-withdraw-1',
    });

    expect(result).toMatchObject({ id: 'cash-movement-1', signedAmountCents: -2_000 });
    expect(client.rpcCalls[0]).toEqual({
      name: 'record_cash_register_movement',
      args: expect.objectContaining({
        p_tenant_id: 'tenant-1',
        p_branch_id: 'branch-1',
        p_actor_id: 'user-1',
        p_type: 'WITHDRAWAL',
      }),
    });
    const movementRead = client.queries.find(
      (query) =>
        query.table === 'cash_movements' && query.filters.some(([column]) => column === 'id'),
    );
    expect(movementRead?.filters).toEqual(
      expect.arrayContaining([
        ['tenant_id', 'tenant-1'],
        ['id', 'cash-movement-1'],
      ]),
    );
  });
});
