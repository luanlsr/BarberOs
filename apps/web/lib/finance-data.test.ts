import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { getDevelopmentFinanceViewModel } from './finance-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

function action(model: ReturnType<typeof getDevelopmentFinanceViewModel>, id: string) {
  const found = model.allowedActions.find((item) => item.id === id);
  if (!found) throw new Error(`Missing action ${id}`);
  return found;
}

describe('Finance data loading layer', () => {
  test('builds a populated finance model from local seed-shaped fixtures', () => {
    const model = getDevelopmentFinanceViewModel(developmentSession);

    expect(model.state).toBe('ready');
    expect(model.periodLabel).toBe('01/09/2026 - 30/09/2026');
    expect(model.canRead).toBe(true);
    expect(model.canCreateExpense).toBe(true);
    expect(model.canManageCommissions).toBe(true);
    expect(model.summary).toMatchObject({
      revenueAmountCents: 15_500,
      expenseAmountCents: 4_200,
      resultAmountCents: 11_300,
      commissionLiabilityAmountCents: 4_250,
      paidPayoutAmountCents: 3_500,
      cashInAmountCents: 15_500,
      cashOutAmountCents: 7_700,
      entriesCount: 4,
    });
    expect(model.cashFlow).toMatchObject({
      cashInAmountCents: 15_500,
      cashOutAmountCents: 7_700,
      netCashFlowAmountCents: 7_800,
      tone: 'success',
    });
    expect(model.metrics.map((metric) => metric.label)).toEqual([
      'Receitas',
      'Despesas',
      'Resultado',
      'Comissoes abertas',
    ]);
    expect(model.expenses.map((expense) => expense.description)).toEqual([
      'Energia da Unidade Centro',
      'Aluguel de outubro da Unidade Centro',
    ]);
    expect(model.expenses.map((expense) => expense.dueDateLabel)).toEqual([
      '10/09/2026',
      '05/10/2026',
    ]);
    expect(model.commission).toMatchObject({
      openAccrualAmountCents: 4_250,
      paidPayoutAmountCents: 3_500,
      openAccrualCount: 1,
      payoutCount: 1,
    });
    expect(action(model, 'finance.refresh').enabled).toBe(true);
    expect(action(model, 'finance.create-expense').enabled).toBe(true);
    expect(action(model, 'finance.manage-commissions').enabled).toBe(true);
    expect(action(model, 'finance.close-payout').enabled).toBe(true);
  });

  test('builds an empty finance state with zero totals and safe actions', () => {
    const model = getDevelopmentFinanceViewModel(developmentSession, { state: 'empty' });

    expect(model.state).toBe('empty');
    expect(model.summary.entriesCount).toBe(0);
    expect(model.summary.resultAmountCents).toBe(0);
    expect(model.cashFlow.netCashFlowAmountCents).toBe(0);
    expect(model.expenses).toEqual([]);
    expect(model.commission.openAccrualAmountCents).toBe(0);
    expect(model.canCreateExpense).toBe(true);
    expect(action(model, 'finance.create-expense').enabled).toBe(true);
    expect(action(model, 'finance.close-payout')).toMatchObject({
      enabled: false,
      reason: 'Nenhuma comissao aberta para fechar no periodo.',
    });
  });

  test('builds a loading state with protected financial actions disabled', () => {
    const model = getDevelopmentFinanceViewModel(developmentSession, { state: 'loading' });

    expect(model.state).toBe('loading');
    expect(model.summary.entriesCount).toBe(0);
    expect(action(model, 'finance.refresh')).toMatchObject({
      enabled: false,
      reason: 'Carregamento em andamento.',
    });
    expect(action(model, 'finance.create-expense')).toMatchObject({
      enabled: false,
      reason: 'Aguarde o carregamento.',
    });
  });

  test('builds an error state with stable request metadata and retry-only actions', () => {
    const model = getDevelopmentFinanceViewModel(developmentSession, { state: 'error' });

    expect(model.state).toBe('error');
    expect(model.error).toEqual({
      code: 'FINANCE_VALIDATION_ERROR',
      message: 'Financeiro local indisponivel.',
      requestId: 'local-finance-error',
    });
    expect(model.summary.entriesCount).toBe(0);
    expect(action(model, 'finance.refresh').enabled).toBe(true);
    expect(action(model, 'finance.create-expense')).toMatchObject({
      enabled: false,
      reason: 'Recarregue o financeiro antes de executar esta acao.',
    });
  });

  test('builds an offline state without enabling money-changing actions', () => {
    const model = getDevelopmentFinanceViewModel(developmentSession, { state: 'offline' });

    expect(model.state).toBe('offline');
    expect(model.summary.entriesCount).toBe(0);
    expect(model.expenses).toEqual([]);
    expect(model.cashFlow.netCashFlowAmountCents).toBe(0);
    expect(action(model, 'finance.refresh').enabled).toBe(true);
    expect(action(model, 'finance.create-expense')).toMatchObject({
      enabled: false,
      reason: 'Disponivel quando a conexao voltar.',
    });
    expect(action(model, 'finance.close-payout').enabled).toBe(false);
  });

  test('communicates permission denied without exposing finance data', () => {
    const model = getDevelopmentFinanceViewModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    );

    expect(model.state).toBe('permission-denied');
    expect(model.canRead).toBe(false);
    expect(model.summary.entriesCount).toBe(0);
    expect(model.expenses).toEqual([]);
    expect(model.commission.payoutCount).toBe(0);
    expect(model.allowedActions.every((item) => item.enabled === false)).toBe(true);
    expect(action(model, 'finance.refresh').reason).toBe(
      'Sem permissao para visualizar financeiro.',
    );
  });
});
