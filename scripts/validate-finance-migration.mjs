import { readFile, readdir } from 'node:fs/promises';

const migrationName = '20260908010000_financial_ledger_commissions.sql';
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const migration = await readFile(
  new URL('../supabase/migrations/' + migrationName, import.meta.url),
  'utf8',
);
const contracts = await readFile(
  new URL('../packages/contracts/src/index.ts', import.meta.url),
  'utf8',
);
const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
const financeData = await readFile(
  new URL('../apps/web/lib/finance-data.ts', import.meta.url),
  'utf8',
);
const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');
const migrationLower = migration.toLowerCase();
const contractsLower = contracts.toLowerCase();
const seedLower = seed.toLowerCase();
const financeDataLower = financeData.toLowerCase();

const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
const paymentsIndex = files.indexOf('20260907010000_payments_cash_register.sql');
const financeIndex = files.indexOf(migrationName);

const tables = [
  'expense_categories',
  'recurring_expense_templates',
  'financial_entries',
  'expenses',
  'commission_rules',
  'commission_accruals',
  'payouts',
  'payout_allocations',
];

const branchScopedTables = [
  'recurring_expense_templates',
  'financial_entries',
  'expenses',
  'commission_accruals',
  'payouts',
  'payout_allocations',
];

const requiredMigrationSnippets = [
  "direction in ('IN', 'OUT')",
  "type in ('SERVICE_REVENUE', 'PRODUCT_REVENUE', 'EXPENSE', 'COMMISSION', 'PAYOUT', 'REFUND', 'ADJUSTMENT', 'OTHER')",
  "status in ('POSTED', 'REVERSED', 'VOIDED')",
  "source_type in ('PAYMENT', 'REFUND', 'EXPENSE', 'COMMISSION_ACCRUAL', 'PAYOUT', 'CASH_MOVEMENT', 'MANUAL_ADJUSTMENT')",
  "frequency in ('WEEKLY', 'MONTHLY', 'YEARLY')",
  "status in ('OPEN', 'DUE', 'OVERDUE', 'PAID', 'CANCELLED')",
  "scope in ('TENANT_DEFAULT', 'PROFESSIONAL', 'SERVICE', 'PRODUCT', 'MANUAL_ITEM')",
  "type in ('PERCENTAGE', 'FIXED_AMOUNT')",
  "status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')",
  "status in ('OPEN', 'SETTLED', 'REVERSED', 'ADJUSTED')",
  "status in ('DRAFT', 'CLOSED', 'APPROVED', 'PAID', 'CANCELLED', 'CORRECTED')",
  'references public.tenants(id)',
  'references public.branches(id)',
  'references public.expense_categories(id)',
  'references public.recurring_expense_templates(id)',
  'references public.financial_entries(id)',
  'references public.professionals(id)',
  'references public.orders(id)',
  'references public.order_items(id)',
  'references public.payments(id)',
  'references public.commission_rules(id)',
  'references public.commission_accruals(id)',
  'references public.payouts(id)',
  'references public.cash_movements(id)',
  'expense_categories_tenant_branch_status_idx',
  'recurring_expense_templates_tenant_branch_next_idx',
  'financial_entries_tenant_branch_competence_idx',
  'financial_entries_tenant_branch_cash_idx',
  'financial_entries_source_idx',
  'expenses_tenant_branch_status_idx',
  'expenses_tenant_branch_competence_idx',
  'commission_rules_tenant_branch_status_idx',
  'commission_rules_professional_idx',
  'commission_rules_source_idx',
  'commission_accruals_tenant_branch_professional_status_idx',
  'commission_accruals_order_item_idx',
  'payouts_tenant_branch_professional_status_idx',
  'payouts_period_idx',
  'payout_allocations_payout_idx',
  'payout_allocations_accrual_idx',
  'signed_amount_cents = amount_cents',
  'signed_amount_cents = -amount_cents',
  "status <> 'paid' or (cash_date is not null and payment_method is not null and paid_by is not null and paid_at is not null and financial_entry_id is not null)",
  "status <> 'settled' or payout_id is not null",
  'unique (tenant_id, payout_id, accrual_id)',
  'financial_entries_idempotency_idx',
  'financial_entries_source_unique_idx',
  'expenses_idempotency_idx',
  'expenses_payment_idempotency_idx',
  'commission_accruals_source_item_unique_idx',
  'payouts_idempotency_idx',
  'payouts_payment_idempotency_idx',
  'payouts_correction_idempotency_idx',
  'payment_idempotency_key text',
  'correction_idempotency_key text',
  "where status = 'POSTED'",
  'where reversed_accrual_id is null',
  'create or replace function public.has_money_management_access',
  'create or replace function public.has_professional_wallet_access',
  "m.role in ('PLATFORM_MASTER', 'OWNER', 'MANAGER', 'FINANCE')",
  "m.role = 'PROFESSIONAL'",
  "lower(coalesce(p.email, '')) = lower(coalesce(auth.jwt()->>'email', ''))",
  'public.has_money_management_access',
  'public.has_professional_wallet_access',
  'payouts_professional_wallet_select',
  'commission_accruals_professional_wallet_select',
  'payout_allocations_professional_wallet_select',
  'create or replace function public.record_payment_finance_effects',
  'create or replace function public.record_refund_finance_effects',
  'create or replace function public.record_payment_commission_effects',
  'create or replace function public.record_refund_commission_effects',
  'create or replace function public.receive_order_payment_with_money_effects',
  'create or replace function public.refund_payment_with_money_effects',
  'public.record_payment_finance_effects',
  'public.record_refund_finance_effects',
  'public.record_payment_commission_effects',
  'public.record_refund_commission_effects',
  'create or replace function public.pay_expense',
  'create or replace function public.close_professional_payout',
  'create or replace function public.pay_professional_payout',
  'for update',
  'raise exception',
  'insert into public.financial_entries',
  'insert into public.cash_movements',
  'update public.cash_register_sessions',
  "set status = 'PAID'",
  "set status = 'SETTLED'",
  "status not in ('PAID', 'PARTIALLY_REFUNDED')",
  "status <> 'COMPLETED'",
  "p_payment_method = 'CASH'",
];

