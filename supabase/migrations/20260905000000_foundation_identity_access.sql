create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null check (role in ('PLATFORM_MASTER', 'PLATFORM_SUPPORT', 'OWNER', 'MANAGER', 'FINANCE', 'RECEPTIONIST', 'PROFESSIONAL')),
  status text not null default 'ACTIVE' check (status in ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tenant_id)
);

create table if not exists public.membership_branches (
  membership_id uuid not null references public.memberships(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (membership_id, branch_id)
);

create table if not exists public.permissions (
  code text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.roles (
  code text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_code text not null references public.roles(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_code, permission_code)
);

create table if not exists public.entitlements (
  code text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_entitlements (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entitlement_code text not null references public.entitlements(code) on delete restrict,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id, entitlement_code)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_type text not null check (actor_type in ('USER', 'SYSTEM', 'SERVICE')),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  result text not null check (result in ('SUCCESS', 'DENIED', 'FAILURE')),
  before_state jsonb,
  after_state jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.foundation_probe (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists branches_tenant_id_idx on public.branches (tenant_id);
create index if not exists memberships_user_tenant_status_idx on public.memberships (user_id, tenant_id, status);
create index if not exists memberships_tenant_status_idx on public.memberships (tenant_id, status);
create index if not exists membership_branches_branch_id_idx on public.membership_branches (branch_id);
create index if not exists audit_logs_tenant_created_at_idx on public.audit_logs (tenant_id, created_at desc);
create index if not exists foundation_probe_tenant_branch_idx on public.foundation_probe (tenant_id, branch_id);

create or replace function public.has_active_membership(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.tenant_id = target_tenant and m.status = 'ACTIVE'
  );
$$;

create or replace function public.has_branch_access(target_tenant uuid, target_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.membership_branches mb on mb.membership_id = m.id
    join public.branches b on b.id = mb.branch_id and b.tenant_id = m.tenant_id
    where m.user_id = auth.uid()
      and m.tenant_id = target_tenant
      and mb.branch_id = target_branch
      and m.status = 'ACTIVE'
      and b.status = 'ACTIVE'
  );
$$;

alter table public.tenants enable row level security;
alter table public.branches enable row level security;
alter table public.memberships enable row level security;
alter table public.membership_branches enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.entitlements enable row level security;
alter table public.tenant_entitlements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.foundation_probe enable row level security;

drop policy if exists tenants_member_select on public.tenants;
create policy tenants_member_select on public.tenants for select to authenticated using (public.has_active_membership(id));
drop policy if exists branches_member_select on public.branches;
create policy branches_member_select on public.branches for select to authenticated using (public.has_branch_access(tenant_id, id));
drop policy if exists memberships_self_select on public.memberships;
create policy memberships_self_select on public.memberships for select to authenticated using (user_id = auth.uid() or public.has_active_membership(tenant_id));
drop policy if exists membership_branches_member_select on public.membership_branches;
create policy membership_branches_member_select on public.membership_branches for select to authenticated using (exists (select 1 from public.memberships m where m.id = membership_id and public.has_active_membership(m.tenant_id)));
drop policy if exists permissions_authenticated_select on public.permissions;
create policy permissions_authenticated_select on public.permissions for select to authenticated using (true);
drop policy if exists roles_authenticated_select on public.roles;
create policy roles_authenticated_select on public.roles for select to authenticated using (true);
drop policy if exists role_permissions_authenticated_select on public.role_permissions;
create policy role_permissions_authenticated_select on public.role_permissions for select to authenticated using (true);
drop policy if exists entitlements_authenticated_select on public.entitlements;
create policy entitlements_authenticated_select on public.entitlements for select to authenticated using (true);
drop policy if exists tenant_entitlements_member_select on public.tenant_entitlements;
create policy tenant_entitlements_member_select on public.tenant_entitlements for select to authenticated using (public.has_active_membership(tenant_id));
drop policy if exists audit_member_insert on public.audit_logs;
create policy audit_member_insert on public.audit_logs for insert to authenticated with check (tenant_id is null or public.has_active_membership(tenant_id));
drop policy if exists audit_member_select on public.audit_logs;
create policy audit_member_select on public.audit_logs for select to authenticated using (tenant_id is null or public.has_active_membership(tenant_id));
drop policy if exists foundation_probe_member_select on public.foundation_probe;
create policy foundation_probe_member_select on public.foundation_probe for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists foundation_probe_member_insert on public.foundation_probe;
create policy foundation_probe_member_insert on public.foundation_probe for insert to authenticated with check (public.has_branch_access(tenant_id, branch_id));