create table if not exists public.tenant_visual_preferences (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  logo_url text,
  accent_color_hex text not null default '#F64C72',
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (logo_url is null or char_length(trim(logo_url)) <= 2048),
  check (accent_color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.user_interface_preferences (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id),
  check (jsonb_typeof(notification_preferences) = 'object')
);

create table if not exists public.tenant_notification_preferences (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  appointment_reminders_enabled boolean not null default true,
  stock_alerts_enabled boolean not null default true,
  billing_alerts_enabled boolean not null default true,
  staff_payment_alerts_enabled boolean not null default true,
  ai_insights_enabled boolean not null default true,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_visual_preferences_updated_idx
  on public.tenant_visual_preferences (updated_at desc);

create index if not exists user_interface_preferences_user_idx
  on public.user_interface_preferences (user_id, updated_at desc);

create or replace function public.has_tenant_permission(target_tenant uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.memberships m
      join public.role_permissions rp on rp.role_code = m.role
     where m.tenant_id = target_tenant
       and m.user_id = auth.uid()
       and m.status = 'ACTIVE'
       and rp.permission_code = required_permission
  );
$$;

alter table public.tenant_visual_preferences enable row level security;
alter table public.user_interface_preferences enable row level security;
alter table public.tenant_notification_preferences enable row level security;

drop policy if exists tenant_visual_preferences_member_select on public.tenant_visual_preferences;
create policy tenant_visual_preferences_member_select on public.tenant_visual_preferences
  for select to authenticated
  using (public.has_active_membership(tenant_id));

drop policy if exists tenant_visual_preferences_manager_write on public.tenant_visual_preferences;
create policy tenant_visual_preferences_manager_write on public.tenant_visual_preferences
  for all to authenticated
  using (public.has_tenant_permission(tenant_id, 'settings.manage'))
  with check (public.has_tenant_permission(tenant_id, 'settings.manage'));

drop policy if exists user_interface_preferences_owner_select on public.user_interface_preferences;
create policy user_interface_preferences_owner_select on public.user_interface_preferences
  for select to authenticated
  using (public.has_active_membership(tenant_id) and user_id = auth.uid());

drop policy if exists user_interface_preferences_owner_write on public.user_interface_preferences;
create policy user_interface_preferences_owner_write on public.user_interface_preferences
  for all to authenticated
  using (public.has_active_membership(tenant_id) and user_id = auth.uid())
  with check (public.has_active_membership(tenant_id) and user_id = auth.uid());

drop policy if exists tenant_notification_preferences_member_select on public.tenant_notification_preferences;
create policy tenant_notification_preferences_member_select on public.tenant_notification_preferences
  for select to authenticated
  using (public.has_active_membership(tenant_id));

drop policy if exists tenant_notification_preferences_manager_write on public.tenant_notification_preferences;
create policy tenant_notification_preferences_manager_write on public.tenant_notification_preferences
  for all to authenticated
  using (public.has_tenant_permission(tenant_id, 'settings.manage'))
  with check (public.has_tenant_permission(tenant_id, 'settings.manage'));

insert into public.permissions (code, description) values
  ('settings.manage', 'Gerenciar preferencias e configuracoes do tenant')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code) values
  ('OWNER', 'settings.manage'),
  ('MANAGER', 'settings.manage'),
  ('PLATFORM_MASTER', 'settings.manage')
on conflict (role_code, permission_code) do nothing;

comment on table public.tenant_visual_preferences is 'Tenant-scoped visual identity preferences applied as BarberOS design tokens.';
comment on table public.user_interface_preferences is 'Per-user interface preferences such as theme and in-app notification toggles.';
comment on table public.tenant_notification_preferences is 'Tenant-level defaults for operational notification surfaces.';
