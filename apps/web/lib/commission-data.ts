import type {
  CommissionAccrual,
  CommissionAccrualStatus,
  CommissionRule,
  CommissionRuleScope,
  PaymentMethod,
  Payout,
  PayoutStatus,
  Permission,
  SessionContext,
} from '@barberos/contracts';

export type CommissionsViewState =
  'ready' | 'no-rule' | 'empty' | 'permission-denied' | 'error' | 'offline';
export type CommissionTone = 'neutral' | 'success' | 'warning' | 'danger';

export type CommissionActionId =
  | 'commissions.refresh'
  | 'commissions.create-rule'
  | 'commissions.close-payout'
  | 'commissions.pay-payout'
  | 'commissions.correct-payout';

export type CommissionActionModel = {
  id: CommissionActionId;
  label: string;
  enabled: boolean;
  reason?: string;
};

export type CommissionRuleModel = {
  id: string;
  label: string;
  scope: CommissionRuleScope;
  scopeLabel: string;
  typeLabel: string;
  statusLabel: string;
  statusTone: CommissionTone;
  valueLabel: string;
  effectivePeriodLabel: string;
  canEdit: boolean;
};

export type CommissionAccrualModel = {
  id: string;
  professionalId: string;
  professionalName: string;
  orderId: string;
  orderLabel: string;
  baseAmountCents: number;
  baseAmountLabel: string;
  commissionAmountCents: number;
  commissionAmountLabel: string;
  status: CommissionAccrualStatus;
  statusLabel: string;
  statusTone: CommissionTone;
  ruleSnapshotLabel: string;
  payoutId?: string;
};

export type PayoutModel = {
  id: string;
  professionalId: string;
  professionalName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  status: PayoutStatus;
  statusLabel: string;
  statusTone: CommissionTone;
  totalAmountCents: number;
  totalAmountLabel: string;
  sourceCount: number;
  paymentMethodLabel?: string;
  canPay: boolean;
  canCorrect: boolean;
  unavailableReason?: string;
};

export type CommissionNoRuleItemModel = {
  orderId: string;
  orderItemId: string;
  orderLabel: string;
  itemLabel: string;
  professionalName: string;
  sourceTypeLabel: string;
  baseAmountCents: number;
  baseAmountLabel: string;
  reason: string;
};

export type CommissionTotalsModel = {
  openAccrualAmountCents: number;
  openAccrualAmountLabel: string;
  settledAccrualAmountCents: number;
  settledAccrualAmountLabel: string;
  paidPayoutAmountCents: number;
  paidPayoutAmountLabel: string;
  payoutPendingAmountCents: number;
  payoutPendingAmountLabel: string;
  professionalCount: number;
  accrualCount: number;
  noRuleItemCount: number;
};

export type CommissionsViewModel = {
  state: CommissionsViewState;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  canRead: boolean;
  canManage: boolean;
  totals: CommissionTotalsModel;
  rules: readonly CommissionRuleModel[];
  openAccruals: readonly CommissionAccrualModel[];
  payouts: readonly PayoutModel[];
  noRuleItems: readonly CommissionNoRuleItemModel[];
  allowedActions: readonly CommissionActionModel[];
  error?: { code: string; message: string; requestId: string };
};

type DevelopmentCommissionsOptions = {
  branchId?: string;
  scenario?: 'open-accrual' | 'no-rule' | 'closed-payout' | 'paid-payout' | 'empty';
  state?: 'error' | 'offline';
};
type CommissionsViewOptions = {
  branchId?: string;
  scenario?: string;
  state?: string;
};

type CommissionsBaseModel = ReturnType<typeof baseModel>;

const periodStart = '2026-09-01';
const periodEnd = '2026-09-30';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
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

