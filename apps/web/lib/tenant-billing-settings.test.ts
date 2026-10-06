import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import {
  buildTenantBillingViewModel,
  getTenantBillingSettingsViewModel,
} from './tenant-billing-settings';

const authMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('./auth/server', () => authMocks);

const session: SessionContext = {
  authState: 'authenticated',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['settings.read'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
  activeBranchId: 'branch-1',
  userName: 'Usuário Teste',
  tenantName: 'Barbearia Teste',
  branchName: 'Unidade Teste',
};

describe('tenant billing settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.createSupabaseServerClient.mockResolvedValue(null);
  });

  test('builds an honest empty state when no subscription or invoice exists', () => {
    const model = buildTenantBillingViewModel(null, []);

    expect(model.summaryItems).toEqual([
      ['Plano atual', 'Sem plano ativo'],
      ['Status da assinatura', 'Não configurado'],
      ['Próxima cobrança', 'Sem cobrança em aberto'],
      ['Comprovantes', 'Nenhum comprovante disponível'],
    ]);
    expect(model.operationalCards[0]?.body).toContain('Nenhum plano SaaS');
    expect(model.operationalCards[1]?.body).toContain('Ainda não há faturas pagas');
  });

  test('loads tenant-scoped subscription and invoices from persistence', async () => {
    const calls: Array<{ table: string; column: string; value: string }> = [];
    authMocks.createSupabaseServerClient.mockResolvedValue({
      from(table: string) {
        return createQuery(table, calls);
      },
    });

    const model = await getTenantBillingSettingsViewModel(session);

    expect(calls).toContainEqual({
      table: 'tenant_subscriptions',
      column: 'tenant_id',
      value: 'tenant-1',
    });
    expect(calls).toContainEqual({
      table: 'billing_invoices',
      column: 'tenant_id',
      value: 'tenant-1',
    });
    expect(model.summaryItems).toContainEqual(['Plano atual', 'Plano Real']);
    expect(model.summaryItems).toContainEqual(['Próxima cobrança', '10/10/2026']);
    expect(model.operationalCards[1]?.body).toContain('R$');
  });
});

function createQuery(
  table: string,
  calls: Array<{ table: string; column: string; value: string }>,
) {
  return {
    select() {
      return this;
    },
    eq(column: string, value: string) {
      calls.push({ table, column, value });
      return this;
    },
    order() {
      return this;
    },
    limit() {
      if (table === 'tenant_subscriptions') {
        return Promise.resolve({
          data: [
            {
              id: 'subscription-1',
              tenant_id: 'tenant-1',
              plan_id: 'plan-1',
              provider: 'ASAAS',
              status: 'ACTIVE',
              current_period_end: '2026-10-31',
              updated_at: '2026-10-01T12:00:00.000Z',
              saas_plan: {
                code: 'real',
                name: 'Plano Real',
                status: 'ACTIVE',
                billing_interval: 'MONTHLY',
              },
            },
          ],
          error: null,
        });
      }

      return Promise.resolve({
        data: [
          {
            id: 'invoice-open',
            tenant_id: 'tenant-1',
            subscription_id: 'subscription-1',
            provider: 'ASAAS',
            external_invoice_id: 'invoice-open',
            status: 'OPEN',
            amount_cents: 19900,
            due_at: '2026-10-10',
            paid_at: null,
            created_at: '2026-10-01T12:00:00.000Z',
          },
          {
            id: 'invoice-paid',
            tenant_id: 'tenant-1',
            subscription_id: 'subscription-1',
            provider: 'ASAAS',
            external_invoice_id: 'invoice-paid',
            status: 'PAID',
            amount_cents: 19900,
            due_at: '2026-09-10',
            paid_at: '2026-09-10T12:00:00.000Z',
            created_at: '2026-09-01T12:00:00.000Z',
          },
        ],
        error: null,
      });
    },
  };
}
