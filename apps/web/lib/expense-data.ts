import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethod,
  Permission,
  SessionContext,
} from '@barberos/contracts';

export type ExpensesViewState =
  'loading' | 'ready' | 'empty' | 'permission-denied' | 'error' | 'offline';
export type ExpenseTone = 'neutral' | 'success' | 'warning' | 'danger';

export type ExpenseActionId =
  'expenses.refresh' | 'expenses.create' | 'expenses.pay-selected' | 'expenses.cancel-selected';

export type ExpenseActionModel = {
  id: ExpenseActionId;
  label: string;
  enabled: boolean;
  reason?: string;
};

export type ExpenseStatusFilterModel = {
  status: ExpenseStatus | 'ALL';
  label: string;
  count: number;
  amountCents: number;
  amountLabel: string;
  tone: ExpenseTone;
};

export type ExpenseCategoryModel = {
  id: string;
  name: string;
  description?: string;
  status: ExpenseCategory['status'];
  expenseCount: number;
  openAmountCents: number;
  openAmountLabel: string;
  paidAmountCents: number;
  paidAmountLabel: string;
};

export type ExpenseTotalsModel = {
  openAmountCents: number;
  openAmountLabel: string;
  overdueAmountCents: number;
  overdueAmountLabel: string;
  paidAmountCents: number;
  paidAmountLabel: string;
  totalAmountCents: number;
  totalAmountLabel: string;
};

export type ExpenseItemModel = {
  id: string;
  description: string;
  vendorName?: string;
  categoryId?: string;
  categoryName: string;
  status: ExpenseStatus;
  statusLabel: string;
  statusTone: ExpenseTone;
  amountCents: number;
  amountLabel: string;
  competenceDate: string;
  competenceDateLabel: string;
  dueDate?: string;
  dueDateLabel?: string;
  cashDate?: string;
  cashDateLabel?: string;
  paymentMethod?: PaymentMethod;
  paymentMethodLabel?: string;
  recurrenceKey?: string;
  recurrenceLabel: string;
  hasAttachment: boolean;
  attachmentLabel?: string;
  canEdit: boolean;
  canPay: boolean;
  canCancel: boolean;
  unavailableReason?: string;
};

export type ExpensesViewModel = {
  state: ExpensesViewState;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  selectedStatus: ExpenseStatus | 'ALL';
  canRead: boolean;
  canWrite: boolean;
  totals: ExpenseTotalsModel;
  categories: readonly ExpenseCategoryModel[];
  statusFilters: readonly ExpenseStatusFilterModel[];
  expenses: readonly ExpenseItemModel[];
  allowedActions: readonly ExpenseActionModel[];
  error?: { code: string; message: string; requestId: string };
};

type DevelopmentExpensesOptions = {
  branchId?: string;
  status?: ExpenseStatus | 'ALL';
  state?: 'loading' | 'populated' | 'empty' | 'error' | 'offline';
};
type ExpensesViewOptions = {
  branchId?: string;
  status?: string;
  state?: string;
};

type ExpensesBaseModel = ReturnType<typeof baseModel>;

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

const statusLabels: Record<ExpenseStatus, string> = {
  OPEN: 'Aberta',
  DUE: 'Vence hoje',
  OVERDUE: 'Vencida',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
};

const statusTones: Record<ExpenseStatus, ExpenseTone> = {
  OPEN: 'neutral',
  DUE: 'warning',
  OVERDUE: 'danger',
  PAID: 'success',
  CANCELLED: 'neutral',
};

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
    description: 'Energia, agua e servicos essenciais',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'dev-expense-category-accounting',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Contabilidade',
    description: 'Servicos administrativos recorrentes',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
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
    documentMetadata: { fileName: 'energia-setembro.pdf' },
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
    recurrenceKey: 'MONTHLY:1:until=2026-12-01',
    documentMetadata: {},
    idempotencyKey: 'seed-expense-1602',
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T18:00:00.000Z',
    updatedAt: '2026-09-07T18:00:00.000Z',
  },
  {
    id: 'dev-expense-accounting-overdue',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    categoryId: 'dev-expense-category-accounting',
    description: 'Honorarios contabeis de agosto',
    vendorName: 'Contabil Prime',
    status: 'OVERDUE',
    amountCents: 65_000,
    competenceDate: '2026-08-01',
    dueDate: '2026-08-30',
    recurrenceKey: 'MONTHLY:1',
    documentMetadata: {},
    idempotencyKey: 'seed-expense-1603',
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
];

