import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationPath = resolve('supabase/migrations/20261001010000_master_admin_billing.sql');
const sql = await readFile(migrationPath, 'utf8');
const seedSql = await readFile(resolve('supabase/seed.sql'), 'utf8');

const checks = [
  [
    'migration extends tenant lifecycle state',
    sql.includes('lifecycle_status') && sql.includes("'RESTRICTED'"),
  ],
  [
    'migration supports subscription billing edge states',
    sql.includes("'UNPAID'") && sql.includes("'OVERDUE'"),
  ],
  [
    'migration adds entitlement override table',
    sql.includes('create table if not exists public.tenant_entitlement_overrides'),
  ],
  [
    'migration stores entitlement override metadata',
    sql.includes('limit_value') &&
      sql.includes('expires_at') &&
      sql.includes('reason text not null'),
  ],
  [
    'migration extends support scopes',
    sql.includes('operation_class') && sql.includes('PRIVATE_OPERATIONAL_READ'),
  ],
  [
    'migration enables override RLS',
    sql.includes('alter table public.tenant_entitlement_overrides enable row level security'),
  ],
  [
    'migration restricts subscription writes to platform',
    sql.includes('tenant_subscriptions_platform_write') &&
      sql.includes('public.has_platform_access()'),
  ],
  [
    'migration restricts invoice writes to platform',
    sql.includes('billing_invoices_platform_write') && sql.includes('public.has_platform_access()'),
  ],
  [
    'migration restricts override visibility to platform',
    sql.includes('tenant_entitlement_overrides_platform_select'),
  ],
  [
    'migration adds audit metadata and platform audit index',
    sql.includes('add column if not exists metadata jsonb') &&
      sql.includes('audit_logs_platform_action_idx'),
  ],
  [
    'migration is additive/idempotent',
    (sql.match(/if not exists/g) ?? []).length >= 20 && sql.includes('drop policy if exists'),
  ],
  ['migration does not contain service role secrets', !/service[_-]?role|eyJhbGciOi/i.test(sql)],
  [
    'seed includes platform permissions',
    seedSql.includes('platform.tenants.read') && seedSql.includes('platform.billing.manage'),
  ],
  [
    'seed includes tenant lifecycle states',
    seedSql.includes("'TRIALING', 'TRIALING'") && seedSql.includes("'RESTRICTED', 'RESTRICTED'"),
  ],
  [
    'seed includes billing risk examples',
    seedSql.includes("'PAST_DUE'") && seedSql.includes("'OVERDUE'"),
  ],
  [
    'seed includes entitlement override examples',
    seedSql.includes('tenant_entitlement_overrides') &&
      seedSql.includes('ENTITLEMENT_OVERRIDE_APPLIED'),
  ],
  [
    'seed includes conditional support scope',
    seedSql.includes('support_access_sessions') && seedSql.includes('BILLING_SUPPORT'),
  ],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length > 0) {
  console.error(failures.map(([name]) => `FAIL: ${name}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Master Admin billing migration validated (${checks.length} checks).`);
}
