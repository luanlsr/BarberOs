import { beforeEach, describe, expect, it, vi } from 'vitest';

import { processAsaasWebhook } from './checkout';

type Row = Record<string, unknown>;

type QueryCall = {
  table: string;
  action?: 'select' | 'update' | 'upsert';
  payload?: unknown;
  options?: unknown;
  filters: Record<string, unknown>;
  selected?: string;
};

type FakeSupabase = {
  calls: QueryCall[];
  from: (table: string) => FakeQuery;
};

const mocks = vi.hoisted(() => ({
  supabase: undefined as FakeSupabase | undefined,
}));

vi.mock('../supabase-admin', () => ({
  createSupabaseAdminClient: () => mocks.supabase,
}));

describe('Asaas checkout billing webhook', () => {
  beforeEach(() => {
    mocks.supabase = undefined;
  });

  it('projects active plan entitlements with limits when subscription becomes active', async () => {
    const supabase = createFakeSupabase({
      updatedSubscriptions: [{ tenant_id: 'tenant-1', plan_id: 'plan-pro' }],
      planEntitlements: [
        { entitlement_code: 'AI_ASSISTANT', enabled: true, limit_value: 100 },
        { entitlement_code: 'WHATSAPP_CAMPAIGNS', enabled: false, limit_value: null },
      ],
    });
    mocks.supabase = supabase;

    const result = await processAsaasWebhook({
      id: 'event-active',
      event: 'SUBSCRIPTION_UPDATED',
      subscription: { id: 'asaas-subscription-1', status: 'ACTIVE' },
    });

    expect(result).toEqual({ status: 'processed' });
    expect(supabase.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'tenant_subscriptions',
          action: 'update',
          payload: expect.objectContaining({ status: 'ACTIVE' }),
          filters: {
            provider: 'ASAAS',
            external_subscription_id: 'asaas-subscription-1',
          },
          selected: 'tenant_id, plan_id',
        }),
        expect.objectContaining({
          table: 'tenant_entitlements',
          action: 'upsert',
          payload: [
            expect.objectContaining({
              tenant_id: 'tenant-1',
              entitlement_code: 'AI_ASSISTANT',
              enabled: true,
              source: 'PLAN',
              limit_value: 100,
              reason: 'Projected from active SaaS plan.',
            }),
            expect.objectContaining({
              tenant_id: 'tenant-1',
              entitlement_code: 'WHATSAPP_CAMPAIGNS',
              enabled: false,
              source: 'PLAN',
              limit_value: null,
              reason: 'Projected from active SaaS plan.',
            }),
          ],
          options: { onConflict: 'tenant_id,entitlement_code' },
        }),
      ]),
    );
  });

  it('disables projected entitlements when subscription becomes inactive', async () => {
    const supabase = createFakeSupabase({
      updatedSubscriptions: [{ tenant_id: 'tenant-1', plan_id: 'plan-pro' }],
      planEntitlements: [{ entitlement_code: 'AI_ASSISTANT', enabled: true, limit_value: 25 }],
    });
    mocks.supabase = supabase;

    await processAsaasWebhook({
      id: 'event-inactive',
      event: 'SUBSCRIPTION_UPDATED',
      subscription: { id: 'asaas-subscription-1', status: 'INACTIVE' },
    });

    expect(supabase.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'tenant_subscriptions',
          action: 'update',
          payload: expect.objectContaining({ status: 'CANCELLED' }),
        }),
        expect.objectContaining({
          table: 'tenant_entitlements',
          action: 'upsert',
          payload: [
            expect.objectContaining({
              tenant_id: 'tenant-1',
              entitlement_code: 'AI_ASSISTANT',
              enabled: false,
              source: 'PLAN',
              limit_value: 25,
              reason: 'Disabled because the billing subscription is not active.',
            }),
          ],
        }),
      ]),
    );
  });
});

function createFakeSupabase(input: {
  updatedSubscriptions: Row[];
  planEntitlements: Row[];
}): FakeSupabase {
  const calls: QueryCall[] = [];
  return {
    calls,
    from(table: string) {
      return new FakeQuery(table, calls, input);
    },
  };
}

class FakeQuery implements PromiseLike<{ data: Row[] | Row | null; error: null }> {
  private readonly call: QueryCall;

  constructor(
    table: string,
    private readonly calls: QueryCall[],
    private readonly input: { updatedSubscriptions: Row[]; planEntitlements: Row[] },
  ) {
    this.call = { table, filters: {} };
  }

  select(columns: string) {
    this.call.action ??= 'select';
    this.call.selected = columns;
    return this;
  }

  update(payload: unknown) {
    this.call.action = 'update';
    this.call.payload = payload;
    return this;
  }

  upsert(payload: unknown, options?: unknown) {
    this.call.action = 'upsert';
    this.call.payload = payload;
    this.call.options = options;
    this.calls.push(this.call);
    return Promise.resolve({ data: null, error: null });
  }

  eq(column: string, value: unknown) {
    this.call.filters[column] = value;
    return this;
  }

  maybeSingle() {
    this.calls.push(this.call);
    return Promise.resolve({ data: null, error: null });
  }

  then<TResult1 = { data: Row[] | Row | null; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[] | Row | null; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    this.calls.push(this.call);
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected);
  }

  private resolve() {
    if (this.call.table === 'tenant_subscriptions' && this.call.action === 'update') {
      return { data: this.input.updatedSubscriptions, error: null };
    }
    if (this.call.table === 'plan_entitlements' && this.call.action === 'select') {
      return { data: this.input.planEntitlements, error: null };
    }
    return { data: null, error: null };
  }
}
