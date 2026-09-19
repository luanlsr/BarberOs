import type {
  CommissionAccrual,
  CommissionRule,
  Expense,
  ExpenseCategory,
  FinanceSummary,
  FinancialEntry,
  Payout,
  Permission,
  SessionContext,
} from '@barberos/contracts';

export type FinanceViewState =
  'loading' | 'ready' | 'empty' | 'permission-denied' | 'error' | 'offline';
export type FinanceTone = 'neutral' | 'success' | 'warning' | 'danger';

export type FinanceMetricModel = {
  label: string;
  amountCents: number;
  amountLabel: string;
  tone: FinanceTone;
};
export type FinanceActionId =
  | 'finance.refresh'
  | 'finance.create-expense'
  | 'finance.manage-commissions'
  | 'finance.close-payout';
export type FinanceActionModel = {
  id: FinanceActionId;
  label: string;
  enabled: boolean;
  reason?: string;
};
export type FinanceCashFlowModel = {
  cashInAmountCents: number;
  cashInAmountLabel: string;
  cashOutAmountCents: number;
  cashOutAmountLabel: string;
  netCashFlowAmountCents: number;
  netCashFlowAmountLabel: string;
  tone: FinanceTone;
};

export type FinanceExpenseModel = {
  id: string;
  description: string;
  categoryName: string;
  status: Expense['status'];
  statusLabel: string;
  amountCents: number;
  amountLabel: string;
  dueDateLabel?: string;
};

export type FinanceCommissionModel = {
  openAccrualAmountCents: number;
  openAccrualAmountLabel: string;
  paidPayoutAmountCents: number;
  paidPayoutAmountLabel: string;
  openAccrualCount: number;
  payoutCount: number;
};

export type FinanceViewModel = {
  state: FinanceViewState;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  canRead: boolean;
  canCreateExpense: boolean;
  canManageCommissions: boolean;
  canClosePayout: boolean;
  summary: FinanceSummary;
  metrics: readonly FinanceMetricModel[];
  expenses: readonly FinanceExpenseModel[];
  commission: FinanceCommissionModel;
  cashFlow: FinanceCashFlowModel;
  allowedActions: readonly FinanceActionModel[];
  error?: { code: string; message: string; requestId: string };
};

type DevelopmentFinanceOptions = {
  branchId?: string;
  state?: 'loading' | 'populated' | 'empty' | 'error' | 'offline';
};
type FinanceViewOptions = {
  branchId?: string;
  state?: string;
};
type FinanceBaseModel = ReturnType<typeof baseModel>;
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const periodStart = '2026-09-01';
const periodEnd = '2026-09-30';