export async function getExpensesViewModel(
  session: SessionContext,
  options: ExpensesViewOptions = {},
): Promise<ExpensesViewModel> {
  return getDevelopmentExpensesViewModel(session, {
    branchId: options.branchId,
    status: expenseStatusFrom(options.status),
    state: developmentStateFrom(options.state),
  });
}

export function getDevelopmentExpensesViewModel(
  session: SessionContext,
  options: DevelopmentExpensesOptions = {},
): ExpensesViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const selectedStatus = options.status ?? 'ALL';
  const base = baseModel(session, branchId, selectedStatus);

  if (!base.canRead) {
    return buildExpensesModel(
      base,
      'permission-denied',
      'Seu perfil nao pode visualizar despesas desta unidade.',
      [],
      [],
    );
  }

  if (options.state === 'loading') {
    return buildExpensesModel(base, 'loading', 'Carregando despesas da unidade.', [], []);
  }

  if (options.state === 'error') {
    return buildExpensesModel(base, 'error', 'Nao foi possivel carregar despesas agora.', [], [], {
      code: 'FINANCE_VALIDATION_ERROR',
      message: 'Despesas locais indisponiveis.',
      requestId: 'local-expenses-error',
    });
  }

  if (options.state === 'offline') {
    return buildExpensesModel(
      base,
      'offline',
      'Voce esta offline. Pagamentos e cancelamentos de despesas ficam pausados.',
      [],
      [],
    );
  }

  if (options.state === 'empty') {
    return buildExpensesModel(
      base,
      'empty',
      'Nenhuma despesa encontrada para este periodo.',
      [],
      [],
    );
  }

  const periodExpenses = developmentExpenses.filter((expense) => expense.branchId === branchId);
  const filteredExpenses = filterExpenses(periodExpenses, selectedStatus);

  return buildExpensesModel(
    base,
    filteredExpenses.length ? 'ready' : 'empty',
    filteredExpenses.length
      ? 'Despesas por status, categoria e recorrencia para a unidade.'
      : 'Nenhuma despesa encontrada para este filtro.',
    filteredExpenses,
    periodExpenses,
  );
}

function baseModel(
  session: SessionContext,
  branchId: string,
  selectedStatus: ExpenseStatus | 'ALL',
) {
  const hasFinanceEntitlement = (session.entitlements ?? []).includes('finance');
  const hasBranch = session.branchScope.includes(branchId);
  return {
    title: 'Despesas',
    description: 'Contas, recorrencias e pagamentos da unidade.',
    branchId,
    branchName: branchNameFor(session, branchId),
    periodStart,
    periodEnd,
    periodLabel: periodLabelFor(periodStart, periodEnd),
    selectedStatus,
    canRead: hasPermission(session, 'finance.read') && hasFinanceEntitlement && hasBranch,
    canWrite: hasPermission(session, 'finance.write') && hasFinanceEntitlement && hasBranch,
  };
}

function buildExpensesModel(
  base: ExpensesBaseModel,
  state: ExpensesViewState,
  description: string,
  visibleExpenses: readonly Expense[],
  periodExpenses: readonly Expense[],
  error?: ExpensesViewModel['error'],
): ExpensesViewModel {
  const items = visibleExpenses
    .slice()
    .sort((a, b) => (a.dueDate ?? a.competenceDate).localeCompare(b.dueDate ?? b.competenceDate))
    .map((expense) => toExpenseItemModel(expense, base, state));

  return {
    ...base,
    state,
    description,
    totals: totalsFor(periodExpenses),
    categories: base.canRead ? categoriesFor(base.branchId, periodExpenses) : [],
    statusFilters: statusFiltersFor(periodExpenses),
    expenses: items,
    allowedActions: actionsFor(base, state, items),
    error,
  };
}

function filterExpenses(expenses: readonly Expense[], selectedStatus: ExpenseStatus | 'ALL') {
  if (selectedStatus === 'ALL') return expenses;
  return expenses.filter((expense) => expense.status === selectedStatus);
}

