import { readFile, readdir } from 'node:fs/promises';

const migrationName = '20260909010000_inventory_products.sql';
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const migration = await readFile(
  new URL('../supabase/migrations/' + migrationName, import.meta.url),
  'utf8',
);
const contracts = await readFile(
  new URL('../packages/contracts/src/index.ts', import.meta.url),
  'utf8',
);
const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');
const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
const migrationLower = migration.toLowerCase();
const contractsLower = contracts.toLowerCase();
const packageLower = packageJson.toLowerCase();
const seedLower = seed.toLowerCase();

const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
const financeIndex = files.indexOf('20260908010000_financial_ledger_commissions.sql');
const inventoryIndex = files.indexOf(migrationName);

const tables = [
  'product_categories',
  'product_category_branches',
  'products',
  'product_branches',
  'inventory_locations',
  'stock_movements',
  'low_stock_alerts',
];

const branchScopedTables = [
  'product_category_branches',
  'product_branches',
  'inventory_locations',
  'stock_movements',
  'low_stock_alerts',
];

const requiredMigrationSnippets = [
  "status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')",
  "stock_tracking_policy in ('TRACKED', 'NOT_TRACKED')",
  "type in ('ENTRY', 'SALE', 'LOSS', 'CONSUMPTION', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT')",
  "source_type in ('MANUAL', 'ORDER_ITEM', 'PAYMENT', 'TRANSFER', 'SYSTEM')",
  "state in ('ACTIVE', 'RESOLVED')",
  'references public.tenants(id)',
  'references public.branches(id)',
  'references public.product_categories(id)',
  'references public.products(id)',
  'references public.inventory_locations(id)',
  'references public.orders(id)',
  'references public.order_items(id)',
  'references public.payments(id)',
  'sale_price_amount_cents > 0',
  'cost_amount_cents >= 0',
  'minimum_stock_quantity >= 0',
  'quantity <> 0',
  "type <> 'SALE' or (order_id is not null and order_item_id is not null and payment_id is not null)",
  'product_categories_tenant_status_idx',
  'product_category_branches_tenant_branch_idx',
  'products_tenant_status_idx',
  'products_tenant_category_idx',
  'product_branches_tenant_branch_idx',
  'inventory_locations_tenant_branch_active_idx',
  'stock_movements_tenant_branch_product_idx',
  'stock_movements_order_item_idx',
  'stock_movements_payment_idx',
  'low_stock_alerts_tenant_branch_state_idx',
  'stock_movements_idempotency_idx',
  'stock_movements_sale_source_unique_idx',
  "where type = 'SALE'",
  'low_stock_alerts_active_product_idx',
  "where state = 'ACTIVE'",
  'create or replace function public.has_inventory_access',
  "m.role in ('PLATFORM_MASTER', 'OWNER', 'MANAGER', 'FINANCE', 'RECEPTIONIST')",
  'public.has_inventory_access',
  'product_categories_inventory_select',
  'product_categories_inventory_write',
  'products_inventory_select',
  'products_inventory_write',
  'inventory_locations_inventory_select',
  'inventory_locations_inventory_write',
  'stock_movements_inventory_select',
  'stock_movements_inventory_write',
  'low_stock_alerts_inventory_select',
  'low_stock_alerts_inventory_write',
  'create or replace function public.record_payment_inventory_sale_effects',
  'create or replace function public.receive_order_payment_with_inventory_effects',
  'public.receive_order_payment_with_money_effects',
  'public.record_payment_inventory_sale_effects',
  "oi.source_type = 'PRODUCT'",
  "p.stock_tracking_policy = 'TRACKED'",
  "p.status = 'ACTIVE'",
  'public.product_branches',
  'for update',
  'select coalesce(sum(quantity), 0) into v_current_quantity',
  'v_next_quantity := v_current_quantity - v_item.quantity',
  'not v_product.allow_negative_stock',
  "raise exception 'Insufficient stock for product sale.'",
  'insert into public.stock_movements',
  "'SALE'",
  "'PAYMENT'",
  'balance_after_quantity',
  'payment_id',
  "v_order.status <> 'PAID'",
  'sm.order_id = p_order_id',
  "sm.type = 'SALE'",
];

const requiredContractSnippets = [
  'export const productCategorySchema',
  'export const productSchema',
  'export const inventoryLocationSchema',
  'export const stockMovementSchema',
  'export const stockBalanceSchema',
  'export const lowStockAlertSchema',
  'export const createStockEntryCommandSchema',
  'export const createStockSaleEffectCommandSchema',
];

const requiredSeedSnippets = [
  'insert into public.product_categories',
  'Finalizadores',
  'insert into public.product_category_branches',
  'insert into public.products',
  'Pomada Matte 80g',
  'Shampoo para Barba 120ml',
  'Agua mineral 500ml',
  "'ACTIVE', 4500, 1800, 'TRACKED'",
  "'ACTIVE', 3900, 1600, 'TRACKED'",
  "'INACTIVE', 600, 250, 'NOT_TRACKED'",
  'insert into public.product_branches',
  'insert into public.inventory_locations',
  'Estoque Centro',
  'Vitrine Centro',
  'seed-inventory-product-sale-order-704',
  "'PRODUCT', '00000000-0000-0000-0000-000000003101'",
  'seed-payment-1004',
  'PRODUCT_REVENUE',
  'insert into public.stock_movements',
  "'ENTRY', 24, 24",
  "'ENTRY', 2, 2",
  "'SALE', -1, 23",
  'seed-inventory-sale-3303',
  'insert into public.low_stock_alerts',
  "'ACTIVE', 2, 5",
];

const missing = [];

if (financeIndex === -1) missing.push('finance migration file');
if (inventoryIndex === -1) missing.push(migrationName + ' file');
if (financeIndex !== -1 && inventoryIndex !== -1 && inventoryIndex <= financeIndex) {
  missing.push('inventory migration ordered after finance migration');
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

for (const snippet of requiredContractSnippets) {
  if (!contractsLower.includes(snippet.toLowerCase())) missing.push(snippet);
}

for (const snippet of requiredSeedSnippets) {
  if (!seedLower.includes(snippet.toLowerCase())) missing.push('seed: ' + snippet);
}

if (!packageLower.includes('"validate:inventory"'))
  missing.push('validate:inventory package script');

if (missing.length > 0) {
  console.error('Inventory migration validation missing: ' + missing.join(', '));
  process.exit(1);
}

console.log(
  'Inventory migration validated (' +
    tables.length +
    ' tables, ' +
    requiredMigrationSnippets.length +
    ' migration checks, ' +
    requiredContractSnippets.length +
    ' contract checks, ' +
    requiredSeedSnippets.length +
    ' seed checks).',
);
