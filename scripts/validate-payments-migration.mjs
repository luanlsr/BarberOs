import { readFile, readdir } from 'node:fs/promises';

const migrationName = '20260907010000_payments_cash_register.sql';
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const migration = await readFile(
  new URL('../supabase/migrations/' + migrationName, import.meta.url),
  'utf8',
);
const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
const contracts = await readFile(
  new URL('../packages/contracts/src/index.ts', import.meta.url),
  'utf8',
);
const authServer = await readFile(
  new URL('../apps/web/lib/auth/server.ts', import.meta.url),
  'utf8',
);
const devSession = await readFile(
  new URL('../apps/web/lib/dev-session.ts', import.meta.url),
  'utf8',
);
const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');
const migrationLower = migration.toLowerCase();
const seedLower = seed.toLowerCase();
const contractsLower = contracts.toLowerCase();

const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
const ordersIndex = files.indexOf('20260906010000_orders_check_in.sql');
const paymentsIndex = files.indexOf(migrationName);

const tables = [
  'payments',
  'payment_allocations',
  'payment_refunds',
  'cash_register_sessions',
  'cash_movements',
];

const requiredMigrationSnippets = [
  "status in ('OPEN', 'IN_SERVICE', 'READY_FOR_PAYMENT', 'PAID', 'CANCELLED')",
  "event_type in ('ORDER_CREATED', 'CHECK_IN', 'STATUS_CHANGED', 'ITEM_ADDED', 'ITEM_UPDATED', 'ITEM_REMOVED', 'PAYMENT_RECEIVED', 'PAYMENT_REFUNDED', 'ORDER_PAID')",
  "method in ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER')",
  "status in ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED')",
  "status in ('OPEN', 'CLOSED')",
  "type in ('OPENING_BALANCE', 'SALE', 'REFUND', 'WITHDRAWAL', 'CASH_IN', 'EXPENSE', 'ADJUSTMENT')",
  'payments_tenant_branch_order_idx',
  'payments_status_idx',
  'payments_idempotency_idx',
  'payment_allocations_order_idx',
  'payment_refunds_idempotency_idx',
  'cash_register_sessions_branch_status_idx',
  'cash_register_sessions_one_open_per_branch_idx',
  'cash_register_sessions_idempotency_idx',
  'cash_register_sessions_closing_idempotency_idx',
  'cash_movements_session_idx',
  'cash_movements_idempotency_idx',
  'amount_cents integer not null check (amount_cents >= 0)',
  'public.has_branch_access',
  'create or replace function public.open_cash_register_session',
  'create or replace function public.record_cash_register_movement',
  'create or replace function public.receive_order_payment',
  'create or replace function public.refund_payment',
  'create or replace function public.close_cash_register_session',
  'for update',
  'jsonb_array_elements(p_payments)',
  "v_order.status not in ('OPEN', 'IN_SERVICE', 'READY_FOR_PAYMENT')",
  "set status = 'PAID'",
  'idempotency_key like nullif(p_idempotency_key',
];

const requiredSeedSnippets = [
  "('payments.receive', 'Receber pagamento')",
  "('payments.refund', 'Estornar pagamento')",
  "('cash.open', 'Abrir caixa')",
  "('cash.withdraw', 'Sangria')",
  "('cash.close', 'Fechar caixa')",
  "('MANAGER', 'payments.receive')",
  "('RECEPTIONIST', 'payments.receive')",
  "('FINANCE', 'payments.receive')",
  "('FINANCE', 'payments.refund')",
  "('FINANCE', 'cash.open')",
  "('FINANCE', 'cash.withdraw')",
  "('FINANCE', 'cash.close')",
  'seed-cash-session-1201',
  'seed-payment-1001',
  'seed-cash-opening-1301',
  'seed-cash-sale-1302',
  'comanda paga para validacao local de pagamentos e caixa',
  "'PAID'",
  "'ORDER_PAID'",
  "'CASH'",
];

