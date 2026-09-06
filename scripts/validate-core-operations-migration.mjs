import { readFile, readdir } from 'node:fs/promises';

const migrationName = '20260905010000_core_operations_scheduling.sql';
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const migration = await readFile(
  new URL(`../supabase/migrations/${migrationName}`, import.meta.url),
  'utf8',
);
const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
const migrationLower = migration.toLowerCase();
const seedLower = seed.toLowerCase();

const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
const foundationIndex = files.indexOf('20260905000000_foundation_identity_access.sql');
const coreIndex = files.indexOf(migrationName);

const tables = [
  'professionals',
  'professional_branches',
  'services',
  'service_professionals',
  'customers',
  'professional_schedules',
  'schedule_blocks',
  'appointments',
  'appointment_services',
  'appointment_status_history',
];

const requiredMigrationSnippets = [
  'create extension if not exists btree_gist',
  'appointments_no_active_overlap',
  'exclude using gist',
  "tstzrange(starts_at, ends_at, '[)')",
  "status in ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE')",
  'professionals_tenant_status_idx',
  'professional_branches_tenant_branch_idx',
  'services_tenant_status_idx',
  'service_professionals_tenant_professional_idx',
  'customers_tenant_branch_idx',
  'customers_tenant_phone_idx',
  'professional_schedules_lookup_idx',
  'schedule_blocks_lookup_idx',
  'appointments_tenant_branch_start_idx',
  'appointments_customer_idx',
  'appointments_professional_start_idx',
  'appointment_services_tenant_service_idx',
  'appointment_status_history_lookup_idx',
  'public.has_active_membership',
  'public.has_branch_access',
];

const requiredSeedSnippets = [
  "'professionals.create'",
  "'services.create'",
  "'schedules.manage'",
  "'core.operations'",
  "'00000000-0000-0000-0000-000000000101'",
  "'00000000-0000-0000-0000-000000000201'",
  "'00000000-0000-0000-0000-000000000301'",
  "'00000000-0000-0000-0000-000000000401'",
  'carlos andrade',
  'corte masculino',
  'joao silva',
  "'00000000-0000-0000-0000-000000000001'",
  "'00000000-0000-0000-0000-000000000011'",
];

const missing = [];

if (foundationIndex === -1) {
  missing.push('foundation migration file');
}
if (coreIndex === -1) {
  missing.push(`${migrationName} file`);
}
if (foundationIndex !== -1 && coreIndex !== -1 && coreIndex <= foundationIndex) {
  missing.push('core operations migration ordered after foundation migration');
}

for (const table of tables) {
  for (const snippet of [
    `create table if not exists public.${table}`,
    `alter table public.${table} enable row level security`,
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
    missing.push(`seed: ${snippet}`);
  }
}

if (missing.length) {
  console.error(`Core operations migration validation missing: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(
  `Core operations migration validated (${tables.length} tables, ${requiredMigrationSnippets.length} migration checks, ${requiredSeedSnippets.length} seed checks).`,
);