function toExpenseItemModel(
  expense: Expense,
  base: ExpensesBaseModel,
  state: ExpensesViewState,
): ExpenseItemModel {
  const category = developmentExpenseCategories.find((item) => item.id === expense.categoryId);
  const canMutate = base.canWrite && state === 'ready';
  const attachmentLabel = attachmentLabelFor(expense.documentMetadata);
  const payable = ['OPEN', 'DUE', 'OVERDUE'].includes(expense.status);
  const cancellable = expense.status !== 'PAID' && expense.status !== 'CANCELLED';

  return {
    id: expense.id,
    description: expense.description,
    vendorName: expense.vendorName,
    categoryId: expense.categoryId,
    categoryName: category?.name ?? 'Sem categoria',
    status: expense.status,
    statusLabel: statusLabels[expense.status],
    statusTone: statusTones[expense.status],
    amountCents: expense.amountCents,
    amountLabel: formatCurrency(expense.amountCents),
    competenceDate: expense.competenceDate,
    competenceDateLabel: formatDateOnly(expense.competenceDate),
    dueDate: expense.dueDate,
    dueDateLabel: expense.dueDate ? formatDateOnly(expense.dueDate) : undefined,
    cashDate: expense.cashDate,
    cashDateLabel: expense.cashDate ? formatDateOnly(expense.cashDate) : undefined,
    paymentMethod: expense.paymentMethod,
    paymentMethodLabel: expense.paymentMethod
      ? paymentMethodLabels[expense.paymentMethod]
      : undefined,
    recurrenceKey: expense.recurrenceKey,
    recurrenceLabel: recurrenceLabelFor(expense.recurrenceKey),
    hasAttachment: Boolean(attachmentLabel),
    attachmentLabel,
    canEdit: canMutate && expense.status !== 'PAID' && expense.status !== 'CANCELLED',
    canPay: canMutate && payable,
    canCancel: canMutate && cancellable,
    unavailableReason: unavailableReasonForExpense(base, state, expense),
  };
}

function unavailableReasonForExpense(
  base: ExpensesBaseModel,
  state: ExpensesViewState,
  expense: Expense,
) {
  if (!base.canWrite) return 'Sem permissao para alterar despesas.';
  if (state === 'offline') return 'Disponivel quando a conexao voltar.';
  if (state === 'error') return 'Recarregue despesas antes de executar esta acao.';
  if (state === 'permission-denied') return 'Sem permissao para visualizar despesas.';
  if (expense.status === 'PAID') return 'Despesa paga preserva historico financeiro.';
  if (expense.status === 'CANCELLED') return 'Despesa cancelada nao aceita alteracoes.';
  return undefined;
}