const requiredContractSnippets = [
  'export const paymentMethodSchema',
  'export const paymentStatusSchema',
  'export const refundStatusSchema',
  'export const cashRegisterSessionStatusSchema',
  'export const cashMovementTypeSchema',
  'export const paymentSchema',
  'export const paymentAllocationSchema',
  'export const cashRegisterSessionSchema',
  'export const cashMovementSchema',
  'export const receivePaymentCommandSchema',
  'export const refundPaymentCommandSchema',
  'export const openCashRegisterCommandSchema',
  'export const cashRegisterMovementCommandSchema',
  'export const closeCashRegisterCommandSchema',
  "'PAYMENT_IDEMPOTENCY_CONFLICT'",
  "'CASH_REGISTER_NOT_OPEN'",
];

const missing = [];

if (ordersIndex === -1) missing.push('orders migration file');
if (paymentsIndex === -1) missing.push(migrationName + ' file');
if (ordersIndex !== -1 && paymentsIndex !== -1 && paymentsIndex <= ordersIndex) {
  missing.push('payments migration ordered after orders migration');
}

for (const table of tables) {
  for (const snippet of [
    'create table if not exists public.' + table,
    'alter table public.' + table + ' enable row level security',
  ]) {
    if (!migrationLower.includes(snippet)) missing.push(snippet);
  }
}

for (const snippet of requiredMigrationSnippets) {
  if (!migrationLower.includes(snippet.toLowerCase())) missing.push(snippet);
}

for (const snippet of requiredSeedSnippets) {
  if (!seedLower.includes(snippet.toLowerCase())) missing.push('seed: ' + snippet);
}

for (const snippet of requiredContractSnippets) {
  if (!contractsLower.includes(snippet.toLowerCase())) missing.push('contracts: ' + snippet);
}

function roleBlock(source, role) {
  const match = source.match(new RegExp('  ' + role + ': \\[([\\s\\S]*?)\\n  \\],'));
  return match?.[1] ?? '';
}

function requireRolePermissions(label, source, role, permissions) {
  const block = roleBlock(source, role);
  if (!block) {
    missing.push(label + ': role ' + role);
    return;
  }
  for (const permission of permissions) {
    if (!block.includes("'" + permission + "'")) {
      missing.push(label + ': ' + role + ' missing ' + permission);
    }
  }
}

function requireDevPermissions(permissions) {
  for (const permission of permissions) {
    if (!devSession.includes("'" + permission + "'")) {
      missing.push('dev-session missing ' + permission);
    }
  }
}

requireRolePermissions('auth-server', authServer, 'PLATFORM_MASTER', [
  'payments.receive',
  'payments.refund',
  'cash.open',
  'cash.withdraw',
  'cash.close',
]);
requireRolePermissions('auth-server', authServer, 'OWNER', [
  'payments.receive',
  'payments.refund',
  'cash.open',
  'cash.withdraw',
  'cash.close',
]);
requireRolePermissions('auth-server', authServer, 'MANAGER', ['payments.receive']);
requireRolePermissions('auth-server', authServer, 'RECEPTIONIST', ['payments.receive']);
requireRolePermissions('auth-server', authServer, 'FINANCE', [
  'finance.read',
  'payments.receive',
  'payments.refund',
  'cash.open',
  'cash.withdraw',
  'cash.close',
]);
requireDevPermissions([
  'payments.receive',
  'payments.refund',
  'cash.open',
  'cash.withdraw',
  'cash.close',
]);

if (!packageJson.includes('"validate:payments"')) {
  missing.push('package.json missing validate:payments script');
}

if (missing.length) {
  console.error('Payments migration validation missing: ' + missing.join(', '));
  process.exit(1);
}

console.log(
  'Payments migration validated (' +
    tables.length +
    ' tables, ' +
    requiredMigrationSnippets.length +
    ' migration checks, ' +
    requiredSeedSnippets.length +
    ' seed/auth checks).',
);
