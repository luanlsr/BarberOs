-- Customer CRM enrichment and barbershop customer plan subscriptions.
-- Additive migration: existing customers and customer_subscription_plans remain valid.

alter table public.customers
  add column if not exists nickname text,
  add column if not exists document_type text check (document_type is null or document_type in ('CPF', 'CNPJ', 'OTHER')),
  add column if not exists document_number text,
  add column if not exists gender text check (gender is null or gender in ('MALE', 'FEMALE', 'NON_BINARY', 'NOT_INFORMED', 'OTHER')),
  add column if not exists instagram_handle text,
  add column if not exists preferred_contact_channel text check (preferred_contact_channel is null or preferred_contact_channel in ('WHATSAPP', 'PHONE', 'EMAIL', 'IN_APP')),
  add column if not exists address jsonb not null default '{}'::jsonb,
  add column if not exists relationship_notes text,
  add column if not exists allergies_notes text,
  add column if not exists hair_profile_notes text,
  add column if not exists beard_profile_notes text,
  add column if not exists occupation text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists lgpd_consent_at timestamptz,
  add column if not exists lgpd_consent_source text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists next_suggested_contact_at timestamptz;

create table if not exists public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  purpose text not null check (purpose in ('LGPD_DATA_PROCESSING', 'WHATSAPP_TRANSACTIONAL', 'WHATSAPP_MARKETING', 'EMAIL_MARKETING', 'SMS_MARKETING', 'AI_PERSONALIZATION')),
  status text not null check (status in ('GRANTED', 'REVOKED', 'UNKNOWN')),
  source text not null,
  evidence text,
  captured_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (tenant_id, customer_id, purpose)
);

create table if not exists public.customer_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  preference_type text not null check (preference_type in ('PROFESSIONAL', 'SERVICE', 'WEEKDAY', 'TIME_WINDOW', 'CONTACT_CHANNEL', 'PRODUCT', 'OTHER')),
  source text not null check (source in ('EXPLICIT', 'AI_INFERRED', 'SYSTEM_CALCULATED', 'OPERATOR')),
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  weekday smallint check (weekday is null or weekday between 0 and 6),
  starts_at_local time,
  ends_at_local time,
  label text,
  score_basis_points integer check (score_basis_points is null or score_basis_points between 0 and 10000),
  confidence_basis_points integer check (confidence_basis_points is null or confidence_basis_points between 0 and 10000),
  observed_count integer not null default 0 check (observed_count >= 0),
  last_observed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at_local is null or ends_at_local is null or starts_at_local < ends_at_local)
);

create table if not exists public.customer_relationship_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  event_type text not null check (event_type in ('NOTE', 'CALL', 'WHATSAPP', 'EMAIL', 'VISIT', 'NO_SHOW', 'CANCELLED', 'PLAN_STARTED', 'PLAN_RENEWED', 'PLAN_CANCELLED', 'AI_INSIGHT')),
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  source_type text,
  source_id uuid,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_plan_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  plan_id uuid not null references public.customer_subscription_plans(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('PENDING', 'ACTIVE', 'PAUSED', 'PAST_DUE', 'CANCELLED', 'EXPIRED')),
  starts_on date not null,
  current_cycle_start date not null,
  current_cycle_end date not null,
  renews_on date,
  cancelled_at timestamptz,
  cancellation_reason text,
  auto_renew boolean not null default true,
  billing_anchor_day smallint check (billing_anchor_day is null or billing_anchor_day between 1 and 31),
  plan_code_snapshot text not null,
  plan_name_snapshot text not null,
  plan_description_snapshot text,
  price_amount_cents_snapshot integer not null check (price_amount_cents_snapshot >= 0),
  billing_interval_snapshot text not null check (billing_interval_snapshot in ('MONTHLY')),
  booking_window_days_snapshot integer not null check (booking_window_days_snapshot > 0),
  payment_method text check (payment_method is null or payment_method in ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER', 'EXTERNAL')),
  external_subscription_id text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on <= current_cycle_start),
  check (current_cycle_start < current_cycle_end),
  unique (tenant_id, idempotency_key)
);

create unique index if not exists customer_plan_subscriptions_one_active_per_customer_idx
  on public.customer_plan_subscriptions (tenant_id, customer_id)
  where status in ('PENDING', 'ACTIVE', 'PAUSED', 'PAST_DUE');

