create table if not exists public.platform_feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  enabled boolean not null default false,
  status text not null default 'INTERNAL' check (status in ('INTERNAL', 'BETA', 'GA', 'DISABLED')),
  rollout_strategy text not null default 'PLATFORM_ONLY' check (rollout_strategy in ('PLATFORM_ONLY', 'TENANT_ALLOWLIST', 'PERCENTAGE', 'GLOBAL')),
  rollout_config jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(key)) >= 3),
  check (char_length(trim(name)) >= 3)
);

create table if not exists public.platform_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text not null default 'INVESTIGATING' check (status in ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED')),
  affected_area text not null check (affected_area in ('WEB', 'AUTH', 'DATABASE', 'WORKER', 'AI', 'MESSAGING', 'BILLING', 'INTEGRATIONS')),
  summary text,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(title)) >= 3),
  check (resolved_at is null or resolved_at >= started_at)
);

create index if not exists platform_feature_flags_status_idx
  on public.platform_feature_flags (status, enabled, updated_at desc);

create index if not exists platform_incidents_status_idx
  on public.platform_incidents (status, severity, started_at desc);

alter table public.platform_feature_flags enable row level security;
drop policy if exists platform_feature_flags_platform_select on public.platform_feature_flags;
create policy platform_feature_flags_platform_select on public.platform_feature_flags
  for select to authenticated
  using (public.has_platform_access());
drop policy if exists platform_feature_flags_platform_write on public.platform_feature_flags;
create policy platform_feature_flags_platform_write on public.platform_feature_flags
  for all to authenticated
  using (public.has_platform_access())
  with check (public.has_platform_access());

alter table public.platform_incidents enable row level security;
drop policy if exists platform_incidents_platform_select on public.platform_incidents;
create policy platform_incidents_platform_select on public.platform_incidents
  for select to authenticated
  using (public.has_platform_access());
drop policy if exists platform_incidents_platform_write on public.platform_incidents;
create policy platform_incidents_platform_write on public.platform_incidents
  for all to authenticated
  using (public.has_platform_access())
  with check (public.has_platform_access());

comment on table public.platform_feature_flags is 'Global BarberOS feature flags visible only to platform admins.';
comment on table public.platform_incidents is 'Platform incident register for Super Admin operations.';
