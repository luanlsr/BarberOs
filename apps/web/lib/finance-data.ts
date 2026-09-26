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
import { createSupabaseServerClient } from './auth/server';

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

export type FinanceBranchOptionModel = {
  id: string;
  label: string;
  href: string;
  active: boolean;
};

export type FinanceBranchBreakdownModel = {
  branchId: string;
  branchName: string;
  revenueAmountCents: number;
  revenueAmountLabel: string;
  expenseAmountCents: number;
  expenseAmountLabel: string;
  resultAmountCents: number;
  resultAmountLabel: string;
  sharePercent: number;
  tone: FinanceTone;
};

export type FinanceCategoryBreakdownModel = {
  id: string;
  name: string;
  direction: 'IN' | 'OUT';
  amountCents: number;
  amountLabel: string;
  percent: number;
  tone: FinanceTone;
  color: string;
};

export type FinanceOriginBreakdownModel = {
  id: string;
  label: string;
  direction: 'IN' | 'OUT';
  amountCents: number;
  amountLabel: string;
  percent: number;
  tone: FinanceTone;
};

export type FinancePlanChannelModel = {
  id: 'plan' | 'walk-in';
  label: string;
  haircutCount: number;
  customerCount: number;
  revenueAmountCents: number;
  revenueAmountLabel: string;
  revenuePerCustomerAmountCents: number;
  revenuePerCustomerAmountLabel: string;
  revenuePerHaircutAmountCents: number;
  revenuePerHaircutAmountLabel: string;
  sharePercent: number;
  tone: FinanceTone;
};

export type FinancePlanAnalysisModel = {
  plan: FinancePlanChannelModel;
  walkIn: FinancePlanChannelModel;
  planUtilizationPercent: number;
  planUtilizationLabel: string;
  recommendationTitle: string;
  recommendationText: string;
  revenueDeltaLabel: string;
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
  scope: 'branch' | 'tenant';
  branchScopeLabel: string;
  branchOptions: readonly FinanceBranchOptionModel[];
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
  branchBreakdown: readonly FinanceBranchBreakdownModel[];
  categoryBreakdown: readonly FinanceCategoryBreakdownModel[];
  originBreakdown: readonly FinanceOriginBreakdownModel[];
  planAnalysis: FinancePlanAnalysisModel;
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
type DevelopmentPlanServiceUsage = {
  id: string;
  tenantId: string;
  branchId: string;
  customerId: string;
  serviceName: string;
  channel: 'plan' | 'walk-in';
  grossAmountCents: number;
  revenueAmountCents: number;
  usedAt: string;
};
type DevelopmentPlanBilling = {
  id: string;
  tenantId: string;
  branchId: string;
  customerId: string;
  amountCents: number;
  occurredAt: string;
};
type CustomerPlanMonthlyPerformanceRow = {
  tenant_id: string;
  branch_id: string | null;
  month_start: string;
  plan_haircut_count: number | null;
  plan_customer_count: number | null;
  plan_revenue_amount_cents: number | null;
  walk_in_haircut_count: number | null;
  walk_in_customer_count: number | null;
  walk_in_revenue_amount_cents: number | null;
};
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
    description: 'Energia e serviços essenciais',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'dev-expense-category-marketing',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Marketing',
    description: 'Campanhas e aquisição de clientes',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'dev-expense-category-stock',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Estoque',
    description: 'Produtos, insumos e reposições',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'dev-expense-category-investments',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Investimentos',
    description: 'Melhorias, equipamentos e expansão',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'dev-expense-category-rent-north',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    name: 'Aluguel',
    description: 'Custos fixos da Unidade Norte',
    status: 'ACTIVE',
    createdBy: 'dev-user',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'dev-expense-category-marketing-north',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    name: 'Marketing',
    description: 'Campanhas locais da Unidade Norte',
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
  {
    id: 'dev-finance-entry-payment-north-1001',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    direction: 'IN',
    type: 'SERVICE_REVENUE',
    status: 'POSTED',
    amountCents: 11_000,
    signedAmountCents: 11_000,
    competenceDate: '2026-09-08',
    cashDate: '2026-09-08',
    sourceType: 'PAYMENT',
    sourceId: 'dev-payment-north-1001',
    description: 'Receita de serviços da Unidade Norte',
    createdBy: 'dev-user',
    createdAt: '2026-09-08T14:30:00.000Z',
  },
  {
    id: 'dev-finance-entry-product-north-1002',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    direction: 'IN',
    type: 'PRODUCT_REVENUE',
    status: 'POSTED',
    amountCents: 2_800,
    signedAmountCents: 2_800,
    competenceDate: '2026-09-08',
    cashDate: '2026-09-08',
    sourceType: 'PAYMENT',
    sourceId: 'dev-payment-north-product-1002',
    description: 'Venda de produtos da Unidade Norte',
    createdBy: 'dev-user',
    createdAt: '2026-09-08T15:10:00.000Z',
  },
  {
    id: 'dev-finance-entry-rent-north',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    direction: 'OUT',
    type: 'EXPENSE',
    status: 'POSTED',
    amountCents: 9_000,
    signedAmountCents: -9_000,
    competenceDate: '2026-09-04',
    cashDate: '2026-09-04',
    sourceType: 'EXPENSE',
    sourceId: 'dev-expense-rent-north',
    categoryId: 'dev-expense-category-rent-north',
    description: 'Aluguel pago da Unidade Norte',
    createdBy: 'dev-user',
    createdAt: '2026-09-04T12:00:00.000Z',
  },
  {
    id: 'dev-finance-entry-marketing-north',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    direction: 'OUT',
    type: 'EXPENSE',
    status: 'POSTED',
    amountCents: 2_400,
    signedAmountCents: -2_400,
    competenceDate: '2026-09-09',
    cashDate: '2026-09-09',
    sourceType: 'EXPENSE',
    sourceId: 'dev-expense-marketing-north',
    categoryId: 'dev-expense-category-marketing-north',
    description: 'Anuncios locais da Unidade Norte',
    createdBy: 'dev-user',
    createdAt: '2026-09-09T12:00:00.000Z',
  },
];