const developmentExpenseCategories: readonly ExpenseCategory[] = [
  {
    id: 'dev-expense-category-rent',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Aluguel',
    description: 'Custos fixos da unidade',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'dev-expense-category-utilities',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Utilidades',
    description: 'Energia e servicos essenciais',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
];

const developmentFinancialEntries: readonly FinancialEntry[] = [
  {
    id: 'dev-finance-entry-payment-1001',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    direction: 'IN',
    type: 'SERVICE_REVENUE',
    status: 'POSTED',
    amountCents: 8_500,
    signedAmountCents: 8_500,
    competenceDate: '2026-09-07',
    cashDate: '2026-09-07',
    sourceType: 'PAYMENT',
    sourceId: 'dev-payment-1001',
    description: 'Receita da Comanda paga',
    idempotencyKey: 'seed-finance-payment-1001',
    createdBy: 'dev-user',
    createdAt: '2026-09-07T15:20:00.000Z',
  },
  {
    id: 'dev-finance-entry-payment-1002',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    direction: 'IN',
    type: 'SERVICE_REVENUE',
    status: 'POSTED',
    amountCents: 7_000,
    signedAmountCents: 7_000,
    competenceDate: '2026-09-06',
    cashDate: '2026-09-06',
    sourceType: 'PAYMENT',
    sourceId: 'dev-payment-1002',
    description: 'Receita da Comanda paga para repasse',
    idempotencyKey: 'seed-finance-payment-1002',
    createdBy: 'dev-user',
    createdAt: '2026-09-06T16:12:00.000Z',
  },
  {
    id: 'dev-finance-entry-expense-1601',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    direction: 'OUT',
    type: 'EXPENSE',
    status: 'POSTED',
    amountCents: 4_200,
    signedAmountCents: -4_200,
    competenceDate: '2026-09-05',
    cashDate: '2026-09-05',
    sourceType: 'EXPENSE',
    sourceId: 'dev-expense-energy',
    categoryId: 'dev-expense-category-utilities',
    description: 'Conta de energia paga',
    idempotencyKey: 'seed-finance-expense-1601',
    createdBy: 'dev-user',
    createdAt: '2026-09-05T13:00:00.000Z',
  },
  {
    id: 'dev-finance-entry-expense-accounting',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    direction: 'OUT',
    type: 'EXPENSE',
    status: 'POSTED',
    amountCents: 65_000,
    signedAmountCents: -65_000,
    competenceDate: '2026-08-31',
    cashDate: '2026-09-07',
    sourceType: 'EXPENSE',
    sourceId: 'dev-expense-accounting',
    categoryId: 'dev-expense-category-utilities',
    description: 'Honorarios contabeis pagos em dinheiro',
    idempotencyKey: 'seed-finance-expense-accounting-cash',
    createdBy: 'dev-user',
    createdAt: '2026-09-07T16:20:00.000Z',
  },
  {
    id: 'dev-finance-entry-payout-2001',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    direction: 'OUT',
    type: 'PAYOUT',
    status: 'POSTED',
    amountCents: 3_500,
    signedAmountCents: -3_500,
    competenceDate: '2026-09-06',
    cashDate: '2026-09-07',
    sourceType: 'PAYOUT',
    sourceId: 'dev-payout-2001',
    description: 'Repasse pago ao profissional Carlos',
    idempotencyKey: 'seed-finance-payout-2001',
    createdBy: 'dev-user',
    createdAt: '2026-09-07T17:10:00.000Z',
  },
];

const developmentExpenses: readonly Expense[] = [
  {
    id: 'dev-expense-energy',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    categoryId: 'dev-expense-category-utilities',
    description: 'Energia da Unidade Centro',
    vendorName: 'Energia SP',
    status: 'PAID',
    amountCents: 4_200,
    competenceDate: '2026-09-05',
    dueDate: '2026-09-10',
    cashDate: '2026-09-05',
    paymentMethod: 'PIX',
    documentMetadata: {},
    financialEntryId: 'dev-finance-entry-expense-1601',
    idempotencyKey: 'seed-expense-1601',
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    paidBy: 'dev-user',
    paidAt: '2026-09-05T13:00:00.000Z',
    createdAt: '2026-09-05T12:30:00.000Z',
    updatedAt: '2026-09-05T13:00:00.000Z',
  },
  {
    id: 'dev-expense-accounting',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    categoryId: 'dev-expense-category-utilities',
    description: 'Honorarios contabeis de agosto',
    vendorName: 'Contabilidade Prime',
    status: 'PAID',
    amountCents: 65_000,
    competenceDate: '2026-08-31',
    dueDate: '2026-09-07',
    cashDate: '2026-09-07',
    paymentMethod: 'CASH',
    documentMetadata: {},
    financialEntryId: 'dev-finance-entry-expense-accounting',
    idempotencyKey: 'seed-expense-accounting-cash',
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    paidBy: 'dev-user',
    paidAt: '2026-09-07T16:20:00.000Z',
    createdAt: '2026-08-31T12:30:00.000Z',
    updatedAt: '2026-09-07T16:20:00.000Z',
  },
  {
    id: 'dev-expense-rent-open',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    categoryId: 'dev-expense-category-rent',
    description: 'Aluguel de outubro da Unidade Centro',
    vendorName: 'Imobiliaria Centro',
    status: 'OPEN',
    amountCents: 120_000,
    competenceDate: '2026-10-01',
    dueDate: '2026-10-05',
    recurrenceKey: 'rent-monthly-centro',
    documentMetadata: {},
    idempotencyKey: 'seed-expense-1602',
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T18:00:00.000Z',
    updatedAt: '2026-09-07T18:00:00.000Z',
  },
];

export const developmentCommissionRules: readonly CommissionRule[] = [
  {
    id: 'dev-commission-rule-default',
    tenantId: 'dev-tenant',
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
];

const developmentCommissionAccruals: readonly CommissionAccrual[] = [
  {
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
  },
  {
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
  },
];

const developmentPayouts: readonly Payout[] = [
  {
    id: 'dev-payout-2001',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    professionalId: 'dev-professional-carlos',
    status: 'PAID',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-07',
    totalAmountCents: 3_500,
    sources: [{ accrualId: 'dev-settled-accrual-1902', amountCents: 3_500 }],
    paymentMethod: 'PIX',
    financialEntryId: 'dev-finance-entry-payout-2001',
    idempotencyKey: 'seed-payout-close-2001',
    closedBy: 'dev-user',
    closedAt: '2026-09-07T17:00:00.000Z',
    paidBy: 'dev-user',
    paidAt: '2026-09-07T17:10:00.000Z',
    createdAt: '2026-09-07T17:00:00.000Z',
    updatedAt: '2026-09-07T17:10:00.000Z',
  },
];

export async function getFinanceViewModel(
  session: SessionContext,
  options: FinanceViewOptions = {},
): Promise<FinanceViewModel> {
  return getDevelopmentFinanceViewModel(session, {
    branchId: options.branchId,
    state: developmentStateFrom(options.state),
  });
}

export function getDevelopmentFinanceViewModel(
  session: SessionContext,
  options: DevelopmentFinanceOptions = {},
): FinanceViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const base = baseModel(session, branchId);
  const empty = emptySummary(session.tenantId, branchId);

  if (!base.canRead) {
    return buildFinanceModel(
      base,
      'permission-denied',
      'Seu perfil nao pode visualizar o financeiro desta unidade.',
      empty,
      [],
      emptyCommission(),
    );
  }

  if (options.state === 'loading') {
    return buildFinanceModel(
      base,
      'loading',
      'Carregando resumo financeiro da unidade.',
      empty,
      [],
      emptyCommission(),
    );
  }

  if (options.state === 'offline') {
    return buildFinanceModel(
      base,
      'offline',
      'Voce esta offline. Acoes financeiras ficam pausadas ate a conexao voltar.',
      empty,
      [],
      emptyCommission(),
    );
  }

  if (options.state === 'error') {
    return buildFinanceModel(
      base,
      'error',
      'Nao foi possivel carregar o financeiro local.',
      empty,
      [],
      emptyCommission(),
      {
        code: 'FINANCE_VALIDATION_ERROR',
        message: 'Financeiro local indisponivel.',
        requestId: 'local-finance-error',
      },
    );
  }

  if (options.state === 'empty') {
    return buildFinanceModel(
      base,
      'empty',
      'Nenhum lancamento financeiro neste periodo.',
      empty,
      [],
      emptyCommission(),
    );
  }

  const entries = developmentFinancialEntries.filter((entry) => entry.branchId === branchId);
  const expenses = developmentExpenses.filter((expense) => expense.branchId === branchId);
  const accruals = developmentCommissionAccruals.filter((accrual) => accrual.branchId === branchId);
  const payouts = developmentPayouts.filter((payout) => payout.branchId === branchId);
  const summary = summaryFrom(session.tenantId, branchId, entries, accruals, payouts);
  const commission = commissionModel(accruals, payouts);
  const state =
    entries.length || expenses.length || accruals.length || payouts.length ? 'ready' : 'empty';

  return buildFinanceModel(
    base,
    state,
    'Resumo financeiro local com receitas, despesas, comissoes e repasses.',
    summary,
    expenses.map(toExpenseModel),
    commission,
  );
}
function baseModel(session: SessionContext, branchId: string) {
  const hasFinanceEntitlement = (session.entitlements ?? []).includes('finance');
  const hasBranch = session.branchScope.includes(branchId);
  return {
    title: 'Financeiro',
    description: 'Resumo financeiro da unidade.',
    branchId,
    branchName: branchNameFor(session, branchId),
    periodStart,
    periodEnd,
    periodLabel: periodLabelFor(periodStart, periodEnd),
    canRead: hasPermission(session, 'finance.read') && hasFinanceEntitlement && hasBranch,
    canCreateExpense: hasPermission(session, 'finance.write') && hasFinanceEntitlement && hasBranch,
    canManageCommissions:
      hasPermission(session, 'commission.manage') && hasFinanceEntitlement && hasBranch,
    canClosePayout:
      hasPermission(session, 'commission.manage') && hasFinanceEntitlement && hasBranch,
  };
}

function buildFinanceModel(
  base: FinanceBaseModel,
  state: FinanceViewState,
  description: string,
  summary: FinanceSummary,
  expenses: readonly FinanceExpenseModel[],
  commission: FinanceCommissionModel,
  error?: FinanceViewModel['error'],
): FinanceViewModel {
  return {
    ...base,
    state,
    description,
    summary,
    metrics: metricsFor(summary),
    expenses,
    commission,
    cashFlow: cashFlowFor(summary),
    allowedActions: actionsFor(base, state, commission),
    error,
  };
}

function actionsFor(
  base: FinanceBaseModel,
  state: FinanceViewState,
  commission: FinanceCommissionModel,
): readonly FinanceActionModel[] {
  const stateReason = unavailableReasonForState(state);
  const mutationsAllowed = state === 'ready' || state === 'empty';

  return [
    {
      id: 'finance.refresh',
      label: 'Recarregar',
      enabled: base.canRead && state !== 'loading' && state !== 'permission-denied',
      reason: base.canRead
        ? state === 'loading'
          ? 'Carregamento em andamento.'
          : undefined
        : 'Sem permissao para visualizar financeiro.',
    },
    {
      id: 'finance.create-expense',
      label: 'Nova despesa',
      enabled: base.canCreateExpense && mutationsAllowed,
      reason: actionReason(
        base.canCreateExpense,
        stateReason,
        'Sem permissao para criar despesas.',
      ),
    },
    {
      id: 'finance.manage-commissions',
      label: 'Comissoes/Repasses',
      enabled: base.canManageCommissions && mutationsAllowed,
      reason: actionReason(
        base.canManageCommissions,
        stateReason,
        'Sem permissao para gerenciar comissoes.',
      ),
    },
    {
      id: 'finance.close-payout',
      label: 'Fechar repasse',
      enabled: base.canClosePayout && state === 'ready' && commission.openAccrualAmountCents > 0,
      reason: payoutActionReason(base.canClosePayout, state, commission, stateReason),
    },
  ];
}

function actionReason(hasAccess: boolean, stateReason: string | undefined, deniedReason: string) {
  if (!hasAccess) return deniedReason;
  return stateReason;
}

function payoutActionReason(
  hasAccess: boolean,
  state: FinanceViewState,
  commission: FinanceCommissionModel,
  stateReason: string | undefined,
) {
  if (!hasAccess) return 'Sem permissao para fechar repasses.';
  if (stateReason) return stateReason;
  if (state !== 'ready' || commission.openAccrualAmountCents === 0) {
    return 'Nenhuma comissao aberta para fechar no periodo.';
  }
  return undefined;
}

function unavailableReasonForState(state: FinanceViewState) {
  if (state === 'loading') return 'Aguarde o carregamento.';
  if (state === 'offline') return 'Disponivel quando a conexao voltar.';
  if (state === 'error') return 'Recarregue o financeiro antes de executar esta acao.';
  if (state === 'permission-denied') return 'Sem permissao para visualizar financeiro.';
  return undefined;
}
function developmentStateFrom(state: string | undefined): DevelopmentFinanceOptions['state'] {
  if (state === 'loading' || state === 'empty' || state === 'error' || state === 'offline') {
    return state;
  }
  return undefined;
}

function summaryFrom(
  tenantId: string,
  branchId: string,
  entries: readonly FinancialEntry[],
  accruals: readonly CommissionAccrual[],
  payouts: readonly Payout[],
): FinanceSummary {
  const revenueAmountCents = entries
    .filter((entry) => entry.direction === 'IN')
    .reduce((total, entry) => total + entry.amountCents, 0);
  const expenseAmountCents = entries
    .filter((entry) => entry.type === 'EXPENSE')
    .reduce((total, entry) => total + entry.amountCents, 0);
  const paidPayoutAmountCents = payouts
    .filter((payout) => payout.status === 'PAID')
    .reduce((total, payout) => total + payout.totalAmountCents, 0);
  const commissionLiabilityAmountCents = accruals
    .filter((accrual) => accrual.status === 'OPEN')
    .reduce((total, accrual) => total + accrual.commissionAmountCents, 0);
  const cashInAmountCents = entries
    .filter((entry) => entry.direction === 'IN' && entry.cashDate)
    .reduce((total, entry) => total + entry.amountCents, 0);
  const cashOutAmountCents = entries
    .filter((entry) => entry.direction === 'OUT' && entry.cashDate)
    .reduce((total, entry) => total + entry.amountCents, 0);

  return {
    tenantId,
    branchId,
    periodStart,
    periodEnd,
    revenueAmountCents,
    expenseAmountCents,
    resultAmountCents: revenueAmountCents - expenseAmountCents,
    commissionLiabilityAmountCents,
    paidPayoutAmountCents,
    cashInAmountCents,
    cashOutAmountCents,
    entriesCount: entries.length,
  };
}

function emptySummary(tenantId: string, branchId: string): FinanceSummary {
  return {
    tenantId,
    branchId,
    periodStart,
    periodEnd,
    revenueAmountCents: 0,
    expenseAmountCents: 0,
    resultAmountCents: 0,
    commissionLiabilityAmountCents: 0,
    paidPayoutAmountCents: 0,
    cashInAmountCents: 0,
    cashOutAmountCents: 0,
    entriesCount: 0,
  };
}

function metricsFor(summary: FinanceSummary): readonly FinanceMetricModel[] {
  return [
    {
      label: 'Receitas',
      amountCents: summary.revenueAmountCents,
      amountLabel: formatCurrency(summary.revenueAmountCents),
      tone: 'success',
    },
    {
      label: 'Despesas',
      amountCents: summary.expenseAmountCents,
      amountLabel: formatCurrency(summary.expenseAmountCents),
      tone: summary.expenseAmountCents > 0 ? 'warning' : 'neutral',
    },
    {
      label: 'Resultado',
      amountCents: summary.resultAmountCents,
      amountLabel: formatSignedCurrency(summary.resultAmountCents),
      tone: summary.resultAmountCents >= 0 ? 'success' : 'danger',
    },
    {
      label: 'Comissoes abertas',
      amountCents: summary.commissionLiabilityAmountCents,
      amountLabel: formatCurrency(summary.commissionLiabilityAmountCents),
      tone: summary.commissionLiabilityAmountCents > 0 ? 'warning' : 'neutral',
    },
  ];
}

function cashFlowFor(summary: FinanceSummary): FinanceCashFlowModel {
  const netCashFlowAmountCents = summary.cashInAmountCents - summary.cashOutAmountCents;
  return {
    cashInAmountCents: summary.cashInAmountCents,
    cashInAmountLabel: formatCurrency(summary.cashInAmountCents),
    cashOutAmountCents: summary.cashOutAmountCents,
    cashOutAmountLabel: formatCurrency(summary.cashOutAmountCents),
    netCashFlowAmountCents,
    netCashFlowAmountLabel: formatSignedCurrency(netCashFlowAmountCents),
    tone: netCashFlowAmountCents >= 0 ? 'success' : 'danger',
  };
}
function toExpenseModel(expense: Expense): FinanceExpenseModel {
  const categoryName =
    developmentExpenseCategories.find((category) => category.id === expense.categoryId)?.name ??
    'Sem categoria';
  return {
    id: expense.id,
    description: expense.description,
    categoryName,
    status: expense.status,
    statusLabel: expenseStatusLabel(expense.status),
    amountCents: expense.amountCents,
    amountLabel: formatCurrency(expense.amountCents),
    dueDateLabel: expense.dueDate ? formatDateOnly(expense.dueDate) : undefined,
  };
}

function expenseStatusLabel(status: Expense['status']) {
  if (status === 'PAID') return 'Paga';
  if (status === 'CANCELLED') return 'Cancelada';
  return 'Aberta';
}
function commissionModel(
  accruals: readonly CommissionAccrual[],
  payouts: readonly Payout[],
): FinanceCommissionModel {
  const openAccrualAmountCents = accruals
    .filter((accrual) => accrual.status === 'OPEN')
    .reduce((total, accrual) => total + accrual.commissionAmountCents, 0);
  const paidPayoutAmountCents = payouts
    .filter((payout) => payout.status === 'PAID')
    .reduce((total, payout) => total + payout.totalAmountCents, 0);
  return {
    openAccrualAmountCents,
    openAccrualAmountLabel: formatCurrency(openAccrualAmountCents),
    paidPayoutAmountCents,
    paidPayoutAmountLabel: formatCurrency(paidPayoutAmountCents),
    openAccrualCount: accruals.filter((accrual) => accrual.status === 'OPEN').length,
    payoutCount: payouts.length,
  };
}

function emptyCommission(): FinanceCommissionModel {
  return {
    openAccrualAmountCents: 0,
    openAccrualAmountLabel: formatCurrency(0),
    paidPayoutAmountCents: 0,
    paidPayoutAmountLabel: formatCurrency(0),
    openAccrualCount: 0,
    payoutCount: 0,
  };
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

function formatSignedCurrency(cents: number) {
  const prefix = cents > 0 ? '+' : cents < 0 ? '-' : '';
  return prefix + formatCurrency(Math.abs(cents));
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}
