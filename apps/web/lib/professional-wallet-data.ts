import type {
  CommissionAccrual,
  PaymentMethod,
  Payout,
  Permission,
  SessionContext,
} from '@barberos/contracts';

export type ProfessionalWalletViewState =
  'ready' | 'empty' | 'permission-denied' | 'error' | 'offline';
export type ProfessionalWalletTone = 'neutral' | 'success' | 'warning' | 'danger';

export type ProfessionalWalletActionId = 'wallet.refresh' | 'wallet.view-payouts';

export type ProfessionalWalletActionModel = {
  id: ProfessionalWalletActionId;
  label: string;
  enabled: boolean;
  reason?: string;
};

export type ProfessionalWalletMetricModel = {
  label: string;
  amountCents: number;
  amountLabel: string;
  tone: ProfessionalWalletTone;
};

export type ProfessionalWalletAccrualModel = {
  id: string;
  orderId: string;
  orderLabel: string;
  baseAmountCents: number;
  baseAmountLabel: string;
  commissionAmountCents: number;
  commissionAmountLabel: string;
  statusLabel: string;
  statusTone: ProfessionalWalletTone;
  accruedAtLabel: string;
};

export type ProfessionalWalletPayoutModel = {
  id: string;
  periodLabel: string;
  statusLabel: string;
  statusTone: ProfessionalWalletTone;
  totalAmountCents: number;
  totalAmountLabel: string;
  paymentMethodLabel?: string;
  paidAtLabel?: string;
};

export type ProfessionalWalletViewModel = {
  state: ProfessionalWalletViewState;
  title: string;
  description: string;
  tenantId: string;
  branchId: string;
  branchName: string;
  professionalId: string;
  professionalName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  canRead: boolean;
  canViewElevated: boolean;
  metrics: readonly ProfessionalWalletMetricModel[];
  productionAmountCents: number;
  productionAmountLabel: string;
  openCommissionAmountCents: number;
  openCommissionAmountLabel: string;
  paidPayoutAmountCents: number;
  paidPayoutAmountLabel: string;
  expectedBalanceAmountCents: number;
  expectedBalanceAmountLabel: string;
  accruals: readonly ProfessionalWalletAccrualModel[];
  payouts: readonly ProfessionalWalletPayoutModel[];
  allowedActions: readonly ProfessionalWalletActionModel[];
  error?: { code: string; message: string; requestId: string };
};

type DevelopmentProfessionalWalletOptions = {
  branchId?: string;
  professionalId?: string;
  state?: 'empty' | 'error' | 'offline';
};
type ProfessionalWalletViewOptions = {
  branchId?: string;
  professionalId?: string;
  state?: string;
};

type ProfessionalWalletBaseModel = ReturnType<typeof baseModel>;

const periodStart = '2026-09-01';
const periodEnd = '2026-09-30';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  DEBIT_CARD: 'Debito',
  CREDIT_CARD: 'Credito',
  OTHER: 'Outro',
};

const professionalNames = new Map([
  ['dev-professional-lucas', 'Lucas Pereira'],
  ['dev-professional-carlos', 'Carlos Andrade'],
]);

