import { readFile, readdir } from 'node:fs/promises';

const migrationName = '20260906010000_orders_check_in.sql';
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const migration = await readFile(
  new URL('../supabase/migrations/' + migrationName, import.meta.url),
  'utf8',
);
const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
const authServer = await readFile(new URL('../apps/web/lib/auth/server.ts', import.meta.url), 'utf8');
const devSession = await readFile(new URL('../apps/web/lib/dev-session.ts', import.meta.url), 'utf8');
const migrationLower = migration.toLowerCase();
const seedLower = seed.toLowerCase();

const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
const coreIndex = files.indexOf('20260905010000_core_operations_scheduling.sql');
const ordersIndex = files.indexOf(migrationName);

const tables = ['orders', 'order_items', 'order_history'];

const requiredMigrationSnippets = [
  "status in ('OPEN', 'IN_SERVICE', 'READY_FOR_PAYMENT', 'CANCELLED')",
  "source_type in ('SERVICE', 'PRODUCT', 'MANUAL')",
  "event_type in ('ORDER_CREATED', 'CHECK_IN', 'STATUS_CHANGED', 'ITEM_ADDED', 'ITEM_UPDATED', 'ITEM_REMOVED')",
  'unique (tenant_id, idempotency_key)',
  'unique (appointment_id)',
  'discount_amount_cents <= subtotal_amount_cents',
  'total_amount_cents = subtotal_amount_cents - discount_amount_cents',
  'discount_amount_cents <= quantity * unit_price_amount_cents',
  'final_amount_cents = quantity * unit_price_amount_cents - discount_amount_cents',
  'orders_tenant_branch_status_idx',
  'orders_customer_idx',
  'orders_professional_idx',
  'orders_appointment_idx',
  'orders_idempotency_idx',
  'order_items_order_idx',
  'order_items_source_idx',
  'order_history_lookup_idx',
  'public.has_branch_access',
  'create or replace function public.check_in_appointment_order',
  'for update',
  'insert into public.appointment_status_history',
];

const requiredSeedSnippets = [
  "('appointments.check_in', 'Executar check-in de agendamento')",
  "('orders.read', 'Visualizar comanda')",
  "('orders.update', 'Atualizar status da comanda')",
  "('orders.item.update', 'Editar item')",
  "('MANAGER', 'appointments.check_in')",
  "('MANAGER', 'orders.read')",
  "('MANAGER', 'orders.update')",
  "('MANAGER', 'orders.item.update')",
  "('RECEPTIONIST', 'appointments.check_in')",
  "('RECEPTIONIST', 'orders.read')",
  "('RECEPTIONIST', 'orders.update')",
  "('RECEPTIONIST', 'orders.item.update')",
  "('PROFESSIONAL', 'orders.read')",
  "'00000000-0000-0000-0000-000000000701'",
  "'00000000-0000-0000-0000-000000000801'",
  "'00000000-0000-0000-0000-000000000901'",
  'comanda aberta para validacao local',
  'seed-walk-in-order-701',
  "'00000000-0000-0000-0000-000000000401'",
  "'CONFIRMED'",
];

const missing = [];

if (coreIndex === -1) {
  missing.push('core operations migration file');
}
if (ordersIndex === -1) {
  missing.push(migrationName + ' file');
}
if (coreIndex !== -1 && ordersIndex !== -1 && ordersIndex <= coreIndex) {
  missing.push('orders migration ordered after core operations migration');
}

for (const table of tables) {
  for (const snippet of [
    'create table if not exists public.' + table,
    'alter table public.' + table + ' enable row level security',
  ]) {
    if (!migrationLower.includes(snippet)) {
      missing.push(snippet);
    }
  }
}

for (const snippet of requiredMigrationSnippets) {
  if (!migrationLower.includes(snippet.toLowerCase())) {
    missing.push(snippet);
  }
}

for (const snippet of requiredSeedSnippets) {
  if (!seedLower.includes(snippet.toLowerCase())) {
    missing.push('seed: ' + snippet);
  }
}

const explicitRolePermissionValues = seed.includes(
  'insert into public.role_permissions (role_code, permission_code) values\n',
)
  ? seed
      .split('insert into public.role_permissions (role_code, permission_code) values\n')
      .at(-1)
      .split('\non conflict (role_code, permission_code) do nothing;')[0]
  : '';

for (const revokedPermission of ['orders.create', 'orders.item.add']) {
  if (explicitRolePermissionValues.includes("('PROFESSIONAL', '" + revokedPermission + "')")) {
    missing.push('seed: PROFESSIONAL should not be granted ' + revokedPermission);
  }
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

function requireRoleLacksPermissions(label, source, role, permissions) {
  const block = roleBlock(source, role);
  for (const permission of permissions) {
    if (block.includes("'" + permission + "'")) {
      missing.push(label + ': ' + role + ' should not include ' + permission);
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

const operationalOrderPermissions = [
  'appointments.check_in',
  'orders.read',
  'orders.create',
  'orders.update',
  'orders.item.add',
  'orders.item.update',
  'orders.item.remove',
];

for (const role of ['PLATFORM_MASTER', 'OWNER', 'MANAGER', 'RECEPTIONIST']) {
  requireRolePermissions('auth-server', authServer, role, operationalOrderPermissions);
}
requireRolePermissions('auth-server', authServer, 'PROFESSIONAL', ['orders.read']);
requireRoleLacksPermissions('auth-server', authServer, 'PROFESSIONAL', [
  'appointments.check_in',
  'orders.create',
  'orders.update',
  'orders.item.add',
  'orders.item.update',
  'orders.item.remove',
]);
requireDevPermissions(operationalOrderPermissions);

if (missing.length) {
  console.error('Orders migration validation missing: ' + missing.join(', '));
  process.exit(1);
}

console.log(
  'Orders migration validated (' +
    tables.length +
    ' tables, ' +
    requiredMigrationSnippets.length +
    ' migration checks, ' +
    requiredSeedSnippets.length +
    ' seed/auth checks).',
);
