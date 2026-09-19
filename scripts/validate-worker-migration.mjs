import { readFile, readdir } from 'node:fs/promises';

const migrationName = '20260918010000_worker_outbox_notifications.sql';
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
const inventoryIndex = files.indexOf('20260909010000_inventory_products.sql');
const workerIndex = files.indexOf(migrationName);

const tables = [
  'outbox_events',
  'worker_jobs',
  'worker_job_attempts',
  'notification_intents',
  'notification_delivery_attempts',
];

const branchScopedTables = tables;

const requiredMigrationSnippets = [
  "event_type in ('APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'ORDER_OPENED', 'ORDER_PAID', 'PAYMENT_COMPLETED', 'PAYMENT_REFUNDED', 'FINANCE_RECALCULATION_REQUESTED', 'STOCK_LOW_DETECTED', 'NOTIFICATION_DELIVERY_REQUESTED')",
  "source_type in ('APPOINTMENT', 'ORDER', 'PAYMENT', 'CASH_REGISTER', 'FINANCIAL_ENTRY', 'COMMISSION', 'PAYOUT', 'PRODUCT', 'STOCK_MOVEMENT', 'NOTIFICATION_INTENT', 'SYSTEM')",
  "status in ('PENDING', 'DISPATCHING', 'DISPATCHED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED')",
  "status in ('PENDING', 'CLAIMED', 'RUNNING', 'SUCCEEDED', 'RETRY_SCHEDULED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED')",
  "status in ('RUNNING', 'SUCCEEDED', 'FAILED', 'RETRY_SCHEDULED', 'DEAD_LETTERED')",
  "channel in ('WHATSAPP', 'SMS', 'EMAIL', 'IN_APP', 'LOCAL')",
  'schema_version integer not null default 1 check (schema_version = 1)',
  'references public.tenants(id)',
  'references public.branches(id)',
  'references public.outbox_events(id)',
  'references public.worker_jobs(id)',
  'references public.notification_intents(id)',
  'outbox_events_tenant_branch_status_idx',
  'outbox_events_idempotency_idx',
  'outbox_events_source_event_unique_idx',
  'worker_jobs_tenant_branch_status_idx',
  'worker_jobs_idempotency_idx',
  'worker_jobs_source_unique_idx',
  'worker_job_attempts_attempt_unique_idx',
  'notification_intents_tenant_branch_status_idx',
  'notification_intents_idempotency_idx',
  'notification_delivery_attempts_attempt_unique_idx',
  'create or replace function public.has_worker_operations_access',
  "m.role in ('PLATFORM_MASTER', 'PLATFORM_SUPPORT', 'OWNER', 'MANAGER')",
  'create or replace function public.has_notification_status_access',
  "m.role in ('PLATFORM_MASTER', 'PLATFORM_SUPPORT', 'OWNER', 'MANAGER', 'RECEPTIONIST')",
  'public.has_worker_operations_access',
  'public.has_notification_status_access',
  'outbox_events_worker_select',
  'outbox_events_worker_write',
  'worker_jobs_worker_select',
  'worker_jobs_worker_write',
  'worker_job_attempts_worker_select',
  'worker_job_attempts_worker_write',
  'notification_intents_status_select',
  'notification_intents_worker_write',
  'notification_delivery_attempts_status_select',
  'notification_delivery_attempts_worker_write',
  'last_error_code text check',
  'error_code text check',
  'WORKER_RETRY_EXHAUSTED',
  "type <> 'NOTIFICATION_DELIVERY' or notification_intent_id is not null",
];

const requiredContractSnippets = [
  'export const outboxEventSchema',
  'export const workerJobSchema',
  'export const workerJobAttemptSchema',
  'export const notificationIntentSchema',
  'export const notificationDeliveryAttemptSchema',
  'export const workerErrorCodeSchema',
  'worker.failures.read',
  'notifications.status.read',
  'worker.operations',
  'notifications',
];

const requiredSeedSnippets = [
  "'worker.failures.read'",
  "'notifications.status.read'",
  "'worker.operations'",
  "'notifications'",
  'insert into public.outbox_events',
  'insert into public.worker_jobs',
  'insert into public.worker_job_attempts',
  'insert into public.notification_intents',
  'insert into public.notification_delivery_attempts',
  'seed-worker-job-pending-4101',
  'seed-worker-job-succeeded-4102',
  'seed-worker-job-retrying-4103',
  'seed-worker-job-failed-4104',
  'seed-worker-job-dead-4105',
  "'PENDING'",
  "'SUCCEEDED'",
  "'RETRY_SCHEDULED'",
  "'FAILED'",
  "'DEAD_LETTERED'",
  'seed-notification-sent-4002',
  'seed-notification-failed-4003',
];

const missing = [];

if (inventoryIndex === -1) missing.push('inventory migration file');
if (workerIndex === -1) missing.push(migrationName + ' file');
if (inventoryIndex !== -1 && workerIndex !== -1 && workerIndex <= inventoryIndex) {
  missing.push('worker migration ordered after inventory migration');
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
  if (!tableBody.includes('branch_id uuid references public.branches(id) on delete restrict')) {
    missing.push(table + ' branch foreign key');
  }
  if (!tableBody.includes('created_at timestamptz')) {
    missing.push(table + ' created_at timestamp');
  }
}

for (const snippet of requiredMigrationSnippets) {
  if (!migrationLower.includes(snippet.toLowerCase())) missing.push(snippet);
}

for (const snippet of requiredContractSnippets) {
  if (!contractsLower.includes(snippet.toLowerCase())) missing.push('contract: ' + snippet);
}

for (const snippet of requiredSeedSnippets) {
  if (!seedLower.includes(snippet.toLowerCase())) missing.push('seed: ' + snippet);
}

if (!packageLower.includes('"validate:worker"')) missing.push('validate:worker package script');

if (missing.length > 0) {
  console.error('Worker migration validation missing: ' + missing.join(', '));
  process.exit(1);
}

console.log(
  'Worker migration validated (' +
    tables.length +
    ' tables, ' +
    requiredMigrationSnippets.length +
    ' migration checks, ' +
    requiredContractSnippets.length +
    ' contract checks, ' +
    requiredSeedSnippets.length +
    ' seed checks).',
);