const developmentPlanBillings: readonly DevelopmentPlanBilling[] = [
  {
    id: 'dev-plan-billing-ana-premium',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-ana',
    amountCents: 9_000,
    occurredAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'dev-plan-billing-bruno-premium',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-bruno',
    amountCents: 9_000,
    occurredAt: '2026-09-03T10:00:00.000Z',
  },
  {
    id: 'dev-plan-billing-diego-basic',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-diego',
    amountCents: 7_000,
    occurredAt: '2026-09-04T10:00:00.000Z',
  },
  {
    id: 'dev-plan-billing-lucas-basic',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-lucas',
    amountCents: 7_000,
    occurredAt: '2026-09-05T10:00:00.000Z',
  },
  {
    id: 'dev-plan-billing-north-1',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    customerId: 'dev-customer-marcos',
    amountCents: 8_000,
    occurredAt: '2026-09-06T10:00:00.000Z',
  },
  {
    id: 'dev-plan-billing-north-2',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    customerId: 'dev-customer-paulo',
    amountCents: 8_000,
    occurredAt: '2026-09-07T10:00:00.000Z',
  },
];

const developmentPlanServiceUsage: readonly DevelopmentPlanServiceUsage[] = [
  {
    id: 'dev-plan-usage-ana-1',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-ana',
    serviceName: 'Corte masculino',
    channel: 'plan',
    grossAmountCents: 8_500,
    revenueAmountCents: 0,
    usedAt: '2026-09-07T14:20:00.000Z',
  },
  {
    id: 'dev-plan-usage-ana-2',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-ana',
    serviceName: 'Pezinho',
    channel: 'plan',
    grossAmountCents: 3_000,
    revenueAmountCents: 0,
    usedAt: '2026-09-21T14:20:00.000Z',
  },
  {
    id: 'dev-plan-usage-bruno-1',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-bruno',
    serviceName: 'Corte masculino',
    channel: 'plan',
    grossAmountCents: 8_500,
    revenueAmountCents: 0,
    usedAt: '2026-09-08T11:20:00.000Z',
  },
  {
    id: 'dev-plan-usage-diego-1',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-diego',
    serviceName: 'Barba',
    channel: 'plan',
    grossAmountCents: 6_000,
    revenueAmountCents: 0,
    usedAt: '2026-09-11T11:20:00.000Z',
  },
  {
    id: 'dev-plan-usage-lucas-1',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-lucas',
    serviceName: 'Corte masculino',
    channel: 'plan',
    grossAmountCents: 8_500,
    revenueAmountCents: 0,
    usedAt: '2026-09-14T16:20:00.000Z',
  },
  {
    id: 'dev-plan-usage-lucas-2',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-lucas',
    serviceName: 'Pezinho',
    channel: 'plan',
    grossAmountCents: 3_000,
    revenueAmountCents: 0,
    usedAt: '2026-09-28T16:20:00.000Z',
  },
  {
    id: 'dev-walkin-usage-1',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-avulso-1',
    serviceName: 'Corte masculino',
    channel: 'walk-in',
    grossAmountCents: 8_500,
    revenueAmountCents: 8_500,
    usedAt: '2026-09-07T15:20:00.000Z',
  },
  {
    id: 'dev-walkin-usage-2',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    customerId: 'dev-customer-avulso-2',
    serviceName: 'Corte + barba',
    channel: 'walk-in',
    grossAmountCents: 7_000,
    revenueAmountCents: 7_000,
    usedAt: '2026-09-06T16:12:00.000Z',
  },
  {
    id: 'dev-plan-usage-north-1',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    customerId: 'dev-customer-marcos',
    serviceName: 'Corte masculino',
    channel: 'plan',
    grossAmountCents: 8_000,
    revenueAmountCents: 0,
    usedAt: '2026-09-08T14:30:00.000Z',
  },
  {
    id: 'dev-plan-usage-north-2',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    customerId: 'dev-customer-paulo',
    serviceName: 'Corte masculino',
    channel: 'plan',
    grossAmountCents: 8_000,
    revenueAmountCents: 0,
    usedAt: '2026-09-15T14:30:00.000Z',
  },
  {
    id: 'dev-walkin-usage-north-1',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    customerId: 'dev-customer-avulso-north-1',
    serviceName: 'Corte premium',
    channel: 'walk-in',
    grossAmountCents: 11_000,
    revenueAmountCents: 11_000,
    usedAt: '2026-09-08T14:30:00.000Z',
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
  const model = getDevelopmentFinanceViewModel(session, {
    branchId: options.branchId,
    state: developmentStateFrom(options.state),
  });
  if (model.state !== 'ready') return model;
  const persistedPlanAnalysis = await loadPersistedPlanAnalysis(session, model).catch(() => null);
  return persistedPlanAnalysis ? { ...model, planAnalysis: persistedPlanAnalysis } : model;
}

export function getDevelopmentFinanceViewModel(
  session: SessionContext,
  options: DevelopmentFinanceOptions = {},
): FinanceViewModel {
  const authorizedBranches = authorizedBranchIds(session);
  const consolidated = options.branchId === 'all';
  const branchId = consolidated
    ? 'all'
    : (options.branchId ?? session.activeBranchId ?? authorizedBranches[0] ?? 'dev-branch');
  const selectedBranchIds = consolidated ? authorizedBranches : [branchId];
  const base = baseModel(session, branchId, selectedBranchIds);
  const empty = emptySummary(session.tenantId, consolidated ? undefined : branchId);

  if (!base.canRead) {
    return buildFinanceModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar o financeiro desta unidade.',
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
      'Você está offline. Ações financeiras ficam pausadas até a conexão voltar.',
      empty,
      [],
      emptyCommission(),
    );
  }

  if (options.state === 'error') {
    return buildFinanceModel(
      base,
      'error',
      'Não foi possível carregar o financeiro local.',
      empty,
      [],
      emptyCommission(),
      [],
      [],
      [],
      {
        code: 'FINANCE_VALIDATION_ERROR',
        message: 'Financeiro local indisponível.',
        requestId: 'local-finance-error',
      },
    );
  }

  if (options.state === 'empty') {
    return buildFinanceModel(
      base,
      'empty',
      'Nenhum lançamento financeiro neste período.',
      empty,
      [],
      emptyCommission(),
    );
  }

  const entries = developmentFinancialEntries.filter((entry) =>
    selectedBranchIds.includes(entry.branchId),
  );
  const expenses = developmentExpenses.filter((expense) =>
    selectedBranchIds.includes(expense.branchId),
  );
  const accruals = developmentCommissionAccruals.filter((accrual) =>
    selectedBranchIds.includes(accrual.branchId),
  );
  const payouts = developmentPayouts.filter((payout) =>
    selectedBranchIds.includes(payout.branchId),
  );
  const planUsages = developmentPlanServiceUsage.filter((usage) =>
    selectedBranchIds.includes(usage.branchId),
  );
  const planBillings = developmentPlanBillings.filter((billing) =>
    selectedBranchIds.includes(billing.branchId),
  );
  const summary = summaryFrom(
    session.tenantId,
    consolidated ? undefined : branchId,
    entries,
    accruals,
    payouts,
  );
  const commission = commissionModel(accruals, payouts);
  const state =
    entries.length || expenses.length || accruals.length || payouts.length ? 'ready' : 'empty';

  return buildFinanceModel(
    base,
    state,
    consolidated
      ? 'Resumo consolidado de todas as unidades autorizadas.'
      : 'Resumo financeiro local com receitas, despesas, comissões e repasses.',
    summary,
    expenses.map(toExpenseModel),
    commission,
    entries,
    planUsages,
    planBillings,
  );
}
function baseModel(
  session: SessionContext,
  branchId: string,
  selectedBranchIds: readonly string[],
) {
  const hasFinanceEntitlement = (session.entitlements ?? []).includes('finance');
  const consolidated = branchId === 'all';
  const hasBranch = consolidated
    ? selectedBranchIds.length > 0 &&
      selectedBranchIds.every((id) => session.branchScope.includes(id))
    : session.branchScope.includes(branchId);
  return {
    title: 'Financeiro',
    description: consolidated
      ? 'Resumo financeiro de todas as unidades.'
      : 'Resumo financeiro da unidade.',
    branchId,
    branchName: consolidated ? 'Todas as unidades' : branchNameFor(session, branchId),
    scope: consolidated ? ('tenant' as const) : ('branch' as const),
    branchScopeLabel: consolidated
      ? selectedBranchIds.length + ' unidades consolidadas'
      : branchNameFor(session, branchId),
    branchOptions: branchOptionsFor(session, branchId),
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
  entries: readonly FinancialEntry[] = [],
  planUsages: readonly DevelopmentPlanServiceUsage[] = [],
  planBillings: readonly DevelopmentPlanBilling[] = [],
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
    branchBreakdown: branchBreakdownFor(entries, base),
    categoryBreakdown: categoryBreakdownFor(entries),
    originBreakdown: originBreakdownFor(entries),
    planAnalysis: planAnalysisFor(planUsages, planBillings),
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
        : 'Sem permissão para visualizar financeiro.',
    },
    {
      id: 'finance.create-expense',
      label: 'Nova despesa',
      enabled: base.canCreateExpense && mutationsAllowed,
      reason: actionReason(
        base.canCreateExpense,
        stateReason,
        'Sem permissão para criar despesas.',
      ),
    },
    {
      id: 'finance.manage-commissions',
      label: 'Comissões/Repasses',
      enabled: base.canManageCommissions && mutationsAllowed,
      reason: actionReason(
        base.canManageCommissions,
        stateReason,
        'Sem permissão para gerenciar comissões.',
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
  if (!hasAccess) return 'Sem permissão para fechar repasses.';
  if (stateReason) return stateReason;
  if (state !== 'ready' || commission.openAccrualAmountCents === 0) {
    return 'Nenhuma comissão aberta para fechar no período.';
  }
  return undefined;
}

function unavailableReasonForState(state: FinanceViewState) {
  if (state === 'loading') return 'Aguarde o carregamento.';
  if (state === 'offline') return 'Disponivel quando a conexão voltar.';
  if (state === 'error') return 'Recarregue o financeiro antes de executar esta ação.';
  if (state === 'permission-denied') return 'Sem permissão para visualizar financeiro.';
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
  branchId: string | undefined,
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

function emptySummary(tenantId: string, branchId?: string): FinanceSummary {
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
      label: 'Comissões abertas',
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

async function loadPersistedPlanAnalysis(
  session: SessionContext,
  model: FinanceViewModel,
): Promise<FinancePlanAnalysisModel | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  let request = client
    .from('customer_plan_monthly_performance')
    .select(
      'tenant_id, branch_id, month_start, plan_haircut_count, plan_customer_count, plan_revenue_amount_cents, walk_in_haircut_count, walk_in_customer_count, walk_in_revenue_amount_cents',
    )
    .eq('tenant_id', session.tenantId)
    .eq('month_start', model.periodStart);

  if (model.scope === 'tenant') {
    request = request.in('branch_id', [...session.branchScope]);
  } else {
    request = request.eq('branch_id', model.branchId);
  }

  const { data, error } = await request;
  if (error || !data?.length) return null;
  return planAnalysisFromPerformanceRows(data as CustomerPlanMonthlyPerformanceRow[]);
}

function planAnalysisFromPerformanceRows(
  rows: readonly CustomerPlanMonthlyPerformanceRow[],
): FinancePlanAnalysisModel {
  const totals = rows.reduce(
    (acc, row) => ({
      planHaircuts: acc.planHaircuts + (row.plan_haircut_count ?? 0),
      planCustomers: acc.planCustomers + (row.plan_customer_count ?? 0),
      planRevenue: acc.planRevenue + (row.plan_revenue_amount_cents ?? 0),
      walkInHaircuts: acc.walkInHaircuts + (row.walk_in_haircut_count ?? 0),
      walkInCustomers: acc.walkInCustomers + (row.walk_in_customer_count ?? 0),
      walkInRevenue: acc.walkInRevenue + (row.walk_in_revenue_amount_cents ?? 0),
    }),
    {
      planHaircuts: 0,
      planCustomers: 0,
      planRevenue: 0,
      walkInHaircuts: 0,
      walkInCustomers: 0,
      walkInRevenue: 0,
    },
  );
  return planAnalysisFromTotals(totals);
}

function planAnalysisFromTotals(totals: {
  planHaircuts: number;
  planCustomers: number;
  planRevenue: number;
  walkInHaircuts: number;
  walkInCustomers: number;
  walkInRevenue: number;
}): FinancePlanAnalysisModel {
  const totalRevenue = totals.planRevenue + totals.walkInRevenue;
  const plan = planChannelModel({
    id: 'plan',
    label: 'Clientes com plano',
    haircutCount: totals.planHaircuts,
    customerCount: totals.planCustomers,
    revenueAmountCents: totals.planRevenue,
    totalRevenue,
    tone: 'success',
  });
  const walkIn = planChannelModel({
    id: 'walk-in',
    label: 'Clientes avulsos',
    haircutCount: totals.walkInHaircuts,
    customerCount: totals.walkInCustomers,
    revenueAmountCents: totals.walkInRevenue,
    totalRevenue,
    tone: 'warning',
  });
  const utilizationBase = totals.planCustomers * 2;
  const planUtilizationPercent = percentOf(plan.haircutCount, utilizationBase);
  const planRevenuePerCustomer = average(totals.planRevenue, totals.planCustomers);
  const walkInRevenuePerCustomer = average(totals.walkInRevenue, totals.walkInCustomers);
  const advantage = planRevenuePerCustomer - walkInRevenuePerCustomer;
  const planBetter = advantage >= 0;

  return {
    plan,
    walkIn,
    planUtilizationPercent,
    planUtilizationLabel: planUtilizationPercent + '% dos benefícios previstos usados',
    recommendationTitle: planBetter
      ? 'Plano está mais vantajoso'
      : 'Avulso ainda rende mais por cliente',
    recommendationText: planBetter
      ? 'A receita recorrente dos planos supera a média por cliente avulso neste mês. Vale acelerar adesão, mantendo limite de uso e monitorando ocupação dos horários nobres.'
      : 'O atendimento avulso ainda entrega maior receita por cliente. Reavalie preço, franquia de cortes ou descontos do plano antes de ampliar campanhas de adesão.',
    revenueDeltaLabel: formatSignedCurrency(advantage) + ' por cliente vs. avulso',
  };
}

function planAnalysisFor(
  usages: readonly DevelopmentPlanServiceUsage[],
  billings: readonly DevelopmentPlanBilling[],
): FinancePlanAnalysisModel {
  const planUsages = usages.filter((usage) => usage.channel === 'plan');
  const walkInUsages = usages.filter((usage) => usage.channel === 'walk-in');
  const planRevenueAmountCents = billings.reduce(
    (total, billing) => total + billing.amountCents,
    0,
  );
  const walkInRevenueAmountCents = walkInUsages.reduce(
    (total, usage) => total + usage.revenueAmountCents,
    0,
  );
  const totalRevenue = planRevenueAmountCents + walkInRevenueAmountCents;
  const planCustomerCount = uniqueCount(planUsages.map((usage) => usage.customerId));
  const walkInCustomerCount = uniqueCount(walkInUsages.map((usage) => usage.customerId));
  const plan = planChannelModel({
    id: 'plan',
    label: 'Clientes com plano',
    haircutCount: planUsages.length,
    customerCount: planCustomerCount,
    revenueAmountCents: planRevenueAmountCents,
    totalRevenue,
    tone: 'success',
  });
  const walkIn = planChannelModel({
    id: 'walk-in',
    label: 'Clientes avulsos',
    haircutCount: walkInUsages.length,
    customerCount: walkInCustomerCount,
    revenueAmountCents: walkInRevenueAmountCents,
    totalRevenue,
    tone: 'warning',
  });
  const utilizationBase = planCustomerCount * 2;
  const planUtilizationPercent = percentOf(plan.haircutCount, utilizationBase);
  const planRevenuePerCustomer = average(planRevenueAmountCents, planCustomerCount);
  const walkInRevenuePerCustomer = average(walkInRevenueAmountCents, walkInCustomerCount);
  const advantage = planRevenuePerCustomer - walkInRevenuePerCustomer;
  const planBetter = advantage >= 0;

  return {
    plan,
    walkIn,
    planUtilizationPercent,
    planUtilizationLabel: planUtilizationPercent + '% dos benefícios previstos usados',
    recommendationTitle: planBetter
      ? 'Plano está mais vantajoso'
      : 'Avulso ainda rende mais por cliente',
    recommendationText: planBetter
      ? 'A receita recorrente dos planos supera a média por cliente avulso neste mês. Vale acelerar adesão, mantendo limite de uso e monitorando ocupação dos horários nobres.'
      : 'O atendimento avulso ainda entrega maior receita por cliente. Reavalie preço, franquia de cortes ou descontos do plano antes de ampliar campanhas de adesão.',
    revenueDeltaLabel: formatSignedCurrency(advantage) + ' por cliente vs. avulso',
  };
}

function planChannelModel(input: {
  id: FinancePlanChannelModel['id'];
  label: string;
  haircutCount: number;
  customerCount: number;
  revenueAmountCents: number;
  totalRevenue: number;
  tone: FinanceTone;
}): FinancePlanChannelModel {
  const revenuePerCustomerAmountCents = average(input.revenueAmountCents, input.customerCount);
  const revenuePerHaircutAmountCents = average(input.revenueAmountCents, input.haircutCount);
  return {
    id: input.id,
    label: input.label,
    haircutCount: input.haircutCount,
    customerCount: input.customerCount,
    revenueAmountCents: input.revenueAmountCents,
    revenueAmountLabel: formatCurrency(input.revenueAmountCents),
    revenuePerCustomerAmountCents,
    revenuePerCustomerAmountLabel: formatCurrency(revenuePerCustomerAmountCents),
    revenuePerHaircutAmountCents,
    revenuePerHaircutAmountLabel: formatCurrency(revenuePerHaircutAmountCents),
    sharePercent: percentOf(input.revenueAmountCents, input.totalRevenue),
    tone: input.tone,
  };
}

function average(total: number, count: number) {
  if (count <= 0) return 0;
  return Math.round(total / count);
}

function uniqueCount(values: readonly string[]) {
  return new Set(values).size;
}

function branchBreakdownFor(
  entries: readonly FinancialEntry[],
  base: FinanceBaseModel,
): readonly FinanceBranchBreakdownModel[] {
  const branchIds = Array.from(new Set(entries.map((entry) => entry.branchId)));
  const totalRevenue = entries
    .filter((entry) => entry.direction === 'IN')
    .reduce((total, entry) => total + entry.amountCents, 0);
  return branchIds.map((branchId) => {
    const branchEntries = entries.filter((entry) => entry.branchId === branchId);
    const revenueAmountCents = branchEntries
      .filter((entry) => entry.direction === 'IN')
      .reduce((total, entry) => total + entry.amountCents, 0);
    const expenseAmountCents = branchEntries
      .filter((entry) => entry.direction === 'OUT')
      .reduce((total, entry) => total + entry.amountCents, 0);
    const resultAmountCents = revenueAmountCents - expenseAmountCents;
    return {
      branchId,
      branchName: branchNameForBase(base, branchId),
      revenueAmountCents,
      revenueAmountLabel: formatCurrency(revenueAmountCents),
      expenseAmountCents,
      expenseAmountLabel: formatCurrency(expenseAmountCents),
      resultAmountCents,
      resultAmountLabel: formatSignedCurrency(resultAmountCents),
      sharePercent: percentOf(revenueAmountCents, totalRevenue),
      tone: resultAmountCents >= 0 ? 'success' : 'danger',
    };
  });
}

function categoryBreakdownFor(
  entries: readonly FinancialEntry[],
): readonly FinanceCategoryBreakdownModel[] {
  const postedEntries = entries.filter((entry) => entry.status === 'POSTED');
  const totals = new Map<string, FinanceCategoryBreakdownModel>();
  for (const entry of postedEntries) {
    const category = categoryForEntry(entry);
    const current = totals.get(category.id);
    const amountCents = (current?.amountCents ?? 0) + entry.amountCents;
    totals.set(category.id, {
      id: category.id,
      name: category.name,
      direction: entry.direction,
      amountCents,
      amountLabel: formatCurrency(amountCents),
      percent: 0,
      tone: entry.direction === 'IN' ? 'success' : 'warning',
      color: category.color,
    });
  }
  const outTotal = Array.from(totals.values())
    .filter((item) => item.direction === 'OUT')
    .reduce((total, item) => total + item.amountCents, 0);
  const inTotal = Array.from(totals.values())
    .filter((item) => item.direction === 'IN')
    .reduce((total, item) => total + item.amountCents, 0);
  return Array.from(totals.values())
    .map((item) => ({
      ...item,
      percent: percentOf(item.amountCents, item.direction === 'IN' ? inTotal : outTotal),
    }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

function originBreakdownFor(
  entries: readonly FinancialEntry[],
): readonly FinanceOriginBreakdownModel[] {
  const labels: Record<string, string> = {
    SERVICE_REVENUE: 'Serviços',
    PRODUCT_REVENUE: 'Produtos',
    EXPENSE: 'Despesas operacionais',
    PAYOUT: 'Salários e repasses',
    COMMISSION: 'Comissões',
    REFUND: 'Estornos',
    ADJUSTMENT: 'Ajustes',
    OTHER: 'Outros',
  };
  const totals = new Map<string, FinanceOriginBreakdownModel>();
  for (const entry of entries.filter((item) => item.status === 'POSTED')) {
    const id = entry.type;
    const current = totals.get(id);
    const amountCents = (current?.amountCents ?? 0) + entry.amountCents;
    totals.set(id, {
      id,
      label: labels[id] ?? id,
      direction: entry.direction,
      amountCents,
      amountLabel: formatCurrency(amountCents),
      percent: 0,
      tone: entry.direction === 'IN' ? 'success' : 'warning',
    });
  }
  const total = Array.from(totals.values()).reduce((sum, item) => sum + item.amountCents, 0);
  return Array.from(totals.values())
    .map((item) => ({ ...item, percent: percentOf(item.amountCents, total) }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

type LocalFinanceCategory = { id: string; name: string; color: string };

function categoryForEntry(entry: FinancialEntry): LocalFinanceCategory {
  if (entry.categoryId) {
    const category = developmentExpenseCategories.find((item) => item.id === entry.categoryId);
    if (category)
      return { id: category.id, name: category.name, color: colorForCategory(category.name) };
  }
  if (entry.type === 'SERVICE_REVENUE')
    return { id: 'revenue-services', name: 'Serviços', color: '#2563eb' };
  if (entry.type === 'PRODUCT_REVENUE')
    return { id: 'revenue-products', name: 'Produtos', color: '#16a34a' };
  if (entry.type === 'PAYOUT')
    return { id: 'out-salaries', name: 'Salários e repasses', color: '#dc2626' };
  if (entry.type === 'COMMISSION')
    return { id: 'out-commissions', name: 'Comissões', color: '#f97316' };
  return { id: 'uncategorized', name: 'Sem categoria', color: '#64748b' };
}

function colorForCategory(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('alug')) return '#a855f7';
  if (normalized.includes('marketing')) return '#ec4899';
  if (normalized.includes('estoque')) return '#0f766e';
  if (normalized.includes('conta') || normalized.includes('util')) return '#f59e0b';
  if (normalized.includes('invest')) return '#6366f1';
  return '#64748b';
}

function percentOf(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
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

function authorizedBranchIds(session: SessionContext) {
  return session.branchScope.length ? [...session.branchScope] : ['dev-branch'];
}

function branchOptionsFor(
  session: SessionContext,
  activeBranchId: string,
): readonly FinanceBranchOptionModel[] {
  const branches = authorizedBranchIds(session);
  const options: FinanceBranchOptionModel[] = branches.map((branchId) => ({
    id: branchId,
    label: branchNameFor(session, branchId),
    href: '/financeiro?branchId=' + encodeURIComponent(branchId),
    active: activeBranchId === branchId,
  }));
  if (branches.length > 1) {
    return [
      {
        id: 'all',
        label: 'Todas as unidades',
        href: '/financeiro?branchId=all',
        active: activeBranchId === 'all',
      },
      ...options,
    ];
  }
  return options;
}

function branchNameForBase(base: FinanceBaseModel, branchId: string) {
  return base.branchOptions.find((option) => option.id === branchId)?.label ?? 'Unidade autorizada';
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
