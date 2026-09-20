-- Customer-facing monthly plans sold by the barbershop.
-- Separate from tenant_subscriptions, which represents BarberOS SaaS billing.

create table if not exists public.customer_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  price_amount_cents integer not null check (price_amount_cents > 0),
  billing_interval text not null default 'MONTHLY' check (billing_interval in ('MONTHLY')),
  booking_window_days integer not null default 15 check (booking_window_days > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (tenant_id, name)
);

create table if not exists public.customer_subscription_plan_service_benefits (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  plan_id uuid not null references public.customer_subscription_plans(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  benefit_type text not null check (benefit_type in ('INCLUDED_MONTHLY_SERVICE', 'FULL_DISCOUNT_SERVICE')),
  monthly_quantity integer check (monthly_quantity is null or monthly_quantity > 0),
  discount_basis_points integer not null default 10000 check (discount_basis_points between 0 and 10000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (tenant_id, plan_id, service_id, benefit_type)
);

create table if not exists public.customer_subscription_plan_discount_benefits (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  plan_id uuid not null references public.customer_subscription_plans(id) on delete cascade,
  target_type text not null check (target_type in ('EXTRA_SERVICES', 'COSMETICS')),
  discount_basis_points integer not null check (discount_basis_points between 0 and 10000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (tenant_id, plan_id, target_type)
);

create index if not exists customer_subscription_plans_tenant_status_idx
  on public.customer_subscription_plans (tenant_id, status);

create index if not exists customer_subscription_plan_service_benefits_service_idx
  on public.customer_subscription_plan_service_benefits (tenant_id, service_id);

alter table public.customer_subscription_plans enable row level security;
alter table public.customer_subscription_plan_service_benefits enable row level security;
alter table public.customer_subscription_plan_discount_benefits enable row level security;

drop policy if exists customer_subscription_plans_member_select on public.customer_subscription_plans;
create policy customer_subscription_plans_member_select
  on public.customer_subscription_plans for select to authenticated
  using (public.has_active_membership(tenant_id));

drop policy if exists customer_subscription_plans_member_write on public.customer_subscription_plans;
create policy customer_subscription_plans_member_write
  on public.customer_subscription_plans for all to authenticated
  using (public.has_active_membership(tenant_id))
  with check (public.has_active_membership(tenant_id));

drop policy if exists customer_subscription_plan_service_benefits_member_select on public.customer_subscription_plan_service_benefits;
create policy customer_subscription_plan_service_benefits_member_select
  on public.customer_subscription_plan_service_benefits for select to authenticated
  using (public.has_active_membership(tenant_id));

drop policy if exists customer_subscription_plan_service_benefits_member_write on public.customer_subscription_plan_service_benefits;
create policy customer_subscription_plan_service_benefits_member_write
  on public.customer_subscription_plan_service_benefits for all to authenticated
  using (public.has_active_membership(tenant_id))
  with check (public.has_active_membership(tenant_id));

drop policy if exists customer_subscription_plan_discount_benefits_member_select on public.customer_subscription_plan_discount_benefits;
create policy customer_subscription_plan_discount_benefits_member_select
  on public.customer_subscription_plan_discount_benefits for select to authenticated
  using (public.has_active_membership(tenant_id));

drop policy if exists customer_subscription_plan_discount_benefits_member_write on public.customer_subscription_plan_discount_benefits;
create policy customer_subscription_plan_discount_benefits_member_write
  on public.customer_subscription_plan_discount_benefits for all to authenticated
  using (public.has_active_membership(tenant_id))
  with check (public.has_active_membership(tenant_id));

with requested_plans (code, name, description, price_amount_cents, included_services, full_discount_services) as (
  values
    (
      'monthly_haircut_7990',
      'Plano Corte',
      'Plano mensal de corte, com agenda liberada com 15 dias de antecedencia.',
      7990,
      array['Corte de cabelo']::text[],
      array['Acabamento/pezinho']::text[]
    ),
    (
      'monthly_beard_8990',
      'Plano Barba',
      'Plano mensal de barba, com agenda liberada com 15 dias de antecedencia.',
      8990,
      array['Barba']::text[],
      array[]::text[]
    ),
    (
      'monthly_haircut_beard_14990',
      'Plano Barba e Cabelo',
      'Plano mensal de barba e cabelo, com agenda liberada com 15 dias de antecedencia.',
      14990,
      array['Corte de cabelo', 'Barba']::text[],
      array['Acabamento/pezinho']::text[]
    )
), upserted_plans as (
  insert into public.customer_subscription_plans (
    tenant_id,
    code,
    name,
    description,
    price_amount_cents,
    billing_interval,
    booking_window_days,
    status,
    metadata,
    updated_at
  )
  select
    tenants.id,
    requested_plans.code,
    requested_plans.name,
    requested_plans.description,
    requested_plans.price_amount_cents,
    'MONTHLY',
    15,
    'ACTIVE',
    jsonb_build_object(
      'source', 'barbershop_current_plans',
      'includedServiceQuantityPolicy', 'not_specified_by_business',
      'extraServicesDiscountBasisPoints', 1000,
      'cosmeticsDiscountBasisPoints', 1000
    ),
    now()
  from public.tenants
  cross join requested_plans
  where tenants.status = 'ACTIVE'
  on conflict (tenant_id, code) do update set
    name = excluded.name,
    description = excluded.description,
    price_amount_cents = excluded.price_amount_cents,
    billing_interval = excluded.billing_interval,
    booking_window_days = excluded.booking_window_days,
    status = excluded.status,
    metadata = excluded.metadata,
    updated_at = now()
  returning id, tenant_id, code
), plan_services as (
  select
    upserted_plans.tenant_id,
    upserted_plans.id as plan_id,
    services.id as service_id,
    'INCLUDED_MONTHLY_SERVICE'::text as benefit_type,
    null::integer as monthly_quantity,
    10000 as discount_basis_points,
    jsonb_build_object('quantityPolicy', 'not_specified_by_business') as metadata
  from upserted_plans
  join requested_plans on requested_plans.code = upserted_plans.code
  join lateral unnest(requested_plans.included_services) as included_service_name on true
  join public.services
    on services.tenant_id = upserted_plans.tenant_id
   and lower(services.name) = lower(included_service_name)
  union all
  select
    upserted_plans.tenant_id,
    upserted_plans.id as plan_id,
    services.id as service_id,
    'FULL_DISCOUNT_SERVICE'::text as benefit_type,
    null::integer as monthly_quantity,
    10000 as discount_basis_points,
    '{}'::jsonb as metadata
  from upserted_plans
  join requested_plans on requested_plans.code = upserted_plans.code
  join lateral unnest(requested_plans.full_discount_services) as full_discount_service_name on true
  join public.services
    on services.tenant_id = upserted_plans.tenant_id
   and lower(services.name) = lower(full_discount_service_name)
)
insert into public.customer_subscription_plan_service_benefits (
  tenant_id,
  plan_id,
  service_id,
  benefit_type,
  monthly_quantity,
  discount_basis_points,
  metadata
)
select tenant_id, plan_id, service_id, benefit_type, monthly_quantity, discount_basis_points, metadata
from plan_services
on conflict (tenant_id, plan_id, service_id, benefit_type) do update set
  monthly_quantity = excluded.monthly_quantity,
  discount_basis_points = excluded.discount_basis_points,
  metadata = excluded.metadata;

with active_customer_subscription_plans as (
  select tenant_id, id as plan_id
  from public.customer_subscription_plans
  where code in ('monthly_haircut_7990', 'monthly_beard_8990', 'monthly_haircut_beard_14990')
)
insert into public.customer_subscription_plan_discount_benefits (
  tenant_id,
  plan_id,
  target_type,
  discount_basis_points,
  metadata
)
select
  active_customer_subscription_plans.tenant_id,
  active_customer_subscription_plans.plan_id,
  discount_targets.target_type,
  1000,
  '{}'::jsonb
from active_customer_subscription_plans
cross join (
  values ('EXTRA_SERVICES'::text), ('COSMETICS'::text)
) as discount_targets(target_type)
on conflict (tenant_id, plan_id, target_type) do update set
  discount_basis_points = excluded.discount_basis_points,
  metadata = excluded.metadata;