function actionsFor(
  base: ExpensesBaseModel,
  state: ExpensesViewState,
  expenses: readonly ExpenseItemModel[],
): readonly ExpenseActionModel[] {
  const stateReason = unavailableReasonForState(state);
  const hasPayableExpense = expenses.some((expense) => expense.canPay);
  const hasCancellableExpense = expenses.some((expense) => expense.canCancel);
  return [
    {
      id: 'expenses.refresh',
      label: 'Recarregar',
      enabled: base.canRead && state !== 'permission-denied',
      reason: base.canRead ? undefined : 'Sem permissao para visualizar despesas.',
    },
    {
      id: 'expenses.create',
      label: 'Nova despesa',
      enabled: base.canWrite && (state === 'ready' || state === 'empty'),
      reason: actionReason(base.canWrite, stateReason, 'Sem permissao para criar despesas.'),
    },
    {
      id: 'expenses.pay-selected',
      label: 'Pagar selecionada',
      enabled: base.canWrite && state === 'ready' && hasPayableExpense,
      reason: selectedActionReason(
        base.canWrite,
        stateReason,
        hasPayableExpense,
        'Nenhuma despesa aberta para pagar.',
      ),
    },
    {
      id: 'expenses.cancel-selected',
      label: 'Cancelar selecionada',
      enabled: base.canWrite && state === 'ready' && hasCancellableExpense,
      reason: selectedActionReason(
        base.canWrite,
        stateReason,
        hasCancellableExpense,
        'Nenhuma despesa aberta para cancelar.',
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
  if (!hasAccess) return 'Sem permissao para alterar despesas.';
  if (stateReason) return stateReason;
  if (!hasSelectable) return emptyReason;
  return undefined;
}

function unavailableReasonForState(state: ExpensesViewState) {
  if (state === 'offline') return 'Disponivel quando a conexao voltar.';
  if (state === 'error') return 'Recarregue despesas antes de executar esta acao.';
  if (state === 'permission-denied') return 'Sem permissao para visualizar despesas.';
  return undefined;
}

function expenseStatusFrom(status: string | undefined): ExpenseStatus | 'ALL' | undefined {
  if (
    status === 'ALL' ||
    status === 'OPEN' ||
    status === 'DUE' ||
    status === 'OVERDUE' ||
    status === 'PAID' ||
    status === 'CANCELLED'
  ) {
    return status;
  }
  return undefined;
}

function developmentStateFrom(state: string | undefined): DevelopmentExpensesOptions['state'] {
  if (state === 'loading' || state === 'empty' || state === 'error' || state === 'offline') {
    return state;
  }
  return undefined;
}

function attachmentLabelFor(metadata: Expense['documentMetadata']) {
  if (!metadata || !Object.keys(metadata).length) return undefined;
  const fileName = metadata.fileName;
  if (typeof fileName === 'string' && fileName.trim()) return fileName;
  const storagePath = metadata.storagePath;
  if (typeof storagePath === 'string' && storagePath.trim()) {
    return storagePath.split('/').filter(Boolean).at(-1) ?? 'Anexo registrado';
  }
  return 'Anexo registrado';
}

function totalsFor(expenses: readonly Expense[]): ExpenseTotalsModel {
  const openAmountCents = sumByStatus(expenses, ['OPEN', 'DUE', 'OVERDUE']);
  const overdueAmountCents = sumByStatus(expenses, ['OVERDUE']);
  const paidAmountCents = sumByStatus(expenses, ['PAID']);
  const totalAmountCents = sumByStatus(expenses, ['OPEN', 'DUE', 'OVERDUE', 'PAID']);
  return {
    openAmountCents,
    openAmountLabel: formatCurrency(openAmountCents),
    overdueAmountCents,
    overdueAmountLabel: formatCurrency(overdueAmountCents),
    paidAmountCents,
    paidAmountLabel: formatCurrency(paidAmountCents),
    totalAmountCents,
    totalAmountLabel: formatCurrency(totalAmountCents),
  };
}

function categoriesFor(
  branchId: string,
  expenses: readonly Expense[],
): readonly ExpenseCategoryModel[] {
  return developmentExpenseCategories
    .filter((category) => category.branchId === branchId)
    .map((category) => {
      const categoryExpenses = expenses.filter((expense) => expense.categoryId === category.id);
      const openAmountCents = sumByStatus(categoryExpenses, ['OPEN', 'DUE', 'OVERDUE']);
      const paidAmountCents = sumByStatus(categoryExpenses, ['PAID']);
      return {
        id: category.id,
        name: category.name,
        description: category.description,
        status: category.status,
        expenseCount: categoryExpenses.length,
        openAmountCents,
        openAmountLabel: formatCurrency(openAmountCents),
        paidAmountCents,
        paidAmountLabel: formatCurrency(paidAmountCents),
      };
    });
}

function statusFiltersFor(expenses: readonly Expense[]): readonly ExpenseStatusFilterModel[] {
  const statuses: readonly (ExpenseStatus | 'ALL')[] = ['ALL', 'OPEN', 'OVERDUE', 'PAID'];
  return statuses.map((status) => {
    const matching =
      status === 'ALL' ? expenses : expenses.filter((expense) => expense.status === status);
    const amountCents = matching.reduce((total, expense) => total + expense.amountCents, 0);
    return {
      status,
      label: statusFilterLabel(status),
      count: matching.length,
      amountCents,
      amountLabel: formatCurrency(amountCents),
      tone: status === 'OVERDUE' ? 'danger' : status === 'PAID' ? 'success' : 'neutral',
    };
  });
}

function statusFilterLabel(status: ExpenseStatus | 'ALL') {
  if (status === 'ALL') return 'Todas';
  if (status === 'OPEN') return 'Abertas';
  if (status === 'OVERDUE') return 'Vencidas';
  if (status === 'PAID') return 'Pagas';
  return statusLabels[status];
}

function sumByStatus(expenses: readonly Expense[], statuses: readonly ExpenseStatus[]) {
  return expenses
    .filter((expense) => statuses.includes(expense.status))
    .reduce((total, expense) => total + expense.amountCents, 0);
}

function recurrenceLabelFor(recurrenceKey?: string) {
  if (!recurrenceKey) return 'Sem recorrencia';
  const [frequency, intervalValue, untilToken] = recurrenceKey.split(':');
  const interval = Number(intervalValue || 1);
  const suffix = untilToken?.startsWith('until=')
    ? ` ate ${formatDateOnly(untilToken.replace('until=', ''))}`
    : '';

  if (frequency === 'WEEKLY')
    return interval === 1 ? `Semanal${suffix}` : `A cada ${interval} semanas${suffix}`;
  if (frequency === 'MONTHLY')
    return interval === 1 ? `Mensal${suffix}` : `A cada ${interval} meses${suffix}`;
  if (frequency === 'YEARLY')
    return interval === 1 ? `Anual${suffix}` : `A cada ${interval} anos${suffix}`;
  return 'Recorrente';
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
