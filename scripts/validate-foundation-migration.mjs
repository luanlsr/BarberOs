import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20260905000000_foundation_identity_access.sql', import.meta.url),
  'utf8',
);
const required = [
  'create table if not exists public.tenants',
  'create table if not exists public.branches',
  'create table if not exists public.memberships',
  'create table if not exists public.membership_branches',
  'create table if not exists public.audit_logs',
  'enable row level security',
  'create policy foundation_probe_member_select',
  'create policy foundation_probe_member_insert',
  'has_active_membership',
  'has_branch_access',
];
const missing = required.filter((entry) => !migration.toLowerCase().includes(entry.toLowerCase()));
if (missing.length) {
  console.error(`Foundation migration missing: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`Foundation migration validated (${required.length} checks).`);
