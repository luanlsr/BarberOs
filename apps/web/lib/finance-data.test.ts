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
      expenseAmountCents: 69_200,
      resultAmountCents: -53_700,
      commissionLiabilityAmountCents: 4_250,
      paidPayoutAmountCents: 3_500,
      cashInAmountCents: 15_500,
      cashOutAmountCents: 72_700,
      entriesCount: 5,
    });
    expect(model.cashFlow).toMatchObject({
      cashInAmountCents: 15_500,
      cashOutAmountCents: 72_700,
      netCashFlowAmountCents: -57_200,
      tone: 'danger',
    });
    expect(model.metrics.map((metric) => metric.label)).toEqual([
      'Receitas',
      'Despesas',
      'Resultado',
      'Comissões abertas',
    ]);
    expect(model.expenses.map((expense) => expense.description)).toEqual([
      'Energia da Unidade Centro',
      'Honorarios contabeis de agosto',
      'Aluguel de outubro da Unidade Centro',
    ]);
    expect(model.expenses.map((expense) => expense.dueDateLabel)).toEqual([
      '10/09/2026',
      '07/09/2026',
      '05/10/2026',
    ]);
    expect(model.commission).toMatchObject({
      openAccrualAmountCents: 4_250,
      paidPayoutAmountCents: 3_500,
      openAccrualCount: 1,
      payoutCount: 1,
    });
    expect(model.planAnalysis.plan).toMatchObject({
      haircutCount: 6,
      customerCount: 4,
      revenueAmountCents: 32_000,
      revenuePerCustomerAmountCents: 8_000,
    });
    expect(model.planAnalysis.walkIn).toMatchObject({
      haircutCount: 2,
      customerCount: 2,
      revenueAmountCents: 15_500,
      revenuePerCustomerAmountCents: 7_750,
    });
    expect(model.planAnalysis).toMatchObject({
      planUtilizationPercent: 75,
      recommendationTitle: 'Plano está mais vantajoso',
      revenueDeltaLabel: '+R$ 2,50 por cliente vs. avulso',
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
      reason: 'Nenhuma comissão aberta para fechar no período.',
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
      message: 'Financeiro local indisponível.',
      requestId: 'local-finance-error',
    });
    expect(model.summary.entriesCount).toBe(0);
    expect(action(model, 'finance.refresh').enabled).toBe(true);
    expect(action(model, 'finance.create-expense')).toMatchObject({
      enabled: false,
      reason: 'Recarregue o financeiro antes de executar esta ação.',
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
      reason: 'Disponivel quando a conexão voltar.',
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
      'Sem permissão para visualizar financeiro.',
    );
  });
  test('builds a consolidated finance model across authorized branches', () => {
    const model = getDevelopmentFinanceViewModel(developmentSession, { branchId: 'all' });

    expect(model.state).toBe('ready');
    expect(model.scope).toBe('tenant');
    expect(model.branchName).toBe('Todas as unidades');
    expect(model.branchOptions.map((option) => option.label)).toEqual([
      'Todas as unidades',
      'Unidade Centro',
      'Unidade Norte',
    ]);
    expect(model.summary).toMatchObject({
      branchId: undefined,
      revenueAmountCents: 29_300,
      expenseAmountCents: 80_600,
      resultAmountCents: -51_300,
      cashInAmountCents: 29_300,
      cashOutAmountCents: 84_100,
      entriesCount: 9,
    });
    expect(model.branchBreakdown.map((branch) => branch.branchName)).toEqual([
      'Unidade Centro',
      'Unidade Norte',
    ]);
    expect(model.categoryBreakdown.map((category) => category.name)).toEqual(
      expect.arrayContaining(['Serviços', 'Produtos', 'Aluguel', 'Marketing']),
    );
    expect(model.originBreakdown.map((origin) => origin.label)).toEqual(
      expect.arrayContaining([
        'Despesas operacionais',
        'Serviços',
        'Salários e repasses',
        'Produtos',
      ]),
    );
    expect(model.planAnalysis.plan).toMatchObject({
      haircutCount: 8,
      customerCount: 6,
      revenueAmountCents: 48_000,
    });
    expect(model.planAnalysis.walkIn).toMatchObject({
      haircutCount: 3,
      customerCount: 3,
      revenueAmountCents: 26_500,
    });
  });
});
