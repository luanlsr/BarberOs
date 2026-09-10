import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { getDevelopmentComandaViewModel } from './order-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

describe('Comanda data loading layer', () => {
  test('builds a ready Comanda view model with customer, items, totals and notes', () => {
    const model = getDevelopmentComandaViewModel(developmentSession, {
      orderId: 'dev-order-1001',
    });

    expect(model.state).toBe('ready');
    expect(model.canRead).toBe(true);
    expect(model.canManageItems).toBe(true);
    expect(model.canCreateWalkIn).toBe(true);
    expect(model.canQuickCreateCustomer).toBe(true);
    expect(model.branchId).toBe('dev-branch');
    expect(model.itemSuggestions.map((item) => item.name)).toContain('Agua mineral');
    expect(model.order).toMatchObject({
      title: 'Comanda #1001',
      customerName: 'Joao Silva',
      professionalName: 'Carlos Andrade',
      originLabel: 'Agendamento',
      subtotalLabel: 'R$\u00a0137,00',
      discountLabel: 'R$\u00a010,00',
      totalLabel: 'R$\u00a0127,00',
    });
    expect(model.order?.items.map((item) => item.name)).toEqual([
      'Corte Masculino',
      'Barba',
      'Pomada matte',
    ]);
    expect(model.order?.notes).toContain('acabamento');
    expect(model.order?.items[0]).toMatchObject({
      quantity: 1,
      unitPriceAmountCents: 6000,
      finalAmountCents: 6000,
    });
  });

  test('builds partially paid and paid payment summaries', () => {
    const partial = getDevelopmentComandaViewModel(developmentSession, { state: 'partial' });
    expect(partial.order?.paymentSummary).toMatchObject({
      state: 'partially-paid',
      stateLabel: 'Parcial',
      paidAmountCents: 7_000,
      amountDueCents: 5_700,
      canReceivePayment: true,
    });
    expect(partial.order?.history.map((item) => item.label)).toContain('Pagamento recebido');
    expect(partial.order?.paymentSummary.methodTotals).toEqual([
      { method: 'PIX', methodLabel: 'PIX', amountCents: 7_000, amountLabel: 'R$ 70,00' },
    ]);

    const paid = getDevelopmentComandaViewModel(developmentSession, { state: 'paid' });
    expect(paid.order?.statusLabel).toBe('Paga');
    expect(paid.order?.paymentSummary).toMatchObject({
      state: 'paid',
      stateLabel: 'Paga',
      paidAmountCents: 12_700,
      amountDueCents: 0,
      canReceivePayment: false,
      unavailableReason: 'Comanda ja esta paga.',
    });
  });

  test('disables payment actions while offline', () => {
    const model = getDevelopmentComandaViewModel(developmentSession, { state: 'offline' });

    expect(model.order?.paymentSummary).toMatchObject({
      state: 'unpaid',
      canReceivePayment: false,
      unavailableReason: 'Pagamentos exigem conexao ativa.',
    });
  });

  test('returns empty state for unknown local Comanda id', () => {
    const model = getDevelopmentComandaViewModel(developmentSession, { orderId: 'missing-order' });

    expect(model.state).toBe('empty');
    expect(model.order).toBeUndefined();
    expect(model.description).toContain('Nenhuma Comanda');
  });

  test('communicates permission denied without exposing order detail', () => {
    const model = getDevelopmentComandaViewModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    );

    expect(model.state).toBe('permission-denied');
    expect(model.canRead).toBe(false);
    expect(model.canReceivePayment).toBe(false);
    expect(model.order).toBeUndefined();
  });

  test('keeps item management state separate from read permission', () => {
    const model = getDevelopmentComandaViewModel(
      sessionWith({ permissions: ['orders.read'], entitlements: ['core.operations'] }),
    );

    expect(model.state).toBe('ready');
    expect(model.canRead).toBe(true);
    expect(model.canManageItems).toBe(false);
    expect(model.canCreateWalkIn).toBe(false);
    expect(model.canQuickCreateCustomer).toBe(false);
    expect(model.canReceivePayment).toBe(false);
    expect(model.order?.paymentSummary).toMatchObject({
      canReceivePayment: false,
      unavailableReason: 'Seu perfil nao pode receber pagamentos.',
    });
  });
});