const developmentRules: readonly CommissionRule[] = [
  {
    id: 'dev-commission-rule-default',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    scope: 'TENANT_DEFAULT',
    type: 'PERCENTAGE',
    status: 'ACTIVE',
    percentageBps: 5000,
    effectiveFrom: '2026-09-01',
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'dev-commission-rule-service',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    scope: 'SERVICE',
    type: 'PERCENTAGE',
    status: 'ACTIVE',
    sourceType: 'SERVICE',
    sourceId: 'dev-service-beard',
    percentageBps: 6000,
    effectiveFrom: '2026-09-01',
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
];

const openAccrual: CommissionAccrual = {
  id: 'dev-open-accrual-1901',
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
};

const settledAccrual: CommissionAccrual = {
  id: 'dev-settled-accrual-1902',
  tenantId: 'dev-tenant',
  branchId: 'dev-branch',
  professionalId: 'dev-professional-carlos',
  orderId: 'dev-order-1003',
  orderItemId: 'dev-order-item-1003',
  paymentId: 'dev-payment-1002',
  ruleId: 'dev-commission-rule-default',
  ruleTypeSnapshot: 'PERCENTAGE',
  ruleScopeSnapshot: 'TENANT_DEFAULT',
  rulePercentageBpsSnapshot: 5000,
  baseAmountCents: 7_000,
  commissionAmountCents: 3_500,
  status: 'SETTLED',
  accruedAt: '2026-09-06T16:12:00.000Z',
  payoutId: 'dev-payout-2001',
  createdAt: '2026-09-06T16:12:00.000Z',
  updatedAt: '2026-09-07T17:00:00.000Z',
};

const closedPayout: Payout = {
  id: 'dev-payout-closed',
  tenantId: 'dev-tenant',
  branchId: 'dev-branch',
  professionalId: 'dev-professional-lucas',
  status: 'CLOSED',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-15',
  totalAmountCents: 4_250,
  sources: [{ accrualId: openAccrual.id, amountCents: 4_250 }],
  idempotencyKey: 'seed-payout-close-lucas',
  closedBy: 'dev-user',
  closedAt: '2026-09-15T21:00:00.000Z',
  createdAt: '2026-09-15T21:00:00.000Z',
  updatedAt: '2026-09-15T21:00:00.000Z',
};

const paidPayout: Payout = {
  id: 'dev-payout-2001',
  tenantId: 'dev-tenant',
  branchId: 'dev-branch',
  professionalId: 'dev-professional-carlos',
  status: 'PAID',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-07',
  totalAmountCents: 3_500,
  sources: [{ accrualId: settledAccrual.id, amountCents: 3_500 }],
  paymentMethod: 'PIX',
  financialEntryId: 'dev-finance-entry-payout-2001',
  idempotencyKey: 'seed-payout-close-2001',
  closedBy: 'dev-user',
  closedAt: '2026-09-07T17:00:00.000Z',
  paidBy: 'dev-user',
  paidAt: '2026-09-07T17:10:00.000Z',
  createdAt: '2026-09-07T17:00:00.000Z',
  updatedAt: '2026-09-07T17:10:00.000Z',
};

const noRuleItems: readonly CommissionNoRuleItemModel[] = [
  {
    orderId: 'dev-order-1004',
    orderItemId: 'dev-order-item-product-no-rule',
    orderLabel: 'Comanda #1004',
    itemLabel: 'Pomada matte',
    professionalName: 'Lucas Pereira',
    sourceTypeLabel: 'Produto',
    baseAmountCents: 3_200,
    baseAmountLabel: formatCurrency(3_200),
    reason: 'Nenhuma regra ativa corresponde ao item e profissional.',
  },
];

export async function getCommissionsViewModel(
  session: SessionContext,
  options: CommissionsViewOptions = {},
): Promise<CommissionsViewModel> {
  return getDevelopmentCommissionsViewModel(session, {
    branchId: options.branchId,
    scenario: developmentScenarioFrom(options.scenario),
    state: developmentStateFrom(options.state),
  });
}

export function getDevelopmentCommissionsViewModel(
  session: SessionContext,
  options: DevelopmentCommissionsOptions = {},
): CommissionsViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return buildCommissionsModel(
      base,
      'permission-denied',
      'Seu perfil nao pode visualizar comissoes e repasses desta unidade.',
      [],
      [],
      [],
      [],
    );
  }

  if (options.state === 'error') {
    return buildCommissionsModel(
      base,
      'error',
      'Nao foi possivel carregar comissoes agora.',
      [],
      [],
      [],
      [],
      {
        code: 'COMMISSION_VALIDATION_ERROR',
        message: 'Comissoes locais indisponiveis.',
        requestId: 'local-commissions-error',
      },
    );
  }

  if (options.state === 'offline') {
    return buildCommissionsModel(
      base,
      'offline',
      'Voce esta offline. Fechamento e pagamento de repasses ficam pausados.',
      [],
      [],
      [],
      [],
    );
  }

  if (options.scenario === 'empty') {
    return buildCommissionsModel(
      base,
      'empty',
      'Nenhuma comissao ou regra encontrada neste periodo.',
      [],
      [],
      [],
      [],
    );
  }

  if (options.scenario === 'no-rule') {
    return buildCommissionsModel(
      base,
      'no-rule',
      'Existem itens pagos sem regra de comissao ativa.',
      [],
      [],
      [],
      noRuleItems,
    );
  }

  if (options.scenario === 'closed-payout') {
    return buildCommissionsModel(
      base,
      'ready',
      'Repasse fechado aguardando pagamento.',
      developmentRules,
      [{ ...openAccrual, status: 'SETTLED', payoutId: closedPayout.id }],
      [closedPayout],
      [],
    );
  }

  if (options.scenario === 'paid-payout') {
    return buildCommissionsModel(
      base,
      'ready',
      'Repasse pago com historico financeiro preservado.',
      developmentRules,
      [settledAccrual],
      [paidPayout],
      [],
    );
  }

  return buildCommissionsModel(
    base,
    'ready',
    'Comissoes abertas, regras ativas e repasses do periodo.',
    developmentRules,
    [openAccrual],
    [],
    [],
  );
}

