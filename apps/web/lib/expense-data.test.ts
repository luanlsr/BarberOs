import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { getDevelopmentExpensesViewModel } from './expense-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

function action(model: ReturnType<typeof getDevelopmentExpensesViewModel>, id: string) {
  const found = model.allowedActions.find((item) => item.id === id);
  if (!found) throw new Error(`Missing action ${id}`);
  return found;
}

describe('Expense data loading layer', () => {
  test('builds open expenses with categories, recurrence labels and open totals', () => {
    const model = getDevelopmentExpensesViewModel(developmentSession, { status: 'OPEN' });

    expect(model.state).toBe('ready');
    expect(model.selectedStatus).toBe('OPEN');
    expect(model.periodLabel).toBe('01/09/2026 - 30/09/2026');
    expect(model.totals).toMatchObject({
      openAmountCents: 185_000,
      overdueAmountCents: 65_000,
      paidAmountCents: 4_200,
      totalAmountCents: 189_200,
    });
    expect(model.categories.map((category) => category.name)).toEqual([
      'Aluguel',
      'Utilidades',
      'Contabilidade',
    ]);
    expect(model.expenses).toHaveLength(1);
    expect(model.expenses[0]).toMatchObject({
      description: 'Aluguel de outubro da Unidade Centro',
      categoryName: 'Aluguel',
      status: 'OPEN',
      statusLabel: 'Aberta',
      recurrenceLabel: 'Mensal até 01/12/2026',
      canEdit: true,
      canPay: true,
      canCancel: true,
    });
    expect(action(model, 'expenses.create').enabled).toBe(true);
    expect(action(model, 'expenses.pay-selected').enabled).toBe(true);
    expect(action(model, 'expenses.cancel-selected').enabled).toBe(true);
  });

  test('builds paid expenses without payment or cancel actions', () => {
    const model = getDevelopmentExpensesViewModel(developmentSession, { status: 'PAID' });

    expect(model.state).toBe('ready');
    expect(model.selectedStatus).toBe('PAID');
    expect(model.expenses).toHaveLength(1);
    expect(model.expenses[0]).toMatchObject({
      description: 'Energia da Unidade Centro',
      status: 'PAID',
      statusLabel: 'Paga',
      statusTone: 'success',
      paymentMethodLabel: 'PIX',
      cashDateLabel: '05/09/2026',
      hasAttachment: true,
      canPay: false,
      canCancel: false,
    });
    expect(action(model, 'expenses.pay-selected')).toMatchObject({
      enabled: false,
      reason: 'Nenhuma despesa aberta para pagar.',
    });
    expect(action(model, 'expenses.cancel-selected')).toMatchObject({
      enabled: false,
      reason: 'Nenhuma despesa aberta para cancelar.',
    });
  });

  test('builds overdue expenses with danger tone and payable actions', () => {
    const model = getDevelopmentExpensesViewModel(developmentSession, { status: 'OVERDUE' });

    expect(model.state).toBe('ready');
    expect(model.selectedStatus).toBe('OVERDUE');
    expect(model.statusFilters.find((filter) => filter.status === 'OVERDUE')).toMatchObject({
      label: 'Vencidas',
      count: 1,
      amountCents: 65_000,
      tone: 'danger',
    });
    expect(model.expenses[0]).toMatchObject({
      description: 'Honorarios contabeis de agosto',
      statusLabel: 'Vencida',
      statusTone: 'danger',
      dueDateLabel: '30/08/2026',
      recurrenceLabel: 'Mensal',
      canPay: true,
      canCancel: true,
    });
  });

  test('builds an empty state with creation available for finance writers', () => {
    const model = getDevelopmentExpensesViewModel(developmentSession, { state: 'empty' });

    expect(model.state).toBe('empty');
    expect(model.expenses).toEqual([]);
    expect(model.totals.totalAmountCents).toBe(0);
    expect(action(model, 'expenses.create').enabled).toBe(true);
    expect(action(model, 'expenses.pay-selected')).toMatchObject({
      enabled: false,
      reason: 'Nenhuma despesa aberta para pagar.',
    });
  });

  test('builds an error state with stable request metadata and retry-only actions', () => {
    const model = getDevelopmentExpensesViewModel(developmentSession, { state: 'error' });

    expect(model.state).toBe('error');
    expect(model.error).toEqual({
      code: 'FINANCE_VALIDATION_ERROR',
      message: 'Despesas locais indisponíveis.',
      requestId: 'local-expenses-error',
    });
    expect(action(model, 'expenses.refresh').enabled).toBe(true);
    expect(action(model, 'expenses.create')).toMatchObject({
      enabled: false,
      reason: 'Recarregue despesas antes de executar esta ação.',
    });
  });

  test('builds an offline state without money-changing actions', () => {
    const model = getDevelopmentExpensesViewModel(developmentSession, { state: 'offline' });

    expect(model.state).toBe('offline');
    expect(model.expenses).toEqual([]);
    expect(action(model, 'expenses.refresh').enabled).toBe(true);
    expect(action(model, 'expenses.create')).toMatchObject({
      enabled: false,
      reason: 'Disponivel quando a conexão voltar.',
    });
  });

  test('communicates permission denied without exposing expenses', () => {
    const model = getDevelopmentExpensesViewModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    );

    expect(model.state).toBe('permission-denied');
    expect(model.canRead).toBe(false);
    expect(model.expenses).toEqual([]);
    expect(model.categories).toEqual([]);
    expect(model.totals.totalAmountCents).toBe(0);
    expect(model.allowedActions.every((item) => item.enabled === false)).toBe(true);
    expect(action(model, 'expenses.refresh').reason).toBe(
      'Sem permissão para visualizar despesas.',
    );
  });
});