const developmentAccruals: readonly CommissionAccrual[] = [
  {
    id: 'dev-wallet-open-accrual-1901',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    professionalId: 'dev-professional-lucas',
    orderId: 'dev-order-1002',
    orderItemId: 'dev-order-item-1002',
    paymentId: 'dev-payment-1001',
    ruleId: 'dev-commission-rule-default',
    ruleTypeSnapshot: 'PERCENTAGE',
    ruleScopeSnapshot: 'SERVICE',
    rulePercentageBpsSnapshot: 5000,
    baseAmountCents: 8_500,
    commissionAmountCents: 4_250,
    status: 'OPEN',
    accruedAt: '2026-09-07T15:20:00.000Z',
    createdAt: '2026-09-07T15:20:00.000Z',
    updatedAt: '2026-09-07T15:20:00.000Z',
  },
  {
    id: 'dev-wallet-settled-accrual-1902',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    professionalId: 'dev-professional-lucas',
    orderId: 'dev-order-1005',
    orderItemId: 'dev-order-item-1005',
    paymentId: 'dev-payment-1005',
    ruleId: 'dev-commission-rule-default',
    ruleTypeSnapshot: 'PERCENTAGE',
    ruleScopeSnapshot: 'TENANT_DEFAULT',
    rulePercentageBpsSnapshot: 5000,
    baseAmountCents: 6_000,
    commissionAmountCents: 3_000,
    status: 'SETTLED',
    accruedAt: '2026-09-04T16:00:00.000Z',
    payoutId: 'dev-wallet-paid-payout-2001',
    createdAt: '2026-09-04T16:00:00.000Z',
    updatedAt: '2026-09-06T17:00:00.000Z',
  },
];

const developmentPayouts: readonly Payout[] = [
  {
    id: 'dev-wallet-paid-payout-2001',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    professionalId: 'dev-professional-lucas',
    status: 'PAID',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-06',
    totalAmountCents: 3_000,
    sources: [{ accrualId: 'dev-wallet-settled-accrual-1902', amountCents: 3_000 }],
    paymentMethod: 'PIX',
    financialEntryId: 'dev-wallet-finance-entry-payout-2001',
    idempotencyKey: 'seed-wallet-payout-2001',
    closedBy: 'dev-user',
    closedAt: '2026-09-06T17:00:00.000Z',
    paidBy: 'dev-user',
    paidAt: '2026-09-06T17:15:00.000Z',
    createdAt: '2026-09-06T17:00:00.000Z',
    updatedAt: '2026-09-06T17:15:00.000Z',
  },
];

export async function getProfessionalWalletViewModel(
  session: SessionContext,
  options: ProfessionalWalletViewOptions = {},
): Promise<ProfessionalWalletViewModel> {
  return getDevelopmentProfessionalWalletViewModel(session, {
    branchId: options.branchId,
    professionalId: options.professionalId,
    state: developmentStateFrom(options.state),
  });
}

export function getDevelopmentProfessionalWalletViewModel(
  session: SessionContext,
  options: DevelopmentProfessionalWalletOptions = {},
): ProfessionalWalletViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const professionalId = options.professionalId ?? defaultProfessionalIdFor(session);
  const base = baseModel(session, branchId, professionalId);

  if (!base.canRead) {
    return buildWalletModel(
      base,
      'permission-denied',
      'Seu perfil nao pode visualizar esta carteira profissional.',
      [],
      [],
    );
  }

  if (options.state === 'error') {
    return buildWalletModel(
      base,
      'error',
      'Nao foi possivel carregar Minha carteira agora.',
      [],
      [],
      {
        code: 'COMMISSION_VALIDATION_ERROR',
        message: 'Carteira profissional local indisponivel.',
        requestId: 'local-wallet-error',
      },
    );
  }

  if (options.state === 'offline') {
    return buildWalletModel(
      base,
      'offline',
      'Voce esta offline. A carteira sera atualizada quando a conexao voltar.',
      [],
      [],
    );
  }

  if (options.state === 'empty') {
    return buildWalletModel(
      base,
      'empty',
      'Nenhuma producao comissionada encontrada neste periodo.',
      [],
      [],
    );
  }

  const accruals = developmentAccruals.filter(
    (accrual) => accrual.branchId === branchId && accrual.professionalId === professionalId,
  );
  const payouts = developmentPayouts.filter(
    (payout) => payout.branchId === branchId && payout.professionalId === professionalId,
  );

  return buildWalletModel(
    base,
    accruals.length || payouts.length ? 'ready' : 'empty',
    accruals.length || payouts.length
      ? 'Producao, comissoes abertas e repasses pagos do periodo.'
      : 'Nenhuma producao comissionada encontrada neste periodo.',
    accruals,
    payouts,
  );
}