function baseModel(session: SessionContext, branchId: string) {
  const hasFinanceEntitlement = (session.entitlements ?? []).includes('finance');
  const hasBranch = session.branchScope.includes(branchId);
  return {
    title: 'Comissoes/Repasses',
    description: 'Regras, producao comissionada e pagamentos de profissionais.',
    branchId,
    branchName: branchNameFor(session, branchId),
    periodStart,
    periodEnd,
    periodLabel: periodLabelFor(periodStart, periodEnd),
    canRead:
      (hasPermission(session, 'commission.read') || hasPermission(session, 'commission.manage')) &&
      hasFinanceEntitlement &&
      hasBranch,
    canManage: hasPermission(session, 'commission.manage') && hasFinanceEntitlement && hasBranch,
  };
}

function buildCommissionsModel(
  base: CommissionsBaseModel,
  state: CommissionsViewState,
  description: string,
  rules: readonly CommissionRule[],
  accruals: readonly CommissionAccrual[],
  payouts: readonly Payout[],
  diagnostics: readonly CommissionNoRuleItemModel[],
  error?: CommissionsViewModel['error'],
): CommissionsViewModel {
  const ruleModels = base.canRead ? rules.map((rule) => toRuleModel(rule, base, state)) : [];
  const payoutModels = base.canRead
    ? payouts.map((payout) => toPayoutModel(payout, base, state))
    : [];
  const accrualModels = base.canRead
    ? accruals.filter((accrual) => accrual.status === 'OPEN').map(toAccrualModel)
    : [];
  return {
    ...base,
    state,
    description,
    totals: totalsFor(accruals, payouts, diagnostics),
    rules: ruleModels,
    openAccruals: accrualModels,
    payouts: payoutModels,
    noRuleItems: base.canRead ? diagnostics : [],
    allowedActions: actionsFor(base, state, accrualModels, payoutModels, diagnostics),
    error,
  };
}

