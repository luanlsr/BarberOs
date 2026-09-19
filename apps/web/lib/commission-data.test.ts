import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { getDevelopmentCommissionsViewModel } from './commission-data';
import { developmentSession } from './dev-session';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

function action(model: ReturnType<typeof getDevelopmentCommissionsViewModel>, id: string) {
  const found = model.allowedActions.find((item) => item.id === id);
  if (!found) throw new Error(`Missing action ${id}`);
  return found;
}

describe('Commission data loading layer', () => {
  test('builds an open accrual state with rules and payout closing enabled', () => {
    const model = getDevelopmentCommissionsViewModel(developmentSession, {
      scenario: 'open-accrual',
    });

    expect(model.state).toBe('ready');
    expect(model.periodLabel).toBe('01/09/2026 - 30/09/2026');
    expect(model.canRead).toBe(true);
    expect(model.canManage).toBe(true);
    expect(model.rules.map((rule) => rule.scopeLabel)).toEqual(['Padrao', 'Servico']);
    expect(model.openAccruals).toHaveLength(1);
    expect(model.openAccruals[0]).toMatchObject({
      professionalName: 'Lucas Pereira',
      orderLabel: 'Comanda #1002',
      commissionAmountCents: 4_250,
      statusLabel: 'Aberta',
      ruleSnapshotLabel: 'Servico - 50%',
    });
    expect(model.totals).toMatchObject({
      openAccrualAmountCents: 4_250,
      paidPayoutAmountCents: 0,
      professionalCount: 1,
      accrualCount: 1,
    });
    expect(action(model, 'commissions.create-rule').enabled).toBe(true);
    expect(action(model, 'commissions.close-payout').enabled).toBe(true);
    expect(action(model, 'commissions.pay-payout')).toMatchObject({
      enabled: false,
      reason: 'Nenhum repasse fechado para pagar.',
    });
  });

  test('builds a no-rule diagnostic state with rule creation available', () => {
    const model = getDevelopmentCommissionsViewModel(developmentSession, { scenario: 'no-rule' });

    expect(model.state).toBe('no-rule');
    expect(model.rules).toEqual([]);
    expect(model.openAccruals).toEqual([]);
    expect(model.noRuleItems).toEqual([
      expect.objectContaining({
        orderLabel: 'Comanda #1004',
        itemLabel: 'Pomada matte',
        professionalName: 'Lucas Pereira',
        baseAmountCents: 3_200,
        reason: 'Nenhuma regra ativa corresponde ao item e profissional.',
      }),
    ]);
    expect(model.totals.noRuleItemCount).toBe(1);
    expect(action(model, 'commissions.create-rule')).toMatchObject({
      enabled: true,
      label: 'Criar regra para item',
    });
    expect(action(model, 'commissions.close-payout')).toMatchObject({
      enabled: false,
      reason: 'Nenhuma comissao aberta para fechar.',
    });
  });

  test('builds a closed payout state with payment enabled', () => {
    const model = getDevelopmentCommissionsViewModel(developmentSession, {
      scenario: 'closed-payout',
    });

    expect(model.state).toBe('ready');
    expect(model.openAccruals).toEqual([]);
    expect(model.payouts).toHaveLength(1);
    expect(model.payouts[0]).toMatchObject({
      professionalName: 'Lucas Pereira',
      status: 'CLOSED',
      statusLabel: 'Fechado',
      statusTone: 'warning',
      totalAmountCents: 4_250,
      sourceCount: 1,
      canPay: true,
      canCorrect: false,
    });
    expect(model.totals).toMatchObject({
      settledAccrualAmountCents: 4_250,
      payoutPendingAmountCents: 4_250,
      paidPayoutAmountCents: 0,
    });
    expect(action(model, 'commissions.pay-payout').enabled).toBe(true);
    expect(action(model, 'commissions.correct-payout')).toMatchObject({
      enabled: false,
      reason: 'Nenhum repasse pago para corrigir.',
    });
  });

  test('builds a paid payout state with correction enabled and payment locked', () => {
    const model = getDevelopmentCommissionsViewModel(developmentSession, {
      scenario: 'paid-payout',
    });

    expect(model.state).toBe('ready');
    expect(model.payouts).toHaveLength(1);
    expect(model.payouts[0]).toMatchObject({
      professionalName: 'Carlos Andrade',
      status: 'PAID',
      statusLabel: 'Pago',
      statusTone: 'success',
      paymentMethodLabel: 'PIX',
      canPay: false,
      canCorrect: true,
      unavailableReason: 'Repasse pago aceita apenas correcao auditavel.',
    });
    expect(model.totals).toMatchObject({
      settledAccrualAmountCents: 3_500,
      paidPayoutAmountCents: 3_500,
      professionalCount: 1,
    });
    expect(action(model, 'commissions.pay-payout')).toMatchObject({
      enabled: false,
      reason: 'Nenhum repasse fechado para pagar.',
    });
    expect(action(model, 'commissions.correct-payout').enabled).toBe(true);
  });

  test('builds offline and error states with money actions disabled', () => {
    const offline = getDevelopmentCommissionsViewModel(developmentSession, { state: 'offline' });
    const error = getDevelopmentCommissionsViewModel(developmentSession, { state: 'error' });

    expect(offline.state).toBe('offline');
    expect(action(offline, 'commissions.refresh').enabled).toBe(true);
    expect(action(offline, 'commissions.close-payout')).toMatchObject({
      enabled: false,
      reason: 'Disponivel quando a conexao voltar.',
    });
    expect(error.error).toEqual({
      code: 'COMMISSION_VALIDATION_ERROR',
      message: 'Comissoes locais indisponiveis.',
      requestId: 'local-commissions-error',
    });
    expect(action(error, 'commissions.create-rule')).toMatchObject({
      enabled: false,
      reason: 'Recarregue comissoes antes de executar esta acao.',
    });
  });

  test('communicates permission denied without exposing commission data', () => {
    const model = getDevelopmentCommissionsViewModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    );

    expect(model.state).toBe('permission-denied');
    expect(model.canRead).toBe(false);
    expect(model.rules).toEqual([]);
    expect(model.openAccruals).toEqual([]);
    expect(model.payouts).toEqual([]);
    expect(model.noRuleItems).toEqual([]);
    expect(model.totals.accrualCount).toBe(0);
    expect(model.allowedActions.every((item) => item.enabled === false)).toBe(true);
    expect(action(model, 'commissions.refresh').reason).toBe(
      'Sem permissao para visualizar comissoes.',
    );
  });
});