create table if not exists public.customer_plan_subscription_benefits_snapshot (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subscription_id uuid not null references public.customer_plan_subscriptions(id) on delete cascade,
  plan_id uuid not null references public.customer_subscription_plans(id) on delete restrict,
  service_id uuid references public.services(id) on delete restrict,
  target_type text check (target_type is null or target_type in ('EXTRA_SERVICES', 'COSMETICS')),
  benefit_type text not null check (benefit_type in ('INCLUDED_MONTHLY_SERVICE', 'FULL_DISCOUNT_SERVICE', 'DISCOUNT')),
  service_name_snapshot text,
  monthly_quantity integer check (monthly_quantity is null or monthly_quantity > 0),
  discount_basis_points integer not null default 0 check (discount_basis_points between 0 and 10000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_plan_cycles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subscription_id uuid not null references public.customer_plan_subscriptions(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  cycle_start date not null,
  cycle_end date not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED', 'CANCELLED')),
  included_services_used_count integer not null default 0 check (included_services_used_count >= 0),
  discount_amount_used_cents integer not null default 0 check (discount_amount_used_cents >= 0),
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cycle_start < cycle_end),
  unique (tenant_id, subscription_id, cycle_start)
);

create table if not exists public.customer_plan_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  subscription_id uuid not null references public.customer_plan_subscriptions(id) on delete restrict,
  cycle_id uuid not null references public.customer_plan_cycles(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid references public.services(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  usage_type text not null check (usage_type in ('INCLUDED_SERVICE', 'FULL_DISCOUNT_SERVICE', 'DISCOUNT')),
  service_name_snapshot text,
  quantity integer not null default 1 check (quantity > 0),
  gross_amount_cents integer not null default 0 check (gross_amount_cents >= 0),
  discount_amount_cents integer not null default 0 check (discount_amount_cents >= 0),
  final_amount_cents integer not null default 0 check (final_amount_cents >= 0),
  used_at timestamptz not null default now(),
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key),
  check (discount_amount_cents <= gross_amount_cents),
  check (final_amount_cents <= gross_amount_cents)
);

create table if not exists public.customer_plan_billing_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  subscription_id uuid not null references public.customer_plan_subscriptions(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  event_type text not null check (event_type in ('INVOICE_CREATED', 'PAYMENT_DUE', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'RENEWED', 'PAST_DUE', 'CANCELLED', 'REFUNDED', 'ADJUSTED')),
  status text not null default 'RECORDED' check (status in ('PENDING', 'RECORDED', 'FAILED', 'REVERSED')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  due_on date,
  occurred_at timestamptz not null default now(),
  payment_id uuid references public.payments(id) on delete set null,
  financial_entry_id uuid references public.financial_entries(id) on delete set null,
  external_reference text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists public.customer_plan_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subscription_id uuid references public.customer_plan_subscriptions(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  action text not null,
  actor_id uuid,
  before jsonb,
  after jsonb,
  reason text,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists customers_tenant_birth_date_idx on public.customers (tenant_id, birth_date) where birth_date is not null;
create index if not exists customers_tenant_preferred_professional_idx on public.customers (tenant_id, preferred_professional_id) where preferred_professional_id is not null;
create index if not exists customer_consents_customer_idx on public.customer_consents (tenant_id, customer_id, purpose);
create index if not exists customer_preferences_customer_type_idx on public.customer_preferences (tenant_id, customer_id, preference_type, source);
create index if not exists customer_preferences_professional_idx on public.customer_preferences (tenant_id, professional_id) where professional_id is not null;
create index if not exists customer_preferences_service_idx on public.customer_preferences (tenant_id, service_id) where service_id is not null;
create index if not exists customer_relationship_events_customer_idx on public.customer_relationship_events (tenant_id, customer_id, occurred_at desc);
create index if not exists customer_plan_subscriptions_customer_status_idx on public.customer_plan_subscriptions (tenant_id, customer_id, status);
create index if not exists customer_plan_subscriptions_plan_status_idx on public.customer_plan_subscriptions (tenant_id, plan_id, status);
create index if not exists customer_plan_cycles_subscription_idx on public.customer_plan_cycles (tenant_id, subscription_id, cycle_start desc);
create index if not exists customer_plan_usage_subscription_idx on public.customer_plan_usage (tenant_id, subscription_id, used_at desc);
create index if not exists customer_plan_usage_order_item_idx on public.customer_plan_usage (tenant_id, order_item_id) where order_item_id is not null;
create index if not exists customer_plan_billing_events_subscription_idx on public.customer_plan_billing_events (tenant_id, subscription_id, occurred_at desc);
create index if not exists customer_plan_audit_logs_subscription_idx on public.customer_plan_audit_logs (tenant_id, subscription_id, created_at desc);

alter table public.customer_consents enable row level security;
alter table public.customer_preferences enable row level security;
alter table public.customer_relationship_events enable row level security;
alter table public.customer_plan_subscriptions enable row level security;
alter table public.customer_plan_subscription_benefits_snapshot enable row level security;
alter table public.customer_plan_cycles enable row level security;
alter table public.customer_plan_usage enable row level security;
alter table public.customer_plan_billing_events enable row level security;
alter table public.customer_plan_audit_logs enable row level security;

drop policy if exists customer_consents_member_select on public.customer_consents;
create policy customer_consents_member_select on public.customer_consents for select to authenticated
  using (public.has_active_membership(tenant_id));
drop policy if exists customer_consents_member_write on public.customer_consents;
create policy customer_consents_member_write on public.customer_consents for all to authenticated
  using (public.has_active_membership(tenant_id))
  with check (public.has_active_membership(tenant_id));

drop policy if exists customer_preferences_member_select on public.customer_preferences;
create policy customer_preferences_member_select on public.customer_preferences for select to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));
drop policy if exists customer_preferences_member_write on public.customer_preferences;
create policy customer_preferences_member_write on public.customer_preferences for all to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)))
  with check (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));

