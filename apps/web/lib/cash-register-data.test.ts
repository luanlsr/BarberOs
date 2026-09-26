import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { getDevelopmentCashRegisterViewModel } from './cash-register-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

describe('Cash register data loading layer', () => {
  test('builds an open cash register model with expected cash, method totals and movements', () => {
    const model = getDevelopmentCashRegisterViewModel(developmentSession, { state: 'open' });

    expect(model.state).toBe('open');
    expect(model.canRead).toBe(true);
    expect(model.canOpen).toBe(true);
    expect(model.canWithdraw).toBe(true);
    expect(model.canCashIn).toBe(true);
    expect(model.canClose).toBe(true);
    expect(model.session).toMatchObject({
      status: 'OPEN',
      statusLabel: 'Aberto',
      openingBalanceAmountCents: 80_000,
      openingBalanceLabel: 'R$\u00a0800,00',
      expectedBalanceAmountCents: 23_500,
      expectedBalanceLabel: 'R$\u00a0235,00',
      differenceAmountCents: 0,
      differenceLabel: 'A conferir',
    });
    expect(model.methodTotals).toEqual([
      {
        method: 'CASH',
        methodLabel: 'Dinheiro',
        amountCents: 8_500,
        amountLabel: 'R$\u00a085,00',
        count: 1,
      },
      {
        method: 'PIX',
        methodLabel: 'PIX',
        amountCents: 7_000,
        amountLabel: 'R$\u00a070,00',
        count: 1,
      },
      {
        method: 'CREDIT_CARD',
        methodLabel: 'Credito',
        amountCents: 12_000,
        amountLabel: 'R$\u00a0120,00',
        count: 1,
      },
    ]);
    expect(model.movements.map((movement) => movement.type)).toEqual([
      'EXPENSE',
      'SALE',
      'OPENING_BALANCE',
    ]);
    expect(model.movements[0]).toMatchObject({
      typeLabel: 'Despesa',
      amountLabel: 'R$\u00a0650,00',
      signedAmountLabel: '-R$\u00a0650,00',
      tone: 'danger',
      reason: 'Despesa paga em dinheiro: Honorarios contabeis de agosto.',
    });
    expect(model.movements[1]).toMatchObject({
      typeLabel: 'Venda',
      amountLabel: 'R$\u00a085,00',
      signedAmountLabel: '+R$\u00a085,00',
      tone: 'success',
    });
  });

  test('starts closed when the branch has no active cash session', () => {
    const model = getDevelopmentCashRegisterViewModel(developmentSession);

    expect(model.state).toBe('no-open-session');
    expect(model.session).toBeUndefined();
    expect(model.methodTotals).toEqual([]);
    expect(model.movements).toEqual([]);
    expect(model.canOpen).toBe(true);
    expect(model.description).toContain('Nenhum caixa aberto');
  });

  test('builds a closed cash register model with actual cash and divergence', () => {
    const model = getDevelopmentCashRegisterViewModel(developmentSession, { state: 'closed' });

    expect(model.state).toBe('closed');
    expect(model.session).toMatchObject({
      status: 'CLOSED',
      statusLabel: 'Fechado',
      expectedBalanceAmountCents: 23_500,
      actualBalanceAmountCents: 23_000,
      actualBalanceLabel: 'R$\u00a0230,00',
      differenceAmountCents: -500,
      differenceLabel: '-R$\u00a05,00',
      closingNotes: 'Diferenca conferida no fechamento.',
    });
    expect(model.movements.map((movement) => movement.type)).toEqual([
      'WITHDRAWAL',
      'EXPENSE',
      'SALE',
      'OPENING_BALANCE',
    ]);
    expect(model.movements[0]).toMatchObject({
      typeLabel: 'Sangria',
      signedAmountLabel: '-R$\u00a05,00',
      tone: 'warning',
    });
  });

  test('communicates permission denied without exposing cash session data', () => {
    const model = getDevelopmentCashRegisterViewModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    );

    expect(model.state).toBe('permission-denied');
    expect(model.canRead).toBe(false);
    expect(model.canOpen).toBe(false);
    expect(model.canWithdraw).toBe(false);
    expect(model.canCashIn).toBe(false);
    expect(model.canClose).toBe(false);
    expect(model.session).toBeUndefined();
    expect(model.movements).toEqual([]);
  });

  test('separates read access from cash mutation permissions', () => {
    const model = getDevelopmentCashRegisterViewModel(
      sessionWith({ permissions: ['finance.read'], entitlements: ['finance'] }),
    );

    expect(model.state).toBe('no-open-session');
    expect(model.canRead).toBe(true);
    expect(model.canOpen).toBe(false);
    expect(model.canWithdraw).toBe(false);
    expect(model.canCashIn).toBe(false);
    expect(model.canClose).toBe(false);
    expect(model.session).toBeUndefined();
  });
});