function baseModel(session: SessionContext, branchId: string, professionalId: string) {
  const hasFinanceEntitlement = (session.entitlements ?? []).includes('finance');
  const hasBranch = session.branchScope.includes(branchId);
  const isOwnProfessionalWallet =
    session.role === 'PROFESSIONAL' && session.userId === professionalId;
  const canViewElevated =
    session.role !== 'PROFESSIONAL' &&
    (hasPermission(session, 'commission.read') || hasPermission(session, 'commission.manage'));

  return {
    title: 'Minha carteira',
    description: 'Ganhos e repasses do profissional.',
    tenantId: session.tenantId,
    branchId,
    branchName: branchNameFor(session, branchId),
    professionalId,
    professionalName: professionalNameFor(professionalId),
    periodStart,
    periodEnd,
    periodLabel: periodLabelFor(periodStart, periodEnd),
    canRead:
      hasFinanceEntitlement &&
      hasBranch &&
      (canViewElevated || (isOwnProfessionalWallet && hasPermission(session, 'commission.read'))),
    canViewElevated: hasFinanceEntitlement && hasBranch && canViewElevated,
  };
}

function buildWalletModel(
  base: ProfessionalWalletBaseModel,
  state: ProfessionalWalletViewState,
  description: string,
  accruals: readonly CommissionAccrual[],
  payouts: readonly Payout[],
  error?: ProfessionalWalletViewModel['error'],
): ProfessionalWalletViewModel {
  const productionAmountCents = accruals.reduce(
    (total, accrual) => total + accrual.baseAmountCents,
    0,
  );
  const openCommissionAmountCents = accruals
    .filter((accrual) => accrual.status === 'OPEN')
    .reduce((total, accrual) => total + accrual.commissionAmountCents, 0);
  const paidPayoutAmountCents = payouts
    .filter((payout) => payout.status === 'PAID')
    .reduce((total, payout) => total + payout.totalAmountCents, 0);
  const expectedBalanceAmountCents = openCommissionAmountCents;

  return {
    ...base,
    state,
    description,
    metrics: metricsFor(
      productionAmountCents,
      openCommissionAmountCents,
      paidPayoutAmountCents,
      expectedBalanceAmountCents,
    ),
    productionAmountCents,
    productionAmountLabel: formatCurrency(productionAmountCents),
    openCommissionAmountCents,
    openCommissionAmountLabel: formatCurrency(openCommissionAmountCents),
    paidPayoutAmountCents,
    paidPayoutAmountLabel: formatCurrency(paidPayoutAmountCents),
    expectedBalanceAmountCents,
    expectedBalanceAmountLabel: formatCurrency(expectedBalanceAmountCents),
    accruals: base.canRead ? accruals.map(toAccrualModel) : [],
    payouts: base.canRead ? payouts.map(toPayoutModel) : [],
    allowedActions: actionsFor(base, state),
    error,
  };
}

function metricsFor(
  productionAmountCents: number,
  openCommissionAmountCents: number,
  paidPayoutAmountCents: number,
  expectedBalanceAmountCents: number,
): readonly ProfessionalWalletMetricModel[] {
  return [
    {
      label: 'Producao',
      amountCents: productionAmountCents,
      amountLabel: formatCurrency(productionAmountCents),
      tone: productionAmountCents > 0 ? 'success' : 'neutral',
    },
    {
      label: 'Comissoes abertas',
      amountCents: openCommissionAmountCents,
      amountLabel: formatCurrency(openCommissionAmountCents),
      tone: openCommissionAmountCents > 0 ? 'warning' : 'neutral',
    },
    {
      label: 'Repasses pagos',
      amountCents: paidPayoutAmountCents,
      amountLabel: formatCurrency(paidPayoutAmountCents),
      tone: paidPayoutAmountCents > 0 ? 'success' : 'neutral',
    },
    {
      label: 'A receber',
      amountCents: expectedBalanceAmountCents,
      amountLabel: formatCurrency(expectedBalanceAmountCents),
      tone: expectedBalanceAmountCents > 0 ? 'success' : 'neutral',
    },
  ];
}

