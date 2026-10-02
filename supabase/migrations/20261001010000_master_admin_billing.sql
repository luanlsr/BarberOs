alter table public.tenants
  add column if not exists lifecycle_status text not null default 'ACTIVE',
  add column if not exists lifecycle_reason text,
  add column if not exists lifecycle_updated_by uuid,
  add column if not exists lifecycle_updated_at timestamptz not null default now();

alter table public.tenants drop constraint if exists tenants_status_check;
alter table public.tenants
  add constraint tenants_status_check
  check (status in ('TRIALING', 'ACTIVE', 'RESTRICTED', 'SUSPENDED', 'CANCELLED', 'ARCHIVED'));

alter table public.tenants drop constraint if exists tenants_lifecycle_status_check;
alter table public.tenants
  add constraint tenants_lifecycle_status_check
  check (lifecycle_status in ('TRIALING', 'ACTIVE', 'RESTRICTED', 'SUSPENDED', 'CANCELLED'));

alter table public.saas_plans
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid;

alter table public.saas_plans drop constraint if exists saas_plans_status_check;
alter table public.saas_plans
  add constraint saas_plans_status_check
  check (status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'));

alter table public.tenant_subscriptions
  add column if not exists trial_starts_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists status_reason text,
  add column if not exists updated_by uuid;

alter table public.tenant_subscriptions drop constraint if exists tenant_subscriptions_status_check;
alter table public.tenant_subscriptions
  add constraint tenant_subscriptions_status_check
  check (status in ('TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELLED', 'EXPIRED'));

alter table public.billing_invoices
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists status_reason text;

alter table public.billing_invoices drop constraint if exists billing_invoices_status_check;
alter table public.billing_invoices
  add constraint billing_invoices_status_check
  check (status in ('DRAFT', 'OPEN', 'PAID', 'OVERDUE', 'VOID', 'UNCOLLECTIBLE'));

alter table public.tenant_entitlements
  add column if not exists source text not null default 'LEGACY_TENANT_ENTITLEMENT',
  add column if not exists limit_value integer,
  add column if not exists reason text,
  add column if not exists expires_at timestamptz,
  add column if not exists updated_by uuid,
  add column if not exists updated_at timestamptz not null default now();

alter table public.tenant_entitlements drop constraint if exists tenant_entitlements_source_check;
alter table public.tenant_entitlements
  add constraint tenant_entitlements_source_check
  check (source in ('PLAN', 'OVERRIDE', 'LEGACY_TENANT_ENTITLEMENT'));

alter table public.tenant_entitlements drop constraint if exists tenant_entitlements_limit_value_check;
alter table public.tenant_entitlements
  add constraint tenant_entitlements_limit_value_check
  check (limit_value is null or limit_value >= 0);

create table if not exists public.tenant_entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entitlement_code text not null references public.entitlements(code) on delete restrict,
  enabled boolean not null,
  limit_value integer check (limit_value is null or limit_value >= 0),
  reason text not null,
  expires_at timestamptz,
  created_by uuid,
  revoked_by uuid,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(reason)) >= 3)
);

create unique index if not exists tenant_entitlement_overrides_active_idx
  on public.tenant_entitlement_overrides (tenant_id, entitlement_code)
  where revoked_at is null;

create index if not exists tenant_entitlement_overrides_tenant_idx
  on public.tenant_entitlement_overrides (tenant_id, entitlement_code, expires_at);

alter table public.support_access_sessions
  add column if not exists purpose text,
  add column if not exists operation_class text not null default 'METADATA_ONLY',
  add column if not exists request_id text,
  add column if not exists created_by uuid,
  add column if not exists updated_at timestamptz not null default now();

update public.support_access_sessions
set purpose = reason
where purpose is null;

alter table public.support_access_sessions drop constraint if exists support_access_sessions_operation_class_check;
alter table public.support_access_sessions
  add constraint support_access_sessions_operation_class_check
  check (operation_class in ('METADATA_ONLY', 'TENANT_HEALTH', 'PRIVATE_OPERATIONAL_READ', 'BILLING_SUPPORT'));

alter table public.audit_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists audit_logs_platform_action_idx
  on public.audit_logs (action, created_at desc)
  where tenant_id is null;

create index if not exists tenant_subscriptions_platform_idx
  on public.tenant_subscriptions (status, current_period_end, tenant_id);

create index if not exists billing_invoices_platform_idx
  on public.billing_invoices (status, due_at, tenant_id);

alter table public.tenant_entitlement_overrides enable row level security;

drop policy if exists tenant_subscriptions_member_select on public.tenant_subscriptions;
create policy tenant_subscriptions_member_select on public.tenant_subscriptions
  for select to authenticated
  using (public.has_platform_access() or public.has_active_membership(tenant_id));

drop policy if exists tenant_subscriptions_member_write on public.tenant_subscriptions;
drop policy if exists tenant_subscriptions_platform_write on public.tenant_subscriptions;
create policy tenant_subscriptions_platform_write on public.tenant_subscriptions
  for all to authenticated
  using (public.has_platform_access())
  with check (public.has_platform_access());

drop policy if exists billing_invoices_member_select on public.billing_invoices;
create policy billing_invoices_member_select on public.billing_invoices
  for select to authenticated
  using (public.has_platform_access() or public.has_active_membership(tenant_id));

drop policy if exists billing_invoices_member_write on public.billing_invoices;
drop policy if exists billing_invoices_platform_write on public.billing_invoices;
create policy billing_invoices_platform_write on public.billing_invoices
  for all to authenticated
  using (public.has_platform_access())
  with check (public.has_platform_access());

drop policy if exists tenant_entitlements_member_select on public.tenant_entitlements;
create policy tenant_entitlements_member_select on public.tenant_entitlements
  for select to authenticated
  using (public.has_platform_access() or public.has_active_membership(tenant_id));

drop policy if exists tenant_entitlements_platform_write on public.tenant_entitlements;
create policy tenant_entitlements_platform_write on public.tenant_entitlements
  for all to authenticated
  using (public.has_platform_access())
  with check (public.has_platform_access());

drop policy if exists tenant_entitlement_overrides_platform_select on public.tenant_entitlement_overrides;
create policy tenant_entitlement_overrides_platform_select on public.tenant_entitlement_overrides
  for select to authenticated
  using (public.has_platform_access());

drop policy if exists tenant_entitlement_overrides_platform_write on public.tenant_entitlement_overrides;
create policy tenant_entitlement_overrides_platform_write on public.tenant_entitlement_overrides
  for all to authenticated
  using (public.has_platform_access())
  with check (public.has_platform_access());

drop policy if exists audit_platform_select on public.audit_logs;
create policy audit_platform_select on public.audit_logs
  for select to authenticated
  using (public.has_platform_access() or tenant_id is null or public.has_active_membership(tenant_id));

comment on table public.tenant_entitlement_overrides is 'Audited platform entitlement overrides used by effective entitlement resolution.';
comment on column public.tenants.lifecycle_status is 'SaaS lifecycle state controlled by platform administration.';
comment on column public.support_access_sessions.operation_class is 'Maximum support operation class allowed by this audited scope.';
