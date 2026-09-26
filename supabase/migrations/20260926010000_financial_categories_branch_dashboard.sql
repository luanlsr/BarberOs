create table if not exists public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  direction text not null check (direction in ('IN', 'OUT', 'BOTH')),
  code text not null,
  name text not null,
  description text,
  color text not null default '#64748b',
  icon text not null default 'wallet',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  system_default boolean not null default false,
  display_order integer not null default 100,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(code)) >= 2),
  check (char_length(trim(name)) >= 2),
  check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create index if not exists financial_categories_tenant_branch_status_idx on public.financial_categories (tenant_id, branch_id, status, display_order, name);
create index if not exists financial_categories_direction_idx on public.financial_categories (tenant_id, direction, status);
create unique index if not exists financial_categories_tenant_branch_code_idx on public.financial_categories (tenant_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(code));

alter table public.financial_entries add column if not exists financial_category_id uuid references public.financial_categories(id) on delete set null;
alter table public.expenses add column if not exists financial_category_id uuid references public.financial_categories(id) on delete set null;
alter table public.recurring_expense_templates add column if not exists financial_category_id uuid references public.financial_categories(id) on delete set null;

insert into public.financial_categories (id, tenant_id, branch_id, direction, code, name, description, status, system_default, display_order, created_by, created_at, updated_at)
select
  ec.id,
  ec.tenant_id,
  ec.branch_id,
  'OUT',
  trim(both '-' from regexp_replace(lower(ec.name), '[^a-z0-9]+', '-', 'g')),
  ec.name,
  ec.description,
  ec.status,
  false,
  100,
  ec.created_by,
  ec.created_at,
  ec.updated_at
from public.expense_categories ec
on conflict (id) do nothing;

update public.financial_entries fe
set financial_category_id = fe.category_id
where fe.financial_category_id is null
  and fe.category_id is not null
  and exists (select 1 from public.financial_categories fc where fc.id = fe.category_id);

update public.expenses e
set financial_category_id = e.category_id
where e.financial_category_id is null
  and e.category_id is not null
  and exists (select 1 from public.financial_categories fc where fc.id = e.category_id);

update public.recurring_expense_templates ret
set financial_category_id = ret.category_id
where ret.financial_category_id is null
  and ret.category_id is not null
  and exists (select 1 from public.financial_categories fc where fc.id = ret.category_id);

create index if not exists financial_entries_financial_category_idx on public.financial_entries (tenant_id, financial_category_id, branch_id, competence_date desc) where financial_category_id is not null;
create index if not exists expenses_financial_category_idx on public.expenses (tenant_id, financial_category_id, branch_id, competence_date desc) where financial_category_id is not null;
create index if not exists recurring_expense_templates_financial_category_idx on public.recurring_expense_templates (tenant_id, financial_category_id) where financial_category_id is not null;

alter table public.financial_categories enable row level security;

drop policy if exists financial_categories_money_select on public.financial_categories;
create policy financial_categories_money_select on public.financial_categories
  for select to authenticated
  using (public.has_money_management_access(tenant_id, branch_id));

drop policy if exists financial_categories_money_write on public.financial_categories;
create policy financial_categories_money_write on public.financial_categories
  for all to authenticated
  using (public.has_money_management_access(tenant_id, branch_id))
  with check (public.has_money_management_access(tenant_id, branch_id));