drop policy if exists customer_relationship_events_member_select on public.customer_relationship_events;
create policy customer_relationship_events_member_select on public.customer_relationship_events for select to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));
drop policy if exists customer_relationship_events_member_write on public.customer_relationship_events;
create policy customer_relationship_events_member_write on public.customer_relationship_events for all to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)))
  with check (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));

drop policy if exists customer_plan_subscriptions_member_select on public.customer_plan_subscriptions;
create policy customer_plan_subscriptions_member_select on public.customer_plan_subscriptions for select to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));
drop policy if exists customer_plan_subscriptions_member_write on public.customer_plan_subscriptions;
create policy customer_plan_subscriptions_member_write on public.customer_plan_subscriptions for all to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)))
  with check (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));

drop policy if exists customer_plan_subscription_benefits_snapshot_member_select on public.customer_plan_subscription_benefits_snapshot;
create policy customer_plan_subscription_benefits_snapshot_member_select on public.customer_plan_subscription_benefits_snapshot for select to authenticated
  using (public.has_active_membership(tenant_id));
drop policy if exists customer_plan_subscription_benefits_snapshot_member_write on public.customer_plan_subscription_benefits_snapshot;
create policy customer_plan_subscription_benefits_snapshot_member_write on public.customer_plan_subscription_benefits_snapshot for all to authenticated
  using (public.has_active_membership(tenant_id))
  with check (public.has_active_membership(tenant_id));

drop policy if exists customer_plan_cycles_member_select on public.customer_plan_cycles;
create policy customer_plan_cycles_member_select on public.customer_plan_cycles for select to authenticated
  using (public.has_active_membership(tenant_id));
drop policy if exists customer_plan_cycles_member_write on public.customer_plan_cycles;
create policy customer_plan_cycles_member_write on public.customer_plan_cycles for all to authenticated
  using (public.has_active_membership(tenant_id))
  with check (public.has_active_membership(tenant_id));

drop policy if exists customer_plan_usage_member_select on public.customer_plan_usage;
create policy customer_plan_usage_member_select on public.customer_plan_usage for select to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));
drop policy if exists customer_plan_usage_member_write on public.customer_plan_usage;
create policy customer_plan_usage_member_write on public.customer_plan_usage for all to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)))
  with check (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));

drop policy if exists customer_plan_billing_events_member_select on public.customer_plan_billing_events;
create policy customer_plan_billing_events_member_select on public.customer_plan_billing_events for select to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));
drop policy if exists customer_plan_billing_events_member_write on public.customer_plan_billing_events;
create policy customer_plan_billing_events_member_write on public.customer_plan_billing_events for all to authenticated
  using (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)))
  with check (public.has_active_membership(tenant_id) and (branch_id is null or public.has_branch_access(tenant_id, branch_id)));

drop policy if exists customer_plan_audit_logs_member_select on public.customer_plan_audit_logs;
create policy customer_plan_audit_logs_member_select on public.customer_plan_audit_logs for select to authenticated
  using (public.has_active_membership(tenant_id));
drop policy if exists customer_plan_audit_logs_member_insert on public.customer_plan_audit_logs;
create policy customer_plan_audit_logs_member_insert on public.customer_plan_audit_logs for insert to authenticated
  with check (public.has_active_membership(tenant_id));

comment on table public.customer_consents is 'Tenant-scoped customer consent ledger for LGPD and communication preferences.';
comment on table public.customer_preferences is 'Explicit and inferred customer preferences for AI-assisted relationship management.';
comment on table public.customer_plan_subscriptions is 'Customer adherence to barbershop-created plans, with price and plan snapshots.';
comment on table public.customer_plan_usage is 'Auditable usage of included services and plan discounts per subscription cycle.';