const requiredContractSnippets = [
  'export const financialEntrySchema',
  'export const expenseCategorySchema',
  'export const expenseSchema',
  'export const commissionRuleSchema',
  'export const commissionAccrualSchema',
  'export const payoutSchema',
  'export const payoutAllocationSchema',
  'export const createExpenseCommandSchema',
  'export const createCommissionRuleCommandSchema',
  'export const closePayoutCommandSchema',
];

const requiredSeedSnippets = [
  'seed-finance-entry-1501',
  'seed-finance-payment-1001',
  'seed-finance-expense-1601',
  '00000000-0000-0000-0000-000000001901',
  'seed-payout-close-2001',
  'seed-payout-pay-2001',
  'aluguel mensal da unidade centro',
  'energia da unidade centro',
  'comanda paga para validacao local de financeiro e repasse',
  'insert into public.expense_categories',
  'insert into public.recurring_expense_templates',
  'insert into public.financial_entries',
  'insert into public.expenses',
  'insert into public.commission_rules',
  'insert into public.commission_accruals',
  'insert into public.payouts',
  'insert into public.payout_allocations',
];

const requiredFinanceDataSnippets = [
  'export function getDevelopmentFinanceViewModel',
  "state: 'empty'",
  "state: 'permission-denied'",
  'developmentFinancialEntries',
  'developmentExpenses',
  'developmentCommissionAccruals',
  'developmentPayouts',
  'commissionLiabilityAmountCents',
  'paidPayoutAmountCents',
  'canCreateExpense',
  'canManageCommissions',
];
const requiredPolicySnippets = [
  'expense_categories_money_select',
  'expense_categories_money_write',
  'recurring_expense_templates_money_select',
  'recurring_expense_templates_money_write',
  'financial_entries_money_select',
  'financial_entries_money_write',
  'expenses_money_select',
  'expenses_money_write',
  'commission_rules_money_select',
  'commission_rules_money_write',
  'payouts_money_select',
  'payouts_money_write',
  'commission_accruals_money_select',
  'commission_accruals_money_write',
  'payout_allocations_money_select',
  'payout_allocations_money_write',
];

const missing = [];

if (paymentsIndex === -1) missing.push('payments migration file');
if (financeIndex === -1) missing.push(migrationName + ' file');
if (paymentsIndex !== -1 && financeIndex !== -1 && financeIndex <= paymentsIndex) {
  missing.push('finance migration ordered after payments migration');
}

for (const table of tables) {
  if (!migrationLower.includes('create table if not exists public.' + table)) {
    missing.push('create table if not exists public.' + table);
  }
  if (!migrationLower.includes('alter table public.' + table + ' enable row level security')) {
    missing.push('alter table public.' + table + ' enable row level security');
  }
}

for (const table of branchScopedTables) {
  const tableMatch = migrationLower.match(
    new RegExp('create table if not exists public\\.' + table + ' \\(([\\s\\S]*?)\\n\\);'),
  );
  const tableBody = tableMatch?.[1] ?? '';
  if (
    !tableBody.includes('tenant_id uuid not null references public.tenants(id) on delete restrict')
  ) {
    missing.push(table + ' tenant foreign key');
  }
  if (
    !tableBody.includes('branch_id uuid not null references public.branches(id) on delete restrict')
  ) {
    missing.push(table + ' branch foreign key');
  }
}

for (const snippet of requiredMigrationSnippets) {
  if (!migrationLower.includes(snippet.toLowerCase())) missing.push(snippet);
}

for (const snippet of requiredSeedSnippets) {
  if (!seedLower.includes(snippet.toLowerCase())) missing.push('seed: ' + snippet);
}

for (const snippet of requiredFinanceDataSnippets) {
  if (!financeDataLower.includes(snippet.toLowerCase())) missing.push('finance-data: ' + snippet);
}
for (const snippet of requiredPolicySnippets) {
  if (!migrationLower.includes(snippet.toLowerCase())) missing.push('policy: ' + snippet);
}

for (const snippet of requiredContractSnippets) {
  if (!contractsLower.includes(snippet.toLowerCase())) missing.push('contracts: ' + snippet);
}

if (!packageJson.includes('"validate:finance"')) {
  missing.push('package.json missing validate:finance script');
}

if (missing.length) {
  console.error('Finance migration validation missing: ' + missing.join(', '));
  process.exit(1);
}

console.log(
  'Finance migration validated (' +
    tables.length +
    ' tables, ' +
    requiredMigrationSnippets.length +
    ' migration/RLS checks, tenant/branch indexes and foreign keys).',
);