function toAccrualModel(accrual: CommissionAccrual): ProfessionalWalletAccrualModel {
  return {
    id: accrual.id,
    orderId: accrual.orderId,
    orderLabel: orderLabel(accrual.orderId),
    baseAmountCents: accrual.baseAmountCents,
    baseAmountLabel: formatCurrency(accrual.baseAmountCents),
    commissionAmountCents: accrual.commissionAmountCents,
    commissionAmountLabel: formatCurrency(accrual.commissionAmountCents),
    statusLabel: accrual.status === 'OPEN' ? 'Aberta' : 'Liquidada',
    statusTone: accrual.status === 'OPEN' ? 'warning' : 'success',
    accruedAtLabel: dateFormatter.format(new Date(accrual.accruedAt)),
  };
}

function toPayoutModel(payout: Payout): ProfessionalWalletPayoutModel {
  return {
    id: payout.id,
    periodLabel: periodLabelFor(payout.periodStart, payout.periodEnd),
    statusLabel:
      payout.status === 'PAID' ? 'Pago' : payout.status === 'CLOSED' ? 'Fechado' : 'Em aberto',
    statusTone: payout.status === 'PAID' ? 'success' : 'warning',
    totalAmountCents: payout.totalAmountCents,
    totalAmountLabel: formatCurrency(payout.totalAmountCents),
    paymentMethodLabel: payout.paymentMethod
      ? paymentMethodLabels[payout.paymentMethod]
      : undefined,
    paidAtLabel: payout.paidAt ? dateFormatter.format(new Date(payout.paidAt)) : undefined,
  };
}

function actionsFor(
  base: ProfessionalWalletBaseModel,
  state: ProfessionalWalletViewState,
): readonly ProfessionalWalletActionModel[] {
  const stateReason = unavailableReasonForState(state);
  return [
    {
      id: 'wallet.refresh',
      label: 'Recarregar',
      enabled: base.canRead && state !== 'permission-denied',
      reason: base.canRead ? undefined : 'Sem permissao para visualizar esta carteira.',
    },
    {
      id: 'wallet.view-payouts',
      label: 'Ver repasses',
      enabled:
        base.canRead && state !== 'offline' && state !== 'error' && state !== 'permission-denied',
      reason: base.canRead ? stateReason : 'Sem permissao para visualizar esta carteira.',
    },
  ];
}

function unavailableReasonForState(state: ProfessionalWalletViewState) {
  if (state === 'offline') return 'Disponivel quando a conexao voltar.';
  if (state === 'error') return 'Recarregue a carteira antes de navegar.';
  if (state === 'permission-denied') return 'Sem permissao para visualizar esta carteira.';
  return undefined;
}

function developmentStateFrom(
  state: string | undefined,
): DevelopmentProfessionalWalletOptions['state'] {
  if (state === 'empty' || state === 'error' || state === 'offline') return state;
  return undefined;
}

function defaultProfessionalIdFor(session: SessionContext) {
  if (session.role === 'PROFESSIONAL') return session.userId;
  return 'dev-professional-lucas';
}

function professionalNameFor(professionalId: string) {
  return professionalNames.get(professionalId) ?? 'Profissional autorizado';
}

function orderLabel(orderId: string) {
  const normalized = orderId.replace(/\D/g, '');
  return `Comanda #${normalized.slice(-4) || orderId.slice(-4)}`;
}

function branchNameFor(session: SessionContext, branchId: string) {
  return (
    session.availableWorkspaces?.find((workspace) => workspace.branchId === branchId)?.branchName ??
    (branchId === session.activeBranchId ? session.branchName : 'Unidade autorizada')
  );
}

function periodLabelFor(start: string, end: string) {
  return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
}

function formatDateOnly(value: string) {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}
