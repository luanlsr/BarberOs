import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { getDevelopmentProfessionalWalletViewModel } from './professional-wallet-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

function professionalSession(overrides: Partial<SessionContext> = {}): SessionContext {
  return sessionWith({
    userId: 'dev-professional-lucas',
    role: 'PROFESSIONAL',
    permissions: ['commission.read'],
    entitlements: ['finance'],
    branchScope: ['dev-branch'],
    activeBranchId: 'dev-branch',
    userName: 'Lucas Pereira',
    ...overrides,
  });
}

function action(model: ReturnType<typeof getDevelopmentProfessionalWalletViewModel>, id: string) {
  const found = model.allowedActions.find((item) => item.id === id);
  if (!found) throw new Error(`Missing action ${id}`);
  return found;
}

describe('Professional wallet data loading layer', () => {
  test('builds an owner-visible wallet with production, open commission and paid payouts', () => {
    const model = getDevelopmentProfessionalWalletViewModel(developmentSession, {
      professionalId: 'dev-professional-lucas',
    });

    expect(model.state).toBe('ready');
    expect(model.canRead).toBe(true);
    expect(model.canViewElevated).toBe(true);
    expect(model.professionalName).toBe('Lucas Pereira');
    expect(model.periodLabel).toBe('01/09/2026 - 30/09/2026');
    expect(model.productionAmountCents).toBe(14_500);
    expect(model.openCommissionAmountCents).toBe(4_250);
    expect(model.paidPayoutAmountCents).toBe(3_000);
    expect(model.expectedBalanceAmountCents).toBe(4_250);
    expect(model.metrics.map((metric) => metric.label)).toEqual([
      'Producao',
      'Comissoes abertas',
      'Repasses pagos',
      'A receber',
    ]);
    expect(model.accruals.map((accrual) => accrual.orderLabel)).toEqual([
      'Comanda #1002',
      'Comanda #1005',
    ]);
    expect(model.payouts).toEqual([
      expect.objectContaining({
        periodLabel: '01/09/2026 - 06/09/2026',
        statusLabel: 'Pago',
        paymentMethodLabel: 'PIX',
        totalAmountCents: 3_000,
      }),
    ]);
    expect(action(model, 'wallet.refresh').enabled).toBe(true);
    expect(action(model, 'wallet.view-payouts').enabled).toBe(true);
  });

  test('allows a professional to read only their own wallet', () => {
    const model = getDevelopmentProfessionalWalletViewModel(professionalSession());

    expect(model.state).toBe('ready');
    expect(model.canRead).toBe(true);
    expect(model.canViewElevated).toBe(false);
    expect(model.professionalId).toBe('dev-professional-lucas');
    expect(model.openCommissionAmountCents).toBe(4_250);
  });

  test('denies cross-professional wallet data for professionals', () => {
    const model = getDevelopmentProfessionalWalletViewModel(professionalSession(), {
      professionalId: 'dev-professional-carlos',
    });

    expect(model.state).toBe('permission-denied');
    expect(model.canRead).toBe(false);
    expect(model.canViewElevated).toBe(false);
    expect(model.professionalId).toBe('dev-professional-carlos');
    expect(model.productionAmountCents).toBe(0);
    expect(model.openCommissionAmountCents).toBe(0);
    expect(model.paidPayoutAmountCents).toBe(0);
    expect(model.accruals).toEqual([]);
    expect(model.payouts).toEqual([]);
    expect(model.allowedActions.every((item) => item.enabled === false)).toBe(true);
    expect(action(model, 'wallet.refresh').reason).toBe(
      'Sem permissao para visualizar esta carteira.',
    );
  });

  test('builds empty, offline and error states without leaking other data', () => {
    const empty = getDevelopmentProfessionalWalletViewModel(developmentSession, {
      professionalId: 'dev-professional-lucas',
      state: 'empty',
    });
    const offline = getDevelopmentProfessionalWalletViewModel(developmentSession, {
      professionalId: 'dev-professional-lucas',
      state: 'offline',
    });
    const error = getDevelopmentProfessionalWalletViewModel(developmentSession, {
      professionalId: 'dev-professional-lucas',
      state: 'error',
    });

    expect(empty.state).toBe('empty');
    expect(empty.productionAmountCents).toBe(0);
    expect(action(empty, 'wallet.view-payouts').enabled).toBe(true);
    expect(offline.state).toBe('offline');
    expect(action(offline, 'wallet.view-payouts')).toMatchObject({
      enabled: false,
      reason: 'Disponivel quando a conexao voltar.',
    });
    expect(error.error).toEqual({
      code: 'COMMISSION_VALIDATION_ERROR',
      message: 'Carteira profissional local indisponivel.',
      requestId: 'local-wallet-error',
    });
    expect(action(error, 'wallet.view-payouts')).toMatchObject({
      enabled: false,
      reason: 'Recarregue a carteira antes de navegar.',
    });
  });
});