function toRuleModel(
  rule: CommissionRule,
  base: CommissionsBaseModel,
  state: CommissionsViewState,
): CommissionRuleModel {
  return {
    id: rule.id,
    label: ruleLabel(rule),
    scope: rule.scope,
    scopeLabel: scopeLabel(rule.scope),
    typeLabel: rule.type === 'PERCENTAGE' ? 'Percentual' : 'Valor fixo',
    statusLabel:
      rule.status === 'ACTIVE' ? 'Ativa' : rule.status === 'INACTIVE' ? 'Inativa' : 'Arquivada',
    statusTone: rule.status === 'ACTIVE' ? 'success' : 'neutral',
    valueLabel:
      rule.type === 'PERCENTAGE'
        ? formatPercentage(rule.percentageBps ?? 0)
        : formatCurrency(rule.fixedAmountCents ?? 0),
    effectivePeriodLabel: rule.effectiveUntil
      ? `${formatDateOnly(rule.effectiveFrom)} - ${formatDateOnly(rule.effectiveUntil)}`
      : `Desde ${formatDateOnly(rule.effectiveFrom)}`,
    canEdit: base.canManage && state !== 'offline' && state !== 'error',
  };
}

function toAccrualModel(accrual: CommissionAccrual): CommissionAccrualModel {
  return {
    id: accrual.id,
    professionalId: accrual.professionalId,
    professionalName: professionalNameFor(accrual.professionalId),
    orderId: accrual.orderId,
    orderLabel: orderLabel(accrual.orderId),
    baseAmountCents: accrual.baseAmountCents,
    baseAmountLabel: formatCurrency(accrual.baseAmountCents),
    commissionAmountCents: accrual.commissionAmountCents,
    commissionAmountLabel: formatCurrency(accrual.commissionAmountCents),
    status: accrual.status,
    statusLabel: accrualStatusLabel(accrual.status),
    statusTone: accrualStatusTone(accrual.status),
    ruleSnapshotLabel: ruleSnapshotLabel(accrual),
    payoutId: accrual.payoutId,
  };
}

function toPayoutModel(
  payout: Payout,
  base: CommissionsBaseModel,
  state: CommissionsViewState,
): PayoutModel {
  const canMutate = base.canManage && state === 'ready';
  const canPay = canMutate && ['CLOSED', 'APPROVED'].includes(payout.status);
  const canCorrect = canMutate && payout.status === 'PAID';
  return {
    id: payout.id,
    professionalId: payout.professionalId,
    professionalName: professionalNameFor(payout.professionalId),
    periodStart: payout.periodStart,
    periodEnd: payout.periodEnd,
    periodLabel: periodLabelFor(payout.periodStart, payout.periodEnd),
    status: payout.status,
    statusLabel: payoutStatusLabel(payout.status),
    statusTone: payoutStatusTone(payout.status),
    totalAmountCents: payout.totalAmountCents,
    totalAmountLabel: formatCurrency(payout.totalAmountCents),
    sourceCount: payout.sources.length,
    paymentMethodLabel: payout.paymentMethod
      ? paymentMethodLabels[payout.paymentMethod]
      : undefined,
    canPay,
    canCorrect,
    unavailableReason: payoutUnavailableReason(base, state, payout),
  };
}

