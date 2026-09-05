create extension if not exists btree_gist;

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  display_name text not null,
  email text,
  phone text,
  role_label text not null default 'Profissional',
  avatar_url text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(display_name)) >= 2)
);

create table if not exists public.professional_branches (
  professional_id uuid not null references public.professionals(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (professional_id, branch_id)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  category text not null,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  price_cents integer not null check (price_cents >= 0),
  estimated_cost_cents integer check (estimated_cost_cents is null or estimated_cost_cents >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists public.service_professionals (
  service_id uuid not null references public.services(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  price_cents integer check (price_cents is null or price_cents >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 720),
  created_at timestamptz not null default now(),
  primary key (service_id, professional_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  birth_date date,
  notes text,
  source text,
  preferred_professional_id uuid references public.professionals(id) on delete set null,
  consent_whatsapp boolean not null default false,
  consent_marketing boolean not null default false,
  status text not null default 'NEW' check (status in ('NEW', 'ACTIVE', 'COOLING', 'AT_RISK', 'INACTIVE', 'LOST', 'ARCHIVED')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) >= 2),
  check (char_length(trim(phone)) >= 8)
);

create table if not exists public.professional_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at_local time not null,
  ends_at_local time not null,
  break_starts_at_local time,
  break_ends_at_local time,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at_local < ends_at_local),
  check (
    (break_starts_at_local is null and break_ends_at_local is null)
    or (
      break_starts_at_local is not null
      and break_ends_at_local is not null
      and starts_at_local < break_starts_at_local
      and break_starts_at_local < break_ends_at_local
      and break_ends_at_local < ends_at_local
    )
  ),
  unique (tenant_id, branch_id, professional_id, weekday, starts_at_local, ends_at_local)
);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  professional_id uuid references public.professionals(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  type text not null check (type in ('BREAK', 'DAY_OFF', 'VACATION', 'MAINTENANCE', 'MANUAL')),
  reason text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'CONFIRMED' check (status in ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  source text not null default 'MANUAL' check (source in ('MANUAL', 'ONLINE', 'WHATSAPP', 'AI')),
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table if not exists public.appointment_services (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  sequence integer not null check (sequence >= 1),
  service_name text not null,
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  price_cents integer not null check (price_cents >= 0),
  created_at timestamptz not null default now(),
  primary key (appointment_id, sequence)
);

create table if not exists public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  previous_status text check (previous_status in ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  next_status text not null check (next_status in ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  actor_id uuid,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists professionals_tenant_status_idx on public.professionals (tenant_id, status);
create index if not exists professional_branches_tenant_branch_idx on public.professional_branches (tenant_id, branch_id);
create index if not exists services_tenant_status_idx on public.services (tenant_id, status);
create index if not exists service_professionals_tenant_professional_idx on public.service_professionals (tenant_id, professional_id);
create index if not exists customers_tenant_branch_idx on public.customers (tenant_id, branch_id);
create index if not exists customers_tenant_phone_idx on public.customers (tenant_id, phone);
create index if not exists professional_schedules_lookup_idx on public.professional_schedules (tenant_id, branch_id, professional_id, weekday) where active;
create index if not exists schedule_blocks_lookup_idx on public.schedule_blocks (tenant_id, branch_id, professional_id, starts_at, ends_at) where active;
create index if not exists appointments_tenant_branch_start_idx on public.appointments (tenant_id, branch_id, starts_at);
create index if not exists appointments_customer_idx on public.appointments (tenant_id, customer_id, starts_at desc);
create index if not exists appointments_professional_start_idx on public.appointments (tenant_id, branch_id, professional_id, starts_at);
create index if not exists appointment_services_tenant_service_idx on public.appointment_services (tenant_id, service_id);
create index if not exists appointment_status_history_lookup_idx on public.appointment_status_history (tenant_id, appointment_id, created_at desc);

alter table public.appointments
  drop constraint if exists appointments_no_active_overlap;
alter table public.appointments
  add constraint appointments_no_active_overlap
  exclude using gist (
    tenant_id with =,
    branch_id with =,
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE'));

alter table public.professionals enable row level security;
alter table public.professional_branches enable row level security;
alter table public.services enable row level security;
alter table public.service_professionals enable row level security;
alter table public.customers enable row level security;
alter table public.professional_schedules enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.appointment_status_history enable row level security;

drop policy if exists professionals_member_select on public.professionals;
create policy professionals_member_select on public.professionals for select to authenticated using (public.has_active_membership(tenant_id));
drop policy if exists professionals_member_write on public.professionals;
create policy professionals_member_write on public.professionals for all to authenticated using (public.has_active_membership(tenant_id)) with check (public.has_active_membership(tenant_id));

drop policy if exists professional_branches_member_select on public.professional_branches;
create policy professional_branches_member_select on public.professional_branches for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists professional_branches_member_write on public.professional_branches;
create policy professional_branches_member_write on public.professional_branches for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists services_member_select on public.services;
create policy services_member_select on public.services for select to authenticated using (public.has_active_membership(tenant_id));
drop policy if exists services_member_write on public.services;
create policy services_member_write on public.services for all to authenticated using (public.has_active_membership(tenant_id)) with check (public.has_active_membership(tenant_id));

drop policy if exists service_professionals_member_select on public.service_professionals;
create policy service_professionals_member_select on public.service_professionals for select to authenticated using (public.has_active_membership(tenant_id));
drop policy if exists service_professionals_member_write on public.service_professionals;
create policy service_professionals_member_write on public.service_professionals for all to authenticated using (public.has_active_membership(tenant_id)) with check (public.has_active_membership(tenant_id));

drop policy if exists customers_member_select on public.customers;
create policy customers_member_select on public.customers for select to authenticated using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));
drop policy if exists customers_member_write on public.customers;
create policy customers_member_write on public.customers for all to authenticated using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id))) with check (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));

drop policy if exists professional_schedules_member_select on public.professional_schedules;
create policy professional_schedules_member_select on public.professional_schedules for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists professional_schedules_member_write on public.professional_schedules;
create policy professional_schedules_member_write on public.professional_schedules for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists schedule_blocks_member_select on public.schedule_blocks;
create policy schedule_blocks_member_select on public.schedule_blocks for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists schedule_blocks_member_write on public.schedule_blocks;
create policy schedule_blocks_member_write on public.schedule_blocks for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists appointments_member_select on public.appointments;
create policy appointments_member_select on public.appointments for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists appointments_member_write on public.appointments;
create policy appointments_member_write on public.appointments for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists appointment_services_member_select on public.appointment_services;
create policy appointment_services_member_select on public.appointment_services for select to authenticated using (public.has_active_membership(tenant_id));
drop policy if exists appointment_services_member_write on public.appointment_services;
create policy appointment_services_member_write on public.appointment_services for all to authenticated using (public.has_active_membership(tenant_id)) with check (public.has_active_membership(tenant_id));

drop policy if exists appointment_status_history_member_select on public.appointment_status_history;
create policy appointment_status_history_member_select on public.appointment_status_history for select to authenticated using (public.has_active_membership(tenant_id));
drop policy if exists appointment_status_history_member_insert on public.appointment_status_history;
create policy appointment_status_history_member_insert on public.appointment_status_history for insert to authenticated with check (public.has_active_membership(tenant_id));