function actionsFor(
  base: CommissionsBaseModel,
  state: CommissionsViewState,
  accruals: readonly CommissionAccrualModel[],
  payouts: readonly PayoutModel[],
  diagnostics: readonly CommissionNoRuleItemModel[],
): readonly CommissionActionModel[] {
  const stateReason = unavailableReasonForState(state);
  const hasOpenAccrual = accruals.length > 0;
  const hasPayablePayout = payouts.some((payout) => payout.canPay);
  const hasPaidPayout = payouts.some((payout) => payout.canCorrect);
  return [
    {
      id: 'commissions.refresh',
      label: 'Recarregar',
      enabled: base.canRead && state !== 'permission-denied',
      reason: base.canRead ? undefined : 'Sem permissao para visualizar comissoes.',
    },
    {
      id: 'commissions.create-rule',
      label: diagnostics.length > 0 ? 'Criar regra para item' : 'Nova regra',
      enabled:
        base.canManage && state !== 'offline' && state !== 'error' && state !== 'permission-denied',
      reason: actionReason(base.canManage, stateReason, 'Sem permissao para configurar comissoes.'),
    },
    {
      id: 'commissions.close-payout',
      label: 'Fechar repasse',
      enabled: base.canManage && state === 'ready' && hasOpenAccrual,
      reason: selectedActionReason(
        base.canManage,
        stateReason,
        hasOpenAccrual,
        'Nenhuma comissao aberta para fechar.',
      ),
    },
    {
      id: 'commissions.pay-payout',
      label: 'Pagar repasse',
      enabled: base.canManage && state === 'ready' && hasPayablePayout,
      reason: selectedActionReason(
        base.canManage,
        stateReason,
        hasPayablePayout,
        'Nenhum repasse fechado para pagar.',
      ),
    },
    {
      id: 'commissions.correct-payout',
      label: 'Corrigir repasse pago',
      enabled: base.canManage && state === 'ready' && hasPaidPayout,
      reason: selectedActionReason(
        base.canManage,
        stateReason,
        hasPaidPayout,
        'Nenhum repasse pago para corrigir.',
      ),
    },
  ];
}

function actionReason(hasAccess: boolean, stateReason: string | undefined, deniedReason: string) {
  if (!hasAccess) return deniedReason;
  return stateReason;
}

function selectedActionReason(
  hasAccess: boolean,
  stateReason: string | undefined,
  hasSelectable: boolean,
  emptyReason: string,
) {
  if (!hasAccess) return 'Sem permissao para gerenciar comissoes.';
  if (stateReason) return stateReason;
  if (!hasSelectable) return emptyReason;
  return undefined;
}

function unavailableReasonForState(state: CommissionsViewState) {
  if (state === 'offline') return 'Disponivel quando a conexao voltar.';
  if (state === 'error') return 'Recarregue comissoes antes de executar esta acao.';
  if (state === 'permission-denied') return 'Sem permissao para visualizar comissoes.';
  return undefined;
}

function payoutUnavailableReason(
  base: CommissionsBaseModel,
  state: CommissionsViewState,
  payout: Payout,
) {
  if (!base.canManage) return 'Sem permissao para gerenciar repasses.';
  if (state === 'offline') return 'Disponivel quando a conexao voltar.';
  if (state === 'error') return 'Recarregue comissoes antes de executar esta acao.';
  if (payout.status === 'PAID') return 'Repasse pago aceita apenas correcao auditavel.';
  if (!['CLOSED', 'APPROVED'].includes(payout.status))
    return 'Status do repasse nao permite pagamento.';
  return undefined;
}

function developmentScenarioFrom(
  scenario: string | undefined,
): DevelopmentCommissionsOptions['scenario'] {
  if (
    scenario === 'open-accrual' ||
    scenario === 'no-rule' ||
    scenario === 'closed-payout' ||
    scenario === 'paid-payout' ||
    scenario === 'empty'
  ) {
    return scenario;
  }
  return undefined;
}

function developmentStateFrom(state: string | undefined): DevelopmentCommissionsOptions['state'] {
  if (state === 'error' || state === 'offline') return state;
  return undefined;
}

function totalsFor(
  accruals: readonly CommissionAccrual[],
  payouts: readonly Payout[],
  diagnostics: readonly CommissionNoRuleItemModel[],
): CommissionTotalsModel {
  const openAccrualAmountCents = sumAccruals(accruals, ['OPEN']);
  const settledAccrualAmountCents = sumAccruals(accruals, ['SETTLED']);
  const paidPayoutAmountCents = payouts
    .filter((payout) => payout.status === 'PAID')
    .reduce((total, payout) => total + payout.totalAmountCents, 0);
  const payoutPendingAmountCents = payouts
    .filter((payout) => ['CLOSED', 'APPROVED'].includes(payout.status))
    .reduce((total, payout) => total + payout.totalAmountCents, 0);
  const professionalCount = new Set([
    ...accruals.map((accrual) => accrual.professionalId),
    ...payouts.map((payout) => payout.professionalId),
  ]).size;

  return {
    openAccrualAmountCents,
    openAccrualAmountLabel: formatCurrency(openAccrualAmountCents),
    settledAccrualAmountCents,
    settledAccrualAmountLabel: formatCurrency(settledAccrualAmountCents),
    paidPayoutAmountCents,
    paidPayoutAmountLabel: formatCurrency(paidPayoutAmountCents),
    payoutPendingAmountCents,
    payoutPendingAmountLabel: formatCurrency(payoutPendingAmountCents),
    professionalCount,
    accrualCount: accruals.length,
    noRuleItemCount: diagnostics.length,
  };
}

function sumAccruals(
  accruals: readonly CommissionAccrual[],
  statuses: readonly CommissionAccrualStatus[],
) {
  return accruals
    .filter((accrual) => statuses.includes(accrual.status))
    .reduce((total, accrual) => total + accrual.commissionAmountCents, 0);
}

function ruleLabel(rule: CommissionRule) {
  if (rule.scope === 'TENANT_DEFAULT') return 'Padrao da unidade';
  if (rule.scope === 'PROFESSIONAL')
    return `Profissional ${professionalNameFor(rule.professionalId ?? '')}`;
  return `${scopeLabel(rule.scope)} especifico`;
}

function scopeLabel(scope: CommissionRuleScope) {
  if (scope === 'TENANT_DEFAULT') return 'Padrao';
  if (scope === 'PROFESSIONAL') return 'Profissional';
  if (scope === 'SERVICE') return 'Servico';
  if (scope === 'PRODUCT') return 'Produto';
  return 'Item manual';
}

function accrualStatusLabel(status: CommissionAccrualStatus) {
  if (status === 'OPEN') return 'Aberta';
  if (status === 'SETTLED') return 'Liquidada';
  if (status === 'REVERSED') return 'Estornada';
  return 'Ajustada';
}

function accrualStatusTone(status: CommissionAccrualStatus): CommissionTone {
  if (status === 'OPEN') return 'warning';
  if (status === 'SETTLED') return 'success';
  if (status === 'REVERSED') return 'danger';
  return 'neutral';
}

function payoutStatusLabel(status: PayoutStatus) {
  if (status === 'DRAFT') return 'Rascunho';
  if (status === 'CLOSED') return 'Fechado';
  if (status === 'APPROVED') return 'Aprovado';
  if (status === 'PAID') return 'Pago';
  if (status === 'CANCELLED') return 'Cancelado';
  return 'Corrigido';
}

function payoutStatusTone(status: PayoutStatus): CommissionTone {
  if (status === 'PAID') return 'success';
  if (status === 'CLOSED' || status === 'APPROVED') return 'warning';
  if (status === 'CANCELLED') return 'danger';
  return 'neutral';
}

function ruleSnapshotLabel(accrual: CommissionAccrual) {
  if (accrual.ruleTypeSnapshot === 'PERCENTAGE') {
    return `${scopeLabel(accrual.ruleScopeSnapshot)} - ${formatPercentage(accrual.rulePercentageBpsSnapshot ?? 0)}`;
  }
  return `${scopeLabel(accrual.ruleScopeSnapshot)} - ${formatCurrency(accrual.ruleFixedAmountCentsSnapshot ?? 0)}`;
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

function formatPercentage(bps: number) {
  return `${bps / 100}%`;
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}
